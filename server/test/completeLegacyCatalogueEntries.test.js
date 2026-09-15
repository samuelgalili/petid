// Phase 4b · what "sellable" means, and what it still does not mean.
//
// Approval creates a catalog_product and nothing else, so 187 approved
// products were 187 products the publication gate refused on four counts. This
// script supplies three of them from the legacy row. The tests are written
// around the fourth: the image is NOT supplied, and no amount of this script
// running changes that. A test suite that only checked the happy path would
// let "we completed the catalogue" quietly come to mean "we published it".

import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_OPTION_SIGNATURE,
  availabilityFor,
  completionBlockers,
  isSellablePrice,
  sellableSalePrice,
} from "../scripts/completeLegacyCatalogueEntries.mjs";

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

const LEGACY = `
  from public.catalog_products p
  join public.product_drafts d on d.id = p.origin_draft_id
  join public.raw_import_records r on r.id = d.raw_import_record_id
 where r.source_system = 'legacy_business_products'`;

// ─── the pure rules ──────────────────────────────────────────────────────────

test("a price is a positive number, not whatever Number() accepts", () => {
  for (const good of ["49.90", "0.01", 10, "10"]) {
    assert.equal(isSellablePrice(good), true, String(good));
  }
  // Number([]) is 0, Number(true) is 1, Number(' ') is 0. An offer priced
  // `true` is what a truthiness test buys you.
  for (const bad of [null, undefined, "", " ", "0", "-1", true, false, [], {}, "abc", "1.2.3", NaN]) {
    assert.equal(isSellablePrice(bad), false, JSON.stringify(bad));
  }
});

test("a product with no usable price is skipped, not priced at zero", () => {
  // C-0 measured 73 products at or below zero. The schema would accept
  // price = 0 - seller_offers_price_check is `>= 0` - and the publication gate
  // demands `> 0`, so a zero-priced offer would be a row that exists solely to
  // fail a gate later, and a shopper could meet a free product in between.
  assert.deepEqual(completionBlockers({ price: "0", owning_business_id: "b" }), ["price_not_positive"]);
  assert.deepEqual(completionBlockers({ price: null, owning_business_id: "b" }), ["price_not_positive"]);
  assert.deepEqual(completionBlockers({ price: "49.90", owning_business_id: "b" }), []);
});

test("a product with no owning business is skipped", () => {
  assert.deepEqual(completionBlockers({ price: "10", owning_business_id: null }), ["no_owning_business"]);
});

test("a sale price above the price is dropped rather than carried across", () => {
  // seller_offers_sale_price_below_price would refuse the insert, taking the
  // whole product down over a bad discount somebody typed years ago.
  assert.equal(sellableSalePrice("50", "60"), null);
  assert.equal(sellableSalePrice("50", "40"), "40");
  assert.equal(sellableSalePrice("50", null), null);
  assert.equal(sellableSalePrice("50", "0"), null, "a zero sale price is not a discount");
  assert.equal(sellableSalePrice("50", "50"), "50", "equal is allowed by the constraint");
});

test("NULL in_stock is not in stock", () => {
  // in_stock is nullable. NULL means nobody recorded it, and defaulting that
  // to IN_STOCK would offer a shopper something we cannot ship.
  assert.equal(availabilityFor(true), "IN_STOCK");
  assert.equal(availabilityFor(false), "OUT_OF_STOCK");
  assert.equal(availabilityFor(null), "OUT_OF_STOCK");
  assert.equal(availabilityFor(undefined), "OUT_OF_STOCK");
  assert.equal(availabilityFor("yes"), "OUT_OF_STOCK", "only true is true");
});

test("importing the script has no side effects", () => {
  // The same trap that turned 18 tests into one failure in phase 5: a
  // DATABASE_URL check at module scope kills the process on import.
  assert.equal(typeof completionBlockers, "function");
  assert.equal(DEFAULT_OPTION_SIGNATURE, "legacy-default");
});

// ─── what it produced ────────────────────────────────────────────────────────

dbTest("every completed product has exactly one default ACTIVE variant", async () => {
  await withDb(async (client) => {
    const { rows } = await client.query(
      `with completed as (
         select p.id,
                (select count(*) from public.product_variants v
                  where v.catalog_product_id = p.id and v.archived_at is null)::int as total,
                (select count(*) from public.product_variants v
                  where v.catalog_product_id = p.id and v.archived_at is null
                    and v.is_default)::int as defaults,
                (select count(*) from public.product_variants v
                  where v.catalog_product_id = p.id and v.archived_at is null
                    and v.status <> 'ACTIVE')::int as inactive
           ${LEGACY}
       )
       select count(*)::int as products,
              count(*) filter (where total <> 1)::int as not_exactly_one,
              count(*) filter (where defaults <> 1)::int as not_exactly_one_default,
              count(*) filter (where inactive > 0)::int as any_inactive
         from completed where total > 0`,
    );
    assert.equal(rows[0].not_exactly_one, 0, "a re-run must not add a second variant");
    assert.equal(rows[0].not_exactly_one_default, 0);
    assert.equal(rows[0].any_inactive, 0, "an INACTIVE variant does not satisfy the gate");
  });
});

