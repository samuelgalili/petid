// Phase 4b · turn an approved legacy product into a sellable one.
//
// Approval creates a catalog_product and nothing else. The publication gate
// wants four more things:
//
//     an ACTIVE variant · an ACTIVE offer priced above zero
//     availability recorded · an approved image
//
// so 187 approved products are 187 products that cannot be published. This
// script supplies the first three from the legacy row, which already holds a
// price, a SKU, a barcode, a weight and a stock flag. It does NOT supply the
// fourth - see IMAGES below.
//
// ONE DEFAULT VARIANT PER PRODUCT, and that is a deliberate limit rather than
// a simplification. C-16 and C-17 refuted the idea that the legacy data groups
// variants: family_code turned out to be a merchandising family - 12 families
// covering 266 products, sizes up to 61 - whose members differ by name and
// price and NOT by weight or size. There is no variant structure in this data
// to recover, so inventing one would be inventing facts. A human building a
// real variant set later adds variants to the same product; this script does
// not stand in their way.
//
// IMAGES ARE NOT TOUCHED. product_media carries an approved_at and an approving
// human, and OD-3 makes an approved image mandatory to publish. Approving an
// image is a claim that we may use it, which is exactly the open question D-7
// records: 69 legacy products have no image at all, and C-26 found 91 carrying
// the importer's own "Needs manual image research". A script must not make that
// claim on somebody's behalf, so this one counts what is missing and stops.
//
//   DATABASE_URL=... node server/scripts/completeLegacyCatalogueEntries.mjs \
//     [--apply --admin-email=someone@mipo.pet] [--limit=N]
//
// Dry run is the default. Idempotent: every insert is guarded by the unique
// index that already exists, so a re-run resumes and a finished run is a no-op.

import pg from "pg";

const { Pool } = pg;

const apply = process.argv.includes("--apply");
const arg = (name) => {
  const found = process.argv.find((value) => value.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : null;
};
const limit = arg("limit") ? Math.max(1, Number(arg("limit")) || 0) : null;
const adminEmail = arg("admin-email");

const SOURCE_SYSTEM = "legacy_business_products";

/**
 * The signature of the single variant this script creates.
 *
 * option_signature is NOT NULL and unique per product, and it is what makes a
 * re-run a no-op rather than a second variant. A constant is correct here
 * precisely because there are no options to encode: the product has one
 * variant standing for the whole product.
 */
export const DEFAULT_OPTION_SIGNATURE = "legacy-default";

/** A price is a positive number, spelled out rather than Number(x) > 0. */
export const isSellablePrice = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return false;
  const text = String(value).trim();
  if (text === "" || !/^-?\d+(\.\d+)?$/.test(text)) return false;
  return Number(text) > 0;
};

/**
 * Why this product cannot be completed, or an empty list.
 *
 * Kept pure and exported so the reasons are testable without a database, and
 * so the dry run and the apply path cannot disagree about what is skipped.
 */
export const completionBlockers = (row) => {
  const blockers = [];
  if (!isSellablePrice(row?.price)) blockers.push("price_not_positive");
  if (!row?.owning_business_id) blockers.push("no_owning_business");
  return blockers;
};

/**
 * A sale price is only carried across when it is a real discount. The schema
 * refuses sale_price > price, and a legacy row with both set wrongly would
 * abort the insert rather than merely look odd.
 */
export const sellableSalePrice = (price, salePrice) => {
  if (!isSellablePrice(salePrice)) return null;
  if (Number(salePrice) > Number(price)) return null;
  return salePrice;
};

/** in_stock is nullable; NULL means nobody said, which is not "in stock". */
export const availabilityFor = (inStock) => (inStock === true ? "IN_STOCK" : "OUT_OF_STOCK");

let pool = null;

