import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildSitemapXml, listSitemapProducts, sitemapOrigin } from "../src/sitemap.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFileSync(path.join(repoRoot, relative), "utf8");

test("the sitemap lists the public pages and each product once", () => {
  const xml = buildSitemapXml({
    origin: "https://mipo.pet",
    now: new Date("2026-09-27T00:00:00.000Z"),
    products: [
      { id: "1dbfeceb-52f8-480a-8540-17479194ae48", updated_at: "2026-08-01T12:00:00.000Z" },
      { id: "not-a-uuid", updated_at: "2026-08-01T12:00:00.000Z" },
      { id: "1dbfeceb-52f8-480a-8540-17479194ae48", updated_at: "2026-08-02T12:00:00.000Z" },
    ],
  });

  assert.match(xml, /<loc>https:\/\/mipo\.pet\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/mipo\.pet\/shop<\/loc>/);
  assert.match(xml, /<loc>https:\/\/mipo\.pet\/support<\/loc>/);
  assert.match(xml, /<loc>https:\/\/mipo\.pet\/product\/1dbfeceb-52f8-480a-8540-17479194ae48<\/loc>/);
  assert.equal(xml.split("1dbfeceb-52f8-480a-8540-17479194ae48").length - 1, 1);
  assert.doesNotMatch(xml, /2026-08-02/);
  assert.doesNotMatch(xml, /not-a-uuid/);
  assert.doesNotMatch(xml, /\/checkout/);
  assert.doesNotMatch(xml, /\/feed/);
  assert.doesNotMatch(xml, /\/auth/);
  assert.match(xml, /<lastmod>2026-08-01<\/lastmod>/);
});

test("a location cannot break out of the XML", () => {
  const xml = buildSitemapXml({
    origin: "https://mipo.pet?x=1&y=2",
    products: [],
  });
  assert.match(xml, /<loc>https:\/\/mipo\.pet\?x=1&amp;y=2\/shop<\/loc>/);
  assert.doesNotMatch(xml, /x=1&y=2/);
});

test("the public origin falls back to the live site", () => {
  assert.equal(sitemapOrigin("https://mipo.pet/shop?x=1"), "https://mipo.pet");
  assert.equal(sitemapOrigin("https://user:pass@mipo.pet"), "https://mipo.pet");
  assert.equal(sitemapOrigin("not a url"), "https://mipo.pet");
  assert.equal(sitemapOrigin(""), "https://mipo.pet");
});

test("a missing catalogue table still leaves the other products", async () => {
  const products = await listSitemapProducts(async (sql) => {
    if (sql.includes("scraped_products")) {
      const error = new Error("missing");
      error.code = "42P01";
      throw error;
    }
    return { rows: [{ id: "22222222-2222-4222-8222-222222222222", updated_at: null }] };
  });
  assert.deepEqual(products, [{ id: "22222222-2222-4222-8222-222222222222", updated_at: null }]);
});

test("robots.txt points at the sitemap", () => {
  const robots = read("public/robots.txt");
  assert.match(robots, /^Sitemap: https:\/\/mipo\.pet\/sitemap\.xml$/m);
});

test("the service worker does not answer sitemap.xml with the app shell", () => {
  // A navigation to /sitemap.xml used to match the app shell route, so a
  // browser showed the missing-page screen while curl, which has no worker,
  // received the file.
  const worker = read("src/sw.ts");
  assert.match(worker, /sitemap\.xml/);
  assert.match(worker, /robots\.txt/);
});

test("Caddy sends sitemap.xml to the API instead of the app shell", () => {
  for (const file of ["deploy/aws/Caddyfile", "deploy/local/Caddyfile"]) {
    const caddy = read(file);
    const sitemap = caddy.indexOf("handle /sitemap.xml");
    const fallback = caddy.indexOf("try_files {path} /index.html");
    assert.ok(sitemap > -1, `${file} does not proxy /sitemap.xml`);
    assert.ok(fallback > sitemap, `${file} would answer /sitemap.xml with index.html`);
  }
});
