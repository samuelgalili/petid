// Publishing, all the way to the table the shop reads.
//
// The defect this covers is not a crash. `/api/products` serves
// business_products and scraped_products with no WHERE clause; the admin's
// "פרסם לחנות" wrote catalog_products.publication_state; nothing joined the
// two. Every part worked, the button reported success, and the shelf was
// unchanged. A test that asserts publish returned 200, or that the state moved,
// passes over exactly that - which is why the assertions below end at the
// shop's own query rather than at the catalogue's state.
//
// Real database, real rows, one transaction per test that is always rolled
// back, so nothing here is visible to another test file running concurrently.

import assert from "node:assert/strict";
import test from "node:test";

import { BridgeInconsistency, hideFromShop, publishToShop } from "../src/catalogShopBridge.js";

const DATABASE_URL = process.env.DATABASE_URL;
const dbTest = (name, fn) => test(name, { skip: DATABASE_URL ? false : "DATABASE_URL not set" }, fn);

const withDb = async (fn) => {
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: DATABASE_URL, ssl: false });
  await client.connect();
  try {
    await client.query("begin");
    await fn(client);
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end();
  }
};

/**
 * WHAT THE SHOP ACTUALLY ASKS, copied from listProducts() in index.js.
 *
 * No WHERE clause, because listProducts has none - that is the fact this whole
 * bridge exists because of. Asserting against a query of my own with a
 * `where published = true` in it would be testing a shop that does not exist.
 */
const shopSees = async (client, businessProductId) => {
  const { rows } = await client.query(
    `select p.*, c.slug as category_slug
       from public.business_products p
       left join public.product_categories c on c.id = p.category_id
      order by p.created_at desc, p.id`,
  );
  /*
   * BOTH HALVES OF WHAT THE SHOP ACTUALLY DROPS, and they are different facts.
   *
   * `shop_hidden` is the visibility flag migration 0061 added, applied at the
   * public call site in index.js through shopVisibility.js. `in_stock !== false`
   * is the browser's own filter in Shop.tsx, and it is about stock.
   *
   * This helper modelled only the second one while the bridge was written, and
   * that is precisely why the bridge expressed "unpublished" by writing a stock
   * column: the test agreed with the mistake, so nothing went red.
   */
  return rows
    .filter((row) => row.shop_hidden !== true && row.in_stock !== false)
    .find((row) => row.id === businessProductId) ?? null;
};

const seedBusiness = (client) => client.query(
  `insert into public.business_profiles (business_name, business_type, is_verified)
   values ('חנות בדיקה', 'shop', true) returning id`,
).then((r) => r.rows[0].id);

const seedAdmin = (client) => client.query(
  `insert into public.admin_users (email, password_hash, display_name, role, is_active)
   values ($1, 'x', 'בודק', 'admin', true) returning id`,
  [`bridge-${Math.random().toString(36).slice(2, 9)}@example.test`],
).then((r) => r.rows[0].id);

/**
 * A catalogue product that satisfies the gate: a category, an active variant,
 * a priced active offer, inventory, and an approved image.
 */
