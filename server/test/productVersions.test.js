import assert from "node:assert/strict";
import { test } from "node:test";
import { Pool } from "pg";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describe = databaseUrl ? test : test.skip;

const withPool = async (run) => {
  const pool = new Pool({ connectionString: databaseUrl, ssl: false, max: 1 });
  try {
    return await run(pool);
  } finally {
    await pool.end();
  }
};

const createProduct = async (pool, name = "מוצר לבדיקת גרסאות") => {
  const result = await pool.query(
    `insert into public.products (source_kind, status, name, price, image_url, sku)
     values ('manual', 'published', $1, 100, '/x.png', $2)
     returning id`,
    [name, `VER-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`],
  );
  return result.rows[0].id;
};

describe("a product is versioned from the moment it exists", async () => {
  await withPool(async (pool) => {
    const productId = await createProduct(pool);

    const versions = await pool.query(
      "select version, changed_fields from public.product_versions where product_id = $1",
      [productId],
    );
    assert.equal(versions.rowCount, 1, "creating a product creates its first version");
    assert.equal(versions.rows[0].version, 1);

    await pool.query("delete from public.products where id = $1", [productId]);
  });
});

describe("only real movement becomes a version", async () => {
  await withPool(async (pool) => {
    const productId = await createProduct(pool);

    await pool.query("update public.products set price = 150 where id = $1", [productId]);
    // Writing the same value again. Recording it would bury the versions that
    // matter under a pile of no-ops.
    await pool.query("update public.products set price = 150 where id = $1", [productId]);
    // updated_at alone is the database keeping house, not history.
    await pool.query("update public.products set updated_at = now() where id = $1", [productId]);

    const versions = await pool.query(
      "select version, changed_fields from public.product_versions where product_id = $1 order by version",
      [productId],
    );
    assert.equal(versions.rowCount, 2, "one creation and one real change");
    assert.deepEqual(versions.rows[1].changed_fields, ["price"]);

    await pool.query("delete from public.products where id = $1", [productId]);
  });
});

describe("history says who changed it and why", async () => {
  await withPool(async (pool) => {
    const productId = await createProduct(pool);

    await pool.query("begin");
    await pool.query(
      "select set_config('mipo.change_source', 'ai', true), set_config('mipo.change_reason', 'תוכן נוצר מחדש', true)",
    );
    await pool.query("update public.products set description = 'תיאור חדש' where id = $1", [productId]);
    await pool.query("commit");

    const latest = await pool.query(
      "select source, reason from public.product_versions where product_id = $1 order by version desc limit 1",
      [productId],
    );
    assert.equal(latest.rows[0].source, "ai");
    assert.equal(latest.rows[0].reason, "תוכן נוצר מחדש");

    await pool.query("delete from public.products where id = $1", [productId]);
  });
});

describe("rolling back restores the product without erasing anything", async () => {
  await withPool(async (pool) => {
    const productId = await createProduct(pool, "שם מקורי");

    await pool.query(
      "update public.products set name = 'שם ששונה', price = 999 where id = $1",
      [productId],
    );

    const restored = await pool.query(
      "select public.rollback_product_to_version($1, 1, null, 'ביטול') as new_version",
      [productId],
    );

    const product = await pool.query(
      "select name, price from public.products where id = $1",
      [productId],
    );
    assert.equal(product.rows[0].name, "שם מקורי");
    assert.equal(Number(product.rows[0].price), 100);

    const versions = await pool.query(
      "select version, source from public.product_versions where product_id = $1 order by version",
      [productId],
    );
    // 1 created, 2 edited, 3 the rollback itself. The edit is still there, which
    // is what makes the rollback reversible in turn.
    assert.equal(versions.rowCount, 3);
    assert.equal(versions.rows[2].source, "rollback");
    assert.equal(restored.rows[0].new_version, 3);

    // Undoing the undo.
    await pool.query("select public.rollback_product_to_version($1, 2, null, null)", [productId]);
    const again = await pool.query("select name from public.products where id = $1", [productId]);
    assert.equal(again.rows[0].name, "שם ששונה");

    await pool.query("delete from public.products where id = $1", [productId]);
  });
});

describe("restoring an unknown version fails loudly", async () => {
  await withPool(async (pool) => {
    const productId = await createProduct(pool);

    await assert.rejects(
      pool.query("select public.rollback_product_to_version($1, 99, null, null)", [productId]),
      /has no version 99/,
    );

    await pool.query("delete from public.products where id = $1", [productId]);
  });
});
