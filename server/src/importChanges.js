import { recordEvent } from "./events.js";
import { setChangeContext } from "./productVersions.js";

// Comparing a delivery against the one before it.
//
// The comparison is per row, keyed on the supplier's SKU, and starts from the
// hash of the raw row. If the hash matches, nothing in that row moved and there
// is nothing to look at — which is what makes a monthly delivery of an
// unchanged catalogue cost almost nothing to review.
//
// Where the hash differs the normalised values are diffed field by field, so
// the question a person answers is "the price went from 99 to 109, yes or no"
// rather than "this row changed somehow".

export const DETECT_JOB_TYPE = "import.detect";

const asJson = (value) => JSON.stringify(value ?? null);

/**
 * Fields worth asking about, and how loudly.
 *
 * Anything not listed is not raised. A supplier file carries dozens of internal
 * columns that move constantly and mean nothing to the catalogue; surfacing
 * them would bury the price change that matters.
 */
const WATCHED_FIELDS = Object.freeze({
  selling_price: "critical",
  cost_price: "critical",
  name: "normal",
  brand: "normal",
  supplier_name: "normal",
  animal: "normal",
  category_label: "normal",
  category_type: "normal",
  barcode: "normal",
  image_path: "normal",
  size_amount: "minor",
  size_unit: "minor",
  name_en: "minor",
});

const valuesDiffer = (before, after) => {
  if (before === after) return false;
  if (before === null || before === undefined) return after !== null && after !== undefined;
  if (after === null || after === undefined) return true;

  // 99 and "99" are the same price arriving in two shapes, and raising that as
  // a change would train people to approve without reading.
  if (typeof before === "number" || typeof after === "number") {
    const a = Number(before);
    const b = Number(after);
    if (Number.isFinite(a) && Number.isFinite(b)) return Math.abs(a - b) > 0.0001;
  }

  return String(before).trim() !== String(after).trim();
};

/** The most recent finished delivery for the same profile. */
const findPreviousImport = async (pool, importRow) => {
  if (!importRow.profile_id) return null;

  const result = await pool.query(
    `
      select id, created_at
      from public.imports
      where profile_id = $1
        and id <> $2
        and status in ('completed', 'completed_with_review')
      order by created_at desc
      limit 1
    `,
    [importRow.profile_id, importRow.id],
  );

  return result.rows[0] || null;
};

/**
 * Detects what changed, and marks rows that did not change at all.
 *
 * Returns counts rather than the changes themselves: a delivery can produce
 * thousands, and they are read from the table by the screen that acts on them.
 */
