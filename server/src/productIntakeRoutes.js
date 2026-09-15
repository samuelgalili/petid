// Product Intake routes - the first Seller-isolated surface.
//
// Every route here follows the same order, and the order is the security
// property, not a style:
//
//   1. authenticate and check the permission      (before anything else)
//   2. read the body only after that              (an unauthenticated caller
//                                                  never reaches the parser)
//   3. open a transaction
//   4. read the row and check ownership INSIDE it (so the owner cannot change
//                                                  between check and write)
//   5. write, audit, commit
//
// Ownership failures answer 404, never 403. A 403 confirms the row exists,
// which tells one Seller that another Seller owns an object with that id. The
// absence of an object and the absence of permission have to be
// indistinguishable from outside.
//
// A business_id in a request body is never authority. For a Seller-scoped
// session the session decides; a body naming a different Seller is refused (and
// audited) rather than quietly overridden, because the attempt is worth seeing.

import { createHash } from "node:crypto";
import { ADMIN_PERMISSIONS } from "./adminPermissions.js";
import {
  DRAFT_STATES,
  PUBLICATION_STATES,
  allowedDraftTransitions,
  draftSubmissionBlockers,
  isDraftTransitionAllowed,
  isPublicationTransitionAllowed,
  mayApproveDraft,
} from "./productIntakeState.js";
import { sellerIneligibilityReason } from "./sellerEligibility.js";
import { mayActOnRow, resolveWriteBusinessId, sessionSellerScope, NO_ACCESS } from "./sellerScope.js";

const UUID = "([0-9a-fA-F-]{36})";

const SOURCE_SYSTEMS = Object.freeze(["url", "scrape", "csv", "xlsx", "manual", "api"]);

/** Host only - a full URL in an audit row is a URL in a log. */
const hostOf = (value) => {
  try { return new URL(String(value)).hostname || null; } catch { return null; }
};
const route = (method, pattern) => ({ method, pattern: new RegExp(`^${pattern}$`) });

/** Draft columns a caller may set. Anything else in the body is ignored. */
const EDITABLE_DRAFT_FIELDS = Object.freeze([
  "name", "description", "brand", "category_id", "pet_type", "attributes", "proposed_price",
]);

/** A draft may be edited only in these states; APPROVED content edits are a
 *  separate action that returns it to DRAFT, and are not implemented here. */
const EDITABLE_DRAFT_STATES = Object.freeze(["IMPORTED", "DRAFT", "IN_REVIEW", "REJECTED"]);

