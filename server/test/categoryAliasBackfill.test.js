// 0051 · the hyphen that unfiled 64% of the catalogue.
//
// C-0 measured 241 of 375 production products carrying no category_id, holding
// exactly two distinct free-text values - 'dry-food' and 'wet-food' - while the
// aliases defined since 0034 are spelled 'dry food' and 'wet food', with a
// space. The importer writes a hyphen.
//
// That is not only migration groundwork. The shop's category filter drops
// anything unfiled the moment a category is chosen, so this is a live defect:
// a shopper filtering to אוכל יבש sees a handful of products where hundreds
// exist.
//
// What these tests are careful about, having been caught by it before: a claim
// about what a MIGRATION did must be scoped to the rows the migration saw.
// Asking the whole table "is anything with category 'dry-food' still unfiled?"
// would go red the day the importer legitimately writes a new row - which is
// the system working, not the migration failing.

import assert from "node:assert/strict";
import test from "node:test";

const DATABASE_URL = process.env.DATABASE_URL;
const dbTest = (name, fn) => test(name, { skip: DATABASE_URL ? false : "DATABASE_URL not set" }, fn);

const pgPool = async () => {
  const { default: pg } = await import("pg");
  return new pg.Pool({ connectionString: DATABASE_URL, ssl: false });
};

/** Runs inside a transaction that is always rolled back. */
const withDb = async (fn) => {
  const pool = await pgPool();
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

const MIGRATION = "0051_hyphenated_food_category_aliases.sql";

dbTest("the hyphenated spellings resolve to the Hebrew food shelves", async () => {
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select a.alias, c.slug, c.name_he
         from public.product_category_aliases a
         join public.product_categories c on c.id = a.category_id
        where a.alias in ('dry-food', 'wet-food')
        order by a.alias`,
    );
    assert.equal(rows.length, 2, "both hyphenated aliases must exist");
    assert.deepEqual(
      rows.map((r) => [r.alias, r.slug]),
      [["dry-food", "food-dry"], ["wet-food", "food-wet"]],
    );
    // The Hebrew shelves are the canonical categories; the English spellings
    // are import variants and stay aliases. 0034 created these.
    assert.equal(rows[0].name_he, "אוכל יבש");
    assert.equal(rows[1].name_he, "אוכל רטוב");
  });
});

dbTest("the four aliases 0034 meant to move now point at the shelves", async () => {
  // Found by this test failing. 0034 listed eight aliases for the two new food
  // shelves; four of those keys were already claimed by 0025 pointing at the
  // parent 'food', and 0034 used ON CONFLICT DO NOTHING. Half its work was a
  // silent no-op - in the migration written to fix precisely this kind of
  // mismatch. 0051 re-points them with DO UPDATE.
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select a.alias, c.slug
         from public.product_category_aliases a
         join public.product_categories c on c.id = a.category_id
        where a.alias in ('dry food', 'wet food', 'מזון יבש', 'מזון רטוב')
        order by c.slug, a.alias`,
    );
    const bySlug = rows.reduce((acc, r) => {
      (acc[r.slug] ||= []).push(r.alias);
      return acc;
    }, {});
    assert.deepEqual(bySlug["food-dry"]?.sort(), ["dry food", "מזון יבש"].sort());
    assert.deepEqual(bySlug["food-wet"]?.sort(), ["wet food", "מזון רטוב"].sort());
    assert.equal(rows.length, 4, "none of the four may still point at the parent");
  });
});

