// The admin's design tokens, and the three ways a token layer dies quietly.
//
// This codebase has the scar already. tailwind.config.ts carries a comment
// about five `mipo` names that generated NO CSS across 258 usages in 19 files,
// because an object literal keeps only the last value for a repeated key and
// Tailwind says nothing about it. In light mode it was almost invisible - an
// unstyled sheet over a white page still looks white - and in dark mode a
// panel simply had no background and the pet showed through it.
//
// A token layer fails in three ways, none of which is a crash:
//
//   1. Tailwind names a variable that CSS never defines  -> the class emits
//      `hsl(var(--nothing))` and the element is transparent.
//   2. CSS defines it for :root and not for .dark        -> the light value is
//      used on a dark page: black text on a near-black card.
//   3. The colour is declared without the alpha-value slot -> bg-x/10 silently
//      drops the opacity and paints the solid colour.
//
// So this reads both files and checks them against each other.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(path.join(repoRoot, rel), "utf8");

const css = read("src/styles/admin.css");
const config = read("tailwind.config.ts");

/** The `admin: { ... }` colour group, as it appears in the Tailwind config. */
const adminColourGroup = (() => {
  const start = config.indexOf("\t\t\tadmin: {");
  assert.ok(start > 0, "tailwind.config.ts no longer declares an `admin` colour group");
  const end = config.indexOf("\n\t\t\t},", start);
  return config.slice(start, end);
})();

/** Every --admin-* the Tailwind config references. */
const referenced = [...adminColourGroup.matchAll(/var\((--admin-[a-z-]+)\)/g)].map((m) => m[1]);

/** Every --admin-* a given CSS block defines. */
const definedIn = (block) =>
  new Set([...block.matchAll(/(--admin-[a-z-]+)\s*:/g)].map((m) => m[1]));

const blockOf = (selector) => {
  const start = css.indexOf(`${selector} {`);
  assert.ok(start > 0, `admin.css has no ${selector} block`);
  return css.slice(start, css.indexOf("\n  }", start));
};

const root = definedIn(blockOf(":root"));
const dark = definedIn(blockOf(".dark"));

test("the token layer exists at all", () => {
  // Guard on the guard. If either list comes back empty the checks below pass
  // vacuously, which is how a test like this stops testing without failing.
  assert.ok(referenced.length >= 15, `Tailwind references ${referenced.length} admin tokens, expected the set`);
  assert.ok(root.size >= 20, `:root defines ${root.size} admin tokens, expected the set`);
});

test("every token Tailwind names is one the CSS defines", () => {
  // Otherwise the class emits hsl(var(--nothing)) and the element is
  // transparent - a card with no background, on a white page, in light mode.
  const undefined_ = referenced.filter((name) => !root.has(name));
  assert.deepEqual(undefined_, [], "tailwind.config.ts names admin tokens that :root never defines");
});

test("every token has a dark value", () => {
  /*
   * THE ONE THAT ACTUALLY HAPPENED HERE BEFORE. A token defined only for
   * :root keeps its LIGHT value on a dark page - so --admin-ink stays
   * near-black and the text disappears into an --admin-surface that did get
   * a dark value. Nothing errors; the screen is just unreadable, and only in
   * the mode the developer was not using.
   *
   * Shadows are exempt: they are in the boxShadow scale, not the colour
   * group, and are checked below.
   */
  const missing = [...root].filter((name) => !name.includes("shadow") && !dark.has(name));
  assert.deepEqual(missing, [], "these admin tokens have no dark value");
});

test("the shadows have dark values too", () => {
  // A shadow tuned for a white page is invisible on a dark one, which reads
  // as the elevation being gone rather than as a bug.
  for (const name of ["--admin-shadow-sm", "--admin-shadow", "--admin-shadow-lg"]) {
    assert.ok(root.has(name), `${name} is not defined`);
    assert.ok(dark.has(name), `${name} has no dark value`);
  }
});

test("every colour carries the alpha slot", () => {
  // Without <alpha-value>, bg-admin-accent/10 silently drops the /10 and
  // paints the accent at full strength - a soft tint becoming a solid block.
  const withoutAlpha = [...adminColourGroup.matchAll(/^\s*'?([a-z-]+)'?:\s*'hsl\(var\(--admin-[a-z-]+\)\)'/gm)]
    .map((m) => m[1]);
  assert.deepEqual(withoutAlpha, [], "these admin colours cannot take an opacity modifier");
});

test("the layer is imported, or none of it reaches the page", () => {
  const index = read("src/index.css");
  assert.match(
    index, /@import\s+["']\.\/styles\/admin\.css["']/,
    "src/index.css does not import the admin token layer, so every --admin-* is undefined at runtime",
  );
  // @import has to precede every other rule or the browser drops it. The
  // stylesheet starts with a @font-face, so the import must come before it.
  const importAt = index.indexOf("@import");
  const firstRule = index.indexOf("@font-face");
  assert.ok(
    importAt >= 0 && importAt < firstRule,
    "the @import comes after another rule, where CSS ignores it",
  );
});

test("status colours come in pairs", () => {
  // Each status is a foreground AND a background. A status with only the
  // strong colour gets used as a fill somewhere, and a red card reads as an
  // emergency when it meant "one invoice is late".
  for (const status of ["danger", "warning", "success", "info"]) {
    assert.ok(root.has(`--admin-${status}`), `--admin-${status} is missing`);
    assert.ok(root.has(`--admin-${status}-soft`), `--admin-${status}-soft is missing`);
  }
});
