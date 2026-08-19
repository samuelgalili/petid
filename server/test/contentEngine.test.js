import assert from "node:assert/strict";
import { test } from "node:test";

import { buildSlug, checkAgainstFacts, collectFacts, hashFacts } from "../src/contentEngine.js";

const FACTS = {
  source_name: 'קוואטרו חתול סניור ללא דגן דג לבן וקריל 7 ק"ג',
  brand: "קוואטרו",
  animal: "חתול",
  category: "מזון",
  pack_size: "7 kg",
  sku: "caqu07107",
  price_ils: 329,
};

test("only facts the product actually has are collected", () => {
  const facts = collectFacts({
    name: "מוצר",
    sku: "A1",
    price: 0,
    brand_name: "מותג",
    size_amount: null,
    ingredients: null,
  });

  assert.equal(facts.source_name, "מוצר");
  assert.equal(facts.brand, "מותג");
  // A price of zero is not a price, and an absent weight is not a weight. There
  // is no filling in of a plausible value, because a plausible fact is still a
  // fabricated one.
  assert.equal("price_ils" in facts, false);
  assert.equal("pack_size" in facts, false);
  assert.equal("ingredients" in facts, false);
});

test("a number that appears nowhere in the facts is caught", () => {
  // The most common shape a fabrication takes: an invented weight, percentage
  // or age that reads perfectly and is simply untrue.
  const invented = checkAgainstFacts(
    {
      title: "קוואטרו חתול סניור",
      short_description: "מזון לחתולים בוגרים",
      long_description: "מכיל 32% חלבון ומיועד לחתולים מגיל 7 שנים.",
      key_benefits: [],
    },
    FACTS,
  );

  assert.equal(invented.no_invented_numbers, false);
  assert.ok(invented.unsupported_numbers.includes("32"));
  assert.equal(invented.passed, false, "unsupported numbers must block the content");
});

test("numbers that do come from the facts are fine", () => {
  const grounded = checkAgainstFacts(
    {
      title: 'קוואטרו חתול סניור 7 ק"ג',
      short_description: "מזון יבש לחתולים בוגרים, אריזת 7 קילוגרם.",
      long_description: "מזון לחתולים מבית קוואטרו.",
      key_benefits: ["מיועד לחתולים"],
    },
    FACTS,
  );

  assert.deepEqual(grounded.unsupported_numbers, []);
  assert.equal(grounded.passed, true);
});

test("medical and certification claims are refused", () => {
  // A pet shop must not say a food cures anything, whatever the model wrote.
  for (const sentence of [
    "המזון מרפא בעיות עיכול",
    "מאושר על ידי משרד הבריאות",
    "100% טבעי",
  ]) {
    const checks = checkAgainstFacts(
      { title: "מוצר", short_description: "תיאור", long_description: sentence, key_benefits: [] },
      FACTS,
    );
    assert.equal(checks.no_medical_claims, false, `expected "${sentence}" to be refused`);
    assert.equal(checks.passed, false);
  }
});

test("missing mandatory fields fail regardless of everything else", () => {
  // The specification is explicit that a quality score never overrides a
  // mandatory rule.
  const checks = checkAgainstFacts(
    { title: null, short_description: null, long_description: "טקסט", key_benefits: [] },
    FACTS,
  );
  assert.equal(checks.passed, false);
  assert.equal(checks.has_title, false);
});

test("the same facts hash the same however they are ordered", () => {
  const a = hashFacts({ brand: "קוואטרו", sku: "A1" });
  const b = hashFacts({ sku: "A1", brand: "קוואטרו" });
  assert.equal(a, b, "key order is not a change in the product");
  assert.notEqual(a, hashFacts({ brand: "קוואטרו", sku: "A2" }));
});

test("a slug keeps similarly named products apart", () => {
  const small = buildSlug('קוואטרו חתולים אדולט עוף 1.5 ק"ג', "caqu1.5101");
  const large = buildSlug('קוואטרו חתולים אדולט עוף 20 ק"ג', "caqu20100");

  assert.notEqual(small, large, "two pack sizes are two pages");
  assert.ok(small.endsWith("caqu15101"));
  assert.ok(!small.includes('"'), "quotes do not belong in an address");
  assert.ok(!small.startsWith("-"));
});
