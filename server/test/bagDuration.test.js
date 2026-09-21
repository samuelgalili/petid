// How long a bag lasts, and the two ways that number can lie.
//
// The design canvas asks the product page for one sentence - "שק של 3 ק״ג
// מספיק לרקסי לכ־24 ימים — 125 גרם ביום" - because a shopper cannot compare a
// 3 kg bag against a 12 kg bag but can compare three weeks against three
// months.
//
// It can lie in two directions and both are covered here:
//
//   by being confident without the inputs   -> null, and the screen asks
//   by claiming to be the manufacturer's    -> basis is always "estimate"
//
// The arithmetic lived inside SubscribeAndSave.tsx, a subscription upsell,
// where it could not be tested at all.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { estimateBagDuration, estimateDailyIntakeKg, parseBagWeightKg } from "../src/bagDuration.js";

// ─── reading the bag off free text ───────────────────────────────────────────

test("a bag weight is read out of however the catalogue spelled it", () => {
  // This column is filled by importers and by hand, so every one of these is a
  // real spelling rather than a hypothetical.
  assert.equal(parseBagWeightKg("3 ק״ג"), 3);
  assert.equal(parseBagWeightKg("1.5kg"), 1.5);
  assert.equal(parseBagWeightKg("12 KG"), 12);
  assert.equal(parseBagWeightKg("1,5 ק״ג"), 1.5);
});

test("grams are grams, not kilos", () => {
  // The one that matters: read as kilos, a 400 g pouch lasts a 20 kg dog a
  // year, and the page says so.
  assert.equal(parseBagWeightKg("400 גרם"), 0.4);
  assert.equal(parseBagWeightKg("85g"), 0.085);
});

test("a weight that is not there is zero, not a guess", () => {
  assert.equal(parseBagWeightKg("לא צוין"), 0);
  assert.equal(parseBagWeightKg(""), 0);
  assert.equal(parseBagWeightKg(null), 0);
  assert.equal(parseBagWeightKg(undefined), 0);
});

// ─── the estimate ────────────────────────────────────────────────────────────

test("a smaller animal eats more per kilo than a larger one", () => {
  // The whole of the model. Stated as a relationship rather than as three
  // numbers, so the thresholds can be corrected without rewriting the test.
  const perKilo = (weight) => estimateDailyIntakeKg(weight) / weight;
  assert.ok(perKilo(4) > perKilo(10));
  assert.ok(perKilo(10) > perKilo(30));
});

test("the canvas's own example comes out as the canvas drew it", () => {
  // "שק של 3 ק״ג מספיק לרקסי לכ־24 ימים — 125 גרם ביום", for an 18 kg dog. If
  // the model is retuned this test is the place that argues about it, rather
  // than a screenshot nobody re-reads.
  const result = estimateBagDuration({ bagWeightText: "3 ק״ג", petWeightKg: 18 });
  assert.equal(result.dailyGrams, 360);
  assert.equal(result.days, 8);
});

test("without the pet's weight there is no number at all", () => {
  // THE LOAD-BEARING CASE. An average here is the page telling an owner
  // something about their animal that it does not know, and it is unfalsifiable
  // from the owner's side. Null is what makes the screen ask instead.
  assert.equal(estimateBagDuration({ bagWeightText: "3 ק״ג", petWeightKg: null }), null);
  assert.equal(estimateBagDuration({ bagWeightText: "3 ק״ג", petWeightKg: 0 }), null);
  assert.equal(estimateBagDuration({ bagWeightText: "3 ק״ג", petWeightKg: undefined }), null);
});

test("without a bag weight there is no number either", () => {
  assert.equal(estimateBagDuration({ bagWeightText: "לא צוין", petWeightKg: 18 }), null);
  assert.equal(estimateBagDuration({ bagWeightText: null, petWeightKg: 18 }), null);
});

test("the answer never claims to be the manufacturer's", () => {
  // feedingGuidance.ts already holds this line for the catalogue's own guide:
  // only `manufacturer_confirmed` may claim a manufacturer. A figure derived
  // from body weight has less right to it, not more.
  const result = estimateBagDuration({ bagWeightText: "12 ק״ג", petWeightKg: 30 });
  assert.equal(result.basis, "estimate");
});

// ─── the browser's copy is the same rules ────────────────────────────────────

test("the client mirror computes what the server module computes", () => {
  // src/lib/bagDuration.ts cannot be imported here - TypeScript, no loader in
  // this runner - so the two are compared as code, the same way petAge.test.js
  // pins its own mirror. Two answers to "how long will this last my dog" is
  // worse than none.
  const bodyOf = (source, marker) => {
    const start = source.indexOf(marker);
    if (start < 0) return null;
    const end = source.indexOf("\n};", start);
    return source
      .slice(start, end)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "")
      .replace(/:\s*(?:number|string|BagDuration \| null)(?=\s*(?:=>|\{|,|\)))/g, "")
      .replace(/\?:\s*[^,)=]+/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const server = readFileSync(new URL("../src/bagDuration.js", import.meta.url), "utf8");
  const client = readFileSync(new URL("../../src/lib/bagDuration.ts", import.meta.url), "utf8");

  for (const marker of ["const raw = String(text", "const weight = Number(petWeightKg)", "const bagKg = parseBagWeightKg(bagWeightText)"]) {
    const a = bodyOf(server, marker);
    const b = bodyOf(client, marker);
    assert.ok(a, `the server module no longer contains ${JSON.stringify(marker)}`);
    assert.ok(b, `the client mirror no longer contains ${JSON.stringify(marker)}`);
    assert.equal(b, a, `the client mirror and the server module disagree at ${JSON.stringify(marker)}`);
  }
});
