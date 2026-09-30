// Cart resolution has to see the whole catalogue. A page is capped at 200,
// and a line that only exists on the next page is still for sale.
// Checkout drops the one line a 409 PRODUCT_UNAVAILABLE names.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CATALOGUE_PAGE_SIZE,
  REMOVED_UNAVAILABLE_ITEM_HE,
  cartLinesForUnavailable,
  cataloguePageComplete,
  fetchAllCatalogueIds,
  readProductUnavailable,
  removedUnavailableMessage,
} from "../../src/lib/cartCatalogue.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFileSync(path.join(repoRoot, relative), "utf8");

const product = (id) => ({ id, name: id, price: 10, in_stock: true });

test("a catalogue longer than one page is collected in full", async () => {
  assert.equal(CATALOGUE_PAGE_SIZE, 200);
  const lateId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const calls = [];
  const ids = await fetchAllCatalogueIds(async ({ limit, offset }) => {
    calls.push({ limit, offset });
    if (offset === 0) {
      return {
        products: Array.from({ length: 200 }, (_, index) => product(`early-${index}`)),
        total: 374,
        limit: 200,
        offset: 0,
      };
    }
    return {
      products: [...Array.from({ length: 173 }, (_, index) => product(`late-${index}`)), product(lateId)],
      total: 374,
      limit: 200,
      offset: 200,
    };
  });
  assert.deepEqual(calls, [
    { limit: 200, offset: 0 },
    { limit: 200, offset: 200 },
  ]);
  assert.equal(ids.length, 374);
  assert.equal(ids.includes(lateId), true);
  assert.equal(ids.includes("early-0"), true);
  assert.equal(ids.at(-1), lateId);
});

test("an unpaged body is the whole list, and a full page without a total is not", async () => {
  const unpaged = await fetchAllCatalogueIds(async () => ({
    products: [product("only")],
  }));
  assert.deepEqual(unpaged, ["only"]);
  assert.equal(cataloguePageComplete({ products: [product("a"), product("b")] }, 0), true);

  const calls = [];
  const paged = await fetchAllCatalogueIds(async ({ offset }) => {
    calls.push(offset);
    if (offset === 0) return { products: [product("a"), product("b")], limit: 2 };
    return { products: [product("c")], limit: 2, total: 3 };
  }, 2);
  assert.deepEqual(calls, [0, 2]);
  assert.deepEqual(paged, ["a", "b", "c"]);
});

test("a hidden row on a page is not an id the cart can buy", async () => {
  const ids = await fetchAllCatalogueIds(async () => ({
    products: [
      product("visible"),
      { ...product("hidden"), shop_hidden: true },
    ],
  }));
  assert.deepEqual(ids, ["visible"]);
});

test("PRODUCT_UNAVAILABLE names the line to remove, and other refusals do not", () => {
  const body = {
    error: "המוצר אינו זמין לרכישה. אפשר להמשיך עם שאר הפריטים בעגלה.",
    details: { code: "PRODUCT_UNAVAILABLE", product_id: "gone-id" },
  };
  assert.deepEqual(readProductUnavailable(409, body), { productId: "gone-id" });
  assert.equal(readProductUnavailable(409, { error: "Product is out of stock", details: { code: "OUT_OF_STOCK" } }), null);
  assert.equal(readProductUnavailable(400, body), null);
  assert.equal(readProductUnavailable(409, null), null);

  const items = [
    { id: "line-gone", productId: "gone-id", name: "נעלם" },
    { id: "line-keep", productId: "keep-id", name: "נשאר" },
    { id: "line-gone-2", productId: "gone-id", name: "נעלם" },
  ];
  assert.deepEqual(
    cartLinesForUnavailable(items, "gone-id").map((line) => line.id),
    ["line-gone", "line-gone-2"],
  );
  assert.deepEqual(cartLinesForUnavailable(items, null), []);
  assert.equal(removedUnavailableMessage("נעלם"), "נעלם הוסר מהעגלה כי הוא כבר לא זמין");
  assert.equal(removedUnavailableMessage(""), REMOVED_UNAVAILABLE_ITEM_HE);
  assert.match(REMOVED_UNAVAILABLE_ITEM_HE, /הוסר מהעגלה כי הוא כבר לא זמין/);
});

test("checkout and the cart hook use the catalogue walk and the 409 removal", () => {
  const hook = read("src/lib/usePublicCatalogueIds.ts");
  assert.match(hook, /fetchAllCatalogueIds\(getShopProductsPage\)/);
  assert.doesNotMatch(hook, /getPublicShopProducts\(\)/);
  const api = read("src/lib/mipoApi.ts");
  assert.match(api, /view: "storefront"/);
  assert.match(api, /limit: String\(page\.limit\)/);
  assert.match(api, /offset: String\(page\.offset\)/);

  const checkout = read("src/pages/Checkout.tsx");
  assert.match(checkout, /readProductUnavailable\(error\.status, error\.body\)/);
  assert.match(checkout, /cartLinesForUnavailable\(items, unavailable\.productId\)/);
  assert.match(checkout, /removeFromCart\(line\.id\)/);
  assert.match(checkout, /navigate\("\/cart", \{ replace: true, state: \{ removedNotice: notice \} \}\)/);
  assert.match(checkout, /data-testid="removed-unavailable"/);

  const index = read("server/src/index.js");
  assert.match(index, /error\.code = PRODUCT_UNAVAILABLE_CODE/);
  assert.match(read("server/src/shopVisibility.js"), /PRODUCT_UNAVAILABLE_CODE = "PRODUCT_UNAVAILABLE"/);
  assert.match(index, /error\.productId = row\.id/);
  assert.match(index, /product_id: error\.productId/);
});
