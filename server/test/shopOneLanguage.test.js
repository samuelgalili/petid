// The shop page is not one component, and a redesign that reaches one of them
// is not a redesign.
//
// The grid card was rebuilt: 1.5rem radius, a thin line instead of a line AND
// a shadow, the name over two lines, the price in ink at 17px. Then the owner
// opened mipo.pet and said the shop still looked old, and he was right,
// because the grid is the THIRD thing on the page. Above it:
//
//   SmartRecommendations - 130px cards, 11px names, prices in --primary,
//                          add-to-cart on a 28px circle, a cyan gradient
//                          badge over the photo, border + shadow-sm
//   MedicalPharmacy      - the same card at 120px with 10px names and an
//                          8px green gradient laid over the product image
//
// Every screenshot he sent was of those two. The redesign had never been
// anywhere near them, and nothing said so: they typecheck, they lint, and
// each class in them is valid on its own.
//
// So the rule is about the PAGE, not about a file. Whatever the shop renders
// speaks one language, and the language is enumerated here. The list of files
// is derived from what Shop.tsx actually imports, so a section added next
// month is covered the day it is added rather than the day someone
// remembers to add it to a test.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const srcRoot = path.join(repoRoot, "src");

const codeOf = (file) =>
  readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");

/**
 * The files the shop page paints with: Shop.tsx, plus every component it
 * imports from components/shop and renders.
 *
 * Imported-but-not-rendered is skipped on purpose. SmartProductPage and
 * SmartProductLayers live in that folder and belong to the product screen;
 * holding them to the shop's rules here would be a claim this test cannot
 * support.
 */
const shopSurfaces = () => {
  const shopPath = path.join(srcRoot, "pages", "Shop.tsx");
  const shop = codeOf(shopPath);
  const files = [shopPath];

  for (const match of shop.matchAll(/import\s*\{([^}]+)\}\s*from\s*"@\/components\/shop\/([\w-]+)"/g)) {
    const [, names, module] = match;
    const rendered = names
      .split(",")
      .map((name) => name.trim().split(/\s+as\s+/).pop())
      .some((name) => new RegExp(`<${name}\\b`).test(shop));
    if (!rendered) continue;
    const file = path.join(srcRoot, "components", "shop", `${module}.tsx`);
    if (existsSync(file)) files.push(file);
  }

  // Cards the rails delegate to are part of the page even though Shop.tsx
  // never names them.
  const rail = path.join(srcRoot, "components", "shop", "ShopRailCard.tsx");
  if (existsSync(rail)) files.push(rail);

  return [...new Set(files)];
};

const classAttributes = (code) =>
  [...code.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)].map((m) => m[1] ?? m[2] ?? "");

test("the shop renders more than one component, and this test knows which", () => {
  // If Shop.tsx is restructured so the derivation finds nothing, every other
  // test in this file passes vacuously. That is the failure mode of a test
  // that computes its own subject, so it is checked.
  const files = shopSurfaces();
  assert.ok(
    files.length >= 4,
    `Only ${files.length} shop surfaces found. The derivation reads Shop.tsx's\n` +
      "imports from @/components/shop and keeps the ones it renders. If that\n" +
      "stopped working, the rest of this file is asserting nothing.",
  );
});

