// Phase 7 · the invariants that must hold over any auto-approved legacy draft.
//
// autoApproval.test.js covers the rule. This covers what the script is allowed
// to do with it, stated as properties of the resulting rows rather than as a
// replay of one run - so they hold however many times it has been run, with
// whatever --limit, by whichever administrator.
//
// The one that matters most is the last: approving 42 drafts produced 42
// products that cannot be published. That is not a defect, it is the division
// of labour the gate enforces - but it is also the reason "the review queue is
// clear" must never be reported as "the shop is full".

import assert from "node:assert/strict";
import test from "node:test";

const DATABASE_URL = process.env.DATABASE_URL;
const dbTest = (name, fn) => test(name, { skip: DATABASE_URL ? false : "DATABASE_URL not set" }, fn);

const withDb = async (fn) => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: false });
  const client = await pool.connect();
  try {
    await client.query("begin");
    await fn(client);
  } finally {
    await client.query("rollback").catch(() => {});
    client.release();
    await pool.end();
  }
};

/** Legacy drafts that reached APPROVED, whoever approved them. */
const APPROVED_LEGACY = `
  from public.product_drafts d
  join public.raw_import_records r on r.id = d.raw_import_record_id
 where r.source_system = 'legacy_business_products' and d.state = 'APPROVED'`;

dbTest("no legacy draft was approved by the actor that submitted it", async () => {
  // The guard the whole design of the script bends around. Two system actors
  // would have satisfied the code and defeated the rule.
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select count(*)::int as n ${APPROVED_LEGACY} and d.reviewed_by = d.submitted_by`,
    );
    assert.equal(rows[0].n, 0, "a reviewer approving their own submission is not a review");
  });
});

dbTest("every approved legacy draft names a real, active reviewer", async () => {
  await withDb(async (client) => {
    const { rows: checked } = await client.query(
      `select count(*)::int as total,
              count(*) filter (where u.id is null)::int as no_reviewer,
              count(*) filter (where u.is_active is not true)::int as inactive_reviewer,
              count(*) filter (where u.role not in ('admin','product_manager'))::int as cannot_review
         from public.product_drafts d
         join public.raw_import_records r on r.id = d.raw_import_record_id
         left join public.admin_users u on u.id = d.reviewed_by
        where r.source_system = 'legacy_business_products' and d.state = 'APPROVED'`,
    );
    assert.equal(checked[0].no_reviewer, 0, "an approval with no reviewer is unattributable");
    assert.equal(checked[0].inactive_reviewer, 0,
      "an inactive account cannot be accountable for a review");
    assert.equal(checked[0].cannot_review, 0,
      "only admin and product_manager hold DRAFT_REVIEW");
  });
});

dbTest("every approved legacy draft carries the submitted_by the guard needs", async () => {
  // mayApproveDraft fails closed on a null submitter. A draft that reached
  // APPROVED without one means the guard was never evaluated.
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select count(*)::int as n ${APPROVED_LEGACY} and d.submitted_by is null`,
    );
    assert.equal(rows[0].n, 0);
  });
});

dbTest("a bulk approval is as visible in the audit log as a hand-made one", async () => {
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select count(*)::int as approved,
              count(*) filter (where a.id is not null)::int as audited
         from public.product_drafts d
         join public.raw_import_records r on r.id = d.raw_import_record_id
         left join public.admin_audit_log a
           on a.entity_id = d.id::text and a.action_type = 'product_draft.approved'
        where r.source_system = 'legacy_business_products' and d.state = 'APPROVED'`,
    );
    assert.equal(rows[0].audited, rows[0].approved,
      "187 approvals that leave no trace are 187 decisions nobody can review later");
    // A broken join made this pass by comparing 0 to 0 once already - the
    // entity_id column is text and the draft id is uuid, so an uncast join
    // matched nothing. Asserting the count is non-zero is what makes the
    // equality above mean something.
    if (rows[0].approved > 0) assert.ok(rows[0].audited > 0);
  });
});

dbTest("the audit row says the rule did it, not that a human read the product", async () => {
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select count(*)::int as n from public.admin_audit_log
        where action_type = 'product_draft.approved'
          and new_values ->> 'via' = 'auto_approval_rule'`,
    );
    const { rows: approved } = await client.query(`select count(*)::int as n ${APPROVED_LEGACY}`);
    if (approved[0].n > 0) {
      assert.ok(rows[0].n > 0,
        "an auto-approval indistinguishable from a human review is a lie by omission");
      // And it records which variant of the rule was applied, because
      // --ignore-review-flags changes what was accepted.
      const { rows: flags } = await client.query(
        `select count(*)::int as n from public.admin_audit_log
          where action_type = 'product_draft.approved'
            and new_values ? 'honour_review_flags'`,
      );
      assert.equal(flags[0].n, rows[0].n);
    }
  });
});

dbTest("nothing auto-approved is published, and none of it could be", async () => {
  // The finding this phase turns on. Auto-approval creates an UNPUBLISHED
  // catalog_product and nothing else; the gate wants an active variant, a
  // priced offer, availability and an approved image. So clearing the review
  // queue does not put a single product in the shop.
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select count(*)::int as products,
              count(*) filter (where p.publication_state <> 'UNPUBLISHED')::int as published,
              count(*) filter (where v.n > 0)::int as with_variant,
              count(*) filter (where o.n > 0)::int as with_priced_offer,
              count(*) filter (where m.n > 0)::int as with_approved_image
         from public.catalog_products p
         join public.product_drafts d on d.id = p.origin_draft_id
         join public.raw_import_records r on r.id = d.raw_import_record_id
         cross join lateral (select count(*) n from public.product_variants v
                              where v.catalog_product_id = p.id
                                and v.status = 'ACTIVE' and v.archived_at is null) v
         cross join lateral (select count(*) n from public.product_variants v2
                              join public.seller_offers o on o.product_variant_id = v2.id
                             where v2.catalog_product_id = p.id
                               and o.status = 'ACTIVE' and o.price > 0) o
         cross join lateral (select count(*) n from public.product_media m
                             where m.catalog_product_id = p.id
                               and m.approved_at is not null) m
        where r.source_system = 'legacy_business_products'`,
    );
    // Trying to falsify this by force - UPDATE ... set publication_state =
    // 'PUBLISHED' - could not even be staged: the schema's
    // catalog_products_published_has_provenance check refuses a published row
    // with no provenance. The assertion below is therefore backed by a
    // constraint rather than by this script's good behaviour, which is the
    // strongest answer available.
    assert.equal(rows[0].published, 0, "approval must never publish");
    if (rows[0].products > 0) {
      assert.equal(rows[0].with_variant, 0,
        "approval creates no variant - so no_active_variant holds and the shop stays unchanged");
      assert.equal(rows[0].with_priced_offer, 0);
      assert.equal(rows[0].with_approved_image, 0);
    }
  });
});

dbTest("a held-back draft is still IMPORTED and still has no product", async () => {
  // The other half: the script must not half-move a draft it declined. A draft
  // sitting in DRAFT or IN_REVIEW with nobody coming to review it is worse
  // than one still in the import queue, because it looks handled.
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select count(*)::int as n
         from public.product_drafts d
         join public.raw_import_records r on r.id = d.raw_import_record_id
        where r.source_system = 'legacy_business_products'
          and d.state in ('DRAFT', 'IN_REVIEW')`,
    );
    assert.equal(rows[0].n, 0,
      "a declined draft must be left where a human will find it, not parked mid-transition");
  });
});
