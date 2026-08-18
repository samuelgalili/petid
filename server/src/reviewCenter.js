import { recordEvent } from "./events.js";
import { setChangeContext } from "./productVersions.js";

// The review queue, grouped by why each product is in it.
//
// A first delivery lands 267 products in review. Presented as a list that is a
// day of scrolling; presented as five reasons it is five decisions. So the
// grouping is the feature, not the list.

const MAX_BULK = 500;

// Ordered by how much of the queue each one usually explains, so the biggest
// win is at the top of the screen.
export const REVIEW_REASONS = Object.freeze({
  MISSING_PRICE: { label: "אין מחיר מכירה", blocksPublish: true },
  MISSING_SUPPLIER: { label: "אין ספק", blocksPublish: false },
  MISSING_IMAGE: { label: "אין תמונה", blocksPublish: false },
  IMAGE_PATH_REORDERED: { label: "נתיב תמונה שוחזר", blocksPublish: false },
  INVALID_BARCODE: { label: "ברקוד לא תקין", blocksPublish: false },
  MISSING_BRAND: { label: "אין יצרן", blocksPublish: false },
});

/** How many products sit behind each reason, and which of them can be published. */
export const getReviewSummary = async (pool) => {
  const result = await pool.query(`
    select
      warning->>'code' as code,
      count(distinct p.id)::int as product_count
    from public.products p
    join public.import_rows r on r.id = p.source_import_row_id
    cross join lateral jsonb_array_elements(r.warnings) as warning
    where p.status = 'pending_review' and p.deleted_at is null
    group by 1
    order by 2 desc
  `);

  const totals = await pool.query(`
    select
      count(*)::int as pending,
      count(*) filter (where price > 0)::int as publishable
    from public.products
    where status = 'pending_review' and deleted_at is null
  `);

  return {
    reasons: result.rows.map((row) => ({
      code: row.code,
      label: REVIEW_REASONS[row.code]?.label || row.code,
      blocks_publish: REVIEW_REASONS[row.code]?.blocksPublish ?? false,
      product_count: row.product_count,
    })),
    pending: totals.rows[0].pending,
    // Publishing everything is never the answer, so the screen says up front
    // how many of them are actually ready.
    publishable: totals.rows[0].publishable,
  };
};

/** The products behind one reason, or the whole queue when no reason is given. */
export const getReviewProducts = async (pool, { reason = null, limit = 50, offset = 0 } = {}) => {
  const values = [Math.min(200, Math.max(1, Number(limit) || 50)), Math.max(0, Number(offset) || 0)];
  let reasonFilter = "";

  if (reason) {
    values.push(reason);
    reasonFilter = `
      and exists (
        select 1 from jsonb_array_elements(r.warnings) as warning
        where warning->>'code' = $${values.length}
      )
    `;
  }

  const result = await pool.query(
    `
      select
        p.id, p.name, p.sku, p.price, p.cost_price, p.image_url, p.size_amount, p.size_unit,
        b.name as brand_name,
        c.name as category_name,
        a.name as animal_name,
        s.name as supplier_name,
        r.row_number,
        coalesce(
          (select jsonb_agg(warning->>'code') from jsonb_array_elements(r.warnings) as warning),
          '[]'::jsonb
        ) as reasons
      from public.products p
      join public.import_rows r on r.id = p.source_import_row_id
      left join public.brands b on b.id = p.brand_id
      left join public.categories c on c.id = p.primary_category_id
      left join public.animal_types a on a.id = p.animal_type_id
      left join public.suppliers s on s.id = p.primary_supplier_id
      where p.status = 'pending_review' and p.deleted_at is null
      ${reasonFilter}
      order by r.row_number
      limit $1 offset $2
    `,
    values,
  );

  return result.rows;
};

/**
 * Approves or rejects a set of products.
 *
 * Publishing checks the mandatory rule regardless of what was asked for. A
 * product with no price would go on sale at zero, so it is refused and named
 * rather than quietly skipped — the person needs to know their bulk action did
 * not cover everything.
 */
export const applyReviewDecision = async (pool, { productIds, action, adminUserId }) => {
  const ids = [...new Set((productIds || []).filter(Boolean))].slice(0, MAX_BULK);
  if (ids.length === 0) throw Object.assign(new Error("No products selected"), { statusCode: 400 });
  if (!["publish", "reject"].includes(action)) {
    throw Object.assign(new Error("action must be publish or reject"), { statusCode: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    await setChangeContext(client, {
      source: "admin",
      reason: action === "publish" ? "אושר לפרסום במרכז הביקורת" : "נדחה במרכז הביקורת",
      adminUserId,
    });

    let refused = [];
    let updated = 0;

    if (action === "publish") {
      const blocked = await client.query(
        `
          select id, name, sku
          from public.products
          where id = any($1::uuid[]) and (price is null or price <= 0)
        `,
        [ids],
      );
      refused = blocked.rows.map((row) => ({
        id: row.id,
        name: row.name,
        sku: row.sku,
        reason: "MISSING_PRICE",
      }));

      const allowed = ids.filter((id) => !refused.some((row) => row.id === id));
      if (allowed.length > 0) {
        const result = await client.query(
          `
            update public.products
            set status = 'published', updated_at = now()
            where id = any($1::uuid[]) and status = 'pending_review'
            returning id
          `,
          [allowed],
        );
        updated = result.rowCount;

        for (const row of result.rows) {
          await recordEvent(client, {
            event_type: "product.published",
            actor_admin_user_id: adminUserId,
            entity_type: "product",
            entity_id: row.id,
            source: "admin",
          });
        }
      }
    } else {
      const result = await client.query(
        `
          update public.products
          set status = 'rejected', updated_at = now()
          where id = any($1::uuid[]) and status = 'pending_review'
          returning id
        `,
        [ids],
      );
      updated = result.rowCount;

      for (const row of result.rows) {
        await recordEvent(client, {
          event_type: "product.rejected",
          actor_admin_user_id: adminUserId,
          entity_type: "product",
          entity_id: row.id,
          source: "admin",
        });
      }
    }

    // Every decision is recorded against the person who made it, because a
    // catalogue changing state with no author is not auditable.
    await client.query(
      `
        insert into public.admin_audit_log (action_type, entity_type, new_values, metadata, actor_admin_user_id)
        values ($1, 'product', $2::jsonb, $3::jsonb, $4)
      `,
      [
        `review.${action}`,
        JSON.stringify({ status: action === "publish" ? "published" : "rejected" }),
        JSON.stringify({ requested: ids.length, updated, refused: refused.length }),
        adminUserId || null,
      ],
    );

    await client.query("commit");
    return { requested: ids.length, updated, refused };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};
