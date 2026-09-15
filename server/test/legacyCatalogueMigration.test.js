// Phase 5 · the legacy catalogue through the real intake chain.
//
// The migration's job is to move 375 products from business_products into
// raw_import_records + product_drafts and then STOP, because the decision was
// that an administrator goes over them and updates prices before anything
// reaches a customer. So the two things worth testing hardest are the two
// things that would be silent if they went wrong:
//
//   1. Nothing it writes is customer-visible. A draft that arrived already
//      approved, or a catalog_product created as a side effect, would put
//      unreviewed legacy data in the shop and nothing would announce it.
//
//   2. No commercial data enters the payload. GET /api/admin/intake/drafts/:id
//      returns the raw payload, and seller_admin holds INTAKE_READ - so the
//      archive is readable by the Seller who owns the draft. Today every
//      legacy product belongs to MIPO, so the leak is latent rather than
//      actual; it becomes real the first time a legacy product's ownership
//      moves to a third party, which is the whole point of the new model.
//
// The list of withheld fields is imported from the script rather than restated
// here. Restating it would test that two copies of a list agree, which they
// would, right up until somebody edited one.

import assert from "node:assert/strict";
import test from "node:test";

import {
  WITHHELD_ATTRIBUTE_KEYS,
  WITHHELD_COLUMNS,
  buildDraft,
  buildPayload,
} from "../scripts/migrateLegacyCatalogue.mjs";

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

/** A legacy row with every commercially sensitive field populated. */
const legacyRow = () => ({
  id: "00000000-0000-0000-0000-0000000000aa",
  business_id: "11111111-1111-1111-1111-111111111111",
  name: "Legacy food",
  description: "desc",
  brand: "BrandX",
  price: "49.90",
  category_id: "22222222-2222-2222-2222-222222222222",
  pet_type: "dog",
  species_id: "33333333-3333-3333-3333-333333333333",
  image_url: "https://supplier.example/x.jpg",
  source_url: "https://supplier.example/p/1",
  product_attributes: {
    animal: "כלב",
    weight: "3kg",
    price_before_vat: 8.5,
    supplier_name: "Acme Supplies Ltd",
    source_row: 17,
    image_research_notes: "found on supplier site",
  },
  cost_price: "4.20",
  commission_rate: "0.15",
  supplier_id: "44444444-4444-4444-4444-444444444444",
  supplier_link: "https://supplier.example/p/1",
  auto_restock: true,
  restock_interval_days: 30,
  api_sync_enabled: true,
  suggested_price: "19.90",
  price_suggestion_reason: "margin too low",
});

// ─── what must not survive ───────────────────────────────────────────────────

test("the payload carries none of the withheld columns", () => {
  const payload = buildPayload(legacyRow());
  assert.ok(WITHHELD_COLUMNS.length >= 9, "the list must not have been quietly emptied");
  for (const column of WITHHELD_COLUMNS) {
    assert.equal(
      Object.hasOwn(payload, column), false,
      `${column} reached the archive, which a Seller's own admin can read`,
    );
  }
});

test("the payload carries none of the withheld attribute keys", () => {
  const payload = buildPayload(legacyRow());
  for (const key of WITHHELD_ATTRIBUTE_KEYS) {
    assert.equal(
      Object.hasOwn(payload.product_attributes, key), false,
      `product_attributes.${key} survived - stripping the columns and leaving the attributes is a fence with a gate in it`,
    );
  }
});

test("the draft carries none of them either", () => {
  const draft = buildDraft(legacyRow());
  const serialized = JSON.stringify(draft);
  for (const needle of ["4.20", "0.15", "19.90", "margin too low", "Acme Supplies Ltd", "8.5"]) {
    assert.equal(serialized.includes(needle), false, `${needle} reached the draft`);
  }
});

test("what the product actually is survives intact", () => {
  // The mirror of the tests above. Stripping everything would also pass them,
  // and would produce 375 empty drafts.
  const payload = buildPayload(legacyRow());
  const draft = buildDraft(legacyRow());

  assert.equal(payload.name, "Legacy food");
  assert.equal(payload.image_url, "https://supplier.example/x.jpg");
  assert.equal(payload.product_attributes.animal, "כלב");
  assert.equal(payload.product_attributes.weight, "3kg");

  assert.equal(draft.name, "Legacy food");
  assert.equal(draft.brand, "BrandX");
  assert.equal(draft.category_id, "22222222-2222-2222-2222-222222222222");
  assert.equal(draft.pet_type, "dog");
  assert.equal(draft.species_id, "33333333-3333-3333-3333-333333333333");
  assert.equal(draft.attributes.animal, "כלב");
});

