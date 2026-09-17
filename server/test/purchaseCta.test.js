// The money path uses the one filled button, and it is ink.
//
// .mipo-cta-button replaced the aurora-filled CTA across the app, but a sweep
// for the OLD class name only reaches buttons that carried it. The cart's
// "המשך לתשלום" did not: it was `bg-primary text-primary-foreground shadow-xl`,
// written out by hand, so it kept its cyan fill and its shadow while every
// other primary action in the app turned to ink. I told the owner to look for
// a black checkout button; it was still cyan.
//
// A rename is only as complete as the spellings it knew about, so the two
// screens that take money are named here rather than trusted to a sweep.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const codeOf = (rel) =>
  readFileSync(path.join(repoRoot, rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");

/** The element containing a given label, near enough to read its classes. */
const buttonAround = (code, label) => {
  const at = code.indexOf(label);
  assert.notEqual(at, -1, `"${label}" is no longer on the page`);
  return code.slice(Math.max(0, at - 400), at);
};

for (const [rel, label] of [
  ["src/pages/Cart.tsx", "המשך לתשלום"],
  ["src/pages/ProductDetailAws.tsx", "הוסף לעגלה"],
]) {
  test(`${label} is the ink CTA`, () => {
    const block = buttonAround(codeOf(rel), label);
    assert.match(
      block,
      /mipo-cta-button/,
      `${rel}: the purchase button does not use .mipo-cta-button. It is the\n` +
        "screen's one commitment and it is ink - a hand-written bg-primary fill\n" +
        "survives every rename, which is exactly how this one did.",
    );
    assert.doesNotMatch(
      block,
      /\bbg-primary\b/,
      `${rel}: the purchase button still carries a raw bg-primary fill.`,
    );
  });
}
