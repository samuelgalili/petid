import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { clipPlainText, stripImportArtifact } from "../src/productText.js";
import { pageWindow, pickStorefrontProduct } from "../src/storefrontProduct.js";
import {
  buildSitemapXml,
  classifyPath,
  createPublicPageRenderer,
  documentTitle,
  listInStockSitemapProducts,
  publicOrigin,
} from "../src/publicPages.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFileSync(path.join(repoRoot, relative), "utf8");
const shell = read("index.html");
const productId = "1dbfeceb-52f8-480a-8540-17479194ae48";

const renderer = (overrides = {}) => createPublicPageRenderer({
  origin: "https://mipo.pet",
  template: shell,
  loadProduct: async (id) => (id === productId ? {
    id,
    name: "גארד כלבים | MIPO",
    description: "שם המוצר | משקל\nמזון יבש לגורים ולאימהות, שק של 3 ק״ג, עם חלבון מן החי.",
    image_url: "/uploads/dog-food.webp",
    price: 89,
    sale_price: 79,
    in_stock: true,
    brand: "גארד",
  } : null),
  loadSitemapProducts: async () => ([
    { id: productId, updated_at: "2026-08-01T12:00:00.000Z" },
    { id: productId, updated_at: "2026-08-02T12:00:00.000Z" },
    { id: "not-a-uuid", updated_at: "2026-08-01T12:00:00.000Z" },
    { id: "22222222-2222-4222-8222-222222222222", in_stock: false, updated_at: "2026-08-01T12:00:00.000Z" },
  ]),
  ...overrides,
});

const htmlOf = async (pathname, pageRenderer = renderer()) => {
  const result = await pageRenderer(pathname);
  return { ...result, html: result.body.toString("utf8") };
};

test("a title is branded once", () => {
  assert.equal(documentTitle("גארד כלבים | MIPO"), "גארד כלבים | MIPO");
  assert.equal(documentTitle("גארד כלבים | MIPO | MIPO"), "גארד כלבים | MIPO");
  assert.equal(documentTitle("חנות"), "חנות | MIPO");
  assert.equal(documentTitle("MIPO — הבית של חיית המחמד"), "MIPO — הבית של חיית המחמד");
});

test("the import header is not a description", () => {
  assert.equal(stripImportArtifact("שם המוצר | משקל"), "");
  assert.equal(stripImportArtifact("שם המוצר | משקל | גארד כלבים 3 ק״ג"), "גארד כלבים 3 ק״ג");
  assert.equal(stripImportArtifact("שם המוצר | משקל\nמזון יבש"), "מזון יבש");
  assert.equal(clipPlainText(`<b>שם המוצר | משקל</b>\n${"א".repeat(200)}`), `${"א".repeat(154)}…`);
});

test("home, shop, support and each legal page carry their own canonical", async () => {
  const home = await htmlOf("/");
  assert.equal(home.status, 200);
  assert.match(home.html, /<title>MIPO — הבית של חיית המחמד<\/title>/);
  assert.match(home.html, /rel="canonical" href="https:\/\/mipo\.pet\/"/);
  assert.doesNotMatch(home.html, /"price": "0"/);
  assert.doesNotMatch(home.html, /"price":"0"/);

  const shop = await htmlOf("/shop");
  assert.equal(shop.status, 200);
  assert.match(shop.html, /<title>חנות \| MIPO<\/title>/);
  assert.match(shop.html, /rel="canonical" href="https:\/\/mipo\.pet\/shop"/);
  assert.match(shop.html, /property="og:url" content="https:\/\/mipo\.pet\/shop"/);
  assert.match(shop.html, /property="og:image" content="https:\/\/mipo\.pet\/og-default\.png"/);
  assert.match(shop.html, /name="twitter:card" content="summary_large_image"/);

  for (const path of ["/terms", "/privacy-policy", "/accessibility", "/club-terms", "/support"]) {
    const page = await htmlOf(path);
    assert.equal(page.status, 200, path);
    assert.match(page.html, new RegExp(`rel="canonical" href="https://mipo\\.pet${path}"`));
    assert.doesNotMatch(page.html, /rel="canonical" href="https:\/\/mipo\.pet\/"/);
  }
});

test("a product page carries the product, the price, and one brand suffix", async () => {
  const page = await htmlOf(`/product/${productId}`);
  assert.equal(page.status, 200);
  assert.match(page.html, /<title>גארד כלבים \| MIPO<\/title>/);
  assert.doesNotMatch(page.html, /MIPO \| MIPO/);
  assert.match(page.html, /מזון יבש לגורים/);
  assert.doesNotMatch(page.html, /שם המוצר \| משקל/);
  assert.match(page.html, /property="og:image" content="https:\/\/mipo\.pet\/uploads\/dog-food\.webp"/);
  assert.match(page.html, /property="og:type" content="product"/);
  assert.match(page.html, /"@type":"Product"/);
  assert.match(page.html, /"priceCurrency":"ILS"/);
  assert.match(page.html, /"price":"79.00"/);
  assert.match(page.html, /schema.org\/InStock/);
  assert.match(page.html, /rel="canonical" href="https:\/\/mipo\.pet\/product\/1dbfeceb-52f8-480a-8540-17479194ae48"/);
});

