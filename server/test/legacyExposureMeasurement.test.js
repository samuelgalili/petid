// G-7 · legacy catalogue exposure measurement.
//
// The measurement exists to make a decision possible, so the dangerous failure
// is not a wrong count - it is a confident one. Two things are tested harder
// than the arithmetic:
//
//   1. that nothing is written, anywhere, by anything the report touches;
//   2. that the questions which cannot be answered come back marked
//      UNRECONSTRUCTIBLE rather than answered plausibly.
//
// Counts are exercised against a real PostgreSQL with known fixtures, so the
// assertions are about arithmetic on data this file created - never about how
// much legacy exposure exists anywhere. These are not exposure figures.

import assert from "node:assert/strict";
import test from "node:test";

import { MEASURABILITY, measureLegacyExposure } from "../src/legacyExposureMeasurement.js";

const DATABASE_URL = process.env.DATABASE_URL;
const dbTest = (name, fn) => test(name, { skip: DATABASE_URL ? false : "DATABASE_URL not set" }, fn);

const pgPool = async () => {
  const { default: pg } = await import("pg");
  return new pg.Pool({ connectionString: DATABASE_URL, ssl: false });
};

// Every table the measurement reads. Used to prove it writes to none of them.
const TOUCHED_TABLES = [
  "business_products",
  "scraped_products",
  "order_items",
  "orders",
  "business_profiles",
  "admin_audit_log",
];

const snapshotTables = async (client) => {
  const snapshot = {};
  for (const table of TOUCHED_TABLES) {
    // Row count plus a checksum over the whole table: a mutation that kept the
    // row count identical would still move the checksum.
    const result = await client.query(
      `select count(*) as rows, coalesce(md5(string_agg(t::text, '|' order by t::text)), 'empty') as digest
         from public.${table} t`,
    );
    snapshot[table] = { rows: Number(result.rows[0].rows), digest: result.rows[0].digest };
  }
  return snapshot;
};

/**
 * Runs the body inside a transaction that is always rolled back, so fixtures
 * never survive and the surrounding database is left exactly as found.
 */
const withFixture = async (fn) => {
  const pool = await pgPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    return await fn({ client, pool });
  } finally {
    await client.query("rollback").catch(() => {});
    client.release();
    await pool.end();
  }
};

// The measurement takes anything with .query. In the server it is handed the
// pool, which runs its queries concurrently; here it is handed one transaction
// client so the fixtures stay invisible to everything else. A pg Client cannot
// run two queries at once, so this adapter serialises them - without it, pg
// warns that concurrent use is deprecated.
const serialised = (client) => {
  let chain = Promise.resolve();
  return {
    query: (...args) => {
      chain = chain.then(() => client.query(...args), () => client.query(...args));
      return chain;
    },
  };
};

const measure = (client) => measureLegacyExposure(serialised(client), { environmentLabel: "test" });

const seedSeller = (client, name = "Exposure Seller", verified = true) => client.query(
  `insert into public.business_profiles (business_name, business_type, is_verified)
   values ($1, 'shop', $2) returning id`,
  [name, verified],
).then((r) => r.rows[0].id);