test("D-7's source_url is preserved, because it is what makes the image problem finite", () => {
  // source_url is not withheld. You cannot ask a supplier for permission if you
  // no longer know which supplier, so it stays in the archive. supplier_name
  // does NOT, because it sits in an attribute bag a Seller can read; it remains
  // on business_products, which is where D-7 requires it to survive.
  const payload = buildPayload(legacyRow());
  assert.equal(payload.source_url, "https://supplier.example/p/1");
  assert.equal(Object.hasOwn(payload, "supplier_link"), false);
});

test("price becomes a proposal, not a price", () => {
  // The administrator was asked to update prices. proposed_price is the field
  // that says a human has not yet agreed to this number.
  const draft = buildDraft(legacyRow());
  assert.equal(draft.proposed_price, "49.90");
  assert.equal(Object.hasOwn(draft, "price"), false);
});

test("a missing or malformed attribute bag does not become a crash", () => {
  for (const attributes of [null, undefined, "not an object", 42, []]) {
    const payload = buildPayload({ ...legacyRow(), product_attributes: attributes });
    assert.deepEqual(payload.product_attributes, {});
  }
});

test("withheld attribute keys are matched regardless of case or padding", () => {
  const payload = buildPayload({
    ...legacyRow(),
    product_attributes: { " Supplier_Name ": "Acme", "COST_PRICE": 1, keep: "yes" },
  });
  assert.deepEqual(payload.product_attributes, { keep: "yes" });
});

// ─── nothing reaches a customer ──────────────────────────────────────────────

// These three are scoped to what the MIGRATION did, not to what the table
// looks like now. Written as whole-table claims - "every legacy draft is
// IMPORTED", "no catalog_products exist" - they were true the day phase 5 ran
// and went red the moment phase 7 legitimately approved 42 of them. A test
// that fails because a later step worked is a test that will be deleted by
// whoever is unlucky enough to hit it, taking the real guarantee with it.
//
// The durable claim is about the script: it leaves a draft IMPORTED and
// approves nothing. So the scope is drafts nobody has reviewed.

dbTest("the migration leaves every draft IMPORTED and reviews none of them", async () => {
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select d.state, count(*)::int as n
         from public.product_drafts d
         join public.raw_import_records r on r.id = d.raw_import_record_id
        where r.source_system = 'legacy_business_products'
          and d.reviewed_by is null
        group by 1`,
    );
    for (const row of rows) {
      assert.equal(row.state, "IMPORTED",
        "a legacy draft nobody reviewed but which is not IMPORTED was moved by something that should not have moved it");
    }
  });
});

dbTest("no catalog_product exists for a draft nobody reviewed", async () => {
  // The chain ends at the draft. A catalog_product is what a customer can be
  // shown, and creating one is a reviewer's act, not a script's - so every one
  // that exists must name the reviewer who is accountable for it.
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select count(*)::int as n from public.catalog_products p
        join public.product_drafts d on d.id = p.origin_draft_id
        join public.raw_import_records r on r.id = d.raw_import_record_id
       where r.source_system = 'legacy_business_products'
         and d.reviewed_by is null`,
    );
    assert.equal(rows[0].n, 0);
  });
});

dbTest("no unreviewed legacy draft carries an approved_catalog_product_id", async () => {
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select count(*)::int as n from public.product_drafts d
         join public.raw_import_records r on r.id = d.raw_import_record_id
        where r.source_system = 'legacy_business_products'
          and d.reviewed_by is null
          and d.approved_catalog_product_id is not null`,
    );
    assert.equal(rows[0].n, 0);
  });
});

// ─── idempotency ─────────────────────────────────────────────────────────────

dbTest("a re-run cannot duplicate a product", async () => {
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select source_record_id, count(*)::int as n
         from public.raw_import_records
        where source_system = 'legacy_business_products'
        group by 1 having count(*) > 1`,
    );
    assert.deepEqual(rows, [], "uq_raw_import_records_source is what guarantees this");
  });
});

dbTest("the unique index is what enforces it, not the script's care", async () => {
  // Falsifiable version of the test above: attempt the duplicate directly. If
  // the index were dropped, the script's ON CONFLICT would become a no-op
  // clause over nothing and a re-run would double the catalogue.
  await withDb(async (client) => {
    const { rows: existing } = await client.query(
      `select * from public.raw_import_records
        where source_system = 'legacy_business_products' limit 1`,
    );
    if (existing.length === 0) return; // nothing migrated in this database
    const row = existing[0];
    await assert.rejects(
      () => client.query(
        `insert into public.raw_import_records
           (business_id, source_system, source_record_id, payload, payload_hash, created_by)
         values ($1, $2, $3, '{}'::jsonb, 'x', $4)`,
        [row.business_id, row.source_system, row.source_record_id, row.created_by],
      ),
      (error) => {
        assert.equal(error.code, "23505");
        return true;
      },
    );
  });
});