export const runImportDetect = async (pool, importId) => {
  const importResult = await pool.query("select * from public.imports where id = $1", [importId]);
  const importRow = importResult.rows[0];
  if (!importRow) throw new Error(`Import ${importId} not found`);

  const previous = await findPreviousImport(pool, importRow);

  const counts = { added: 0, removed: 0, changed: 0, unchanged: 0 };

  if (!previous) {
    // Nothing to compare against. Every row is new, and saying so explicitly is
    // more useful than an empty change list that looks like nothing happened.
    const rows = await pool.query(
      "select count(*)::int as count from public.import_rows where import_id = $1",
      [importId],
    );
    counts.added = rows.rows[0].count;
    return { import_id: importId, previous_import_id: null, ...counts };
  }

  const currentRows = await pool.query(
    `
      select r.id, r.row_number, r.raw_hash, r.normalized, r.product_id,
             r.normalized->>'sku' as sku
      from public.import_rows r
      where r.import_id = $1 and r.normalized->>'sku' is not null
    `,
    [importId],
  );

  const previousRows = await pool.query(
    `
      select r.raw_hash, r.normalized, r.product_id, r.normalized->>'sku' as sku
      from public.import_rows r
      where r.import_id = $1 and r.normalized->>'sku' is not null
    `,
    [previous.id],
  );

  const previousBySku = new Map();
  for (const row of previousRows.rows) {
    previousBySku.set(String(row.sku).trim().toLowerCase(), row);
  }

  const seenSkus = new Set();

  for (const row of currentRows.rows) {
    const key = String(row.sku).trim().toLowerCase();
    seenSkus.add(key);
    const before = previousBySku.get(key);

    if (!before) {
      counts.added += 1;
      await pool.query(
        `
          insert into public.import_changes (
            import_id, previous_import_id, import_row_id, product_id, change_type, new_value, severity
          )
          values ($1, $2, $3, $4, 'product_added', $5::jsonb, 'normal')
          on conflict do nothing
        `,
        [importId, previous.id, row.id, row.product_id, asJson({ sku: row.sku, name: row.normalized?.name })],
      );
      continue;
    }

    // The cheap path, and the common one: an unchanged row costs one hash
    // comparison rather than a field-by-field diff.
    if (before.raw_hash === row.raw_hash) {
      counts.unchanged += 1;
      await pool.query(
        "update public.import_rows set status = 'unchanged', action = 'unchanged', updated_at = now() where id = $1",
        [row.id],
      );
      continue;
    }

    let rowChanged = false;
    for (const [field, severity] of Object.entries(WATCHED_FIELDS)) {
      const oldValue = before.normalized?.[field] ?? null;
      const newValue = row.normalized?.[field] ?? null;
      if (!valuesDiffer(oldValue, newValue)) continue;

      rowChanged = true;
      counts.changed += 1;
      await pool.query(
        `
          insert into public.import_changes (
            import_id, previous_import_id, import_row_id, product_id,
            change_type, field_name, old_value, new_value, severity
          )
          values ($1, $2, $3, $4, 'field_changed', $5, $6::jsonb, $7::jsonb, $8)
          on conflict do nothing
        `,
        [
          importId, previous.id, row.id, row.product_id || before.product_id,
          field, asJson(oldValue), asJson(newValue), severity,
        ],
      );
    }

    if (!rowChanged) {
      // The hash moved but nothing watched did — an internal column shifted.
      counts.unchanged += 1;
      await pool.query(
        "update public.import_rows set status = 'unchanged', action = 'unchanged', updated_at = now() where id = $1",
        [row.id],
      );
    }
  }

  // Products the supplier stopped sending. Marked, never deleted: a product
  // missing from one file is a question, not an instruction.
  for (const [key, before] of previousBySku) {
    if (seenSkus.has(key)) continue;

    counts.removed += 1;
    await pool.query(
      `
        insert into public.import_changes (
          import_id, previous_import_id, product_id, change_type, old_value, severity
        )
        values ($1, $2, $3, 'product_removed', $4::jsonb, 'critical')
        on conflict do nothing
      `,
      [importId, previous.id, before.product_id, asJson({ sku: before.sku, name: before.normalized?.name })],
    );

    if (before.product_id) {
      await pool.query(
        "update public.products set missing_from_import_at = now(), updated_at = now() where id = $1",
        [before.product_id],
      );
    }
  }

  await pool.query(
    "update public.imports set unchanged_products = $2, updated_at = now() where id = $1",
    [importId, counts.unchanged],
  );

  await recordEvent(pool, {
    event_type: "product.change_detected",
    entity_type: "import",
    entity_id: importId,
    source: "import",
    idempotency_key: `product.change_detected:${importId}`,
    payload: counts,
  });

  return { import_id: importId, previous_import_id: previous.id, ...counts };
};