const seedProduct = (client, seller, overrides = {}) => {
  const {
    name = "Exposure Product", price = 10, inStock = true,
    sourceUrl = null, flavors = null, supplierId = null, category = null,
  } = overrides;
  return client.query(
    `insert into public.business_products
       (business_id, name, price, in_stock, source_url, flavors, supplier_id, category)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
    [seller, name, price, inStock, sourceUrl, flavors, supplierId, category],
  ).then((r) => r.rows[0].id);
};

// ─── the shape, and the things it refuses to answer ──────────────────────────

dbTest("the report never declares itself production-validated", async () => {
  await withFixture(async ({ client }) => {
    const report = await measure(client);
    assert.equal(report.scope.read_only, true);
    assert.equal(report.scope.production_validated, false,
      "nothing in the process may certify which database answered");
    assert.ok(report.scope.warning.includes("not production figures"));
  });
});

dbTest("the legacy creation path is reported as unreconstructible, never estimated", async () => {
  await withFixture(async ({ client }) => {
    const report = await measure(client);
    assert.equal(report.population.created_through_legacy_path.status, MEASURABILITY.UNRECONSTRUCTIBLE);
    assert.equal(Object.hasOwn(report.population.created_through_legacy_path, "count"), false,
      "an unreconstructible question must not carry a number");
  });
});

dbTest("defaultBusinessId assignment cannot be reconstructed without explicit evidence", async () => {
  await withFixture(async ({ client }) => {
    const seller = await seedSeller(client);
    await seedProduct(client, seller);
    const report = await measure(client);

    assert.equal(report.population.default_business_id_assignment.status, MEASURABILITY.UNRECONSTRUCTIBLE);
    assert.equal(Object.hasOwn(report.population.default_business_id_assignment, "count"), false);
    // The per-business breakdown may still count rows - it just must not be
    // presented as evidence of how the id got there.
    assert.match(report.breakdowns.by_business_id.note, /not a finding about who owns it/i);
  });
});

dbTest("ownership provenance is unreconstructible while content provenance is measured", async () => {
  await withFixture(async ({ client }) => {
    // Deltas, not absolutes: the database this runs against already holds rows,
    // and asserting on totals would be asserting on somebody else's data.
    const before = await measure(client);
    const seller = await seedSeller(client);
    await seedProduct(client, seller, { sourceUrl: "https://supplier.example.com/p/1" });
    await seedProduct(client, seller, { name: "No provenance" });
    await seedProduct(client, seller, { name: "Unparseable", sourceUrl: "not-a-url" });
    const after = await measure(client);

    assert.equal(after.provenance.ownership_provenance.status, MEASURABILITY.UNRECONSTRUCTIBLE);
    assert.equal(after.provenance.content_provenance.status, MEASURABILITY.MEASURED);

    const delta = (key) => after.provenance.content_provenance[key] - before.provenance.content_provenance[key];
    assert.equal(delta("available"), 2, "both non-empty source_urls count as available");
    assert.equal(delta("missing"), 1);
    assert.equal(delta("ambiguous"), 1, "a present but unparseable source_url is ambiguous");
  });
});

dbTest("cart exposure is unmeasurable server-side", async () => {
  await withFixture(async ({ client }) => {
    const report = await measure(client);
    assert.equal(report.cart_exposure.status, MEASURABILITY.UNMEASURABLE_SERVER_SIDE);
    assert.match(report.cart_exposure.reason, /localStorage/);
    assert.equal(Object.hasOwn(report.cart_exposure, "count"), false);
  });
});

dbTest("the blocked questions list names production access as the reason numbers are not production", async () => {
  await withFixture(async ({ client }) => {
    const report = await measure(client);
    assert.ok(report.blocked_questions.length >= 5);
    assert.ok(
      report.blocked_questions.some((q) => /production access/i.test(q.reason)),
      "the report must say plainly that these are not production figures",
    );
  });
});

// ─── counts, over fixtures this test created ─────────────────────────────────

dbTest("discovery records are counted separately from commercial listings and never summed", async () => {
  await withFixture(async ({ client }) => {
    const before = await measure(client);
    const seller = await seedSeller(client);
    await seedProduct(client, seller);
    const after = await measure(client);

    assert.equal(
      after.population.commercial_listings.total - before.population.commercial_listings.total, 1,
    );
    assert.equal(
      after.population.discovery_records.total - before.population.discovery_records.total, 0,
      "a commercial listing must not land in the discovery count",
    );
    assert.equal(Object.hasOwn(after.population, "total"), false,
      "the two populations must never be presented as one total");
  });
});

dbTest("the variant-price exposure counts multi-variant listings as an upper bound", async () => {
  await withFixture(async ({ client }) => {
    const before = await measure(client);
    const seller = await seedSeller(client);
    await seedProduct(client, seller, { name: "Two variants", flavors: ["3kg - ₪99", "5kg - ₪149"] });
    await seedProduct(client, seller, { name: "One variant", flavors: ["3kg"] });
    await seedProduct(client, seller, { name: "No variants" });
    const after = await measure(client);

    const delta = (key) => after.purchase_exposure.variant_data[key] - before.purchase_exposure.variant_data[key];
    assert.equal(delta("multi_variant"), 1);
    assert.equal(delta("single_variant"), 1);
    assert.equal(delta("no_variant_data"), 1);
    assert.equal(
      after.purchase_exposure.exposed_to_variant_price_bug.count,
      after.purchase_exposure.variant_data.multi_variant,
    );
    assert.match(after.purchase_exposure.exposed_to_variant_price_bug.reason, /upper bound/i);
  });
});

dbTest("order snapshots stay independent, and a dangling id is reported as expected, not as a fault", async () => {
  await withFixture(async ({ client }) => {
    const order = (await client.query(
      `insert into public.orders (order_number, customer_name, customer_email, subtotal, total)
       values ('EXPOSURE-1', 'Buyer', 'buyer@example.com', 10, 10) returning id`,
    )).rows[0].id;
    // A product id that is deliberately not in either catalogue table.
    await client.query(
      `insert into public.order_items (order_id, product_id, product_source, product_name, quantity, price)
       values ($1, '99999999-9999-4999-8999-999999999999', 'scraped', 'Gone Product', 1, 10)`,
      [order],
    );

    const report = await measure(client);
    assert.equal(report.order_exposure.snapshot_independence.holds, true);
    assert.ok(report.order_exposure.items_whose_catalogue_row_is_gone.count >= 1);
    assert.match(report.order_exposure.items_whose_catalogue_row_is_gone.note, /expected, correct state/i);
    assert.ok(
      report.order_exposure.items_by_product_source.breakdown.some((row) => row.product_source === "scraped"),
    );
  });
});

dbTest("ownership review counts use deterministic latest-event selection and count reopenings", async () => {
  await withFixture(async ({ client }) => {
    const seller = await seedSeller(client);
    const product = await seedProduct(client, seller);
    const event = (from, to) => client.query(
      `insert into public.admin_audit_log
         (action_type, entity_type, entity_id, old_values, new_values, actor_email, actor_role, created_at)
       values ($1, 'product_ownership_review', $2, $3::jsonb, $4::jsonb, 'r@mipo.pet', 'admin', clock_timestamp())`,
      [`product_ownership.${to}`, product, JSON.stringify({ state: from }), JSON.stringify({ state: to })],
    );

    await event("unresolved", "ownership_review");
    await event("ownership_review", "verified_mipo_shop");
    await event("verified_mipo_shop", "ownership_review");   // the reopening
    await event("ownership_review", "rejected");

    const report = await measure(client);
    assert.equal(report.ownership_review.by_latest_state.rejected, 1, "the newest event decides the state");
    assert.equal(report.ownership_review.by_latest_state.verified_mipo_shop, 0,
      "a superseded decision must not still be counted as current");
    assert.equal(report.ownership_review.products_reopened_after_a_decision, 1);
    assert.equal(report.ownership_review.total_review_events, 4);
    assert.equal(report.ownership_review.products_with_any_review_event, 1);
    assert.equal(report.ownership_review.products_with_multiple_review_events, 3);
    assert.match(report.ownership_review.note, /not a reassignment/i);
  });
});

dbTest("publication breakdown is unreconstructible, because no such column exists", async () => {
  await withFixture(async ({ client }) => {
    const report = await measure(client);
    assert.equal(report.breakdowns.by_publication_state.status, MEASURABILITY.UNRECONSTRUCTIBLE);
    assert.match(report.breakdowns.by_publication_state.reason, /No publication.*column exists/i);
  });
});

dbTest("an empty catalogue returns a valid zero-count report rather than failing", async () => {
  await withFixture(async ({ client }) => {
    // Order matters: order_items references orders, products reference profiles.
    await client.query("delete from public.order_items");
    await client.query("delete from public.orders");
    await client.query("delete from public.business_products");
    await client.query("delete from public.scraped_products");
    await client.query("delete from public.admin_audit_log");

    const report = await measure(client);
    assert.equal(report.population.commercial_listings.total, 0);
    assert.equal(report.population.discovery_records.total, 0);
    assert.equal(report.public_exposure.returned_by_public_listing.total_rows_served, 0);
    assert.equal(report.ownership_review.total_review_events, 0);
    assert.equal(report.ownership_review.products_with_no_review_event, 0);
    assert.equal(report.order_exposure.items_by_product_source.breakdown.length, 0);
    assert.deepEqual(report.ownership_review.by_latest_state, {
      unresolved: 0, ownership_review: 0, verified_mipo_shop: 0, verified_external_seller: 0, rejected: 0,
    });
  });
});

// ─── the central guarantee: it writes nothing ────────────────────────────────

dbTest("the whole measurement writes nothing to any table it reads", async () => {
  await withFixture(async ({ client }) => {
    // Give it something to measure, so the queries do real work.
    const seller = await seedSeller(client);
    const product = await seedProduct(client, seller, {
      sourceUrl: "https://supplier.example.com/p/1?token=secret",
      flavors: ["3kg - ₪99", "5kg - ₪149"],
      supplierId: null,
      category: "food",
    });
    const order = (await client.query(
      `insert into public.orders (order_number, customer_name, customer_email, subtotal, total)
       values ('EXPOSURE-2', 'Buyer', 'buyer@example.com', 10, 10) returning id`,
    )).rows[0].id;
    await client.query(
      `insert into public.order_items (order_id, product_id, product_source, product_name, quantity, price)
       values ($1, $2, 'manual', 'Exposure Product', 1, 10)`,
      [order, product],
    );

    const before = await snapshotTables(client);
    await measure(client);
    await measure(client); // twice: a write that only happens once would still show
    const after = await snapshotTables(client);

    assert.deepEqual(after, before, "the measurement must leave every table byte-identical");
  });
});

dbTest("the measurement changes no business_id, supplier_id, product row or order item", async () => {
  await withFixture(async ({ client }) => {
    const seller = await seedSeller(client);
    const otherSeller = await seedSeller(client, "Other Seller");
    const product = await seedProduct(client, seller, { supplierId: otherSeller });
    const order = (await client.query(
      `insert into public.orders (order_number, customer_name, customer_email, subtotal, total)
       values ('EXPOSURE-3', 'Buyer', 'buyer@example.com', 10, 10) returning id`,
    )).rows[0].id;
    await client.query(
      `insert into public.order_items (order_id, product_id, product_source, product_name, quantity, price)
       values ($1, $2, 'manual', 'Exposure Product', 2, 10)`,
      [order, product],
    );

    const productBefore = (await client.query(
      "select business_id, supplier_id, name, price, in_stock, updated_at from public.business_products where id = $1",
      [product],
    )).rows[0];
    const itemsBefore = (await client.query(
      "select product_id, product_name, price, quantity, product_source from public.order_items where order_id = $1",
      [order],
    )).rows;

    await measure(client);

    const productAfter = (await client.query(
      "select business_id, supplier_id, name, price, in_stock, updated_at from public.business_products where id = $1",
      [product],
    )).rows[0];
    const itemsAfter = (await client.query(
      "select product_id, product_name, price, quantity, product_source from public.order_items where order_id = $1",
      [order],
    )).rows;

    assert.deepEqual(productAfter, productBefore, "product row must be untouched");
    assert.equal(productAfter.business_id, seller, "business_id must be unchanged");
    assert.equal(productAfter.supplier_id, otherSeller, "supplier_id must be unchanged");
    assert.deepEqual(itemsAfter, itemsBefore, "order items must be untouched");
  });
});

dbTest("the measurement writes no audit row for reading it", async () => {
  await withFixture(async ({ client }) => {
    const before = Number((await client.query("select count(*) as c from public.admin_audit_log")).rows[0].c);
    await measure(client);
    const after = Number((await client.query("select count(*) as c from public.admin_audit_log")).rows[0].c);
    assert.equal(after, before, "a read must not append to the audit log");
  });
});

dbTest("no source URL, query parameter or product content reaches the response", async () => {
  await withFixture(async ({ client }) => {
    const seller = await seedSeller(client);
    await seedProduct(client, seller, {
      name: "Very Secret Product Name",
      sourceUrl: "https://supplier.example.com/secret/path?token=abc123&affiliate=xyz",
      category: "food",
    });

    const serialized = JSON.stringify(await measure(client));
    assert.doesNotMatch(serialized, /abc123|affiliate|xyz/i, "no query parameters");
    assert.doesNotMatch(serialized, /secret\/path/i, "no URL paths");
    assert.doesNotMatch(serialized, /Very Secret Product Name/, "no product names");
    assert.doesNotMatch(serialized, /supplier\.example\.com/, "not even a source host");
    assert.doesNotMatch(serialized, /buyer@example\.com/, "no customer data");
  });
});

dbTest("a failing measurement writes nothing and surfaces the error", async () => {
  await withFixture(async ({ client }) => {
    const before = await snapshotTables(client);
    // A pool-like object whose second query fails part-way through the report.
    let calls = 0;
    const queue = serialised(client);
    const failing = {
      query: (...args) => {
        calls += 1;
        if (calls > 2) return Promise.reject(new Error("measurement query failed"));
        return queue.query(...args);
      },
    };
    await assert.rejects(() => measureLegacyExposure(failing), /measurement query failed/);
    assert.deepEqual(await snapshotTables(client), before,
      "a partial failure must leave no trace, because nothing was ever written");
  });
});
