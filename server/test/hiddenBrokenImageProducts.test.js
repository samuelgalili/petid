// The 25 in-stock products whose main image is a broken external hotlink,
// hidden without deleting them and without changing stock.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { searchCatalog } from "../src/catalogSearch.js";
import { buildCatalogSearch } from "../src/catalogRecommendations.js";
import {
  CHECKOUT_UNAVAILABLE_HE,
  UNAVAILABLE_ITEM_HE,
  chargeableSubtotal,
  matchesCategory,
  partitionCartByCatalogue,
  productSitemapPaths,
  productsInCategory,
  publiclyVisibleProduct,
  visibleShopProducts,
} from "../src/shopVisibility.js";
import {
  BROKEN_IMAGE_PRODUCTS,
  assertAllowlisted,
  blockingActions,
  parseMode,
  planShopVisibility,
  unexpectedIds,
} from "../scripts/hideBrokenImageProducts.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFileSync(path.join(repoRoot, relative), "utf8");

const hiddenId = BROKEN_IMAGE_PRODUCTS[0].id;
const otherId = "11111111-1111-4111-8111-111111111111";

const catalogue = [
  {
    id: hiddenId,
    name: "קוואטרו מוסתר",
    category: "מזון",
    category_id: "cat-food",
    category_slug: "food",
    category_name: "מזון",
    shop_hidden: true,
    in_stock: true,
    price: 120,
  },
  {
    id: otherId,
    name: "חטיף עוף",
    category: "מזון",
    category_id: "cat-food",
    category_slug: "food",
    category_name: "מזון",
    shop_hidden: false,
    in_stock: true,
    price: 40,
  },
];

test("the allowlist is the 25 broken main images, and nothing else", () => {
  assert.equal(BROKEN_IMAGE_PRODUCTS.length, 25);
  const ids = BROKEN_IMAGE_PRODUCTS.map((entry) => entry.id);
  assert.equal(new Set(ids).size, 25);
  const ken = BROKEN_IMAGE_PRODUCTS.filter((entry) => entry.source_domain === "ken-hatuki.co.il");
  const speedog = BROKEN_IMAGE_PRODUCTS.filter((entry) => entry.source_domain === "speedog.co.il");
  assert.equal(ken.length, 23);
  assert.equal(speedog.length, 2);
  assert.ok(ken.every((entry) => entry.reason.includes("HTTP 202")));
  assert.ok(speedog.every((entry) => entry.reason.includes("403")));
  assert.equal(BROKEN_IMAGE_PRODUCTS.some((entry) => entry.source_domain === "foodforafriend.co.il"), false);
});

test("the doc names every id, name and domain, and how to restore them", () => {
  const doc = read("docs/hidden-products-2026-09-27.md");
  for (const entry of BROKEN_IMAGE_PRODUCTS) {
    assert.ok(doc.includes(entry.id), entry.id);
    assert.ok(doc.includes(entry.name), entry.name);
    assert.ok(doc.includes(entry.source_domain), entry.source_domain);
    assert.ok(doc.includes(entry.public_path), entry.public_path);
  }
  assert.match(doc, /HIDE-BROKEN-IMAGES/);
  assert.match(doc, /UNHIDE-BROKEN-IMAGES/);
  assert.match(doc, /previous_shop_hidden/);
  assert.match(doc, /`in_stock` is not changed/);
});

test("an id that is not on the list is refused", () => {
  const stranger = "00000000-0000-4000-8000-000000000099";
  assert.throws(() => assertAllowlisted(stranger), /not on the broken-image list/);
  assert.deepEqual(unexpectedIds([`--product=${stranger}`]), [stranger]);
  assert.deepEqual(unexpectedIds([`--mode=hide`]), []);
  assert.equal(parseMode([]), "dry-run");
  assert.equal(parseMode(["--mode=unhide"]), "unhide");
  assert.throws(() => parseMode(["--mode=apply"]), /dry-run, hide or unhide/);
});

test("hide records the previous visibility and a second hide does not overwrite it", () => {
  const id = hiddenId;
  const rows = new Map([[id, { id, in_stock: true, shop_hidden: false }]]);
  const holds = new Map();
  const first = planShopVisibility("hide", rows, holds)[0];
  assert.equal(first.action, "hide");
  assert.equal(first.write, true);
  assert.equal(first.restore_to, false);
  assert.equal(first.in_stock, true);

  const after = planShopVisibility(
    "hide",
    new Map([[id, { id, in_stock: true, shop_hidden: true }]]),
    new Map([[id, { product_id: id, previous_shop_hidden: false }]]),
  )[0];
  assert.equal(after.action, "already-hidden");
  assert.equal(after.write, false);
  assert.equal(after.recorded_previous_shop_hidden, false);
});