/** What is waiting for a decision, grouped so money is read first. */
export const getPendingChanges = async (pool, { importId = null, limit = 200 } = {}) => {
  const values = [Math.min(500, Math.max(1, Number(limit) || 200))];
  let filter = "";
  if (importId) {
    values.push(importId);
    filter = `and c.import_id = $${values.length}`;
  }

  const result = await pool.query(
    `
      select
        c.id, c.change_type, c.field_name, c.old_value, c.new_value, c.severity,
        c.product_id, p.name as product_name, p.sku as product_sku
      from public.import_changes c
      left join public.products p on p.id = c.product_id
      where c.status = 'pending' ${filter}
      order by
        case c.severity when 'critical' then 0 when 'normal' then 1 else 2 end,
        c.created_at
      limit $1
    `,
    values,
  );

  const summary = await pool.query(
    `
      select change_type, severity, count(*)::int as count
      from public.import_changes
      where status = 'pending' ${importId ? "and import_id = $1" : ""}
      group by 1, 2
      order by 3 desc
    `,
    importId ? [importId] : [],
  );

  return { changes: result.rows, summary: summary.rows };
};

const FIELD_TO_PRODUCT_COLUMN = Object.freeze({
  selling_price: "price",
  cost_price: "cost_price",
  name: "name",
  brand: "brand",
  size_amount: "size_amount",
  size_unit: "size_unit",
});

/**
 * Applies or rejects decided changes.
 *
 * Only fields that map to a product column are written. A change to something
 * the catalogue does not store — a supplier's internal code, say — is still
 * worth recording and approving, but there is nothing to apply.
 */
export const decideChanges = async (pool, { changeIds, action, adminUserId }) => {
  const ids = [...new Set((changeIds || []).filter(Boolean))].slice(0, 500);
  if (ids.length === 0) throw Object.assign(new Error("No changes selected"), { statusCode: 400 });
  if (!["approve", "reject"].includes(action)) {
    throw Object.assign(new Error("action must be approve or reject"), { statusCode: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("begin");

    if (action === "reject") {
      const result = await client.query(
        `
          update public.import_changes
          set status = 'rejected', decided_by_admin_user_id = $2, decided_at = now(), updated_at = now()
          where id = any($1::uuid[]) and status = 'pending'
          returning id
        `,
        [ids, adminUserId || null],
      );
      await client.query("commit");
      return { requested: ids.length, decided: result.rowCount, applied: 0 };
    }

    await setChangeContext(client, {
      source: "admin",
      reason: "אישור שינוי מייבוא",
      adminUserId,
    });

    const pending = await client.query(
      `
        select id, product_id, change_type, field_name, new_value
        from public.import_changes
        where id = any($1::uuid[]) and status = 'pending'
      `,
      [ids],
    );

    let applied = 0;
    for (const change of pending.rows) {
      const column = change.field_name ? FIELD_TO_PRODUCT_COLUMN[change.field_name] : null;

      if (change.change_type === "field_changed" && column && change.product_id) {
        await client.query(
          `update public.products set ${column} = $2, updated_at = now() where id = $1`,
          [change.product_id, change.new_value],
        );
        applied += 1;

        await recordEvent(client, {
          event_type: change.field_name === "selling_price" ? "product.price_changed" : "product.updated",
          actor_admin_user_id: adminUserId,
          entity_type: "product",
          entity_id: change.product_id,
          source: "admin",
          payload: { field: change.field_name, new_value: change.new_value },
        });
      }

      await client.query(
        `
          update public.import_changes
          set status = $2, decided_by_admin_user_id = $3, decided_at = now(),
              applied_at = case when $2 = 'applied' then now() else null end, updated_at = now()
          where id = $1
        `,
        [change.id, column && change.product_id ? "applied" : "approved", adminUserId || null],
      );
    }

    await client.query(
      `
        insert into public.admin_audit_log (action_type, entity_type, metadata, actor_admin_user_id)
        values ($1, 'import_change', $2::jsonb, $3)
      `,
      [
        `change.${action}`,
        JSON.stringify({ requested: ids.length, decided: pending.rowCount, applied }),
        adminUserId || null,
      ],
    );

    await client.query("commit");
    return { requested: ids.length, decided: pending.rowCount, applied };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};
