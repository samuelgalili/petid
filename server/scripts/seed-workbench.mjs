#!/usr/bin/env node
/**
 * Fills the work environment with data worth looking at.
 *
 * This is not a demo. Every awkward thing in here is something production
 * actually has, and each one is the reason a bug got as far as customers:
 *
 *   - six duplicate SKUs, which stopped a deploy halfway through on
 *     8 September and left the site unable to log anyone in
 *   - products with no category_id, filed only under a free-text category,
 *     which is why picking a category in the shop filters to nothing
 *   - one category with 27 products, so the row that previews ten and the
 *     "הכל" button that opens the rest can both be seen working
 *   - products with no SKU and no weight, which the warehouse label has to
 *     survive rather than print blanks for
 *
 * A work environment seeded with tidy data would have shown none of it.
 *
 * Safe to re-run: everything is keyed and upserted, and it refuses to touch a
 * database that looks like production.
 */

import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { hashPassword } from "../src/passwords.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

// A blunt guard, but the failure it prevents is unrecoverable. The work
// environment's database is called mipo on localhost; production is RDS.
if (!process.env.WORKBENCH_ALLOW_ANY_DATABASE) {
  const host = (() => {
    try { return new URL(databaseUrl).hostname; } catch { return ""; }
  })();
  const local = ["localhost", "127.0.0.1", "postgres", "::1"];
  if (!local.includes(host)) {
    console.error(`Refusing to seed a database that is not local (host: ${host || "unparseable"}).`);
    console.error("This script writes test users and products. It is not for a real database.");
    process.exit(1);
  }
}

const pool = new Pool({ connectionString: databaseUrl, ssl: false, max: 1 });

const ADMIN = { email: "admin@mipo.local", password: "workbench-admin-1234" };
const CUSTOMER = { email: "dana@mipo.local", password: "workbench-user-1234", name: "דנה כהן", phone: "0501234567" };

// slug → [Hebrew name, parent slug or null]
const CATEGORIES = [
  ["food", "מזון", null],
  ["food-dry", "מזון יבש", "food"],
  ["food-wet", "אוכל רטוב", "food"],
  ["treats", "חטיפים", null],
  ["toys", "צעצועים", null],
  ["health", "בריאות", null],
  ["accessories", "אביזרים", null],
];

const productsFor = () => {
  const rows = [];
  const add = (props) => rows.push({
    sku: null, weight: null, weightUnit: null, categorySlug: null,
    categoryText: null, price: 49, ...props,
  });

  // A category big enough that the shop has to preview it and offer "הכל".
  for (let index = 1; index <= 27; index += 1) {
    add({
      name: `מזון יבש לכלבים ${index} ק״ג`,
      sku: `DRY-${String(index).padStart(3, "0")}`,
      weight: String(index), weightUnit: "kg",
      categorySlug: "food-dry", categoryText: "מזון יבש",
      price: 89 + index,
    });
  }

  // The duplicates. Six SKUs, each on two rows — the exact shape that stopped
  // the deploy: `count(*) > 1` grouped by sku returns six.
  for (let index = 1; index <= 6; index += 1) {
    const sku = `DUP-${String(index).padStart(3, "0")}`;
    add({ name: `חטיף עוף מיובש ${index}`, sku, categorySlug: "treats", categoryText: "חטיפים", price: 19 + index });
    add({ name: `חטיף עוף מיובש ${index} (אריזה חדשה)`, sku, categorySlug: "treats", categoryText: "חטיפים", price: 19 + index });
  }

  // Filed under free text only, with no place in the category tree. These are
  // the ones that vanish when a category is picked.
  add({ name: "כדור גומי לכלבים", categoryText: "צעצועים", price: 35 });
  add({ name: "עכבר קטיפה לחתולים", categoryText: "צעצועים", price: 25 });
  add({ name: "חבל משיכה", categoryText: "צעצועים", price: 45 });

  // No SKU, no weight: the label has to cope.
  add({ name: "שמפו לגורים", categorySlug: "health", categoryText: "בריאות", price: 39 });
  add({ name: "מסרק פרעושים", categorySlug: "accessories", categoryText: "אביזרים", price: 29 });

  // One category holding a single product, so the row correctly offers no
  // "הכל" button at all.
  add({ name: "קולר משולב", sku: "ACC-001", categorySlug: "accessories", categoryText: "אביזרים", price: 59 });

  return rows;
};

