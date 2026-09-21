// The cart predicts what the checkout will refuse.
//
// The checkout refuses two baskets, and its own comment explains why it is the
// one enforcing: "the cart lives in a browser and a browser is not where a
// rule like this can be enforced." True, and not an argument for the cart
// being ignorant of it. The canvas's audit: "הלקוח בונה סל שנדחה בשלב האחרון."
//
// THE RULES THESE MIRROR ARE READ OUT OF index.js AT THE BOTTOM OF THIS FILE.
// A mirror that drifts is worse than no mirror: it is a cart confidently
// telling a shopper their basket is fine.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { LEGACY_SELLER_KEY, groupCartBySeller, needsSeparateOrders, sellerKeyOf } from "../src/cartGrouping.js";

const line = (name, price, quantity, extra = {}) => ({ name, price, quantity, ...extra });

test("a basket from one shop is one order", () => {
  const groups = groupCartBySeller([
    line("מזון", 129, 1, { sellerId: "shop-a", sellerName: "חנות הכלבים" }),
    line("חטיף", 24, 2, { sellerId: "shop-a", sellerName: "חנות הכלבים" }),
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].sellerName, "חנות הכלבים");
  assert.equal(groups[0].count, 3);
  assert.equal(groups[0].subtotal, 177);
});

test("two shops are two orders, in the order they were added", () => {
  // Not sorted by name or by size. A list that reshuffles while someone is
  // adding to it is a list they stop trusting.
  const groups = groupCartBySeller([
    line("מזון", 100, 1, { sellerId: "shop-b", sellerName: "ב" }),
    line("מברשת", 45, 1, { sellerId: "shop-a", sellerName: "א" }),
    line("חטיף", 20, 1, { sellerId: "shop-b", sellerName: "ב" }),
  ]);

  assert.deepEqual(groups.map((group) => group.sellerName), ["ב", "א"]);
  assert.equal(needsSeparateOrders(groups.flatMap((group) => group.items)), true);
});

test("a line with no seller is its own group, not a passenger", () => {
  // THE RULE THAT IS EASY TO MISS. "No seller" reads as "no opinion", and the
  // checkout's second refusal exists precisely because it is not: a
  // marketplace line and a legacy line in one order produce an order that is
  // half-attributed, with no honest answer to who sold it.
  const groups = groupCartBySeller([
    line("מזון", 129, 1, { sellerId: "shop-a" }),
    line("מוצר ישן", 45, 1),
  ]);

  assert.equal(groups.length, 2);
  assert.equal(groups[1].key, LEGACY_SELLER_KEY);
  assert.equal(groups[1].sellerId, null);
});

test("an all-legacy basket is one order, which is every basket today", () => {
  // A marketplace line needs an offer_id and the browser's CartItem has no
  // such field, so this is the only shape that currently reaches the cart. If
  // this ever returns more than one group for legacy-only lines, the grouping
  // has started splitting baskets that used to check out.
  const groups = groupCartBySeller([line("א", 10, 1), line("ב", 20, 3)]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].sellerId, null);
  assert.equal(groups[0].subtotal, 70);
  assert.equal(needsSeparateOrders([line("א", 10, 1), line("ב", 20, 3)]), false);
});

test("an unnamed seller is shown as a seller, not as the platform", () => {
  // Falling back to "MIPO" for a seller whose name did not load tells the
  // shopper the platform is selling it. That is a claim about who they are
  // paying.
  const [group] = groupCartBySeller([line("מוצר", 50, 1, { sellerId: "shop-x" })]);
  assert.equal(group.sellerName, null);
  assert.equal(group.sellerId, "shop-x");
});

test("the snake_case shape the API speaks is grouped the same", () => {
  assert.equal(sellerKeyOf({ seller_business_id: "shop-a" }), "shop-a");
  assert.equal(sellerKeyOf({ sellerId: "shop-a" }), "shop-a");
  assert.equal(sellerKeyOf({}), LEGACY_SELLER_KEY);
  assert.equal(sellerKeyOf({ sellerId: null }), LEGACY_SELLER_KEY);
});

test("money is not accumulated into a floating-point tail", () => {
  const [group] = groupCartBySeller([line("א", 0.1, 1), line("ב", 0.2, 1)]);
  assert.equal(group.subtotal, 0.3);
});

// ─── the rules this mirrors are still the rules ──────────────────────────────

test("the checkout still refuses exactly what this module predicts", () => {
  // If the server grows a third refusal - a shipping region, a currency - this
  // module starts telling shoppers a basket is fine that is not, and nothing
  // else in the suite would notice. The test reads the enforcement and fails
  // when it changes shape, which is a prompt to come back here.
  const server = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");

  assert.match(
    server,
    /const sellers = new Set\(orderItems\.map\(\(item\) => item\.seller_business_id\)\.filter\(Boolean\)\);/,
    "The checkout no longer derives its seller set the way cartGrouping mirrors it.",
  );
  assert.match(server, /code = "MULTIPLE_SELLERS_IN_ORDER"/);
  assert.match(server, /code = "MIXED_CATALOGUE_ORDER"/);

  // And exactly two refusals hang off that set. A third would need a group of
  // its own here.
  const block = server.slice(
    server.indexOf("const sellers = new Set(orderItems"),
    server.indexOf("const orderSellerBusinessId"),
  );
  // COUNTED BY `throw`, not by `error.code`. The first version matched
  // /error\.code = "/ and so was counting a variable NAME: a third refusal
  // written with any other identifier walked straight past it, which is what
  // the falsification run demonstrated. A refusal is a throw.
  const refusals = block.match(/\bthrow\b/g) || [];
  assert.equal(
    refusals.length,
    2,
    `The checkout now raises ${refusals.length} refusals over the seller set, not 2.\n` +
      "cartGrouping predicts two. A basket it calls fine may now be rejected at the\n" +
      "last step, which is the exact failure this module exists to prevent.",
  );
});

test("the browser's copy groups by the same rule", () => {
  // src/lib/cartGrouping.ts cannot be imported here - TypeScript, no loader in
  // this runner - so the grouping bodies are compared as code, the way
  // petAge.test.js and bagDuration.test.js pin their own mirrors. A cart that
  // groups differently from this module is a cart that predicts the wrong
  // refusal, which is worse than predicting none.
  const bodyOf = (source) => {
    const start = source.indexOf("const groups = new Map");
    const end = source.indexOf("\n};", start);
    return source
      .slice(start, end)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "")
      // Only TypeScript's own syntax is normalised away. Every other
      // difference has to be fixed in the files, because a normalisation rule
      // is a place this comparison stops looking.
      .replace(/groups\.get\(key\)!/g, "groups.get(key)")
      .replace(/new Map<[\s\S]*?>\(\)/g, "new Map()")
      .replace(/\s+/g, " ")
      .trim();
  };

  const server = bodyOf(readFileSync(new URL("../src/cartGrouping.js", import.meta.url), "utf8"));
  const client = bodyOf(readFileSync(new URL("../../src/lib/cartGrouping.ts", import.meta.url), "utf8"));

  assert.ok(server.length > 200, "the server grouping body was not found");
  assert.equal(client, server, "the cart's grouping and the server's mirror have drifted apart");
});
