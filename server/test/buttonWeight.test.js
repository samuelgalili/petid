// One filled button per screen, and it is ink - not the aurora.
//
// The primary CTA was .mipo-gradient-button: a pill filled with the brand
// gradient, 25 of them across 8 files, including "המשך לתשלום" and every step
// of adding a pet. The aurora now belongs to the pet's avatar alone, so
// emphasis comes from weight instead - .mipo-cta-button, solid ink.
//
// The trap this pins is the one that bit while making the change. ink and
// surface INVERT between the themes:
//
//     --mipo-ink: 240 11% 9%   light   /  0 0% 95%   dark
//     --mipo-surface: 0 0% 100% light  /  240 7% 10% dark
//
// So `bg-mipo-ink text-white` reads black-on-white in light mode and
// WHITE-ON-NEAR-WHITE in dark: the label vanishes. It looks right, it passes
// typecheck and lint, and it is only wrong in one theme. The classes that pair
// ink with surface (.mipo-cta-button, .mipo-chip-selected) handle both, so the
// rule is to use them rather than to hand-pair the tokens.

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
    else if (/\.(ts|tsx)$/.test(full)) out.push(full);
  }
  return out;
};

const codeOf = (file) =>
  readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");

test("no button is filled with the brand aurora", () => {
  const offenders = [];
  for (const file of walk(srcRoot)) {
    if (codeOf(file).includes("mipo-gradient-button")) {
      offenders.push(path.relative(repoRoot, file));
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "mipo-gradient-button is back. Buttons carry a thin line, or ink when they\n" +
      "are the screen's primary action - the aurora is the pet avatar's:\n" +
      offenders.join("\n"),
  );
});

test("the aurora-filled button class no longer exists", () => {
  // Deleting the call sites while leaving the class is how it comes back: the
  // next person reaches for the name that still works.
  const css = readFileSync(path.join(srcRoot, "index.css"), "utf8");
  assert.ok(
    !/\.mipo-gradient-button\s*\{/.test(css),
    "the .mipo-gradient-button rule is still defined in index.css, so the\n" +
      "aurora-filled button is still available to reach for.",
  );
  assert.match(
    css,
    /\.mipo-cta-button\s*\{/,
    "the .mipo-cta-button rule is gone - the primary action has no filled form.",
  );
});

test("a fixed text colour is never pinned to an inverting surface", () => {
  // bg-mipo-ink with text-white: correct in light, invisible in dark.
  const offenders = [];
  for (const file of walk(srcRoot)) {
    const code = codeOf(file);
    for (const [hit] of code.matchAll(
      /\bbg-mipo-ink\b[^"'`]*\btext-white\b|\btext-white\b[^"'`]*\bbg-mipo-ink\b/g,
    )) {
      offenders.push(`${path.relative(repoRoot, file)} — ${hit.trim().slice(0, 70)}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "text-white is set on a bg-mipo-ink surface. ink inverts with the theme, so\n" +
      "this is white-on-near-white in dark mode. Use .mipo-cta-button or\n" +
      ".mipo-chip-selected, which pair ink with surface:\n" +
      offenders.join("\n"),
  );
});