dbTest("the generic food alias still means the parent, not a shelf", async () => {
  // The re-point must not overreach. 'מזון' genuinely means food-in-general and
  // belongs on the parent; only the four spellings that name a shelf moved.
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select c.slug from public.product_category_aliases a
         join public.product_categories c on c.id = a.category_id
        where a.alias = 'מזון'`,
    );
    assert.equal(rows[0]?.slug, "food");
  });
});

dbTest("re-pointing an alias does not re-file products already under the parent", async () => {
  // The limit of what can be fixed honestly. A row filed under 'food' by the
  // stale alias and a row an admin deliberately filed under 'food' are
  // indistinguishable - the database records the category, not who chose it -
  // so the re-point governs what happens next and nothing is moved.
  await withDb(async (client) => {
    const business = (await client.query(
      `insert into public.business_profiles (business_name, business_type)
       values ('Alias Repoint Test', 'shop') returning id`,
    )).rows[0].id;
    const food = (await client.query(
      "select id from public.product_categories where slug = 'food'",
    )).rows[0].id;
    const product = (await client.query(
      `insert into public.business_products (business_id, name, price, category, category_id)
       values ($1, 'Filed under the parent', 10, 'מזון רטוב', $2) returning id`,
      [business, food],
    )).rows[0].id;

    await client.query(
      `update public.business_products p
          set category_id = a.category_id
         from public.product_category_aliases a
        where p.category_id is null
          and p.category is not null
          and lower(btrim(p.category)) = a.alias`,
    );

    const after = (await client.query(
      "select category_id from public.business_products where id = $1", [product],
    )).rows[0].category_id;
    assert.equal(after, food, "an already-filed product must not be moved by a re-point");
  });
});

dbTest("every row the migration saw with these values was filed", async () => {
  await withDb(async (client) => {
    // Scoped to rows that existed when 0051 ran. A product created afterwards
    // is not this migration's business, and asserting over the whole table
    // would make the test fail for the system working correctly.
    const { rows } = await client.query(
      `select count(*) as seen,
              count(*) filter (where p.category_id is null) as still_unfiled
         from public.business_products p
         join public.schema_migrations m on m.filename = $1
        where p.created_at < m.applied_at
          and lower(btrim(coalesce(p.category, ''))) in ('dry-food', 'wet-food')`,
      [MIGRATION],
    );
    assert.equal(
      Number(rows[0].still_unfiled), 0,
      "a product the migration saw with a hyphenated food value is still unfiled",
    );
  });
});

dbTest("a category an admin chose by hand is never overwritten", async () => {
  await withDb(async (client) => {
    const business = (await client.query(
      `insert into public.business_profiles (business_name, business_type)
       values ('Alias Test', 'shop') returning id`,
    )).rows[0].id;
    const treats = (await client.query(
      "select id from public.product_categories where slug = 'treats'",
    )).rows[0].id;

    // Free text says dry-food; a human filed it under treats anyway.
    const product = (await client.query(
      `insert into public.business_products (business_id, name, price, category, category_id)
       values ($1, 'Hand filed', 10, 'dry-food', $2) returning id`,
      [business, treats],
    )).rows[0].id;

    // Exactly the migration's backfill predicate.
    await client.query(
      `update public.business_products p
          set category_id = a.category_id
         from public.product_category_aliases a
        where p.category_id is null
          and p.category is not null
          and lower(btrim(p.category)) = a.alias`,
    );

    const after = (await client.query(
      "select category_id from public.business_products where id = $1", [product],
    )).rows[0].category_id;
    assert.equal(after, treats, "the admin's choice must survive the backfill");
  });
});

dbTest("the backfill matches case and surrounding whitespace the importer produces", async () => {
  await withDb(async (client) => {
    const business = (await client.query(
      `insert into public.business_profiles (business_name, business_type)
       values ('Alias Case Test', 'shop') returning id`,
    )).rows[0].id;
    const product = (await client.query(
      `insert into public.business_products (business_id, name, price, category, category_id)
       values ($1, 'Shouty', 10, '  DRY-FOOD  ', null) returning id`,
      [business],
    )).rows[0].id;

    await client.query(
      `update public.business_products p
          set category_id = a.category_id
         from public.product_category_aliases a
        where p.category_id is null
          and p.category is not null
          and lower(btrim(p.category)) = a.alias`,
    );

    const { rows } = await client.query(
      `select c.slug from public.business_products p
         join public.product_categories c on c.id = p.category_id
        where p.id = $1`, [product],
    );
    assert.equal(rows[0]?.slug, "food-dry", "lower(btrim(...)) is what the alias is matched on");
  });
});

dbTest("nothing outside the two values was filed by this migration", async () => {
  await withDb(async (client) => {
    const business = (await client.query(
      `insert into public.business_profiles (business_name, business_type)
       values ('Alias Negative Test', 'shop') returning id`,
    )).rows[0].id;
    const product = (await client.query(
      `insert into public.business_products (business_id, name, price, category, category_id)
       values ($1, 'Unknown kind', 10, 'no-such-category-value', null) returning id`,
      [business],
    )).rows[0].id;

    await client.query(
      `update public.business_products p
          set category_id = a.category_id
         from public.product_category_aliases a
        where p.category_id is null
          and p.category is not null
          and lower(btrim(p.category)) = a.alias`,
    );

    const after = (await client.query(
      "select category_id from public.business_products where id = $1", [product],
    )).rows[0].category_id;
    // 0034's rule, kept: anything not listed stays uncategorised rather than
    // being guessed at. An unfiled product is visible in the admin screen that
    // counts unmatched values; a wrongly filed one is invisible.
    assert.equal(after, null, "an unrecognised value must stay unfiled, not be guessed at");
  });
});
