// Policy the customer was promised, and the page that never showed it.
//
// The delivery time, the shipping fee, the free-shipping threshold and the
// returns rule were all decided, written into src/lib/shipping.ts with careful
// comments about being "said in one place" - and then RETURNS_SUMMARY_HE,
// RETURNS_DETAIL_HE and shippingFeeLabelHe were imported by nobody. The
// product page, which is where a shopper decides whether to buy a bag of food
// their animal may refuse, said nothing about returns at all. The answer
// existed only in the source.
//
// Worse, the page kept its OWN `const SHIPPING_ESTIMATE_HE = "3-5 ימי עסקים"`,
// so the module whose entire purpose is one definition was being shadowed by a
// second copy on the most important page it serves.
//
// An exported constant nobody imports is not dead code here. It is a promise
// to a customer that no customer can read.

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

const codeOf = (file) =>
  readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");

/** Every name src/lib/shipping.ts exports. */
const exportedNames = () => {
  const code = codeOf(shippingModule);
  return [...code.matchAll(/export const ([A-Za-z_][\w]*)/g)].map((m) => m[1]);
};

/**
 * Each declaration in the module, paired with its own body.
 *
 * Used to answer "does this value reach a screen INDIRECTLY" - which the first
 * version of this test could not, so it flagged SHIPPING_ESTIMATE_MIN_DAYS and
 * RETURN_MAX_USED_SHARE. Neither is imported anywhere, and both are correct:
 * they compose the sentences that are. A rule that cannot tell a building
 * block from an unkept promise would be answered by deleting the building
 * blocks and inlining the numbers, which is the drift this module prevents.
 */
const declarations = () => {
  const code = codeOf(shippingModule);
  const starts = [...code.matchAll(/^(?:export )?const ([A-Za-z_][\w]*)\s*=/gm)];
  return starts.map((match, index) => ({
    name: match[1],
    body: code.slice(
      match.index + match[0].length,
      index + 1 < starts.length ? starts[index + 1].index : code.length,
    ),
  }));
};

test("every shipping and returns promise reaches a screen", () => {
  const names = exportedNames();
  assert.ok(names.length > 0, "src/lib/shipping.ts exports nothing");

  const corpus = walk(srcRoot)
    .filter((f) => f !== shippingModule)
    .map(codeOf)
    .join("\n");

  // Reached directly by a screen...
  const reaching = new Set(names.filter((n) => new RegExp(`\\b${n}\\b`).test(corpus)));

  // ...or used to build something that is. Repeated to a fixed point, so a
  // chain of any length counts.
  const decls = declarations();
  for (let changed = true; changed; ) {
    changed = false;
    for (const { name, body } of decls) {
      if (!reaching.has(name)) continue;
      for (const other of decls) {
        if (reaching.has(other.name)) continue;
        if (new RegExp(`\\b${other.name}\\b`).test(body)) {
          reaching.add(other.name);
          changed = true;
        }
      }
    }
  }

  const unread = names.filter((name) => !reaching.has(name));

  assert.deepEqual(
    unread,
    [],
    "src/lib/shipping.ts exports a policy value that no screen reads. These are\n" +
      "commitments to a customer - a delivery time, a fee, a returns rule - so an\n" +
      "unread one is a promise nobody can see, not spare code. Show it or delete\n" +
      "it:\n" +
      unread.join("\n"),
  );
});

test("the product page states the returns policy", () => {
  // Named specifically, because this is the screen where the question is
  // actually asked: the shopper is deciding whether to buy food an animal may
  // refuse. A returns rule that lives only in the cart is one they meet after
  // they have already committed.
  const page = codeOf(path.join(srcRoot, "pages", "ProductDetailAws.tsx"));
  assert.match(
    page,
    /\bRETURNS_(?:SUMMARY|DETAIL)_HE\b/,
    "the product page says nothing about returns. It is where the decision is\n" +
      "made, so it is where the policy has to be legible.",
  );
});

test("no screen keeps its own copy of a shipping constant", () => {
  const names = exportedNames();
  const offenders = [];
  for (const file of walk(srcRoot)) {
    if (file === shippingModule) continue;
    const code = codeOf(file);
    for (const name of names) {
      // A local `const X = ...` shadowing an exported name of the same thing.
      if (new RegExp(`\\bconst ${name}\\s*=`).test(code)) {
        offenders.push(`${path.relative(repoRoot, file)} — const ${name}`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "a screen declares its own copy of a value src/lib/shipping.ts already\n" +
      "defines. Two spellings of a promise is how one of them goes stale:\n" +
      offenders.join("\n"),
  );
});
