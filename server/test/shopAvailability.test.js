// One rule: hidden, no image, or a selling price of 0 is not for sale.
// The two rows QA found are the fixtures: a hidden id that was still served
// at a real price, and a cage whose price is 0.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildSitemapXml } from "../src/publicPages.js";
import {
  PRODUCT_UNAVAILABLE_CODE,
  hasShopImage,
  isShopUnavailable,
  publiclyVisibleProduct,
  purchasableLegacySql,
  purchasableScrapedSql,
  shopSellingPrice,
  visibleShopProducts,
} from "../src/shopVisibility.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFileSync(path.join(repoRoot, relative), "utf8");

const hiddenId = "98e4cc1c-37c1-4008-ac21-bfc1e1310e2a";
const cageId = "0d41a1b7-0000-4000-8000-000000000001";
const sellableId = "11111111-1111-4111-8111-111111111111";

const hidden = {
  id: hiddenId,
  name: "ארמון מוסתר",
  shop_hidden: true,
  price: "199.00",
  image_url: "/uploads/palace.webp",
  in_stock: true,
};

const cage = {
  id: cageId,
  name: "כלוב ארמון",
  shop_hidden: false,
  price: "0.00",
  image_url: "/uploads/cage.webp",
  in_stock: true,
};

const sellable = {
  id: sellableId,
  name: "מזון יבש לכלב",
  shop_hidden: false,
  price: 89,
  image_url: "/placeholder.svg",
  in_stock: true,
};

test("a hidden row, a zero price and a blank image are the same unavailable product", () => {
  assert.equal(isShopUnavailable(hidden), true);
  assert.equal(shopSellingPrice(hidden), 199);
  assert.equal(isShopUnavailable(cage), true);
  assert.equal(shopSellingPrice(cage), 0);
  assert.equal(isShopUnavailable({ ...sellable, image_url: "  ", images: [] }), true);
  assert.equal(hasShopImage({ image_url: "", images: ["/uploads/gallery.webp"] }), true);
  assert.equal(isShopUnavailable({
    price: 40,
    image_url: "",
    images: ["/uploads/gallery.webp"],
  }), false);

  assert.equal(isShopUnavailable(sellable), false);
  assert.equal(isShopUnavailable({ ...sellable, shop_hidden: "true" }), true);
  assert.equal(isShopUnavailable({ ...sellable, shop_hidden: "t" }), true);
  assert.equal(isShopUnavailable(null), true);

  const visible = visibleShopProducts([hidden, cage, sellable, { ...sellable, id: "no-image", image_url: "" }]);
  assert.deepEqual(visible.map((product) => product.id), [sellableId]);
});

test("a public caller loses the row and a full admin view keeps it", () => {
  assert.equal(publiclyVisibleProduct(hidden, "public"), null);
  assert.equal(publiclyVisibleProduct(cage, "public"), null);
  assert.equal(publiclyVisibleProduct({ ...sellable, image_url: "" }, "public"), null);
  assert.equal(publiclyVisibleProduct(sellable, "public")?.id, sellableId);
  assert.equal(publiclyVisibleProduct(hidden, "full")?.id, hiddenId);
  assert.equal(publiclyVisibleProduct(cage, "full")?.id, cageId);
  assert.equal(publiclyVisibleProduct(null, "public"), null);
});

test("the sitemap omits a hidden id, a zero price and a blank image", () => {
  const xml = buildSitemapXml({
    origin: "https://mipo.pet",
    products: [
      { ...sellable, updated_at: "2026-08-01T12:00:00.000Z" },
      { ...hidden, updated_at: "2026-08-01T12:00:00.000Z" },
      { ...cage, updated_at: "2026-08-01T12:00:00.000Z" },
      {
        id: "55555555-5555-4555-8555-555555555555",
        updated_at: "2026-08-01T12:00:00.000Z",
        price: 12,
        image_url: "",
        in_stock: true,
      },
    ],
  });
  assert.match(xml, new RegExp(`/product/${sellableId}`));
  assert.equal(xml.includes(hiddenId), false);
  assert.equal(xml.includes(cageId), false);
  assert.equal(xml.includes("55555555-5555-4555-8555-555555555555"), false);
});

test("catalogue scans apply the same price and image rule in SQL", () => {
  const legacy = purchasableLegacySql("p");
  assert.match(legacy, /coalesce\(p\.shop_hidden, false\) = false/);
  assert.match(legacy, /coalesce\(p\.sale_price, 0\) > 0 or coalesce\(p\.price, 0\) > 0/);
  assert.match(legacy, /p\.image_url/);
  assert.match(legacy, /cardinality\(p\.images\)/);

  const scraped = purchasableScrapedSql("");
  assert.match(scraped, /coalesce\(final_price, 0\) > 0/);
  assert.match(scraped, /main_image_url/);
  assert.throws(() => purchasableLegacySql("p;drop"), /bad sql alias/);

  const pages = read("server/src/publicPages.js");
  assert.match(pages, /purchasableLegacySql\(""\)/);
  assert.match(pages, /purchasableScrapedSql\(""\)/);
  const search = read("server/src/catalogRecommendations.js");
  assert.match(search, /purchasableLegacySql\("p"\)/);
  assert.match(search, /!isShopUnavailable\(row\)/);
});

test("order creation and the product route refuse with PRODUCT_UNAVAILABLE", () => {
  const index = read("server/src/index.js");
  const refusal = index.indexOf("if (isShopUnavailable(row))");
  const totals = index.indexOf("const amounts = await calculateOrderAmounts");
  assert.ok(refusal > 0 && totals > refusal);
  const thrown = index.slice(refusal, refusal + 500);
  assert.match(thrown, /error\.statusCode = 409/);
  assert.match(thrown, /error\.code = PRODUCT_UNAVAILABLE_CODE/);
  assert.match(thrown, /error\.productId = row\.id/);
  assert.equal(PRODUCT_UNAVAILABLE_CODE, "PRODUCT_UNAVAILABLE");

  const priceBackstop = index.indexOf("if (price <= 0)", refusal);
  assert.ok(priceBackstop > refusal);
  const priceThrown = index.slice(priceBackstop, priceBackstop + 350);
  assert.match(priceThrown, /PRODUCT_UNAVAILABLE_CODE/);
  assert.match(priceThrown, /error\.productId = row\.id/);
  // Checkout reads details.product_id on a 409 PRODUCT_UNAVAILABLE and drops that line.
  assert.match(index, /product_id: error\.productId/);

  const byId = index.indexOf("const publicProductMatch");
  const byIdBlock = index.slice(byId, byId + 900);
  assert.match(byIdBlock, /if \(!product\)/);
  assert.match(byIdBlock, /sendError\(response, 404, "Product not found"\)/);
  assert.match(byIdBlock, /sendError\(response, 404, "Product not found", \{ code: PRODUCT_UNAVAILABLE_CODE \}\)/);

  assert.match(index, /image_url: row\.main_image_url \|\| null/);
  assert.doesNotMatch(index, /main_image_url \|\| "\/placeholder\.svg"/);
  assert.match(read("server/src/storefrontProduct.js"), /"shop_hidden"/);
});
