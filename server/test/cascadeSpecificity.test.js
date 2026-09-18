// A component class on a shadcn <Button> must outrank the variant's utilities.
//
// This is the test that was missing while the cart's checkout button rendered
// cyan through five deploys. purchaseCta.test.js asserted the button carried
// `mipo-cta-button` - it did - and went green, because carrying the class was
// never what decided the colour:
//
//   @layer components   .mipo-cta-button { background: hsl(var(--mipo-ink)) }
//   @layer utilities    .bg-primary      { background-color: hsl(var(--primary)) }
//
// Tailwind emits utilities after components. In the built stylesheet those two
// sat 54KB apart with one class each: a tie on specificity, won by whichever
// came last. <Button> puts `bg-primary text-primary-foreground` on everything
// that does not name another variant, and cn()/tailwind-merge cannot drop it
// because tailwind-merge has never heard of `mipo-cta-button`. So the source
// said ink and the screen said cyan, on the cart, on add-to-cart, on
// onboarding, on every <Button className="mipo-cta-button"> in the app.
//
// The general rule, which is what this file enforces: if a class from
// index.css paints a <Button>, it must be declared with at least two classes
// in its selector so it cannot lose to a utility on source order.
//
// e2e/cta-ink.aws.spec.ts measures the same thing in a real browser against
// the built dist/. This one runs in the fast suite and names the file to edit.

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

/**
 * Every rule in index.css, as { classes, paints }.
 *
 * `classes` is how many class selectors the rule needs to match - the number
 * that decides a tie against a utility. `paints` is the properties that a
 * utility could take away: a fill and a text colour.
 */
const cssRules = () => {
  const css = readFileSync(path.join(srcRoot, "index.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [];
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const [, selectorList, body] = match;
    const paints = new Set();
    if (/(?:^|[;\s])background(?:-color)?\s*:/.test(body)) paints.add("background");
    if (/(?:^|[;\s])color\s*:/.test(body)) paints.add("color");
    // @apply carries utilities into the rule at the rule's own specificity.
    const applied = /@apply\s+([^;]+);/.exec(body)?.[1] || "";
    if (/\bbg-\S+/.test(applied)) paints.add("background");
    if (/\btext-(?!xs|sm|base|lg|xl|\dxl|center|right|left|balance)\S+/.test(applied)) paints.add("color");
    if (paints.size === 0) continue;

    for (const selector of selectorList.split(",")) {
      const trimmed = selector.trim();
      // Only plain class chains. A descendant selector, an element or an
      // attribute is a different question and this test does not answer it.
      if (!/^\.[\w-]+(?:\.[\w-]+)*(?::[\w-]+(?:\([^)]*\))?)*$/.test(trimmed)) continue;
      const classes = [...trimmed.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
      rules.push({ head: classes[0], classes: classes.length, paints });
    }
  }
  return rules;
};

/**
 * For each class: does it paint at one-class specificity, and does it also
 * have a rule at two or more for the same property?
 */
const paintersFromCss = () => {
  const byClass = new Map();
  for (const { head, classes, paints } of cssRules()) {
    const entry = byClass.get(head) || { single: new Set(), armoured: new Set() };
    for (const paint of paints) (classes >= 2 ? entry.armoured : entry.single).add(paint);
    byClass.set(head, entry);
  }
  return byClass;
};

/** The opening tag of each <Button>, braces and strings respected. */
const buttonTags = (code) => {
  const tags = [];
  for (const match of code.matchAll(/<Button\b/g)) {
    let depth = 0;
    let quote = null;
    for (let i = match.index; i < code.length; i += 1) {
      const ch = code[i];
      if (quote) {
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") quote = ch;
      else if (ch === "{") depth += 1;
      else if (ch === "}") depth -= 1;
      else if (ch === ">" && depth === 0) {
        tags.push(code.slice(match.index, i + 1));
        break;
      }
    }
  }
  return tags;
};

/** Variants that paint nothing, so a component class has nothing to beat. */
const UNFILLED_VARIANTS = /variant=\{?["']?(ghost|outline|link|instagramSecondary)["']?\}?/;

test("a component class that paints a <Button> outranks the variant's utilities", () => {
  const painters = paintersFromCss();
  const offenders = [];

  for (const file of walk(srcRoot)) {
    const code = readFileSync(file, "utf8");
    if (!/from "@\/components\/ui\/button"/.test(code)) continue;

    for (const tag of buttonTags(code)) {
      if (UNFILLED_VARIANTS.test(tag)) continue;
      for (const [className, entry] of painters) {
        if (!new RegExp(`\\b${className}\\b`).test(tag)) continue;
        for (const paint of entry.single) {
          if (entry.armoured.has(paint)) continue;
          offenders.push(
            `${path.relative(repoRoot, file)} — .${className} sets ${paint} at one class`,
          );
        }
      }
    }
  }

  assert.deepEqual(
    [...new Set(offenders)],
    [],
    "These classes are applied to a <Button> and will LOSE to the variant's\n" +
      "utilities, because @layer utilities is emitted after @layer components and\n" +
      "both are one class. The button renders in the variant's colour whatever\n" +
      "the class says.\n\n" +
      "Fix it in src/index.css by repeating the class in the selector:\n\n" +
      "    .the-class.the-class { background: ...; color: ...; }\n\n" +
      "Repeat only the colours. Leave height, radius and the box model at one\n" +
      "class so h-14 and rounded-2xl from the call site still win.\n\n" +
      `${[...new Set(offenders)].join("\n")}\n`,
  );
});

test("the armour is on the colours only, not on the whole rule", () => {
  // The other direction. Widening `.mipo-cta-button.mipo-cta-button` to cover
  // min-height and border-radius would beat the utilities every call site
  // passes, and the cart's `h-14 rounded-2xl` button would quietly change
  // shape. Cheap to do by accident while fixing the test above.
  const forbidden = /(?:min-)?(?:height|width|padding|margin|border-radius)\s*:/;
  const css = readFileSync(path.join(srcRoot, "index.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const [, selectorList, body] = match;
    if (!/\.([\w-]+)[^,{]*\.\1\b/.test(selectorList)) continue;
    assert.doesNotMatch(
      body,
      forbidden,
      `${selectorList.trim()} raises the specificity of a layout property.\n` +
        "The doubled selector exists to hold a COLOUR against a utility. Sizing\n" +
        "belongs at one class, where the call site can still override it.",
    );
  }
});
