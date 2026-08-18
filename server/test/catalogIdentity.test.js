import assert from "node:assert/strict";
import { test } from "node:test";
import { Pool } from "pg";

// These assertions run against a real database because they are about schema
// behaviour — updatable views, an INSTEAD OF trigger and a foreign key — none of
// which can be checked without PostgreSQL executing them.
//
// Point TEST_DATABASE_URL at a scratch database that has had every migration in
// server/sql applied, then run `npm test`. Without it the suite skips, so CI
// stays green on machines with no database.
const databaseUrl = process.env.TEST_DATABASE_URL;
const describe = databaseUrl ? test : test.skip;

const SEED_BUSINESS_ID = "cf941cc4-e1d1-4d7c-8122-a5df81a1e53c";

const withPool = async (run) => {
  const pool = new Pool({ connectionString: databaseUrl, ssl: false, max: 1 });
  try {
    return await run(pool);
  } finally {
    await pool.end();
  }
};

describe("business_products stays writable after the view swap", async () => {
  await withPool(async (pool) => {
    const sku = `TEST-${Date.now()}`;

    const inserted = await pool.query(
      `insert into public.business_products (business_id, name, price, image_url, category, sku)
       values ($1, 'בדיקת תאימות', 10, '/x.png', 'מזון', $2)
       returning id`,
      [SEED_BUSINESS_ID, sku],
    );
    assert.equal(inserted.rowCount, 1, "insert through the view should create a row");

    const productId = inserted.rows[0].id;
    const stored = await pool.query(
      "select source_kind, status from public.products where id = $1",
      [productId],
    );
    assert.equal(stored.rows[0].source_kind, "manual");
    assert.equal(stored.rows[0].status, "published");

    const updated = await pool.query(
      "update public.business_products set price = 20 where id = $1 returning price",
      [productId],
    );
    assert.equal(Number(updated.rows[0].price), 20, "update through the view should apply");

    await pool.query("delete from public.business_products where id = $1", [productId]);

    const afterDelete = await pool.query(
      "select status, deleted_at from public.products where id = $1",
      [productId],
    );
    assert.equal(afterDelete.rowCount, 1, "delete must archive the product, not remove it");
    assert.equal(afterDelete.rows[0].status, "archived");
    assert.notEqual(afterDelete.rows[0].deleted_at, null);

    const visible = await pool.query(
      "select 1 from public.business_products where id = $1",
      [productId],
    );
    assert.equal(visible.rowCount, 0, "an archived product must not stay visible to the shop");
  });
});

describe("order lines cannot point at a product that does not exist", async () => {
  await withPool(async (pool) => {
    const order = await pool.query("select id from public.orders limit 1");
    if (order.rowCount === 0) return;

    await assert.rejects(
      pool.query(
        `insert into public.order_items (order_id, product_id, product_name, quantity, price)
         values ($1, '00000000-0000-0000-0000-0000000000ff', 'bogus', 1, 1)`,
        [order.rows[0].id],
      ),
      /foreign key constraint/,
      "the foreign key added in 0017 should reject an unknown product",
    );
  });
});

describe("every order line joins to a product", async () => {
  await withPool(async (pool) => {
    const orphans = await pool.query(`
      select count(*)::int as count
      from public.order_items oi
      where oi.product_id is not null
        and not exists (select 1 from public.products p where p.id = oi.product_id)
    `);
    assert.equal(orphans.rows[0].count, 0, "purchase history must stay joinable to the catalog");
  });
});

describe("the checkout upsert still resolves to one customer", async () => {
  await withPool(async (pool) => {
    const email = `checkout-${Date.now()}@example.com`;

    // Exactly the statement createOrder runs.
    const upsert = `
      insert into public.shop_customers (email, full_name, phone, last_order_at)
      values ($1, $2, $3, now())
      on conflict (email) do update set
        full_name = excluded.full_name,
        phone = excluded.phone,
        last_order_at = now(),
        updated_at = now()
      returning id
    `;

    const first = await pool.query(upsert, [email, "קונה", "052-1111111"]);
    const second = await pool.query(upsert, [email, "קונה מעודכן", "052-2222222"]);

    assert.equal(
      first.rows[0].id,
      second.rows[0].id,
      "a returning customer must keep the id their earlier orders point at",
    );

    const rows = await pool.query("select full_name from public.customers where email = $1", [email]);
    assert.equal(rows.rowCount, 1, "one person is one row");
    assert.equal(rows.rows[0].full_name, "קונה מעודכן");

    await pool.query("delete from public.shop_customers where lower(email) = $1", [email]);
    const afterDelete = await pool.query("select 1 from public.customers where email = $1", [email]);
    assert.equal(afterDelete.rowCount, 0, "account deletion must still remove the customer");
  });
});

describe("no order points at a customer that is gone", async () => {
  await withPool(async (pool) => {
    const dangling = await pool.query(`
      select count(*)::int as count
      from public.orders o
      where o.customer_id is not null
        and not exists (select 1 from public.customers c where c.id = o.customer_id)
    `);
    assert.equal(dangling.rows[0].count, 0);
  });
});