test("a price is ink, not the brand colour", () => {
  // The price is the number the decision gets made on. When it is --primary it
  // is the same cyan as the add button, the badge, the section icon and the
  // selected chip, so it stops being emphasis and becomes wallpaper. Ink
  // outranks everything else on the card by being the only heavy thing.
  const offenders = [];
  for (const file of shopSurfaces()) {
    const code = codeOf(file);
    for (const match of code.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})[^<>]*>\s*₪/g)) {
      const attr = match[1] ?? match[2] ?? "";
      if (!/\btext-primary\b|\btext-\[hsl\(var\(--primary/.test(attr)) continue;
      offenders.push(`${path.relative(repoRoot, file)} — ${attr.replace(/\s+/g, " ").slice(0, 80)}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "A price on the shop page is painted in --primary:\n\n" +
      `${offenders.join("\n")}\n\n` +
      "Use text-mipo-ink. It inverts with the theme and it is the only weight\n" +
      "on the card, which is what makes it readable at a glance.",
  );
});

test("small type on the shop page is a label, never prose", () => {
  // 8, 9, 10 and 11px were all in use here, on product names and on a medical
  // disclaimer. A product name at 10px is a texture, not a name, and a
  // disclaimer is not more compliant for being harder to read.
  //
  // The rule is not a flat floor, because a flat floor is a rule that gets
  // switched off the first time someone needs a badge: 11px is fine on a
  // count, a discount or a chip - something short, in a pill, that you read as
  // a mark rather than as words. Below 11px is nothing at all. Prose starts at
  // 12px.
  //
  // Matching is over the whole file rather than per className attribute,
  // because ShopRailCard builds its classes inside cn() and an attribute-only
  // scan walks straight past it - which is how the first version of this test
  // gave itself a clean bill of health on the card it was written for.
  const belowEleven = /\btext-\[(?:[0-9]|10)px\]/g;
  const eleven = /\btext-\[11px\]/;

  const tooSmall = [];
  const elevenNotAChip = [];

  for (const file of shopSurfaces()) {
    const code = codeOf(file);
    const relative = path.relative(repoRoot, file);
    for (const hit of code.match(belowEleven) || []) {
      tooSmall.push(`${relative} — ${hit}`);
    }
    for (const attr of classAttributes(code)) {
      if (!eleven.test(attr)) continue;
      // A pill. If it is not round it is a paragraph, and paragraphs are 12px.
      if (/\brounded-(?:full|lg|xl)\b/.test(attr)) continue;
      elevenNotAChip.push(`${relative} — ${attr.replace(/\s+/g, " ").slice(0, 70)}`);
    }
  }

  assert.deepEqual(
    [...new Set(tooSmall)].sort(),
    [],
    `Type below 11px on the shop page:\n\n${[...new Set(tooSmall)].sort().join("\n")}\n\n` +
      "There is no size below 11px on this page. Not for a badge, not for a\n" +
      "disclaimer.",
  );

  assert.deepEqual(
    [...new Set(elevenNotAChip)].sort(),
    [],
    "11px used outside a pill on the shop page:\n\n" +
      `${[...new Set(elevenNotAChip)].sort().join("\n")}\n\n` +
      "11px is for a mark - a count, a discount, a chip. Words are 12px.",
  );
});

test("a tap target on the shop page is at least 44px", () => {
  // The add-to-cart buttons were w-6 h-6 and w-7 h-7 - 24 and 28px - sitting
  // inside a card that also navigated on tap. Missing it did not do nothing;
  // it opened the product page.
  const SMALL_SQUARE = /\bh-([0-9]|10)\b(?=[^"`]*\bw-\1\b)/g;
  const offenders = [];
  for (const file of shopSurfaces()) {
    const code = codeOf(file);
    for (const match of code.matchAll(/<(?:motion\.)?button\b[^>]*className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
      const attr = match[1] ?? match[2] ?? "";
      for (const hit of attr.match(SMALL_SQUARE) || []) {
        offenders.push(`${path.relative(repoRoot, file)} — a button at ${hit}`);
      }
    }
  }
  assert.deepEqual(
    [...new Set(offenders)].sort(),
    [],
    "Buttons on the shop page below the 44px touch target:\n\n" +
      `${[...new Set(offenders)].sort().join("\n")}\n\n` +
      "h-11 w-11 is the floor. These sit on cards that navigate on tap, so a\n" +
      "near miss does not do nothing - it opens a different screen.",
  );
});

test("the aurora stays on the avatar", () => {
  // The owner asked for the brand gradient to be the pet's alone. Both rails
  // painted one behind a badge - `linear-gradient(135deg, hsl(var(--primary))
  // ...)` in an inline style, which no class-based sweep would ever find.
  const offenders = [];
  for (const file of shopSurfaces()) {
    const code = codeOf(file);
    if (/linear-gradient\([^)]*var\(--primary/.test(code)) {
      offenders.push(path.relative(repoRoot, file));
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `A brand gradient is painted on the shop page:\n\n${offenders.join("\n")}\n\n` +
      "The aurora belongs to the pet's avatar. Everything else earns attention\n" +
      "with weight and ink.",
  );
});