const main = async () => {
  const client = await pool.connect();
  try {
    await client.query("begin");

    // ── the business every product hangs off ────────────────────────────
    // Looked up by name before inserting. `on conflict do nothing` was wrong
    // here: business_name carries no unique constraint, so nothing ever
    // conflicted, every run created another business, and the products — which
    // are keyed on (business_id, name) — were re-inserted under it. A second
    // run doubled the catalogue.
    const BUSINESS_NAME = "MIPO Workbench";
    const found = await client.query(
      "select id from public.business_profiles where business_name = $1 order by created_at limit 1",
      [BUSINESS_NAME]);
    const businessId = found.rows[0]?.id ?? (await client.query(`
      insert into public.business_profiles (business_name, business_type, city, email)
      values ($1, 'shop', 'תל אביב', 'shop@mipo.local')
      returning id`, [BUSINESS_NAME])).rows[0].id;

    // ── people ──────────────────────────────────────────────────────────
    await client.query(`
      insert into public.admin_users (email, password_hash, display_name, role, is_active)
      values ($1, $2, 'Workbench Admin', 'admin', true)
      on conflict (email) do update set password_hash = excluded.password_hash, is_active = true`,
      [ADMIN.email, hashPassword(ADMIN.password)]);

    const customer = await client.query(`
      insert into public.app_users (email, password_hash, full_name, phone, is_active, terms_accepted_at, terms_version)
      values ($1, $2, $3, $4, true, now(), 'workbench')
      on conflict (email) do update set password_hash = excluded.password_hash
      returning id`,
      [CUSTOMER.email, hashPassword(CUSTOMER.password), CUSTOMER.name, CUSTOMER.phone]);
    const customerId = customer.rows[0].id;

    await client.query(`
      insert into public.profiles (id, first_name, last_name, whatsapp_number)
      values ($1, 'דנה', 'כהן', $2)
      on conflict (id) do nothing`,
      [customerId, CUSTOMER.phone]);

    // ── the category tree ───────────────────────────────────────────────
    const categoryIdBySlug = new Map();
    for (const [slug, nameHe, parentSlug] of CATEGORIES) {
      const result = await client.query(`
        insert into public.product_categories (slug, name_he, parent_id, is_active)
        values ($1, $2, $3, true)
        on conflict (slug) do update set name_he = excluded.name_he
        returning id`,
        [slug, nameHe, parentSlug ? categoryIdBySlug.get(parentSlug) : null]);
      categoryIdBySlug.set(slug, result.rows[0].id);
    }

    // ── the catalogue ───────────────────────────────────────────────────
    // Keyed on the name so a re-run updates rather than multiplies. The
    // duplicate SKUs survive that, because it is the name that is unique here
    // and the SKU that deliberately is not.
    let written = 0;
    for (const product of productsFor()) {
      const existing = await client.query(
        "select id from public.business_products where business_id = $1 and name = $2",
        [businessId, product.name]);

      const categoryId = product.categorySlug ? categoryIdBySlug.get(product.categorySlug) : null;
      // Each statement is given exactly the parameters it names. Passing the
      // same array to both left $1 and $2 unreferenced in the update, and
      // Postgres cannot infer a type for a parameter no expression uses:
      // "could not determine data type of parameter $1". It only showed on a
      // second run, because the first always takes the insert.
      const shared = [product.price, product.sku, product.weight, product.weightUnit, categoryId, product.categoryText];

      if (existing.rows[0]) {
        await client.query(`
          update public.business_products
          set price = $1, sku = $2, weight = $3, weight_unit = $4, category_id = $5, category = $6,
              in_stock = true, updated_at = now()
          where id = $7`,
          [...shared, existing.rows[0].id]);
      } else {
        await client.query(`
          insert into public.business_products
            (price, sku, weight, weight_unit, category_id, category, business_id, name, in_stock, image_url)
          values ($1, $2, $3, $4, $5, $6, $7, $8, true, '/placeholder.svg')`,
          [...shared, businessId, product.name]);
      }
      written += 1;
    }

    await client.query("commit");

    // On `client`, not `pool`. The pool holds a single connection and this one
    // is still checked out until the finally block below, so asking the pool
    // here waits for a connection that only this function can return: the
    // script hangs until CI kills the job.
    const duplicates = await client.query(`
      select count(*)::int as groups from (
        select 1 from public.business_products
        where sku is not null and btrim(sku) <> ''
        group by btrim(sku) having count(*) > 1) d`);
    const orphans = await client.query(`
      select count(*)::int as n from public.business_products
      where category_id is null and category is not null`);

    console.log("");
    console.log(`  products          ${written}`);
    console.log(`  categories        ${CATEGORIES.length}`);
    console.log(`  duplicate SKUs    ${duplicates.rows[0].groups} groups   (production has 6)`);
    console.log(`  no category_id    ${orphans.rows[0].n} products  (these are the ones a category filter loses)`);
    console.log("");
    console.log(`  admin     ${ADMIN.email} / ${ADMIN.password}`);
    console.log(`  customer  ${CUSTOMER.email} / ${CUSTOMER.password}`);
    console.log("");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
