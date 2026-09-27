// A short static sitemap so /sitemap.xml is a document rather than the app
// shell. Product URLs, canonical tags, and a generated sitemap belong to a
// later change; this file is only the public front door and may be replaced.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFileSync(path.join(repoRoot, relative), "utf8");

test("the static sitemap is only the public front door", () => {
  const xml = read("public/sitemap.xml");
  assert.match(xml, /<loc>https:\/\/mipo\.pet\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/mipo\.pet\/shop<\/loc>/);
  assert.match(xml, /<loc>https:\/\/mipo\.pet\/support<\/loc>/);
  assert.equal(xml.split("<loc>").length - 1, 3);
  assert.doesNotMatch(xml, /\/product\//);
  assert.doesNotMatch(xml, /\/feed/);
  assert.doesNotMatch(xml, /\/checkout/);
});

test("robots.txt points at the sitemap", () => {
  assert.match(read("public/robots.txt"), /^Sitemap: https:\/\/mipo\.pet\/sitemap\.xml$/m);
});

test("the service worker lets the static sitemap through", () => {
  const worker = read("src/sw.ts");
  assert.match(worker, /sitemap\.xml/);
  assert.match(worker, /robots\.txt/);
});

test("Caddy does not replace the static sitemap with an API route", () => {
  for (const file of ["deploy/aws/Caddyfile", "deploy/local/Caddyfile"]) {
    assert.doesNotMatch(read(file), /handle \/sitemap\.xml/);
  }
});
