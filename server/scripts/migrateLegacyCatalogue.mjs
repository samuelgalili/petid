// Phase 5 · move the legacy catalogue through the real intake chain.
//
//   business_products (375)
//     → raw_import_records   source_system = 'legacy_business_products'
//                            source_record_id = business_products.id
//                            payload = the legacy row, minus the commercial
//                                      columns (see WHAT THE PAYLOAD OMITS)
//     → product_drafts       mapped fields, state = 'IMPORTED'
//     → [stops here]
//
// It stops at IMPORTED on purpose. The decision was to migrate and wait for an
// administrator to go over the products, handle them and update prices, so
// this script deliberately does NOT approve anything into catalog_products.
// Nothing it writes is visible to a customer. A product becomes public only
// when a human approves the draft and publishes it, through the same review
// the intake model requires of every other Seller.
//
// IDEMPOTENT. uq_raw_import_records_source is a unique index on
// (business_id, source_system, source_record_id), so a re-run cannot duplicate
// a product - the insert conflicts and the product is reported as skipped. An
// interrupted run resumes; a finished run is a no-op.
//
// WHAT THE PAYLOAD OMITS, and why this differs from the plan.
//
// The plan said the payload is "the whole legacy row, immutable". It cannot
// be. GET /api/admin/intake/drafts/:id returns `r.payload as raw_payload`, and
// seller_admin holds INTAKE_READ - so a Seller's own administrator can read
// the payload of any draft owned by their business. Today every legacy product
// belongs to MIPO's own profile, so nothing leaks; the moment ownership of one
// moves to a real Seller, which is the entire purpose of the new model, that
// Seller reads our cost price, our commission rate and our supplier's name out
// of the archive.
//
// The plan's own list of columns that must never reach anything customer-facing
// is therefore also the list that must not enter the payload. Nothing is lost
// by omitting them: none of them maps into a draft, so "a mapping error is
// correctable by re-running" still holds, and business_products itself is
// untouched and remains the complete record.
//
//   DATABASE_URL=... node server/scripts/migrateLegacyCatalogue.mjs [--apply] [--limit=N]
//
// Dry run is the DEFAULT. Writing requires --apply. That is the opposite of
// the other scripts in this directory, and deliberate: this one writes hundreds
// of rows into three tables on a single invocation.
//
// WHAT THE DRY RUN DOES NOT TELL YOU. It counts what would be attempted; it
// does not attempt it. The first --apply of this script failed on all 50
// fixture products after a dry run had confidently reported 50 successes,
// because the failure was in the insert path the dry run never executes. Read
// "would migrate: 375" as "375 products are eligible", never as "375 will
// succeed". That is what --limit=1 is for.

import { createHash } from "node:crypto";

import pg from "pg";

const { Pool } = pg;

const apply = process.argv.includes("--apply");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Math.max(1, Number(limitArg.split("=")[1]) || 0) : null;

const SOURCE_SYSTEM = "legacy_business_products";
const SYSTEM_ACTOR_EMAIL = "system+legacy-migration@mipo.pet";

/**
 * Columns that must never enter the payload or the draft.
 *
 * Commercial: what a product costs us and what we take from a Seller.
 * Operational: supplier plumbing that describes our arrangement, not the
 * product. Advisory: review flags and price suggestions, which are opinions
 * about the row and not facts about the thing being sold.
 *
 * Exported for the test that asserts none of them survives the migration -
 * a list only this file knows would be a list nothing checks.
 */
export const WITHHELD_COLUMNS = Object.freeze([
  "cost_price",
  "commission_rate",
  "supplier_id",
  "supplier_link",
  "auto_restock",
  "restock_interval_days",
  "api_sync_enabled",
  "suggested_price",
  "price_suggestion_reason",
]);

/**
 * Keys the legacy importer left inside product_attributes that carry the same
 * commercial information as the columns above. Stripping the columns and
 * leaving these would be a fence with a gate in it.
 */
export const WITHHELD_ATTRIBUTE_KEYS = Object.freeze([
  "price_before_vat",
  "supplier_name",
  "supplier",
  "source_row",
  "image_research_notes",
  "cost_price",
  "commission_rate",
]);

/**
 * D-7 keeps source_url and supplier_name on business_products, because they are
 * what makes the image-rights problem finite - you cannot ask a supplier for
 * permission if you no longer know which supplier. That is an argument for not
 * DELETING them from the legacy table. It is not an argument for copying them
 * into a record a Seller can read. They stay where they are.
 */
const stripAttributes = (attributes) => {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) return {};
  const clean = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (WITHHELD_ATTRIBUTE_KEYS.includes(String(key).trim().toLowerCase())) continue;
    clean[key] = value;
  }
  return clean;
};

/** The legacy row as it will be archived: everything except the withheld columns. */
export const buildPayload = (row) => {
  const payload = {};
  for (const [key, value] of Object.entries(row)) {
    if (WITHHELD_COLUMNS.includes(key)) continue;
    payload[key] = value === undefined ? null : value;
  }
  payload.product_attributes = stripAttributes(row.product_attributes);
  return payload;
};

/**
 * The legacy row mapped onto a draft.
 *
 * price becomes proposed_price, not price. A draft proposes; an offer prices.
 * The administrator reviewing these was asked to update prices, and a field
 * called proposed_price is the one that says so.
 */