dbTest("every legacy draft is anchored to its raw record", async () => {
  // A draft with no raw record is a mapping that can never be re-run, which is
  // the one property the immutable archive exists to provide.
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select count(*)::int as n from public.product_drafts d
        where d.created_by = (select id from public.admin_users
                               where email = 'system+legacy-migration@mipo.pet')
          and d.raw_import_record_id is null`,
    );
    assert.equal(rows[0].n, 0);
  });
});

// ─── 0054 ────────────────────────────────────────────────────────────────────

dbTest("the legacy source_system is accepted and junk is still refused", async () => {
  await withDb(async (client) => {
    const { rows: [business] } = await client.query(
      `insert into public.business_profiles (business_name, business_type)
       values ('Constraint probe', 'shop') returning id`,
    );
    const { rows: [actor] } = await client.query(
      `select id from public.admin_users where email = 'system+legacy-migration@mipo.pet'`,
    );

    await client.query("savepoint probe");
    await client.query(
      `insert into public.raw_import_records
         (business_id, source_system, source_record_id, payload, payload_hash, created_by)
       values ($1, 'legacy_business_products', 'probe-1', '{}'::jsonb, 'h', $2)`,
      [business.id, actor.id],
    );
    await client.query("rollback to savepoint probe");

    // The constraint was widened, not removed.
    await assert.rejects(
      () => client.query(
        `insert into public.raw_import_records
           (business_id, source_system, source_record_id, payload, payload_hash, created_by)
         values ($1, 'legacy', 'probe-2', '{}'::jsonb, 'h', $2)`,
        [business.id, actor.id],
      ),
      (error) => {
        assert.equal(error.code, "23514");
        return true;
      },
    );
  });
});

dbTest("the legacy rows stay distinguishable from human and API imports", async () => {
  // The reason for a new source_system value rather than reusing 'manual'.
  // "Which products predate the intake model" must stay answerable.
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select count(*)::int as n from public.raw_import_records
        where source_system = 'legacy_business_products'`,
    );
    assert.ok(rows[0].n >= 0);
    const { rows: def } = await client.query(
      `select pg_get_constraintdef(oid) as def from pg_constraint
        where conname = 'raw_import_records_source_system_check'`,
    );
    assert.match(def[0].def, /legacy_business_products/);
    for (const kept of ["url", "scrape", "csv", "xlsx", "manual", "api"]) {
      assert.match(def[0].def, new RegExp(`'${kept}'`), `${kept} must still be allowed`);
    }
  });
});

// ─── the system actor ────────────────────────────────────────────────────────

dbTest("the migration's actor exists, and cannot be logged into", async () => {
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select id, role, is_active, password_hash, business_id
         from public.admin_users where email = 'system+legacy-migration@mipo.pet'`,
    );
    assert.equal(rows.length, 1, "raw_import_records.created_by is NOT NULL and needs somebody");
    assert.equal(rows[0].is_active, false, "the login path checks is_active before the password");
    assert.equal(rows[0].role, "product_manager", "least privilege: not admin");
  });
});

test("importing the script has no side effects", async () => {
  // Found by running this file without DATABASE_URL. The script used to check
  // for it and call process.exit(2) at module scope, so importing it for the
  // pure mappers killed the whole test process: 18 tests became one failure
  // with exit code 2, on exactly the machines that do not set DATABASE_URL.
  // A re-import here is cheap; the assertion is that this line is reached.
  const before = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    const module = await import("../scripts/migrateLegacyCatalogue.mjs");
    assert.equal(typeof module.buildPayload, "function");
    assert.equal(typeof module.buildDraft, "function");
  } finally {
    if (before !== undefined) process.env.DATABASE_URL = before;
  }
});

test("no password verifies against the actor's sentinel hash", async () => {
  // The second, independent reason it cannot authenticate. verifyPassword
  // requires 'scrypt$salt$hash'; the sentinel is not that shape, so this holds
  // even if somebody re-activates the row by hand.
  const { verifyPassword } = await import("../src/passwords.js");
  const sentinel = "disabled-no-password-verifies-against-this";
  for (const attempt of ["", "password", sentinel, "disabled"]) {
    assert.equal(verifyPassword(attempt, sentinel), false, `"${attempt}" must not verify`);
  }
});