test("unhide restores the recorded value, including a value that was already hidden", () => {
  const id = hiddenId;
  const hidden = planShopVisibility(
    "unhide",
    new Map([[id, { id, in_stock: true, shop_hidden: true }]]),
    new Map([[id, { product_id: id, previous_shop_hidden: false }]]),
  )[0];
  assert.equal(hidden.action, "unhide");
  assert.equal(hidden.restore_to, false);
  assert.equal(hidden.in_stock, true);

  const wasAlreadyHidden = planShopVisibility(
    "unhide",
    new Map([[id, { id, in_stock: false, shop_hidden: true }]]),
    new Map([[id, { product_id: id, previous_shop_hidden: true }]]),
  )[0];
  assert.equal(wasAlreadyHidden.restore_to, true);
  assert.equal(wasAlreadyHidden.in_stock, false);

  const noRecord = planShopVisibility(
    "unhide",
    new Map([[id, { id, in_stock: true, shop_hidden: true }]]),
    new Map(),
  )[0];
  assert.equal(noRecord.action, "refuse-no-record");
  assert.equal(noRecord.write, false);
  assert.ok(blockingActions.has(noRecord.action));
});

test("dry-run writes nothing and still reports a missing id", () => {
  const plans = planShopVisibility("dry-run", new Map(), new Map());
  assert.equal(plans.length, 25);
  assert.ok(plans.every((plan) => plan.write === false));
  assert.ok(plans.every((plan) => plan.action === "missing"));
});

test("a hidden product is absent from the shop list, search, category pages and sitemap paths", () => {
  const visible = visibleShopProducts(catalogue);
  assert.deepEqual(visible.map((product) => product.id), [otherId]);

  assert.ok(searchCatalog(catalogue, "קוואטרו").some((product) => product.id === hiddenId));
  assert.equal(
    searchCatalog(visible, "קוואטרו").some((product) => product.id === hiddenId),
    false,
  );

  const category = productsInCategory(catalogue, "cat-food");
  assert.deepEqual(category.map((product) => product.id), [otherId]);
  assert.equal(matchesCategory(catalogue[0], "cat-food"), true);
  assert.equal(productsInCategory(catalogue, "food").some((product) => product.id === hiddenId), false);

  const paths = productSitemapPaths(catalogue);
  assert.deepEqual(paths, [`/product/${otherId}`]);
  assert.equal(paths.some((entry) => entry.includes(hiddenId)), false);

  const { sql } = buildCatalogSearch(["חטיף"], null);
  assert.match(sql, /coalesce\(p\.shop_hidden, false\) = false/);
  assert.match(sql, /coalesce\(p\.in_stock, true\) = true/);
});