export const buildDraft = (row) => ({
  name: row.name ?? null,
  description: row.description ?? null,
  brand: row.brand ?? null,
  category_id: row.category_id ?? null,
  pet_type: row.pet_type ?? null,
  species_id: row.species_id ?? null,
  proposed_price: row.price ?? null,
  attributes: stripAttributes(row.product_attributes),
});

// Built inside main(), never at module scope. The mappers above are pure and
// are imported by the tests; a module that opened a pool - or called
// process.exit() over a missing DATABASE_URL - as a side effect of being
// imported would take the entire test file down with it on the machines that
// do not set one. It did, before this was moved.
let pool = null;

const main = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required");
    process.exit(2);
  }
  pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DB_SSL === "false" ? false : undefined,
  });

  const actor = await pool.query(
    "select id from public.admin_users where email = $1",
    [SYSTEM_ACTOR_EMAIL],
  );
  if (actor.rows.length === 0) {
    console.error(
      `the system actor ${SYSTEM_ACTOR_EMAIL} does not exist - apply 0054_legacy_import_source_system.sql first`,
    );
    process.exit(2);
  }
  const actorId = actor.rows[0].id;

  const { rows: products } = await pool.query(
    `select p.* from public.business_products p
      order by p.created_at nulls last, p.id
      ${limit ? `limit ${Number(limit)}` : ""}`,
  );

  const summary = {
    considered: products.length,
    migrated: 0,
    alreadyMigrated: 0,
    failed: 0,
    withoutCategory: 0,
    withoutImage: 0,
    withoutSpecies: 0,
  };
  const failures = [];

  for (const row of products) {
    if (!row.category_id) summary.withoutCategory += 1;
    if (!row.species_id) summary.withoutSpecies += 1;
    const imageUrl = String(row.image_url ?? "").trim();
    if (!imageUrl || imageUrl === "/placeholder.svg") summary.withoutImage += 1;

    const payload = buildPayload(row);
    const draft = buildDraft(row);

    if (!apply) {
      const { rows: seen } = await pool.query(
        `select 1 from public.raw_import_records
          where business_id = $1 and source_system = $2 and source_record_id = $3`,
        [row.business_id, SOURCE_SYSTEM, row.id],
      );
      if (seen.length > 0) summary.alreadyMigrated += 1;
      else summary.migrated += 1;
      continue;
    }

    // One product, one transaction. A product that fails to map does not take
    // the other 374 down with it, and does not leave a raw record with no
    // draft behind it.
    const client = await pool.connect();
    try {
      await client.query("begin");
      const payloadJson = JSON.stringify(payload);
      const { rows: raw } = await client.query(
        `insert into public.raw_import_records
           (business_id, source_system, source_record_id, source_url, payload,
            payload_hash, content_type, created_by)
         values ($1, $2, $3, $4, $5::jsonb, $6, 'application/json', $7)
         on conflict (business_id, source_system, source_record_id)
           where source_record_id is not null
           do nothing
         returning id`,
        [
          row.business_id, SOURCE_SYSTEM, row.id, row.source_url ?? null, payloadJson,
          // Hashed here rather than with pgcrypto's digest(), so the value is
          // produced by exactly the same code as POST /api/admin/intake/raw
          // does. Two implementations of "the payload hash" is one more than
          // the number that can be trusted to agree.
          createHash("sha256").update(payloadJson).digest("hex"),
          actorId,
        ],
      );

      if (raw.length === 0) {
        await client.query("rollback");
        summary.alreadyMigrated += 1;
        continue;
      }

      await client.query(
        `insert into public.product_drafts
           (business_id, raw_import_record_id, state, name, description, brand,
            category_id, pet_type, species_id, attributes, proposed_price, created_by)
         values ($1, $2, 'IMPORTED', $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)`,
        [
          row.business_id, raw[0].id, draft.name, draft.description, draft.brand,
          draft.category_id, draft.pet_type, draft.species_id,
          JSON.stringify(draft.attributes), draft.proposed_price, actorId,
        ],
      );

      await client.query("commit");
      summary.migrated += 1;
    } catch (error) {
      await client.query("rollback").catch(() => {});
      summary.failed += 1;
      failures.push({ id: row.id, name: row.name, error: error.message });
    } finally {
      client.release();
    }
  }

  console.log(apply ? "APPLIED" : "DRY RUN - nothing was written (pass --apply to write)");
  console.log(`  products considered      ${summary.considered}`);
  console.log(`  ${apply ? "migrated" : "would migrate"}${apply ? "                 " : "            "}${summary.migrated}`);
  console.log(`  already migrated         ${summary.alreadyMigrated}`);
  console.log(`  failed                   ${summary.failed}`);
  console.log("  --- waiting for an administrator ---");
  console.log(`  with no category         ${summary.withoutCategory}`);
  console.log(`  with no image            ${summary.withoutImage}`);
  console.log(`  with no species          ${summary.withoutSpecies}`);

  if (failures.length > 0) {
    console.log("\nfailures:");
    for (const failure of failures.slice(0, 20)) {
      console.log(`  ${failure.id}  ${failure.name}: ${failure.error}`);
    }
    if (failures.length > 20) console.log(`  ... and ${failures.length - 20} more`);
  }

  await pool.end();
  process.exit(summary.failed > 0 ? 1 : 0);
};

// Importing this file for its pure mappers must not run the migration.
const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop());
if (invokedDirectly) {
  main().catch(async (error) => {
    console.error(error);
    await pool?.end().catch(() => {});
    process.exit(1);
  });
}
