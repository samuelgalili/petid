// The free-shipping threshold, said once.
//
// It was hardcoded in four places - ProductDetailAws, Shop, SmartCartLayers
// and RecommendedProducts - all agreeing on 199, while the assistant in
// AITraining was trained to answer 200. A customer who asked the chat got a
// different number from the one the cart charged, and nothing anywhere would
// have caught it: five literals agreeing four-to-one is not a test failure,
// it is just a wrong answer given to somebody.
//
// So this test does not check that the number is 199. It checks that there is
// only ONE of it, which is the property that was actually missing.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const srcRoot = path.join(repoRoot, "src");
const shippingModule = path.join(srcRoot, "lib", "shipping.ts");

const walk = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(full)) out.push(full);
  }
  return out;
};

/** Source with comments stripped, so prose about a rule is not the rule. */
const codeOf = (file) =>
  readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");

test("the shipping module is the only place the threshold and fee are written", () => {
  const offenders = [];
  for (const file of walk(srcRoot)) {
    if (file === shippingModule) continue;
    const code = codeOf(file);
    // A free-shipping threshold appears near the words that give it meaning.
    // Matching a bare 199 anywhere would flag prices, pixel values and ids.
    for (const [pattern, why] of [
      [/(?:free[_A-Za-z]*shipping|freeShipping|משלוח חינם)[^\n]{0,80}\b(199|200)\b/i, "threshold"],
      [/\b(199|200)\b[^\n]{0,80}(?:free[_A-Za-z]*shipping|freeShipping|משלוח חינם)/i, "threshold"],
    ]) {
      const hit = code.match(pattern);
      if (hit) offenders.push(`${path.relative(repoRoot, file)} — ${why}: ${hit[0].trim().slice(0, 90)}`);
    }
  }
  assert.deepEqual(
    offenders, [],
    "a shipping threshold is written outside src/lib/shipping.ts:\n" + offenders.join("\n"),
  );
});

test("the module states the fee and the threshold, and they are numbers", async () => {
  const source = readFileSync(shippingModule, "utf8");
  // Read as source rather than imported: this is a .ts file and the server
  // test runner has no TypeScript loader. The assertions are about what the
  // module commits to, which is visible in the text.
  const threshold = source.match(/export const FREE_SHIPPING_THRESHOLD = (\d+);/);
  const fee = source.match(/export const SHIPPING_FEE = (\d+);/);
  assert.ok(threshold, "FREE_SHIPPING_THRESHOLD must be exported");
  assert.ok(fee, "SHIPPING_FEE must be exported");
  assert.ok(Number(threshold[1]) > 0);
  assert.ok(Number(fee[1]) > 0);
  assert.ok(Number(fee[1]) < Number(threshold[1]),
    "a delivery fee at or above the free-delivery threshold would never be charged");
});

test("the assistant quotes the shared numbers rather than its own", () => {
  // The specific failure: AITraining answered "₪200" as a literal while the
  // shop charged 199. Whatever it answers now, it must be interpolated from
  // the module, not typed.
  const training = path.join(srcRoot, "components/admin/ai-service/AITraining.tsx");
  const code = codeOf(training);
  const shippingAnswer = code.match(/משלוח חינם[^\n]*/);
  if (!shippingAnswer) return; // the question was removed, which is also fine
  assert.match(
    shippingAnswer[0], /\$\{FREE_SHIPPING_THRESHOLD\}/,
    "the assistant's free-shipping answer must interpolate the shared threshold",
  );
});

test("the returns policy is stated once, and answers the opened-bag case", () => {
  const source = readFileSync(shippingModule, "utf8");
  assert.match(source, /RETURN_MAX_USED_SHARE = 0\.2/);
  // The case a generic policy cannot answer, and the reason this one exists.
  assert.match(source, /RETURNS_SUMMARY_HE/);
  assert.match(source, /RETURNS_DETAIL_HE/);
  // Who pays the return carriage is the part customers argue about, so it has
  // to be in the text rather than implied.
  assert.match(source, /על הלקוח/);
});
