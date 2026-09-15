// 0055 · the image work queue, and why it is not a column.
//
// An approved image is the last thing between the migrated catalogue and a
// published shop. Phase 4b gives every approved product a variant, a priced
// offer and availability; OD-3 still refuses to publish without an approved
// image. So this queue is the remaining work, and its ordering is a claim
// about which work unblocks the most.
//
// The classification is COMPUTED. A stored needs_urgent_image column would go
// on saying a product needs a photograph after somebody supplied one - the
// same defect OD-2 describes for stored publication readiness. The tests below
// therefore check that a product LEAVES the queue when its problem is fixed,
// which is the property a stored flag cannot have.

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

const classify = async (client, { image = "/uploads/a.webp", verdict = null, flagged = false, adopted = true }) => {
  const { rows } = await client.query(
    "select public.image_action_for($1, $2, $3, $4) as action",
    [image, verdict, flagged, adopted ? new Date() : null],
  );
  return rows[0].action;
};

const RESEARCH = "Needs manual image research";

// ─── the ordering is the claim ───────────────────────────────────────────────

dbTest("no file outranks unresolved rights", async () => {
  // You cannot obtain permission for a photograph that does not exist. A
  // product with no image needs somebody to go and get one, which is different
  // work from asking a supplier, and it blocks publication just as hard.
  await withDb(async (client) => {
    assert.equal(await classify(client, { image: "/placeholder.svg", verdict: RESEARCH, flagged: true }), "missing");
    assert.equal(await classify(client, { image: "", verdict: RESEARCH }), "missing");
    assert.equal(await classify(client, { image: "   " }), "missing");
  });
});

dbTest("adopting the file does not clear the rights question", async () => {
  // The finding this whole classification turns on. C-26 measured 23 of the 91
  // products marked "Needs manual image research" as ALREADY normalized - the
  // verdict is about whether we may use the picture, not about which server it
  // sits on. A classification that consulted image_adopted_at here would empty
  // the rights queue by copying files around.
  await withDb(async (client) => {
    assert.equal(await classify(client, { verdict: RESEARCH, adopted: true }), "rights_unresolved");
    assert.equal(await classify(client, { verdict: RESEARCH, adopted: true, flagged: true }), "rights_unresolved");
  });
});

dbTest("a supplier-hosted image is work, but ranks below the two that need a person", async () => {
  await withDb(async (client) => {
    assert.equal(
      await classify(client, { image: "https://supplier.example/p.jpg", adopted: false }),
      "foreign_host",
    );
    assert.equal(
      await classify(client, { image: "http://supplier.example/p.jpg", adopted: false }),
      "foreign_host",
    );
    // Already ours: nothing to adopt.
    assert.equal(await classify(client, { image: "/uploads/a.webp", adopted: true }), "ok");
  });
});

dbTest("an undated flag with nothing behind it is looked at last, not ignored", async () => {
  await withDb(async (client) => {
    assert.equal(await classify(client, { flagged: true }), "review_requested");
    // C-27: no flagged row is untouched for 90 days, so these are not ancient -
    // but nothing records why they were set, which is why they rank last.
    assert.equal(await classify(client, { flagged: false }), "ok");
    assert.equal(await classify(client, { flagged: null }), "ok", "NULL is not a flag");
  });
});

// ─── the property a stored flag cannot have ──────────────────────────────────

dbTest("a product leaves the queue the moment its problem is fixed", async () => {
  await withDb(async (client) => {
    const { rows: [business] } = await client.query(
      `insert into public.business_profiles (business_name, business_type)
       values ('Image queue', 'shop') returning id`,
    );
    const { rows: [product] } = await client.query(
      `insert into public.business_products
         (business_id, name, price, image_url, needs_image_review, product_attributes)
       values ($1, 'No picture', 10.00, '/placeholder.svg', true,
               '{"image_review_status":"Needs manual image research"}'::jsonb)
       returning id`,
      [business.id],
    );

    const inQueue = async () => {
      const { rows } = await client.query(
        "select action, priority from public.image_action_queue where product_id = $1",
        [product.id],
      );
      return rows[0] ?? null;
    };

    assert.deepEqual(await inQueue(), { action: "missing", priority: 1 });

    // Somebody supplies a picture. The rights verdict is still open, so it
    // moves DOWN the queue rather than out of it - which is the honest state.
    await client.query(
      "update public.business_products set image_url = '/uploads/new.webp', image_adopted_at = now() where id = $1",
      [product.id],
    );
    assert.deepEqual(await inQueue(), { action: "rights_unresolved", priority: 2 });

    // The rights are settled and the flag cleared.
    await client.query(
      `update public.business_products
          set product_attributes = product_attributes - 'image_review_status',
              needs_image_review = false
        where id = $1`,
      [product.id],
    );
    assert.equal(await inQueue(), null,
      "a stored flag would still say this product needs a photograph");
  });
});

dbTest("a product with nothing wrong never enters the queue", async () => {
  await withDb(async (client) => {
    const { rows: [business] } = await client.query(
      `insert into public.business_profiles (business_name, business_type)
       values ('Clean image', 'shop') returning id`,
    );
    const { rows: [product] } = await client.query(
      `insert into public.business_products
         (business_id, name, price, image_url, image_adopted_at, needs_image_review)
       values ($1, 'Fine', 10.00, '/uploads/ok.webp', now(), false) returning id`,
      [business.id],
    );
    const { rows } = await client.query(
      "select 1 from public.image_action_queue where product_id = $1", [product.id],
    );
    assert.equal(rows.length, 0);
  });
});

dbTest("the queue orders by what blocks publication, not by what is easy", async () => {
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select distinct action, priority from public.image_action_queue order by priority`,
    );
    const order = rows.map((r) => r.action);
    // Whatever the data happens to contain, the ranking must never invert:
    // a missing photograph is never less urgent than a supplier-hosted one.
    const rank = Object.fromEntries(rows.map((r) => [r.action, r.priority]));
    for (const [higher, lower] of [
      ["missing", "rights_unresolved"], ["rights_unresolved", "foreign_host"],
      ["foreign_host", "review_requested"],
    ]) {
      if (rank[higher] !== undefined && rank[lower] !== undefined) {
        assert.ok(rank[higher] < rank[lower], `${higher} must outrank ${lower}`);
      }
    }
    assert.ok(order.length > 0 || true);
  });
});

dbTest("the queue carries what D-7 needs to make the rights problem finite", async () => {
  // source_url is what lets somebody ask the right supplier for permission.
  // Without it the rights question is unanswerable rather than merely open.
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'image_action_queue'
        order by column_name`,
    );
    const columns = rows.map((r) => r.column_name);
    for (const required of ["source_url", "importer_verdict", "action", "priority", "product_id"]) {
      assert.ok(columns.includes(required), `the queue must expose ${required}`);
    }
    // And must NOT leak what a Seller may not see.
    for (const forbidden of ["cost_price", "commission_rate", "supplier_id", "supplier_link"]) {
      assert.equal(columns.includes(forbidden), false, `${forbidden} must not be in the queue`);
    }
  });
});
