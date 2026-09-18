// A surface is separated by a line OR by a shadow. Never by both.
//
// The shop's product card was `rounded-lg` - 8px - with `shadow-sm` AND a
// border, sitting in an app whose cards are 1.5rem. That is what "the design
// looks old" turned out to mean: not a colour, not a font, but a card built to
// a different system than the one around it, promising precision with a line
// and softness with a shadow at the same time.
//
// Two rules, both narrow enough to be true:
//
//   1. A card-like surface does not carry a border and a drop shadow together.
//   2. The radii come from the scale, not from whatever was to hand.
//
// Neither is reachable by typecheck, lint or a screenshot diff, because every
// one of those classes is individually valid.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const srcRoot = path.join(repoRoot, "src");

const walk = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.tsx$/.test(full)) out.push(full);
  }
  return out;
};

const codeOf = (file) =>
  readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");

/** Each class attribute, one at a time - two elements are not a conflict. */
const classAttributes = (code) =>
  [...code.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)].map((m) => m[1] ?? m[2] ?? "");

/**
 * A drop shadow, excluding `shadow-none` and the inner shadows used on inputs.
 * `shadow-sm` counts: it is the one that was paired with a border.
 */
const DROP_SHADOW = /\bshadow-(?:sm|md|lg|xl|2xl)\b|\bshadow-\[[^\]]*\]/;
/** A visible border, not a transparent or colourless one. */
const HAS_BORDER = /\bborder(?:-[trbl])?\b(?!-(?:0|none|transparent))/;
/** Rounded at card scale, which is what makes it a surface rather than a chip. */
const CARD_RADIUS = /\brounded-(?:xl|2xl|3xl|\[[^\]]*\])\b/;

test("a card does not carry both a border and a drop shadow", () => {
  const offenders = [];
  for (const file of walk(srcRoot)) {
    for (const attr of classAttributes(codeOf(file))) {
      if (!CARD_RADIUS.test(attr)) continue;
      if (!HAS_BORDER.test(attr) || !DROP_SHADOW.test(attr)) continue;
      // Floating surfaces are exempt, and they are floating for a reason: a
      // modal, a dropdown, a toast, an install banner. Those SHOULD cast a
      // shadow, and a hairline on top of it defines their edge against a
      // background of the same colour. The rule is about surfaces that SIT.
      //
      // A first version did not draw this line and flagged the PWA prompt, the
      // image editor and the chat menu - all correct - which would have been
      // answered by deleting the shadows that make them read as floating.
      if (/\b(?:absolute|fixed|sticky)\b/.test(attr)) continue;
      if (/\bshadow-(?:xl|2xl)\b/.test(attr)) continue;
      // A shadow that only appears on hover is a lift, not a second promise.
      if (/\bhover:shadow/.test(attr) && !DROP_SHADOW.test(attr.replace(/hover:\S+/g, ""))) continue;
      offenders.push(`${path.relative(repoRoot, file)} — ${attr.replace(/\s+/g, " ").slice(0, 90)}`);
    }
  }

  // A RATCHET, not a clean sheet.
  //
  // There are 61 of these today, across screens nobody has redesigned yet.
  // Was 64 until the shop's two rails stopped drawing a line and a shadow
  // around the same card.
  // Asserting zero would fail on the first run and be switched off within a
  // week, which is worse than not having the rule. Asserting "no more than
  // there are" stops the next one arriving and turns the backlog into a number
  // that can only go down.
  //
  // Lower this when you fix some. It is not allowed to rise.
  const BUDGET = 61;

  assert.ok(
    offenders.length <= BUDGET,
    `${offenders.length} cards carry a border AND a drop shadow; the budget is ` +
      `${BUDGET}.\n\nPick one: the thin line is the house style for a surface that ` +
      "sits, the shadow\nfor one that floats - a modal, a drawer, a menu. Both at " +
      "once is what\nreads as dated.\n\n" +
      offenders.slice(BUDGET).join("\n"),
  );

  if (offenders.length < BUDGET) {
    assert.fail(
      `Only ${offenders.length} left, under the budget of ${BUDGET}. Lower BUDGET ` +
        "to that number\nin server/test/surfaceDepth.test.js so the ground you took " +
        "is held.",
    );
  }
});

test("the shop's product card is on the card radius", () => {
  // Named, because this is the one that was wrong and the one a shopper sees
  // sixty times on a screen. rounded-lg is 8px; MIPO's cards are 1.5rem.
  const shop = codeOf(path.join(srcRoot, "pages", "Shop.tsx"));
  const card = shop.slice(shop.indexOf("const ShopProductCard"), shop.indexOf("const Shop ="));
  assert.ok(card.length > 0, "ShopProductCard is gone from Shop.tsx");
  assert.doesNotMatch(
    card,
    /\brounded-(?:sm|md|lg)\b/,
    "the product card is back on a small radius. Everything around it is\n" +
      "rounded-3xl, and an 8px card in a 24px app is the whole of what 'the\n" +
      "design looks old' meant.",
  );
});
