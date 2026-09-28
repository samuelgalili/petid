// The static sitemap is the fallback page list. Production /sitemap.xml is
// proxied to the API, which adds in-stock public products. This file is what
// is served when that proxy is down, and it must not name a product.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFileSync(path.join(repoRoot, relative), "utf8");

test("the static sitemap is the public page list and nothing else", () => {
  const xml = read("public/sitemap.xml");
  for (const loc of [
    "https://mipo.pet/shop",
    "https://mipo.pet/support",
    "https://mipo.pet/breeds",
    "https://mipo.pet/terms",
    "https://mipo.pet/data-deletion",
  ]) {
    assert.match(xml, new RegExp(`<loc>${loc.replaceAll(".", "\\.")}</loc>`));
  }
  assert.doesNotMatch(xml, /<loc>https:\/\/mipo\.pet\/<\/loc>/);
  assert.doesNotMatch(xml, /\/product\//);
  assert.doesNotMatch(xml, /\/feed/);
  assert.doesNotMatch(xml, /\/checkout/);
});

test("robots.txt points at the sitemap", () => {
  assert.match(read("public/robots.txt"), /^Sitemap: https:\/\/mipo\.pet\/sitemap\.xml$/m);
});

test("the service worker lets the sitemap through", () => {
  const worker = read("src/sw.ts");
  assert.match(worker, /sitemap\.xml/);
  assert.match(worker, /robots\.txt/);
  assert.doesNotMatch(worker, /NetworkFirst/);
});

test("Caddy proxies the sitemap and falls back to the static file", () => {
  for (const file of ["deploy/aws/Caddyfile", "deploy/local/Caddyfile"]) {
    const caddy = read(file);
    assert.match(caddy, /handle \/sitemap\.xml/);
    assert.match(caddy, /rewrite \* \/sitemap\.xml/);
  }
});