dbTest("every offer is ACTIVE, priced above zero, and in shekels", async () => {
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select count(*)::int as offers,
              count(*) filter (where o.status <> 'ACTIVE')::int as not_active,
              count(*) filter (where o.price <= 0)::int as not_positive,
              count(*) filter (where o.currency <> 'ILS')::int as wrong_currency,
              count(*) filter (where o.price_source <> 'adopted')::int as wrong_source
         from public.seller_offers o
         join public.product_variants v on v.id = o.product_variant_id
         join public.catalog_products p on p.id = v.catalog_product_id
         join public.product_drafts d on d.id = p.origin_draft_id
         join public.raw_import_records r on r.id = d.raw_import_record_id
        where r.source_system = 'legacy_business_products'`,
    );
    assert.equal(rows[0].not_active, 0);
    assert.equal(rows[0].not_positive, 0, "the gate demands price > 0, not >= 0");
    assert.equal(rows[0].wrong_currency, 0);
    // price_source 'adopted' is what distinguishes a price carried over from
    // the legacy row from one a human typed.
    assert.equal(rows[0].wrong_source, 0);
  });
});

dbTest("no Seller ended up with two offers carrying the same SKU", async () => {
  // uq_seller_offers_business_sku enforces this, and 366 of the 375 legacy
  // products carry a SKU with nothing guaranteeing they are distinct. The
  // script drops the SKU on a clash rather than letting the insert fail,
  // because an offer with no SKU is a real offer and a failed insert is a
  // product that stays unsellable.
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select count(*)::int as n from (
         select business_id, sku from public.seller_offers
          where sku is not null and archived_at is null
          group by 1, 2 having count(*) > 1) x`,
    );
    assert.equal(rows[0].n, 0);
  });
});

dbTest("every offer has an inventory row, and NULL stock did not become IN_STOCK", async () => {
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select count(*)::int as offers,
              count(*) filter (where i.id is null)::int as without_inventory,
              count(*) filter (where i.availability is null)::int as null_availability
         from public.seller_offers o
         join public.product_variants v on v.id = o.product_variant_id
         join public.catalog_products p on p.id = v.catalog_product_id
         join public.product_drafts d on d.id = p.origin_draft_id
         join public.raw_import_records r on r.id = d.raw_import_record_id
         left join public.inventory i on i.seller_offer_id = o.id
        where r.source_system = 'legacy_business_products'`,
    );
    assert.equal(rows[0].without_inventory, 0, "no_availability is a gate condition");
    assert.equal(rows[0].null_availability, 0);
  });
});

// ─── and what it still is not ────────────────────────────────────────────────

dbTest("it created no product_media, and approved none", async () => {
  // The point of the whole file. OD-3 makes an approved image mandatory, and
  // approving one asserts we may use it - D-7's open question, with 69 legacy
  // products carrying no image at all and 91 flagged "Needs manual image
  // research". If this assertion ever fails, a script has made a rights claim
  // on somebody's behalf.
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select count(*)::int as media,
              count(*) filter (where m.approved_at is not null)::int as approved
         from public.product_media m
         join public.catalog_products p on p.id = m.catalog_product_id
         join public.product_drafts d on d.id = p.origin_draft_id
         join public.raw_import_records r on r.id = d.raw_import_record_id
        where r.source_system = 'legacy_business_products'`,
    );
    assert.equal(rows[0].approved, 0,
      "no script may assert that we are allowed to use a supplier's photograph");
  });
});

dbTest("nothing it touched became PUBLISHED", async () => {
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select count(*)::int as n ${LEGACY} and p.publication_state <> 'UNPUBLISHED'`,
    );
    assert.equal(rows[0].n, 0);
  });
});

dbTest("a completed product satisfies three gate conditions and fails the fourth", async () => {
  // Stated as one assertion because it is one fact: this script moves a
  // product from failing four conditions to failing exactly one, and the
  // remaining one is not a bug to fix in code.
  await withDb(async (client) => {
    const { rows } = await client.query(
      `with gate as (
         select p.id,
                (select count(*) from public.product_variants v
                  where v.catalog_product_id = p.id and v.status = 'ACTIVE'
                    and v.archived_at is null)::int as variants,
                (select count(*) from public.product_variants v
                  join public.seller_offers o on o.product_variant_id = v.id
                 where v.catalog_product_id = p.id and o.status = 'ACTIVE'
                   and o.price > 0 and o.archived_at is null)::int as priced_offers,
                (select count(*) from public.product_variants v
                  join public.seller_offers o on o.product_variant_id = v.id
                  join public.inventory i on i.seller_offer_id = o.id
                 where v.catalog_product_id = p.id
                   and i.availability is not null)::int as availability,
                (select count(*) from public.product_media m
                  where m.catalog_product_id = p.id
                    and m.approved_at is not null)::int as approved_images
           ${LEGACY}
       )
       select count(*)::int as completed,
              count(*) filter (where variants = 0)::int as missing_variant,
              count(*) filter (where priced_offers = 0)::int as missing_priced_offer,
              count(*) filter (where availability = 0)::int as missing_availability,
              count(*) filter (where approved_images = 0)::int as missing_approved_image
         from gate where variants > 0`,
    );
    if (rows[0].completed === 0) return;
    assert.equal(rows[0].missing_variant, 0);
    assert.equal(rows[0].missing_priced_offer, 0);
    assert.equal(rows[0].missing_availability, 0);
    assert.equal(rows[0].missing_approved_image, rows[0].completed,
      "every one of them still lacks an approved image - that is the honest state");
  });
});
