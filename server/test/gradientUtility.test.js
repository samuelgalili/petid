// `bg-[var(--gradient-...)]` is not a gradient. It is nothing.
//
// Tailwind compiles an arbitrary `bg-[...]` value to background-COLOR, so
// `bg-[var(--gradient-primary)]` emits
//
//     background-color: var(--gradient-primary)
//
// and --gradient-primary is a linear-gradient(). A colour property cannot take
// a gradient, so the declaration is dropped and the element gets no background
// at all.
//
// The notifications page set exactly that on its selected filter chip, next to
// `text-white`. The selected filter was therefore white text on the page's own
// white background - invisible, on the only control that says which
// notifications you are looking at. Nothing caught it: it is valid TSX, a real
// Tailwind class, and it does generate a CSS rule. It just generates one the
// browser throws away.
//
// The working form is `bg-[image:var(--gradient-primary)]`, which two other
// call sites already use.

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

/**
 * The custom properties whose value is a gradient, read from index.css.
 *
 * The check resolves the variable rather than matching the word "gradient" in
 * its name: a first attempt did the latter and flagged three innocent
 * `bg-[radial-gradient(...)]` call sites. Written out in full, Tailwind SEES
 * the gradient function and emits background-image - verified in the built
 * CSS - so those are correct. It is only the var() indirection Tailwind cannot
 * look through, and a var holding a gradient need not be named for one.
 */
const gradientVars = () => {
  const css = readFileSync(path.join(srcRoot, "index.css"), "utf8");
  const found = new Set();
  for (const [, name] of css.matchAll(
    /(--[\w-]+)\s*:\s*(?:linear|radial|conic)-gradient\(/g,
  )) {
    found.add(name);
  }
  // One level of aliasing: --gradient-story: var(--gradient-primary).
  for (const [, name, target] of css.matchAll(/(--[\w-]+)\s*:\s*var\((--[\w-]+)\)/g)) {
    if (found.has(target)) found.add(name);
  }
  return found;
};

test("no arbitrary background-color is handed a gradient", () => {
  const gradients = gradientVars();
  assert.ok(gradients.size > 0, "no gradient custom properties found in index.css");

  const offenders = [];
  for (const file of walk(srcRoot)) {
    // bg-[var(--x)], but not bg-[image:var(--x)], which is the working form.
    for (const [hit, name] of codeOf(file).matchAll(/\bbg-\[(?!image:)var\((--[\w-]+)\)\]/g)) {
      if (gradients.has(name)) {
        offenders.push(`${path.relative(repoRoot, file)} — ${hit}`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    "an arbitrary bg-[...] is given a gradient value. Tailwind emits\n" +
      "background-color for these, the browser drops the declaration, and the\n" +
      "element renders with no background - which is invisible when the same\n" +
      "class list sets a light text colour. Use bg-[image:var(--...)]:\n" +
      offenders.join("\n"),
  );
});