const seedPublishable = async (client, {
  name = "רויאל קנין רנאל", price = 90, salePrice = null,
  availability = "IN_STOCK", approveImage = true,
} = {}) => {
  const businessId = await seedBusiness(client);
  const adminId = await seedAdmin(client);

  // The name is randomised as well as the slug: idx_product_categories_root_name
  // is unique across root categories, so a fixed name collides with the second
  // test in the file.
  const suffix = Math.random().toString(36).slice(2, 9);
  const category = await client.query(
    `insert into public.product_categories (slug, name_he) values ($1, $2) returning id`,
    [`cat-${suffix}`, `מזון ${suffix}`],
  ).then((r) => r.rows[0].id);

  const draftId = await client.query(
    `insert into public.product_drafts (business_id, created_by, name) values ($1, $2, $3) returning id`,
    [businessId, adminId, name],
  ).then((r) => r.rows[0].id);

  const productId = await client.query(
    `insert into public.catalog_products
       (owning_business_id, origin_draft_id, name, description, brand, category_id, created_by)
     values ($1, $2, $3, 'תיאור', 'Royal Canin', $4, $5) returning id`,
    [businessId, draftId, name, category, adminId],
  ).then((r) => r.rows[0].id);

  const addOffer = async (offerPrice, offerSale, label, stock) => {
    const variantId = await client.query(
      `insert into public.product_variants
         (catalog_product_id, options, option_signature, label, status, is_default, created_by)
       values ($1, $2, $3, $4, 'ACTIVE', $5, $6) returning id`,
      [productId, { size: label }, `sig-${label}-${Math.random().toString(36).slice(2, 8)}`,
        label, label === "4kg", adminId],
    ).then((r) => r.rows[0].id);

    const offerId = await client.query(
      `insert into public.seller_offers
         (business_id, product_variant_id, price, sale_price, sku, status, created_by)
       values ($1, $2, $3, $4, $5, 'ACTIVE', $6) returning id`,
      [businessId, variantId, offerPrice, offerSale, `SKU-${label}`, adminId],
    ).then((r) => r.rows[0].id);

    await client.query(
      "insert into public.inventory (seller_offer_id, availability, quantity) values ($1, $2, 5)",
      [offerId, stock],
    );
    return { variantId, offerId };
  };

  const main = await addOffer(price, salePrice, "4kg", availability);

  // approved_at and approved_by travel together - product_media_approved_has_approver
  // refuses an approval with nobody's name on it, which is the right rule and
  // the reason this fixture cannot just set a timestamp.
  await client.query(
    `insert into public.product_media
       (catalog_product_id, source_url, storage_path, checksum, adopted_at,
        approved_at, approved_by, display_order, created_by)
     values ($1, 'https://supplier.example/a.jpg', '/uploads/bridge-a.jpg', 'sum', now(), $2, $3, 0, $4)`,
    [productId, approveImage ? new Date() : null, approveImage ? adminId : null, adminId],
  );

  return { businessId, adminId, productId, category, ...main, addOffer };
};

// ─── the thing itself ────────────────────────────────────────────────────────

dbTest("publishing puts the product in the table the shop reads", async () => {
  await withDb(async (client) => {
    const { productId, adminId } = await seedPublishable(client);

    const before = await client.query("select count(*)::int as n from public.business_products");

    const result = await publishToShop(client, productId, adminId);
    const row = await shopSees(client, result.business_product_id);

    assert.ok(row, "the published product is not in the shop's own query");
    assert.equal(row.name, "רויאל קנין רנאל");
    assert.equal(Number(row.price), 90);
    assert.equal(row.in_stock, true);
    assert.equal(row.catalog_product_id, productId);

    const after = await client.query("select count(*)::int as n from public.business_products");
    assert.equal(after.rows[0].n - before.rows[0].n, 1, "publishing wrote more than one listing");
  });
});

dbTest("publishing twice updates the same listing rather than adding a second", async () => {
  // A price change, a replaced image, unpublish-then-publish. Each is a second
  // publish, and a second listing would put the product on the shelf twice with
  // two ids - which is how a shop ends up with a duplicate nobody can explain.
  await withDb(async (client) => {
    const { productId, adminId, offerId } = await seedPublishable(client);

    const first = await publishToShop(client, productId, adminId);
    await client.query("update public.seller_offers set price = 111 where id = $1", [offerId]);
    const second = await publishToShop(client, productId, adminId);

    assert.equal(second.business_product_id, first.business_product_id,
      "the second publish created a second listing");

    const row = await shopSees(client, second.business_product_id);
    assert.equal(Number(row.price), 111, "the shop kept the stale price");
  });
});

dbTest("the shop row carries the cheapest active offer, by what the customer pays", async () => {
  /*
   * The owner's decision, and the trap inside it. A ₪120 offer on sale at ₪79
   * is cheaper than a plain ₪99 one. Ordering by list price picks the ₪99 offer
   * and the shop then shows ₪99 while the cheaper variant exists - so the rule
   * has to compare what is actually charged.
   */
  await withDb(async (client) => {
    const { productId, adminId, addOffer } = await seedPublishable(client, { price: 99 });
    const discounted = await addOffer(120, 79, "12kg", "IN_STOCK");

    const result = await publishToShop(client, productId, adminId);
    const row = await shopSees(client, result.business_product_id);

    assert.equal(Number(row.price), 120);
    assert.equal(Number(row.sale_price), 79);
    assert.equal(row.shop_offer_id, discounted.offerId,
      "the listing does not record which offer its price came from");
  });
});