const main = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required");
    process.exit(2);
  }
  if (apply && !adminEmail) {
    console.error(
      "--apply requires --admin-email=<a real administrator>.\n" +
      "product_variants.created_by and seller_offers.created_by are NOT NULL, and a\n" +
      "price entering the catalogue should name who put it there.",
    );
    process.exit(2);
  }

  pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DB_SSL === "false" ? false : undefined,
  });

  let actor = null;
  if (apply) {
    const { rows } = await pool.query(
      "select id, email, role, is_active from public.admin_users where lower(email) = lower($1)",
      [adminEmail],
    );
    if (rows.length === 0) {
      console.error(`no admin_user with email ${adminEmail}`);
      process.exit(2);
    }
    actor = rows[0];
    if (actor.is_active !== true) {
      console.error(`${actor.email} is not active`);
      process.exit(2);
    }
    if (!["admin", "product_manager"].includes(actor.role)) {
      console.error(`${actor.email} has role '${actor.role}', which does not hold OFFERS_WRITE`);
      process.exit(2);
    }
  }

  // Approved legacy products, with the legacy row beside them and a count of
  // what they already have. Products that already carry a variant are not
  // re-processed, which is what makes a re-run resume.
  const { rows: products } = await pool.query(
    `select p.id as product_id, p.owning_business_id, p.name,
            b.id as legacy_id, b.price, b.sale_price, b.sku,
            -- business_products has no barcode COLUMN. C-18 measured 266
            -- products carrying one, and it reads them out of the attribute
            -- bag exactly like this. Selecting b.barcode would have failed on
            -- every row with 42703.
            nullif(btrim(coalesce(b.product_attributes ->> 'barcode', '')), '') as barcode,
            b.weight, b.weight_unit, b.in_stock, b.image_url,
            r.id as raw_import_record_id,
            (select count(*) from public.product_variants v
              where v.catalog_product_id = p.id and v.archived_at is null)::int as variants
       from public.catalog_products p
       join public.product_drafts d on d.id = p.origin_draft_id
       join public.raw_import_records r on r.id = d.raw_import_record_id
       join public.business_products b on b.id = r.source_record_id::uuid
      where r.source_system = $1
        and p.archived_at is null
      order by p.name
      ${limit ? `limit ${Number(limit)}` : ""}`,
    [SOURCE_SYSTEM],
  );

  const summary = {
    considered: products.length,
    completed: 0,
    alreadyComplete: 0,
    skipped: 0,
    failed: 0,
    skuDropped: 0,
    stillNeedAnImage: 0,
  };
  const blockerCounts = new Map();
  const failures = [];

  for (const row of products) {
    if (row.variants > 0) {
      summary.alreadyComplete += 1;
      continue;
    }

    const blockers = completionBlockers(row);
    if (blockers.length > 0) {
      summary.skipped += 1;
      for (const blocker of blockers) {
        blockerCounts.set(blocker, (blockerCounts.get(blocker) ?? 0) + 1);
      }
      continue;
    }

    const image = String(row.image_url ?? "").trim();
    if (!image || image === "/placeholder.svg") summary.stillNeedAnImage += 1;

    if (!apply) {
      summary.completed += 1;
      continue;
    }

    const client = await pool.connect();
    try {
      await client.query("begin");

      const { rows: variant } = await client.query(
        `insert into public.product_variants
           (catalog_product_id, options, option_signature, label, barcode,
            weight, weight_unit, status, is_default, created_by)
         values ($1, '{}'::jsonb, $2, $3, $4, $5, $6, 'ACTIVE', true, $7)
         on conflict (catalog_product_id, option_signature) where archived_at is null
           do nothing
         returning id`,
        [
          row.product_id, DEFAULT_OPTION_SIGNATURE,
          row.weight ? `${row.weight}${row.weight_unit ? ` ${row.weight_unit}` : ""}` : null,
          row.barcode ?? null, row.weight ?? null, row.weight_unit ?? null,
          actor.id,
        ],
      );

      if (variant.length === 0) {
        await client.query("rollback");
        summary.alreadyComplete += 1;
        continue;
      }

      // uq_seller_offers_business_sku: one Seller may not reuse a SKU. 366 of
      // the 375 legacy products carry one and nothing guarantees they are
      // distinct, so a duplicate must not take the product down with it. The
      // offer is created without a SKU instead - the column is nullable, and
      // an offer with no SKU is a real offer, while a failed insert is a
      // product that stays unsellable.
      let sku = row.sku ? String(row.sku).trim() || null : null;
      if (sku) {
        const { rows: clash } = await client.query(
          `select 1 from public.seller_offers
            where business_id = $1 and sku = $2 and archived_at is null limit 1`,
          [row.owning_business_id, sku],
        );
        if (clash.length > 0) {
          sku = null;
          summary.skuDropped += 1;
        }
      }

      const { rows: offer } = await client.query(
        `insert into public.seller_offers
           (business_id, product_variant_id, sku, price, sale_price, currency,
            price_source, status, adopted_from_raw_import_id, created_by)
         values ($1, $2, $3, $4, $5, 'ILS', 'adopted', 'ACTIVE', $6, $7)
         returning id`,
        [
          row.owning_business_id, variant[0].id, sku, row.price,
          sellableSalePrice(row.price, row.sale_price),
          row.raw_import_record_id, actor.id,
        ],
      );

      await client.query(
        `insert into public.inventory
           (seller_offer_id, availability, created_by)
         values ($1, $2, $3)
         on conflict (seller_offer_id) do nothing`,
        [offer[0].id, availabilityFor(row.in_stock), actor.id],
      );

      await client.query("commit");
      summary.completed += 1;
    } catch (error) {
      await client.query("rollback").catch(() => {});
      summary.failed += 1;
      failures.push({ id: row.product_id, name: row.name, error: error.message });
    } finally {
      client.release();
    }
  }

  console.log(apply
    ? `APPLIED - variants, offers and inventory created by ${actor.email}`
    : "DRY RUN - nothing was written (pass --apply --admin-email=... to write)");
  console.log(`  approved products considered  ${summary.considered}`);
  console.log(`  ${apply ? "completed" : "would complete"}${apply ? "                     " : "                "}${summary.completed}`);
  console.log(`  already had a variant         ${summary.alreadyComplete}`);
  console.log(`  skipped                       ${summary.skipped}`);
  console.log(`  failed                        ${summary.failed}`);
  if (summary.skuDropped > 0) {
    console.log(`  SKU dropped as duplicate      ${summary.skuDropped}`);
  }

  if (blockerCounts.size > 0) {
    console.log("\nwhy products were skipped:");
    for (const [blocker, count] of [...blockerCounts].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(blocker).padEnd(24)} ${count}`);
    }
  }
  if (failures.length > 0) {
    console.log("\nfailures:");
    for (const failure of failures.slice(0, 20)) {
      console.log(`  ${failure.id}  ${failure.name}: ${failure.error}`);
    }
  }

  console.log(
    `\nSTILL NOT PUBLISHABLE. Every product completed here now has a variant, a\n` +
    `priced offer and availability - and still no approved image, which OD-3\n` +
    `makes mandatory. ${summary.stillNeedAnImage} of the products handled have no image file at all.\n` +
    `Approving an image asserts we may use it, which is D-7's open question, so\n` +
    `no script does it.`,
  );

  await pool.end();
  process.exit(summary.failed > 0 ? 1 : 0);
};

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop());
if (invokedDirectly) {
  main().catch(async (error) => {
    console.error(error);
    await pool?.end().catch(() => {});
    process.exit(1);
  });
}
