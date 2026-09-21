// What delivery costs, and the two files that have to agree about it.
//
// THE BUG THIS FILE EXISTS FOR was not a crash and did not fail anything. The
// owner said, twice, the second time in as many words:
//
//   "והייתי מאוד ברור משלוח עולה 39 שח מי שלא מגיע למינימום הזמנה של 199 שח"
//
// src/lib/shipping.ts was written from that sentence and said 39. The shop's
// free-delivery badge read it. And the checkout charged 25 - Checkout.tsx had
// the number typed in as a literal for the total the customer approved, and
// index.js had it typed in again for the total the customer was charged.
//
// The two literals agreed with each other, so the order reconciled perfectly
// and nothing ever errored. Every order under the threshold was simply
// fourteen shekels short, silently, for as long as it had been that way.
//
// A price is the kind of fact that has to be in ONE place, and the place has
// to be the one the money code reads. These tests are about that: the number,
// and nobody writing it down a second time.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, shippingFor } from "../src/shipping.js";

const browserModule = () => readFileSync(new URL("../../src/lib/shipping.ts", import.meta.url), "utf8");

const numberFrom = (source, name) => {
  const match = source.match(new RegExp(`export const ${name}\\s*=\\s*(\\d+(?:\\.\\d+)?)`));
  assert.ok(match, `${name} was not found in the browser's copy`);
  return Number(match[1]);
};

test("the owner's number is the number", () => {
  // Stated rather than derived, because the value is a business decision and
  // not an implementation detail. If it changes, it changes here first.
  assert.equal(SHIPPING_FEE, 39);
  assert.equal(FREE_SHIPPING_THRESHOLD, 199);
});

test("the browser and the server charge the same for delivery", () => {
  // The pin is on the VALUES, not on the source text. src/lib/shipping.ts also
  // carries the delivery estimate and the returns policy, which the server has
  // no business holding, so the files legitimately differ - only these two
  // numbers have to agree.
  const source = browserModule();
  assert.equal(numberFrom(source, "SHIPPING_FEE"), SHIPPING_FEE);
  assert.equal(numberFrom(source, "FREE_SHIPPING_THRESHOLD"), FREE_SHIPPING_THRESHOLD);
});

test("delivery is charged below the threshold and free at it", () => {
  assert.equal(shippingFor(0), SHIPPING_FEE);
  assert.equal(shippingFor(198.99), SHIPPING_FEE);
  // AT the threshold, not above it: "מי שלא מגיע למינימום" - somebody who does
  // not REACH the minimum pays. Somebody who reaches it exactly has reached it.
  assert.equal(shippingFor(FREE_SHIPPING_THRESHOLD), 0);
  assert.equal(shippingFor(500), 0);
});

test("an order under the threshold is accepted, not refused", () => {
  // ₪199 is the minimum order for FREE DELIVERY, not a minimum order. An order
  // of ₪40 is a perfectly good order that pays for its delivery, and reading
  // the sentence the other way would turn a price into a refusal.
  assert.equal(shippingFor(40), SHIPPING_FEE);
  assert.ok(Number.isFinite(shippingFor(1)));
});

test("nothing in the money path writes the number down a second time", () => {
  // THE ACTUAL DEFECT, guarded directly. Both totals were computed from a
  // literal, and a literal cannot disagree loudly - it just quietly charges
  // something else. This scans the two files that compute what a customer
  // approves and what a customer is charged.
  const files = [
    ["server/src/index.js", readFileSync(new URL("../src/index.js", import.meta.url), "utf8")],
    ["src/pages/Checkout.tsx", readFileSync(new URL("../../src/pages/Checkout.tsx", import.meta.url), "utf8")],
  ];

  for (const [name, source] of files) {
    // The shape the bug had: a threshold comparison resolving to a fee, with
    // both numbers inline.
    const inlineRule = /subtotal\s*>=\s*\d+\s*\?\s*\d+\s*:\s*\d+/.exec(source);
    assert.equal(
      inlineRule,
      null,
      `${name} computes delivery from inline numbers (${inlineRule?.[0]}) instead of reading the shipping module`,
    );
    assert.ok(source.includes("shippingFor"), `${name} no longer reads the shared delivery rule`);
  }
});