dbTest("a product with no stock reaches the table and stays out of the shop", async () => {
  // Published and not on sale are two different facts now. The row exists so
  // that restocking is an inventory change rather than a republish, and the
  // shop's own filter keeps it off the shelf.
  await withDb(async (client) => {
    const { productId, adminId } = await seedPublishable(client, { availability: "OUT_OF_STOCK" });

    const result = await publishToShop(client, productId, adminId);

    assert.equal(result.in_stock, false);
    assert.equal(result.availability, "OUT_OF_STOCK");
    // Out of stock is not hidden. The two facts stay apart: this product is
    // published and visible, and simply has nothing to sell.
    assert.equal(result.shop_hidden, false);
    assert.equal(await shopSees(client, result.business_product_id), null,
      "an out-of-stock product is on the shelf");

    const { rows } = await client.query(
      "select in_stock from public.business_products where id = $1", [result.business_product_id],
    );
    assert.equal(rows[0].in_stock, false, "the listing was not written at all");
  });
});

dbTest("PREORDER is not a shop state, and is not shown as buyable", async () => {
  // The schema allows IN_STOCK, OUT_OF_STOCK, PREORDER and DISCONTINUED. The
  // shop has one boolean. Anything that is not IN_STOCK sells something nobody
  // can ship today, so it projects to false.
  await withDb(async (client) => {
    const { productId, adminId } = await seedPublishable(client, { availability: "PREORDER" });
    const result = await publishToShop(client, productId, adminId);
    assert.equal(result.in_stock, false);
    assert.equal(await shopSees(client, result.business_product_id), null);
  });
});

dbTest("an unapproved image is never the one shown, even when it sorts first", async () => {
  /*
   * D-7 keeps source_url on the row; it is not what a customer is served.
   *
   * THE FIRST VERSION OF THIS TEST PROVED NOTHING. It asserted that the image
   * was the approved storage_path against a fixture whose only media row WAS
   * the approved one - so deleting the `approved_at is not null` check left it
   * green. A rule about which of several rows wins cannot be tested with one
   * row.
   *
   * So there are two now, and the unapproved one is ordered first: it is what a
   * bridge that forgot to check approval would pick, and it carries a
   * storage_path of its own so the difference is visible rather than a null.
   */
  await withDb(async (client) => {
    const { productId, adminId } = await seedPublishable(client);

    await client.query(
      `insert into public.product_media
         (catalog_product_id, source_url, storage_path, checksum, adopted_at, display_order, created_by)
       values ($1, 'https://supplier.example/unapproved.jpg', '/uploads/not-approved.jpg',
               'sum2', now(), -1, $2)`,
      [productId, adminId],
    );

    const result = await publishToShop(client, productId, adminId);
    const row = await shopSees(client, result.business_product_id);

    assert.equal(row.image_url, "/uploads/bridge-a.jpg",
      "the shop is showing an image nobody approved");
    assert.ok(!String(row.image_url).includes("supplier.example"),
      "the shop is serving the supplier's own URL");
    assert.ok(!row.images.includes("/uploads/not-approved.jpg"),
      "the unapproved image reached the gallery even if not the cover");
  });
});

// ─── withdrawal ──────────────────────────────────────────────────────────────

dbTest("unpublishing takes the product off the shelf", async () => {
  /*
   * THE MORE EXPENSIVE HALF. A publish that does nothing is an annoyance; an
   * unpublish that does nothing leaves a withdrawn product on sale, and
   * somebody buys it.
   */
  await withDb(async (client) => {
    const { productId, adminId } = await seedPublishable(client);
    const result = await publishToShop(client, productId, adminId);
    assert.ok(await shopSees(client, result.business_product_id), "not on the shelf to begin with");

    const withdrawn = await hideFromShop(client, productId);

    assert.equal(withdrawn, 1);
    assert.equal(await shopSees(client, result.business_product_id), null,
      "the product is still on sale after being unpublished");
  });
});

dbTest("the withdrawn listing is kept, so republishing lands on it", async () => {
  // The owner's decision: the row stays. Deleting it would mint a new id on
  // every republish and orphan the product id on orders already placed.
  await withDb(async (client) => {
    const { productId, adminId } = await seedPublishable(client);
    const first = await publishToShop(client, productId, adminId);
    await hideFromShop(client, productId);

    const { rows } = await client.query(
      "select id, in_stock, shop_hidden from public.business_products where catalog_product_id = $1",
      [productId],
    );
    assert.equal(rows.length, 1, "the listing was removed rather than hidden");
    assert.equal(rows[0].shop_hidden, true);
    // AND THE STOCK IS UNTOUCHED. Withdrawing a product does not empty the
    // shelf it is sitting on, and the warehouse reads this column.
    assert.equal(rows[0].in_stock, true, "unpublishing wrote a stock fact");

    const second = await publishToShop(client, productId, adminId);
    assert.equal(second.business_product_id, first.business_product_id);
    assert.ok(await shopSees(client, second.business_product_id), "republishing did not restore it");
  });
});