export const createProductIntakeRoutes = ({
  pool,
  sendJson,
  sendError,
  readBody,
  requireAdminPermission,
  recordAdminAudit,
}) => {
  /**
   * Runs `fn` inside a transaction, resolving the owning Seller of a row first
   * and refusing with 404 if the caller may not act on it.
   *
   * The SELECT takes `for update` so the owner cannot change between the check
   * and the write. Checking ownership outside the transaction, or without the
   * lock, is a race: the row can be transferred in between and the write lands
   * on somebody else's object.
   */
  const withOwnedRow = async (admin, { sql, params, ownerColumn = "business_id" }, fn) => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const { rows } = await client.query(sql, params);
      if (rows.length === 0) {
        await client.query("rollback");
        return { status: 404, body: { error: "Not found" } };
      }
      if (!mayActOnRow(admin, rows[0][ownerColumn])) {
        await client.query("rollback");
        // Deliberately identical to the not-found answer above.
        return { status: 404, body: { error: "Not found" }, crossSeller: true };
      }
      const result = await fn(client, rows[0]);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  };

  /** Adds `and business_id = $n` for a Seller-scoped session. */
  const scopeClause = (admin, params, column = "business_id") => {
    const scope = sessionSellerScope(admin);
    if (scope === NO_ACCESS) return { sql: " and false", params };
    if (scope === null) return { sql: "", params };
    params.push(scope);
    return { sql: ` and ${column} = $${params.length}`, params };
  };

  const auditCrossSellerAttempt = (admin, entityType, entityId) =>
    recordAdminAudit(admin, {
      actionType: "seller_isolation.cross_seller_denied",
      entityType,
      entityId,
      metadata: { scope: admin.scope ?? null },
    });

  // ── 1 · intake list ────────────────────────────────────────────────────────
  const listDrafts = async (request, response, _match, url) => {
    if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.INTAKE_READ))) return true;
    const admin = request.admin;

    const params = [];
    const scoped = scopeClause(admin, params, "d.business_id");
    const state = String(url.searchParams.get("state") || "").trim();
    let stateSql = "";
    if (state) {
      params.push(state);
      stateSql = ` and d.state = $${params.length}`;
    }

    const { rows } = await pool.query(
      `select d.id, d.business_id, d.state, d.name, d.brand, d.category_id,
              d.proposed_price, d.raw_import_record_id, d.updated_at,
              d.approved_catalog_product_id
         from public.product_drafts d
        where d.archived_at is null${scoped.sql}${stateSql}
        order by d.updated_at desc
        limit 200`,
      params,
    );
    sendJson(response, 200, { drafts: rows });
    return true;
  };

  // ── 2 · intake detail, with the raw record beside the correction ───────────
  const getDraft = async (request, response, match) => {
    if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.INTAKE_READ))) return true;
    const admin = request.admin;

    const { rows } = await pool.query(
      `select d.*, r.payload as raw_payload, r.source_system, r.source_host, r.imported_at
         from public.product_drafts d
         left join public.raw_import_records r on r.id = d.raw_import_record_id
        where d.id = $1`,
      [match[1]],
    );

    if (rows.length === 0 || !mayActOnRow(admin, rows[0].business_id)) {
      if (rows.length > 0) await auditCrossSellerAttempt(admin, "product_draft", match[1]);
      sendError(response, 404, "Not found");
      return true;
    }
    sendJson(response, 200, { draft: rows[0] });
    return true;
  };

  // ── 3 · draft update ──────────────────────────────────────────────────────
  const updateDraft = async (request, response, match) => {
    if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.INTAKE_WRITE))) return true;
    const admin = request.admin;
    // Only now is the body read.
    const body = await readBody(request);

    // A body naming another Seller is an attempt, not a typo.
    if (body?.business_id) {
      const resolved = resolveWriteBusinessId(admin, body.business_id);
      if (!resolved.ok && resolved.attemptedCrossSeller) {
        await auditCrossSellerAttempt(admin, "product_draft", match[1]);
        sendError(response, 404, "Not found");
        return true;
      }
    }

    const outcome = await withOwnedRow(
      admin,
      { sql: "select * from public.product_drafts where id = $1 for update", params: [match[1]] },
      async (client, draft) => {
        if (draft.archived_at) return { status: 409, body: { error: "Draft is archived" } };
        if (!EDITABLE_DRAFT_STATES.includes(draft.state)) {
          return {
            status: 409,
            body: { error: "INVALID_STATE_TRANSITION", state: draft.state },
          };
        }

        const updates = {};
        for (const field of EDITABLE_DRAFT_FIELDS) {
          if (Object.hasOwn(body ?? {}, field)) updates[field] = body[field];
        }
        if (Object.keys(updates).length === 0) {
          return { status: 400, body: { error: "No editable fields supplied" } };
        }

        const assignments = Object.keys(updates)
          .map((field, index) => `${field} = $${index + 2}`)
          .join(", ");
        const { rows } = await client.query(
          `update public.product_drafts
              set ${assignments}, updated_by = $${Object.keys(updates).length + 2}, updated_at = now()
            where id = $1
            returning *`,
          [draft.id, ...Object.values(updates), admin.id === "api-key" ? null : admin.id],
        );

        return {
          status: 200,
          body: { draft: rows[0] },
          audit: {
            actionType: "product_draft.updated",
            entityType: "product_draft",
            entityId: draft.id,
            oldValues: Object.fromEntries(Object.keys(updates).map((f) => [f, draft[f]])),
            newValues: updates,
          },
        };
      },
    );

    if (outcome.crossSeller) await auditCrossSellerAttempt(admin, "product_draft", match[1]);
    if (outcome.audit) await recordAdminAudit(admin, outcome.audit);
    sendJson(response, outcome.status, outcome.body);
    return true;
  };

  // ── 4 · variants ──────────────────────────────────────────────────────────
  const createVariant = async (request, response, match) => {
    if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.VARIANTS_WRITE))) return true;
    const admin = request.admin;
    const body = await readBody(request);

    const signature = String(body?.option_signature ?? "").trim();
    if (!signature) {
      sendError(response, 400, "option_signature is required");
      return true;
    }

    const outcome = await withOwnedRow(
      admin,
      {
        sql: `select id, owning_business_id from public.catalog_products where id = $1 for update`,
        params: [match[1]],
        ownerColumn: "owning_business_id",
      },
      async (client, product) => {
        const { rows } = await client.query(
          `insert into public.product_variants
             (catalog_product_id, options, option_signature, label, barcode, is_default, created_by)
           values ($1, $2::jsonb, $3, $4, $5, coalesce($6, false), $7)
           returning *`,
          [
            product.id,
            JSON.stringify(body?.options ?? {}),
            signature,
            body?.label ?? null,
            body?.barcode ?? null,
            body?.is_default ?? false,
            admin.id === "api-key" ? null : admin.id,
          ],
        );
        return {
          status: 201,
          body: { variant: rows[0] },
          audit: {
            actionType: "product_variant.created",
            entityType: "product_variant",
            entityId: rows[0].id,
            newValues: { catalog_product_id: product.id, option_signature: signature },
          },
        };
      },
    );

    if (outcome.crossSeller) await auditCrossSellerAttempt(admin, "catalog_product", match[1]);
    if (outcome.audit) await recordAdminAudit(admin, outcome.audit);
    sendJson(response, outcome.status, outcome.body);
    return true;
  };

  const updateVariant = async (request, response, match) => {
    if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.VARIANTS_WRITE))) return true;
    const admin = request.admin;
    const body = await readBody(request);

    const outcome = await withOwnedRow(
      admin,
      {
        // The owner is the product's, so it is joined rather than assumed.
        sql: `select v.id, v.status, p.owning_business_id
                from public.product_variants v
                join public.catalog_products p on p.id = v.catalog_product_id
               where v.id = $1 for update of v`,
        params: [match[1]],
        ownerColumn: "owning_business_id",
      },
      async (client, variant) => {
        const { rows } = await client.query(
          `update public.product_variants
              set label = coalesce($2, label),
                  barcode = coalesce($3, barcode),
                  status = coalesce($4, status),
                  updated_by = $5,
                  updated_at = now()
            where id = $1
            returning *`,
          [
            variant.id,
            body?.label ?? null,
            body?.barcode ?? null,
            body?.status ?? null,
            admin.id === "api-key" ? null : admin.id,
          ],
        );
        return {
          status: 200,
          body: { variant: rows[0] },
          audit: {
            actionType: "product_variant.updated",
            entityType: "product_variant",
            entityId: variant.id,
            newValues: { status: rows[0].status },
          },
        };
      },
    );

    if (outcome.crossSeller) await auditCrossSellerAttempt(admin, "product_variant", match[1]);
    if (outcome.audit) await recordAdminAudit(admin, outcome.audit);
    sendJson(response, outcome.status, outcome.body);
    return true;
  };

  // ── 5 · offers ────────────────────────────────────────────────────────────
  const createOffer = async (request, response, match) => {
    if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.OFFERS_WRITE))) return true;
    const admin = request.admin;
    const body = await readBody(request);

    // The selling Seller comes from the session for a Seller-scoped admin, and
    // must be named explicitly by a platform admin. Never from a fallback.
    const resolved = resolveWriteBusinessId(admin, body?.business_id);
    if (!resolved.ok) {
      if (resolved.attemptedCrossSeller) await auditCrossSellerAttempt(admin, "seller_offer", match[1]);
      sendError(response, resolved.status, resolved.error);
      return true;
    }

    const price = Number(body?.price);
    if (!Number.isFinite(price) || price < 0) {
      sendError(response, 400, "price must be a non-negative number");
      return true;
    }

    const client = await pool.connect();
    try {
      await client.query("begin");
      // The variant must exist; a Seller may only offer against a product it
      // owns (OD-6 - relaxing this later is additive).
      const { rows } = await client.query(
        `select v.id, p.owning_business_id
           from public.product_variants v
           join public.catalog_products p on p.id = v.catalog_product_id
          where v.id = $1 for share`,
        [match[1]],
      );
      if (rows.length === 0 || !mayActOnRow(admin, rows[0].owning_business_id)) {
        await client.query("rollback");
        if (rows.length > 0) await auditCrossSellerAttempt(admin, "product_variant", match[1]);
        sendError(response, 404, "Not found");
        return true;
      }

      const inserted = await client.query(
        `insert into public.seller_offers
           (business_id, product_variant_id, sku, price, sale_price, price_source, created_by)
         values ($1, $2, $3, $4, $5, coalesce($6, 'manual'), $7)
         returning *`,
        [
          resolved.businessId,
          rows[0].id,
          body?.sku ?? null,
          price,
          body?.sale_price ?? null,
          body?.price_source ?? null,
          admin.id === "api-key" ? null : admin.id,
        ],
      );
      await client.query("commit");

      await recordAdminAudit(admin, {
        actionType: "seller_offer.created",
        entityType: "seller_offer",
        entityId: inserted.rows[0].id,
        newValues: { business_id: resolved.businessId, price, product_variant_id: rows[0].id },
      });
      sendJson(response, 201, { offer: inserted.rows[0] });
      return true;
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  };

  const updateOffer = async (request, response, match) => {
    if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.OFFERS_WRITE))) return true;
    const admin = request.admin;
    const body = await readBody(request);

    const outcome = await withOwnedRow(
      admin,
      { sql: "select * from public.seller_offers where id = $1 for update", params: [match[1]] },
      async (client, offer) => {
        const nextPrice = body?.price === undefined ? offer.price : Number(body.price);
        if (!Number.isFinite(Number(nextPrice)) || Number(nextPrice) < 0) {
          return { status: 400, body: { error: "price must be a non-negative number" } };
        }
        const { rows } = await client.query(
          `update public.seller_offers
              set price = $2,
                  sale_price = $3,
                  sku = coalesce($4, sku),
                  status = coalesce($5, status),
                  updated_by = $6,
                  updated_at = now()
            where id = $1
            returning *`,
          [
            offer.id,
            nextPrice,
            body?.sale_price === undefined ? offer.sale_price : body.sale_price,
            body?.sku ?? null,
            body?.status ?? null,
            admin.id === "api-key" ? null : admin.id,
          ],
        );
        return {
          status: 200,
          body: { offer: rows[0] },
          audit: {
            actionType: "seller_offer.updated",
            entityType: "seller_offer",
            entityId: offer.id,
            oldValues: { price: offer.price, status: offer.status },
            newValues: { price: rows[0].price, status: rows[0].status },
          },
        };
      },
    );

    if (outcome.crossSeller) await auditCrossSellerAttempt(admin, "seller_offer", match[1]);
    if (outcome.audit) await recordAdminAudit(admin, outcome.audit);
    sendJson(response, outcome.status, outcome.body);
    return true;
  };

  // ── 6 · inventory ─────────────────────────────────────────────────────────
  const readInventory = async (request, response, match) => {
    if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.INVENTORY_READ))) return true;
    const admin = request.admin;

    const { rows } = await pool.query(
      `select o.business_id, i.*
         from public.seller_offers o
         left join public.inventory i on i.seller_offer_id = o.id
        where o.id = $1`,
      [match[1]],
    );
    if (rows.length === 0 || !mayActOnRow(admin, rows[0].business_id)) {
      if (rows.length > 0) await auditCrossSellerAttempt(admin, "seller_offer", match[1]);
      sendError(response, 404, "Not found");
      return true;
    }
    sendJson(response, 200, { inventory: rows[0].id ? rows[0] : null });
    return true;
  };

  const updateInventory = async (request, response, match) => {
    if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.INVENTORY_WRITE))) return true;
    const admin = request.admin;
    const body = await readBody(request);

    const outcome = await withOwnedRow(
      admin,
      { sql: "select id, business_id from public.seller_offers where id = $1 for update", params: [match[1]] },
      async (client, offer) => {
        const availability = String(body?.availability ?? "").trim();
        if (!availability) return { status: 400, body: { error: "availability is required" } };

        const { rows } = await client.query(
          `insert into public.inventory
             (seller_offer_id, availability, quantity, low_stock_threshold, created_by, updated_by)
           values ($1, $2, $3, $4, $5, $5)
           on conflict (seller_offer_id) do update
             set availability = excluded.availability,
                 quantity = excluded.quantity,
                 low_stock_threshold = excluded.low_stock_threshold,
                 updated_by = excluded.updated_by,
                 updated_at = now()
           returning *`,
          [
            offer.id,
            availability,
            body?.quantity ?? null,
            body?.low_stock_threshold ?? null,
            admin.id === "api-key" ? null : admin.id,
          ],
        );
        return {
          status: 200,
          body: { inventory: rows[0] },
          audit: {
            actionType: "inventory.updated",
            entityType: "inventory",
            entityId: rows[0].id,
            newValues: { availability, quantity: rows[0].quantity },
          },
        };
      },
    );

    if (outcome.crossSeller) await auditCrossSellerAttempt(admin, "seller_offer", match[1]);
    if (outcome.audit) await recordAdminAudit(admin, outcome.audit);
    sendJson(response, outcome.status, outcome.body);
    return true;
  };

  // ── 7 · media ─────────────────────────────────────────────────────────────
  const adoptMedia = async (request, response, match) => {
    if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.MEDIA_ADOPT))) return true;
    const admin = request.admin;
    const body = await readBody(request);

    const outcome = await withOwnedRow(
      admin,
      {
        sql: "select id, owning_business_id from public.catalog_products where id = $1 for update",
        params: [match[1]],
        ownerColumn: "owning_business_id",
      },
      async (client, product) => {
        const storagePath = String(body?.storage_path ?? "").trim();
        if (!storagePath) {
          // Adoption means the bytes are ours; without a path of our own there
          // is nothing to adopt, only a supplier URL to point at.
          return { status: 400, body: { error: "storage_path is required to adopt an image" } };
        }
        const { rows } = await client.query(
          `insert into public.product_media
             (catalog_product_id, product_variant_id, source_url, storage_path, checksum,
              content_type, width, height, bytes, adopted_at, display_order, created_by)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), coalesce($10, 0), $11)
           returning *`,
          [
            product.id,
            body?.product_variant_id ?? null,
            body?.source_url ?? null,
            storagePath,
            body?.checksum ?? null,
            body?.content_type ?? null,
            body?.width ?? null,
            body?.height ?? null,
            body?.bytes ?? null,
            body?.display_order ?? null,
            admin.id === "api-key" ? null : admin.id,
          ],
        );
        return {
          status: 201,
          body: { media: rows[0] },
          audit: {
            actionType: "product_media.adopted",
            entityType: "product_media",
            entityId: rows[0].id,
            // No full URL: host only, as everywhere else in this codebase.
            metadata: { catalog_product_id: product.id, has_source: Boolean(body?.source_url) },
          },
        };
      },
    );

    if (outcome.crossSeller) await auditCrossSellerAttempt(admin, "catalog_product", match[1]);
    if (outcome.audit) await recordAdminAudit(admin, outcome.audit);
    sendJson(response, outcome.status, outcome.body);
    return true;
  };

  const approveMedia = async (request, response, match) => {
    // MEDIA_APPROVE, not MEDIA_ADOPT: a Seller may bring bytes in but may not
    // accept them for public display.
    if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.MEDIA_APPROVE))) return true;
    const admin = request.admin;

    const outcome = await withOwnedRow(
      admin,
      {
        sql: `select m.id, m.adopted_at, m.approved_at, p.owning_business_id
                from public.product_media m
                join public.catalog_products p on p.id = m.catalog_product_id
               where m.id = $1 for update of m`,
        params: [match[1]],
        ownerColumn: "owning_business_id",
      },
      async (client, media) => {
        if (!media.adopted_at) {
          return { status: 409, body: { error: "Image must be adopted before it can be approved" } };
        }
        const { rows } = await client.query(
          `update public.product_media
              set approved_at = now(), approved_by = $2, rejected_at = null,
                  rejection_reason = null, updated_by = $2, updated_at = now()
            where id = $1
            returning *`,
          [media.id, admin.id === "api-key" ? null : admin.id],
        );
        return {
          status: 200,
          body: { media: rows[0] },
          audit: {
            actionType: "product_media.approved",
            entityType: "product_media",
            entityId: media.id,
          },
        };
      },
    );

    if (outcome.crossSeller) await auditCrossSellerAttempt(admin, "product_media", match[1]);
    if (outcome.audit) await recordAdminAudit(admin, outcome.audit);
    sendJson(response, outcome.status, outcome.body);
    return true;
  };

  // ── 8 · publication readiness, computed ───────────────────────────────────
  //
  // OD-2: never stored. A stored "ready" flag is a claim that drifts from the
  // rows it describes - delete the last variant and the flag still says ready.
  // This reads the live rows every time and reports which conditions are unmet,
  // so an admin sees exactly what is missing.
  //
  // The query and the report are extracted because publish() has to evaluate
  // the identical gate inside its own transaction. Two copies of a gate is one
  // gate and one near-miss.
  const READINESS_SQL = `
    select p.id, p.owning_business_id, p.name, p.category_id, p.publication_state,
           d.state as draft_state,
           b.is_verified, b.commercial_status,
           (select count(*) from public.product_variants v
             where v.catalog_product_id = p.id and v.archived_at is null
               and v.status = 'ACTIVE')::int as active_variants,
           (select count(*) from public.product_variants v
             join public.seller_offers o on o.product_variant_id = v.id
            where v.catalog_product_id = p.id and v.archived_at is null
              and o.archived_at is null and o.status = 'ACTIVE' and o.price > 0)::int as priced_offers,
           (select count(*) from public.product_variants v
             join public.seller_offers o on o.product_variant_id = v.id
             join public.inventory i on i.seller_offer_id = o.id
            where v.catalog_product_id = p.id and o.archived_at is null
              and i.availability is not null)::int as offers_with_availability,
           (select count(*) from public.product_media m
             where m.catalog_product_id = p.id and m.archived_at is null
               and m.approved_at is not null)::int as approved_images,
           -- 0052. Attributes the product's category insists on, and which of
           -- them this product is missing. Inherited down the tree by
           -- category_attributes_effective, so a child category's products must
           -- satisfy its parent's requirements too.
           --
           -- Evaluated HERE rather than in JavaScript for the same reason every
           -- other condition is: publishProduct runs this exact statement
           -- inside the transaction that publishes, against rows locked for its
           -- duration. A check done outside it is a check that can go stale
           -- between reading and writing.
           --
           -- '' counts as absent. An attribute present but empty is not a value
           -- somebody entered; treating it as one is how a page ends up showing
           -- a blank next to a label.
           coalesce((
             select array_agg(ea.key order by ea.key)
               from public.category_attributes_effective(p.category_id) ea
              where ea.is_required
                and coalesce(btrim(p.attributes ->> ea.key), '') = ''
           ), '{}') as missing_required_attributes
      from public.catalog_products p
      join public.product_drafts d on d.id = p.origin_draft_id
      join public.business_profiles b on b.id = p.owning_business_id
     where p.id = $1`;

  const readinessReport = (row) => {
    const unmet = [];
    // Condition 1: the Seller is approved. Evaluated by the shared predicate so
    // this gate, provisioning and checkout cannot drift apart. The reason code
    // distinguishes pending from suspended from none - all three are blocked,
    // but an admin should not have to guess which.
    const sellerReason = sellerIneligibilityReason(row);
    if (sellerReason) unmet.push(sellerReason);
    if (row.draft_state !== "APPROVED") unmet.push("draft_not_approved");
    if (!row.name || !String(row.name).trim()) unmet.push("missing_name");
    if (!row.category_id) unmet.push("missing_category");
    if (row.active_variants < 1) unmet.push("no_active_variant");
    if (row.priced_offers < 1) unmet.push("no_priced_offer");
    if (row.offers_with_availability < 1) unmet.push("no_availability");
    // OD-3, decided: an approved image is mandatory.
    if (row.approved_images < 1) unmet.push("no_approved_image");
    // 0052: whatever the category declared it insists on. The reason names the
    // keys rather than saying "incomplete", because an admin looking at a
    // refusal needs to know which field to go and fill.
    const missingAttributes = Array.isArray(row.missing_required_attributes)
      ? row.missing_required_attributes
      : [];
    for (const key of missingAttributes) unmet.push(`missing_attribute:${key}`);

    return {
      product_id: row.id,
      publication_state: row.publication_state,
      ready: unmet.length === 0,
      unmet,
      seller: {
        // So an admin screen can say "pending approval" rather than only "not
        // ready". Never business_type: a category is not a status.
        eligible: sellerReason === null,
        commercial_status: row.commercial_status,
        is_verified: row.is_verified,
      },
    };
  };

  const publicationReadiness = async (request, response, match) => {
    if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.PUBLICATION_READ))) return true;
    const admin = request.admin;

    const { rows } = await pool.query(READINESS_SQL, [match[1]]);
    if (rows.length === 0 || !mayActOnRow(admin, rows[0].owning_business_id)) {
      if (rows.length > 0) await auditCrossSellerAttempt(admin, "catalog_product", match[1]);
      sendError(response, 404, "Not found");
      return true;
    }
    sendJson(response, 200, readinessReport(rows[0]));
    return true;
  };

  // ── 9 · the chain: import → draft → review → product → publication ─────────
  //
  // Without these the tables below are unreachable: nothing could create a raw
  // record, nothing could turn a draft into a product, and nothing could
  // publish one. The permissions DRAFT_SUBMIT, DRAFT_REVIEW and
  // PUBLICATION_PUBLISH existed with no route to use them.

  /** POST /api/admin/intake/imports - record what the source actually said. */
  const createImport = async (request, response) => {
    if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.INTAKE_WRITE))) return true;
    const admin = request.admin;
    const body = await readBody(request);

    const resolved = resolveWriteBusinessId(admin, body?.business_id);
    if (!resolved.ok) {
      if (resolved.attemptedCrossSeller) await auditCrossSellerAttempt(admin, "raw_import_record", null);
      sendError(response, resolved.status, resolved.error);
      return true;
    }

    const sourceSystem = String(body?.source_system ?? "").trim();
    if (!SOURCE_SYSTEMS.includes(sourceSystem)) {
      sendError(response, 400, `source_system must be one of: ${SOURCE_SYSTEMS.join(", ")}`);
      return true;
    }
    if (body?.payload === undefined || body?.payload === null || typeof body.payload !== "object") {
      sendError(response, 400, "payload must be an object: the source record, verbatim");
      return true;
    }

    const payload = JSON.stringify(body.payload);
    // Computed here rather than trusted from the caller: a hash the client
    // chooses is not a hash of anything.
    const payloadHash = createHash("sha256").update(payload).digest("hex");

    try {
      const { rows } = await pool.query(
        `insert into public.raw_import_records
           (business_id, source_system, source_record_id, source_url, source_host,
            payload, payload_hash, content_type, import_batch_id, created_by)
         values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
         returning id, business_id, source_system, source_record_id, source_host,
                   payload_hash, imported_at`,
        [
          resolved.businessId,
          sourceSystem,
          body?.source_record_id ?? null,
          body?.source_url ?? null,
          hostOf(body?.source_url),
          payload,
          payloadHash,
          body?.content_type ?? null,
          body?.import_batch_id ?? null,
          admin.id === "api-key" ? null : admin.id,
        ],
      );

      await recordAdminAudit(admin, {
        actionType: "raw_import_record.created",
        entityType: "raw_import_record",
        entityId: rows[0].id,
        // Host only. Never the full URL, never the payload.
        metadata: {
          business_id: resolved.businessId,
          source_system: sourceSystem,
          source_host: hostOf(body?.source_url),
        },
      });
      sendJson(response, 201, { import: rows[0] });
    } catch (error) {
      if (error.code === "23505") {
        sendError(response, 409, "This Seller has already imported that source record", {
          code: "DUPLICATE_SOURCE_RECORD",
        });
        return true;
      }
      throw error;
    }
    return true;
  };

  /** POST /api/admin/intake/drafts - start correcting, or author by hand. */
  const createDraft = async (request, response) => {
    if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.INTAKE_WRITE))) return true;
    const admin = request.admin;
    const body = await readBody(request);

    const rawId = body?.raw_import_record_id ?? null;
    const client = await pool.connect();
    try {
      await client.query("begin");

      let businessId;
      if (rawId) {
        // The draft inherits the raw record's Seller. It is never taken from
        // the body, and never defaulted.
        const { rows } = await client.query(
          "select id, business_id from public.raw_import_records where id = $1 for share",
          [rawId],
        );
        if (rows.length === 0 || !mayActOnRow(admin, rows[0].business_id)) {
          await client.query("rollback");
          if (rows.length > 0) await auditCrossSellerAttempt(admin, "raw_import_record", rawId);
          sendError(response, 404, "Not found");
          return true;
        }
        businessId = rows[0].business_id;
      } else {
        const resolved = resolveWriteBusinessId(admin, body?.business_id);
        if (!resolved.ok) {
          await client.query("rollback");
          sendError(response, resolved.status, resolved.error);
          return true;
        }
        businessId = resolved.businessId;
      }

      const { rows } = await client.query(
        `insert into public.product_drafts
           (business_id, raw_import_record_id, state, name, description, brand,
            category_id, pet_type, attributes, proposed_price, created_by)
         values ($1, $2, 'DRAFT', $3, $4, $5, $6, $7, coalesce($8::jsonb, '{}'::jsonb), $9, $10)
         returning *`,
        [
          businessId,
          rawId,
          body?.name ?? null,
          body?.description ?? null,
          body?.brand ?? null,
          body?.category_id ?? null,
          body?.pet_type ?? null,
          body?.attributes ? JSON.stringify(body.attributes) : null,
          body?.proposed_price ?? null,
          admin.id === "api-key" ? null : admin.id,
        ],
      );
      await client.query("commit");

      await recordAdminAudit(admin, {
        actionType: "product_draft.created",
        entityType: "product_draft",
        entityId: rows[0].id,
        newValues: { business_id: businessId, raw_import_record_id: rawId },
      });
      sendJson(response, 201, { draft: rows[0] });
      return true;
    } catch (error) {
      await client.query("rollback").catch(() => {});
      if (error.code === "23505") {
        sendError(response, 409, "A live draft already exists for that source record", {
          code: "DRAFT_ALREADY_EXISTS",
        });
        return true;
      }
      throw error;
    } finally {
      client.release();
    }
  };

  /** POST /api/admin/intake/drafts/:id/submit - DRAFT → IN_REVIEW. */
  const submitDraft = async (request, response, match) => {
    if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.DRAFT_SUBMIT))) return true;
    const admin = request.admin;

    const outcome = await withOwnedRow(
      admin,
      { sql: "select * from public.product_drafts where id = $1 for update", params: [match[1]] },
      async (client, draft) => {
        if (!isDraftTransitionAllowed(draft.state, DRAFT_STATES.IN_REVIEW)) {
          return {
            status: 409,
            body: {
              error: "INVALID_STATE_TRANSITION",
              from: draft.state,
              to: DRAFT_STATES.IN_REVIEW,
              allowed: allowedDraftTransitions(draft.state),
            },
          };
        }
        const blockers = draftSubmissionBlockers(draft);
        if (blockers.length > 0) {
          return { status: 400, body: { error: "DRAFT_INCOMPLETE", blockers } };
        }

        const { rows } = await client.query(
          `update public.product_drafts
              set state = 'IN_REVIEW', submitted_by = $2, submitted_at = clock_timestamp(),
                  updated_by = $2, updated_at = now()
            where id = $1 returning *`,
          [draft.id, admin.id === "api-key" ? null : admin.id],
        );
        return {
          status: 200,
          body: { draft: rows[0] },
          audit: {
            actionType: "product_draft.submitted",
            entityType: "product_draft",
            entityId: draft.id,
            oldValues: { state: draft.state },
            newValues: { state: "IN_REVIEW" },
          },
        };
      },
    );

    if (outcome.crossSeller) await auditCrossSellerAttempt(admin, "product_draft", match[1]);
    if (outcome.audit) await recordAdminAudit(admin, outcome.audit);
    sendJson(response, outcome.status, outcome.body);
    return true;
  };

  /**
   * POST /api/admin/intake/drafts/:id/approve - IN_REVIEW → APPROVED, and the
   * only place a catalog_product is ever created.
   *
   * Both writes happen in one transaction. A draft that says APPROVED with no
   * product, or a product with no approved draft behind it, is exactly the kind
   * of half-state the intake chain exists to prevent.
   */
  const approveDraft = async (request, response, match) => {
    if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.DRAFT_REVIEW))) return true;
    const admin = request.admin;

    const outcome = await withOwnedRow(
      admin,
      { sql: "select * from public.product_drafts where id = $1 for update", params: [match[1]] },
      async (client, draft) => {
        if (!isDraftTransitionAllowed(draft.state, DRAFT_STATES.APPROVED)) {
          return {
            status: 409,
            body: {
              error: "INVALID_STATE_TRANSITION",
              from: draft.state,
              to: DRAFT_STATES.APPROVED,
              allowed: allowedDraftTransitions(draft.state),
            },
          };
        }
        // The submitter may not approve. seller_admin does not hold
        // DRAFT_REVIEW at all, but a product_manager who submitted this draft
        // holds both - so the rule has to exist here too.
        if (!mayApproveDraft(admin.id, draft.submitted_by)) {
          return {
            status: 403,
            body: {
              error: "SELF_APPROVAL_FORBIDDEN",
              detail: "the admin who submitted a draft may not approve it",
            },
          };
        }

        const product = await client.query(
          `insert into public.catalog_products
             (owning_business_id, origin_draft_id, name, description, brand,
              category_id, pet_type, attributes, created_by)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           returning *`,
          [
            draft.business_id, draft.id, draft.name, draft.description, draft.brand,
            draft.category_id, draft.pet_type, draft.attributes,
            admin.id === "api-key" ? null : admin.id,
          ],
        );

        const { rows } = await client.query(
          `update public.product_drafts
              set state = 'APPROVED', approved_catalog_product_id = $2,
                  reviewed_by = $3, reviewed_at = clock_timestamp(),
                  updated_by = $3, updated_at = now()
            where id = $1 returning *`,
          [draft.id, product.rows[0].id, admin.id === "api-key" ? null : admin.id],
        );

        return {
          status: 201,
          body: { draft: rows[0], product: product.rows[0] },
          audit: {
            actionType: "product_draft.approved",
            entityType: "product_draft",
            entityId: draft.id,
            oldValues: { state: draft.state },
            newValues: { state: "APPROVED", catalog_product_id: product.rows[0].id },
          },
        };
      },
    );

    if (outcome.crossSeller) await auditCrossSellerAttempt(admin, "product_draft", match[1]);
    if (outcome.audit) await recordAdminAudit(admin, outcome.audit);
    sendJson(response, outcome.status, outcome.body);
    return true;
  };

  /** POST /api/admin/intake/drafts/:id/reject - a reason is required. */
  const rejectDraft = async (request, response, match) => {
    if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.DRAFT_REVIEW))) return true;
    const admin = request.admin;
    const body = await readBody(request);

    const reason = String(body?.review_note ?? "").trim();
    if (!reason) {
      sendError(response, 400, "review_note is required: a rejection without a reason is not a review");
      return true;
    }

    const outcome = await withOwnedRow(
      admin,
      { sql: "select * from public.product_drafts where id = $1 for update", params: [match[1]] },
      async (client, draft) => {
        if (!isDraftTransitionAllowed(draft.state, DRAFT_STATES.REJECTED)) {
          return {
            status: 409,
            body: {
              error: "INVALID_STATE_TRANSITION",
              from: draft.state,
              to: DRAFT_STATES.REJECTED,
              allowed: allowedDraftTransitions(draft.state),
            },
          };
        }
        const { rows } = await client.query(
          `update public.product_drafts
              set state = 'REJECTED', review_note = $2, reviewed_by = $3,
                  reviewed_at = clock_timestamp(), updated_by = $3, updated_at = now()
            where id = $1 returning *`,
          [draft.id, reason, admin.id === "api-key" ? null : admin.id],
        );
        return {
          status: 200,
          body: { draft: rows[0] },
          audit: {
            actionType: "product_draft.rejected",
            entityType: "product_draft",
            entityId: draft.id,
            oldValues: { state: draft.state },
            newValues: { state: "REJECTED" },
          },
        };
      },
    );

    if (outcome.crossSeller) await auditCrossSellerAttempt(admin, "product_draft", match[1]);
    if (outcome.audit) await recordAdminAudit(admin, outcome.audit);
    sendJson(response, outcome.status, outcome.body);
    return true;
  };

  /**
   * POST /api/admin/intake/products/:id/publish
   *
   * The gate is evaluated INSIDE the transaction that publishes, against rows
   * locked for the duration. Reading readiness and then publishing in a second
   * statement is a race: the last approved image can be archived in between,
   * and the product goes live without one.
   */
  const publishProduct = async (request, response, match) => {
    if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.PUBLICATION_PUBLISH))) return true;
    const admin = request.admin;

    const outcome = await withOwnedRow(
      admin,
      {
        sql: "select id, owning_business_id, publication_state from public.catalog_products where id = $1 for update",
        params: [match[1]],
        ownerColumn: "owning_business_id",
      },
      async (client, product) => {
        if (!isPublicationTransitionAllowed(product.publication_state, PUBLICATION_STATES.PUBLISHED)) {
          return {
            status: 409,
            body: {
              error: "INVALID_STATE_TRANSITION",
              from: product.publication_state,
              to: PUBLICATION_STATES.PUBLISHED,
            },
          };
        }

        const { rows: gate } = await client.query(READINESS_SQL, [product.id]);
        const report = readinessReport(gate[0]);
        if (!report.ready) {
          return { status: 409, body: { error: "PUBLICATION_GATE_FAILED", ...report } };
        }

        const { rows } = await client.query(
          `update public.catalog_products
              set publication_state = 'PUBLISHED', published_at = clock_timestamp(),
                  published_by = $2, unpublished_at = null, unpublished_reason = null,
                  updated_by = $2, updated_at = now()
            where id = $1 returning *`,
          [product.id, admin.id === "api-key" ? null : admin.id],
        );
        return {
          status: 200,
          body: { product: rows[0] },
          audit: {
            actionType: "catalog_product.published",
            entityType: "catalog_product",
            entityId: product.id,
            oldValues: { publication_state: product.publication_state },
            newValues: { publication_state: "PUBLISHED" },
          },
        };
      },
    );

    if (outcome.crossSeller) await auditCrossSellerAttempt(admin, "catalog_product", match[1]);
    if (outcome.audit) await recordAdminAudit(admin, outcome.audit);
    sendJson(response, outcome.status, outcome.body);
    return true;
  };

  /** POST /api/admin/intake/products/:id/unpublish - no gate; withdrawal is always allowed. */
  const unpublishProduct = async (request, response, match) => {
    if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.PUBLICATION_PUBLISH))) return true;
    const admin = request.admin;
    const body = await readBody(request);

    const outcome = await withOwnedRow(
      admin,
      {
        sql: "select id, owning_business_id, publication_state from public.catalog_products where id = $1 for update",
        params: [match[1]],
        ownerColumn: "owning_business_id",
      },
      async (client, product) => {
        if (!isPublicationTransitionAllowed(product.publication_state, PUBLICATION_STATES.UNPUBLISHED)) {
          return {
            status: 409,
            body: {
              error: "INVALID_STATE_TRANSITION",
              from: product.publication_state,
              to: PUBLICATION_STATES.UNPUBLISHED,
            },
          };
        }
        const { rows } = await client.query(
          `update public.catalog_products
              set publication_state = 'UNPUBLISHED', unpublished_at = clock_timestamp(),
                  unpublished_reason = $2, updated_by = $3, updated_at = now()
            where id = $1 returning *`,
          [product.id, body?.reason ?? null, admin.id === "api-key" ? null : admin.id],
        );
        return {
          status: 200,
          body: { product: rows[0] },
          audit: {
            actionType: "catalog_product.unpublished",
            entityType: "catalog_product",
            entityId: product.id,
            oldValues: { publication_state: product.publication_state },
            newValues: { publication_state: "UNPUBLISHED" },
          },
        };
      },
    );

    if (outcome.crossSeller) await auditCrossSellerAttempt(admin, "catalog_product", match[1]);
    if (outcome.audit) await recordAdminAudit(admin, outcome.audit);
    sendJson(response, outcome.status, outcome.body);
    return true;
  };

  const table = [
    [route("GET", "/api/admin/intake/drafts"), listDrafts],
    [route("GET", `/api/admin/intake/drafts/${UUID}`), getDraft],
    [route("PATCH", `/api/admin/intake/drafts/${UUID}`), updateDraft],
    [route("POST", `/api/admin/intake/products/${UUID}/variants`), createVariant],
    [route("PATCH", `/api/admin/intake/variants/${UUID}`), updateVariant],
    [route("POST", `/api/admin/intake/variants/${UUID}/offers`), createOffer],
    [route("PATCH", `/api/admin/intake/offers/${UUID}`), updateOffer],
    [route("GET", `/api/admin/intake/offers/${UUID}/inventory`), readInventory],
    [route("PUT", `/api/admin/intake/offers/${UUID}/inventory`), updateInventory],
    [route("POST", `/api/admin/intake/products/${UUID}/media`), adoptMedia],
    [route("POST", `/api/admin/intake/media/${UUID}/approve`), approveMedia],
    [route("GET", `/api/admin/intake/products/${UUID}/publication-readiness`), publicationReadiness],
    [route("POST", "/api/admin/intake/imports"), createImport],
    [route("POST", "/api/admin/intake/drafts"), createDraft],
    [route("POST", `/api/admin/intake/drafts/${UUID}/submit`), submitDraft],
    [route("POST", `/api/admin/intake/drafts/${UUID}/approve`), approveDraft],
    [route("POST", `/api/admin/intake/drafts/${UUID}/reject`), rejectDraft],
    [route("POST", `/api/admin/intake/products/${UUID}/publish`), publishProduct],
    [route("POST", `/api/admin/intake/products/${UUID}/unpublish`), unpublishProduct],
  ];

  /** Returns true when the request was handled. */
  return async (request, response, url) => {
    if (!url.pathname.startsWith("/api/admin/intake/")) return false;
    for (const [{ method, pattern }, handler] of table) {
      if (request.method !== method) continue;
      const match = url.pathname.match(pattern);
      if (match) return await handler(request, response, match, url);
    }
    return false;
  };
};
