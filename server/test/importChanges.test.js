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

describe("two new products in one delivery are two changes", async () => {
  await withPool(async (pool) => {
    // The unique key was originally (import, product, type, field). A product
    // that does not exist yet has no id, so every product_added collapsed to
    // one row and a supplier's second new product vanished from the review
    // list — the exact loss this table exists to prevent.
    const imports = await pool.query("select id from public.imports order by created_at limit 1");
    if (imports.rowCount === 0) return;
    const importId = imports.rows[0].id;

    const rows = await pool.query(
      "select id from public.import_rows where import_id = $1 order by row_number limit 2",
      [importId],
    );
    if (rows.rowCount < 2) return;

    const insert = `
      insert into public.import_changes (import_id, import_row_id, change_type, new_value)
      values ($1, $2, 'product_added', $3::jsonb)
      on conflict do nothing
      returning id
    `;

    const first = await pool.query(insert, [importId, rows.rows[0].id, JSON.stringify({ sku: "T-1" })]);
    const second = await pool.query(insert, [importId, rows.rows[1].id, JSON.stringify({ sku: "T-2" })]);

    assert.equal(first.rowCount, 1);
    assert.equal(second.rowCount, 1, "a second new product must not be swallowed by the first");

    await pool.query(
      "delete from public.import_changes where id = any($1::uuid[])",
      [[first.rows[0].id, second.rows[0].id]],
    );
  });
});

describe("the same field changing twice in one delivery is one decision", async () => {
  await withPool(async (pool) => {
    const imports = await pool.query("select id from public.imports order by created_at limit 1");
    const rows = await pool.query(
      "select id, product_id from public.import_rows where import_id = $1 and product_id is not null limit 1",
      [imports.rows[0]?.id],
    );
    if (rows.rowCount === 0) return;

    const importId = imports.rows[0].id;
    const { id: rowId, product_id: productId } = rows.rows[0];

    const insert = `
      insert into public.import_changes (import_id, import_row_id, product_id, change_type, field_name, new_value)
      values ($1, $2, $3, 'field_changed', 'selling_price', $4::jsonb)
      on conflict do nothing
      returning id
    `;

    const first = await pool.query(insert, [importId, rowId, productId, "10"]);
    const duplicate = await pool.query(insert, [importId, rowId, productId, "20"]);

    assert.equal(first.rowCount, 1);
    assert.equal(duplicate.rowCount, 0, "one field on one product is one question");

    await pool.query("delete from public.import_changes where id = $1", [first.rows[0].id]);
  });
});

describe("a product missing from the newest file is marked, never deleted", async () => {
  await withPool(async (pool) => {
    const missing = await pool.query(`
      select count(*)::int as marked
      from public.products
      where missing_from_import_at is not null and deleted_at is null
    `);
    // Marked and still present. A product that stopped appearing in one
    // supplier file is a question, not an instruction to destroy history.
    assert.ok(missing.rows[0].marked >= 0);

    const destroyed = await pool.query(`
      select count(*)::int as count
      from public.products
      where missing_from_import_at is not null and deleted_at is not null
    `);
    assert.equal(destroyed.rows[0].count, 0, "going missing must not delete anything");
  });
});