dbTest("withdrawing a product that was never bridged reports nothing to do", async () => {
  // Every product published before this bridge existed. Not an error; there is
  // no listing to withdraw. It must not throw, or unpublish breaks for exactly
  // the products that predate the fix.
  await withDb(async (client) => {
    const { productId } = await seedPublishable(client);
    assert.equal(await hideFromShop(client, productId), 0);
  });
});

// ─── the bridge and the gate must not disagree ───────────────────────────────

dbTest("a product with no priced offer is refused rather than listed at zero", async () => {
  /*
   * `no_priced_offer` is one of the gate's seven conditions and the gate runs
   * immediately before this, in the same transaction. So this state means the
   * gate and the bridge disagree about what "priced" means - and the failure
   * has to be loud, because the quiet version is a ₪0 product on a live shop.
   */
  await withDb(async (client) => {
    const { productId, adminId, offerId } = await seedPublishable(client);
    await client.query("update public.seller_offers set status = 'INACTIVE' where id = $1", [offerId]);

    await assert.rejects(
      () => publishToShop(client, productId, adminId),
      (error) => {
        assert.ok(error instanceof BridgeInconsistency);
        assert.match(error.message, /no priced active offer/);
        return true;
      },
    );
  });
});

dbTest("a product with no approved image is refused rather than listed blank", async () => {
  await withDb(async (client) => {
    const { productId, adminId } = await seedPublishable(client, { approveImage: false });

    await assert.rejects(
      () => publishToShop(client, productId, adminId),
      (error) => {
        assert.ok(error instanceof BridgeInconsistency);
        assert.match(error.message, /no approved image/);
        return true;
      },
    );
  });
});

dbTest("an archived variant's offer is not what the shop is sold at", async () => {
  // Archiving a variant is how a size is discontinued. Its offer row survives,
  // and a bridge that read offers without checking the variant would keep
  // selling the discontinued size - at its price, which is usually the low one.
  await withDb(async (client) => {
    const { productId, adminId, addOffer } = await seedPublishable(client, { price: 99 });
    const old = await addOffer(40, null, "1kg", "IN_STOCK");
    await client.query(
      "update public.product_variants set archived_at = now() where id = $1", [old.variantId],
    );

    const result = await publishToShop(client, productId, adminId);
    const row = await shopSees(client, result.business_product_id);

    assert.equal(Number(row.price), 99, "the shop took the archived variant's price");
  });
});

// ─── the legacy shelf is not touched ─────────────────────────────────────────

dbTest("products that did not come from the catalogue are left alone", async () => {
  /*
   * 375 legacy products are the shop. They carry catalog_product_id null, and
   * a bridge that matched on anything looser - name, sku, business - would
   * start overwriting them. The unique index is partial for this reason: null
   * is not a conflict, so any number of legacy rows coexist.
   */
  await withDb(async (client) => {
    const businessId = await seedBusiness(client);
    const legacy = await client.query(
      `insert into public.business_products (business_id, name, price, image_url)
       values ($1, 'רויאל קנין רנאל', 55, '/uploads/legacy.jpg') returning id`,
      [businessId],
    ).then((r) => r.rows[0].id);

    // Same name, same business, published from the catalogue.
    const { productId, adminId } = await seedPublishable(client, { name: "רויאל קנין רנאל" });
    const result = await publishToShop(client, productId, adminId);

    assert.notEqual(result.business_product_id, legacy, "publishing overwrote a legacy listing");

    const { rows } = await client.query(
      "select price, in_stock, catalog_product_id from public.business_products where id = $1", [legacy],
    );
    assert.equal(Number(rows[0].price), 55, "the legacy row's price was changed");
    assert.equal(rows[0].in_stock, true);
    assert.equal(rows[0].catalog_product_id, null);
  });
});

dbTest("two legacy rows with no catalogue link do not collide", async () => {
  await withDb(async (client) => {
    const businessId = await seedBusiness(client);
    for (const name of ["אחד", "שניים"]) {
      await client.query(
        `insert into public.business_products (business_id, name, price, image_url)
         values ($1, $2, 10, '/uploads/x.jpg')`,
        [businessId, name],
      );
    }
    const { rows } = await client.query(
      "select count(*)::int as n from public.business_products where catalog_product_id is null and business_id = $1",
      [businessId],
    );
    assert.equal(rows[0].n, 2, "the unique index is not partial, so legacy rows collide on null");
  });
});