test("the static sitemap has no product urls and none of the hidden ids", () => {
  const sitemap = read("public/sitemap.xml");
  assert.doesNotMatch(sitemap, /\/product\//);
  for (const entry of BROKEN_IMAGE_PRODUCTS) {
    assert.equal(sitemap.includes(entry.id), false, entry.id);
  }
});

test("a public product url is a 404 for a hidden product, and a full view still sees it", () => {
  const hidden = catalogue[0];
  assert.equal(publiclyVisibleProduct(hidden, "public"), null);
  assert.equal(publiclyVisibleProduct(hidden, "full"), hidden);
  assert.equal(publiclyVisibleProduct(catalogue[1], "public"), catalogue[1]);
  assert.equal(publiclyVisibleProduct(null, "public"), null);

  const page = read("src/pages/ProductDetailAws.tsx");
  assert.match(page, /המוצר לא נמצא/);
  assert.match(page, /isError \|\| !product/);
});

test("a cart keeps the hidden line visible, drops it from the total, and can still buy the rest", () => {
  const items = [
    { id: "line-hidden", productId: hiddenId, name: "מוסתר", price: 120, quantity: 2 },
    { id: "line-ok", productId: otherId, name: "נשאר", price: 40, quantity: 3 },
  ];
  const partition = partitionCartByCatalogue(items, [otherId]);
  assert.deepEqual(partition.unavailable.map((item) => item.productId), [hiddenId]);
  assert.deepEqual(partition.available.map((item) => item.productId), [otherId]);
  assert.equal(chargeableSubtotal(items), 120 * 2 + 40 * 3);
  assert.equal(chargeableSubtotal(partition.available), 120);
  assert.equal(chargeableSubtotal(partition.unavailable), 240);

  const unknown = partitionCartByCatalogue(items, null);
  assert.equal(unknown.catalogueKnown, false);
  assert.equal(unknown.unavailable.length, 0);
  assert.equal(chargeableSubtotal(unknown.available), 360);

  const cart = read("src/pages/Cart.tsx");
  const checkout = read("src/pages/Checkout.tsx");
  assert.match(cart, /UNAVAILABLE_ITEM_HE/);
  assert.match(cart, /chargeableSubtotal\(orderItems\)/);
  assert.match(checkout, /UNAVAILABLE_ITEM_HE/);
  assert.match(checkout, /items: orderItems\.map/);
  assert.equal(UNAVAILABLE_ITEM_HE, "המוצר אינו זמין כרגע");
  assert.match(CHECKOUT_UNAVAILABLE_HE, /אפשר להמשיך עם שאר הפריטים בעגלה/);
});

test("order totals and the payment webhook do not grow a special case for a hidden line", () => {
  const index = read("server/src/index.js");
  const amountsStart = index.indexOf("const calculateOrderAmounts = async");
  const amountsEnd = index.indexOf("const mapOrderItem = ", amountsStart);
  const amounts = index.slice(amountsStart, amountsEnd);
  assert.equal(amounts.includes("shop_hidden"), false);
  assert.match(amounts, /orderItems\.reduce/);

  const webhookStart = index.indexOf("const handleCardcomWebhook = async");
  const webhookEnd = index.indexOf("const handleRequest = async", webhookStart);
  const webhook = index.slice(webhookStart, webhookEnd);
  assert.equal(webhook.includes("shop_hidden"), false);

  const refusal = index.indexOf("row.shop_hidden === true");
  const totals = index.indexOf("const amounts = await calculateOrderAmounts");
  assert.ok(refusal > 0 && totals > refusal, "a hidden line is refused before the order total is computed");
  assert.match(index, /new Error\(CHECKOUT_UNAVAILABLE_HE\)/);
  assert.match(index, /publiclyVisibleProduct\(product, view\)/);
  assert.match(index, /matchesCategory\(product, categoryKey\)/);
});

test("the production workflow defaults to dry-run and confirms hide and unhide separately", () => {
  const workflow = read(".github/workflows/production-hide-broken-image-products.yml");
  assert.match(workflow, /name: Hide broken external product images/);
  assert.match(workflow, /default: 'dry-run'/);
  assert.match(workflow, /hide\) expected="HIDE-BROKEN-IMAGES"/);
  assert.match(workflow, /unhide\) expected="UNHIDE-BROKEN-IMAGES"/);
  const confirmAt = workflow.indexOf("mode=$MODE changes production data");
  const sshAt = workflow.indexOf("Configure SSH");
  assert.ok(confirmAt > 0 && confirmAt < sshAt, "confirmation is checked before anything is contacted");
  assert.match(workflow, /backup-before-migrate\.sh/);
  assert.match(workflow, /0061_product_shop_visibility\.sql/);
  assert.match(workflow, /group: aws-production/);

  const script = read("server/scripts/hideBrokenImageProducts.mjs");
  const updates = [...script.matchAll(/update public\.business_products[\s\S]*?returning/g)].map((match) => match[0]);
  assert.equal(updates.length, 2);
  for (const statement of updates) {
    assert.match(statement, /shop_hidden/);
    assert.doesNotMatch(statement, /in_stock/);
    assert.match(statement, /where id = \$1/);
  }
  assert.match(script, /assertAllowlisted\(plan\.id\)/);
  assert.doesNotMatch(script, /delete from public\.business_products/);
});

test("the browser's visibility rules are the server's, character for character", () => {
  const region = (source, label) => {
    const start = source.indexOf("// SHARED_SHOP_VISIBILITY_START");
    const end = source.indexOf("// SHARED_SHOP_VISIBILITY_END");
    assert.ok(start > 0 && end > start, `the shared region was not found in ${label}`);
    return source.slice(start, end).trimEnd();
  };
  const server = region(read("server/src/shopVisibility.js"), "the server copy");
  const client = region(read("src/lib/shopVisibility.ts"), "the browser copy");
  assert.ok(server.length > 500, "the shared region is too small to be the rules");
  assert.equal(client, server);
});

test("the shop listing and the public product fetch both go through the visibility filter", () => {
  const shop = read("src/pages/Shop.tsx");
  assert.match(shop, /getPublicShopProducts\(\)/);
  assert.match(shop, /searchCatalogDetailed\(products, searchQuery\)/);
  assert.match(shop, /in_stock !== false/);
  const api = read("src/lib/mipoApi.ts");
  assert.match(api, /visibleShopProducts\(await getShopProducts\(\)\)/);
  assert.match(read("server/src/health.js"), /shop_hidden/);
});