test("an unknown path and an unknown product are 404 with the shell", async () => {
  const missing = await htmlOf("/this-page-does-not-exist-xyz");
  assert.equal(missing.status, 404);
  assert.match(missing.html, /<div id="root"><\/div>/);
  assert.doesNotMatch(missing.html, /splash-paw/);
  assert.doesNotMatch(missing.html, /טוען\.\.\./);
  assert.match(missing.html, /noindex/);
  assert.match(missing.html, /העמוד לא נמצא/);

  const product = await htmlOf("/product/00000000-0000-4000-8000-000000000000");
  assert.equal(product.status, 404);
  assert.match(product.html, /<div id="root"><\/div>/);
  assert.doesNotMatch(product.html, /splash-paw/);

  assert.equal(classifyPath("/api/health").kind, "api");
  assert.equal((await renderer()("/api/health")), null);
});

test("every client route is a known path, and the catch-all is not", () => {
  const routes = read("src/routes/index.tsx");
  const paths = [...routes.matchAll(/path:\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.ok(paths.includes("/shop"));
  for (const routePath of paths) {
    if (routePath === "*") {
      assert.equal(classifyPath("/this-page-does-not-exist-xyz").kind, "unknown");
      continue;
    }
    const sample = routePath.replace(/:[A-Za-z]+/g, "abc").replace(/\*/g, "extra");
    assert.notEqual(classifyPath(sample).kind, "unknown", sample);
  }
});

test("the sitemap lists public pages and in-stock products, with a real lastmod", () => {
  const xml = buildSitemapXml({
    origin: "https://mipo.pet",
    products: [
      { id: productId, updated_at: "2026-08-01T12:00:00.000Z" },
      { id: productId, updated_at: "2026-09-01T12:00:00.000Z" },
      { id: "not-a-uuid", updated_at: "2026-08-01T12:00:00.000Z" },
      { id: "22222222-2222-4222-8222-222222222222", in_stock: false, updated_at: "2026-08-03T00:00:00.000Z" },
    ],
  });
  assert.match(xml, /<loc>https:\/\/mipo\.pet\/shop<\/loc>/);
  assert.match(xml, /<loc>https:\/\/mipo\.pet\/support<\/loc>/);
  assert.match(xml, /<loc>https:\/\/mipo\.pet\/terms<\/loc>/);
  assert.match(xml, /<loc>https:\/\/mipo\.pet\/data-deletion<\/loc>/);
  assert.match(xml, new RegExp(`<loc>https://mipo\\.pet/product/${productId}</loc><lastmod>2026-08-01</lastmod>`));
  assert.equal(xml.split(productId).length - 1, 1);
  for (const blocked of ["/feed", "/explore", "/auth", "/cart", "/checkout", ">", "<"]) {
    assert.equal(xml.includes(`https://mipo.pet${blocked}<`), false, blocked);
  }
  assert.doesNotMatch(xml, /<loc>https:\/\/mipo\.pet\/<\/loc>/);
  assert.doesNotMatch(xml, /2026-09-01/);
  assert.doesNotMatch(xml, /2026-07-07/);
});

test("sitemap queries keep only in-stock rows, and a missing table does not drop the other", async () => {
  const sql = [];
  const products = await listInStockSitemapProducts(async (statement) => {
    sql.push(statement);
    if (statement.includes("scraped_products")) {
      const error = new Error("missing");
      error.code = "42P01";
      throw error;
    }
    return { rows: [{ id: productId, updated_at: "2026-08-01T00:00:00.000Z" }] };
  });
  assert.match(sql[0], /in_stock is not false/);
  assert.match(sql[0], /shop_hidden/);
  assert.match(sql.find((statement) => statement.includes("scraped_products")), /stock_status/);
  assert.equal(products.length, 1);
});

test("a product lookup is cached", async () => {
  let calls = 0;
  const pageRenderer = renderer({
    loadProduct: async () => {
      calls += 1;
      return { id: productId, name: "גארד", description: "מזון", price: 10, in_stock: true, image_url: "/uploads/a.webp" };
    },
  });
  await pageRenderer(`/product/${productId}`);
  await pageRenderer(`/product/${productId}`);
  assert.equal(calls, 1);
});

test("the storefront view drops the columns the grid does not read", () => {
  const card = pickStorefrontProduct({
    id: "1",
    name: "מזון",
    description: "א".repeat(800),
    price: 10,
    image_url: "/a.webp",
    images: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    feeding_guide: "ארוך",
    source_url: "https://supplier.example/item",
    sku: "SECRET",
    in_stock: true,
  });
  assert.equal(card.feeding_guide, undefined);
  assert.equal(card.source_url, undefined);
  assert.equal(card.sku, undefined);
  assert.equal(card.images.length, 8);
  assert.ok(card.description.length < 800);
  assert.equal(card.name, "מזון");

  const all = pageWindow([card, card], {});
  assert.equal(all.limit, undefined);
  assert.equal(all.products.length, 2);
  const page = pageWindow([1, 2, 3, 4], { limit: "2", offset: "1" });
  assert.deepEqual(page, { products: [2, 3], total: 4, limit: 2, offset: 1 });
});

test("the public origin falls back to the live site", () => {
  assert.equal(publicOrigin("https://mipo.pet/shop"), "https://mipo.pet");
  assert.equal(publicOrigin("https://user:pass@mipo.pet"), "https://mipo.pet");
  assert.equal(publicOrigin(""), "https://mipo.pet");
});

test("a hidden product is not indexable and is not in the sitemap", async () => {
  const hiddenId = "33333333-3333-4333-8333-333333333333";
  const pageRenderer = renderer({
    loadProduct: async () => ({
      id: hiddenId,
      name: "מוצר מוסתר",
      description: "לא לפרסום",
      price: 40,
      in_stock: true,
      shop_hidden: true,
    }),
  });
  const page = await htmlOf(`/product/${hiddenId}`, pageRenderer);
  assert.equal(page.status, 404);
  assert.match(page.html, /noindex/);
  assert.match(page.html, /המוצר לא נמצא/);
  assert.doesNotMatch(page.html, /מוצר מוסתר/);
  assert.doesNotMatch(page.html, /"@type":"Product"/);
  assert.doesNotMatch(page.html, /"price":"40.00"/);

  const xml = buildSitemapXml({
    origin: "https://mipo.pet",
    products: [
      { id: productId, updated_at: "2026-08-01T12:00:00.000Z", shop_hidden: false },
      { id: hiddenId, updated_at: "2026-08-01T12:00:00.000Z", shop_hidden: true, in_stock: true },
    ],
  });
  assert.match(xml, new RegExp(`/product/${productId}`));
  assert.equal(xml.includes(hiddenId), false);
});

test("www redirects to the apex with the path and query, and an empty robots policy is not sent", () => {
  const caddy = read("deploy/aws/Caddyfile");
  const entry = read("deploy/aws/caddy-entrypoint.sh");
  assert.match(entry, /redir https:\/\/\$\{site\}\{uri\} 308/);
  assert.match(entry, /on_demand/);
  assert.match(entry, /omit the www site/);
  assert.match(caddy, /header X-Robots-Tag "\{\$MIPO_ROBOTS_POLICY:all\}"/);
  assert.match(caddy, /response_header_timeout 3s/);
  assert.match(caddy, /rewrite \* \/index\.html/);
  assert.match(read("deploy/local/Caddyfile"), /rewrite \* \/index\.html/);
  const sitemap = caddy.indexOf("handle /sitemap.xml");
  const navigation = caddy.indexOf("reverse_proxy mipo-api:3000");
  assert.ok(sitemap > -1);
  assert.ok(navigation > -1);
  assert.doesNotMatch(caddy, /^\s*try_files\b/m);
  assert.match(caddy, /encode zstd gzip/);
  assert.match(caddy, /max-age=31536000, immutable/);
  assert.match(read("deploy/local/Caddyfile"), /handle \/sitemap\.xml/);
  assert.match(read("deploy/aws/docker-compose.yml"), /MIPO_ROBOTS_POLICY: \$\{MIPO_ROBOTS_POLICY:-all\}/);
});

test("an unset www address becomes www.mipo.pet only for the apex", () => {
  const script = path.join(repoRoot, "deploy/aws/caddy-entrypoint.sh");
  const run = (env) => spawnSync("sh", [script, "--print"], { env: { ...process.env, ...env }, encoding: "utf8" });
  const production = run({ MIPO_SITE_ADDRESS: "mipo.pet", MIPO_WWW_ADDRESS: "", MIPO_ROBOTS_POLICY: "" });
  assert.equal(production.status, 0);
  assert.deepEqual(production.stdout.split("\n").filter(Boolean), ["www.mipo.pet", "all"]);
  const staging = run({ MIPO_SITE_ADDRESS: "staging.mipo.pet", MIPO_WWW_ADDRESS: "", MIPO_ROBOTS_POLICY: "noindex, nofollow" });
  assert.equal(staging.stdout.split("\n")[0], "http://localhost:8081");
  assert.match(staging.stdout, /noindex, nofollow/);
  const explicit = run({ MIPO_SITE_ADDRESS: "mipo.pet", MIPO_WWW_ADDRESS: "www.example.test" });
  assert.equal(explicit.stdout.split("\n")[0], "www.example.test");
});

test("the service worker does not answer sitemap.xml with the app shell", () => {
  const worker = read("src/sw.ts");
  assert.match(worker, /sitemap\.xml/);
  assert.match(worker, /robots\.txt/);
});
