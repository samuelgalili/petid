import assert from "node:assert/strict";
import { test } from "node:test";

import { applyRounding, computePrice, percentileOf } from "../src/pricingEngine.js";

const RULE = {
  strategy: "cost_plus_margin",
  margin_percent: 45,
  min_margin_percent: 20,
  max_margin_percent: 120,
  vat_percent: 17,
  price_includes_vat: true,
  rounding: "none",
};

test("margin is on the selling price, not markup on cost", () => {
  // Confusing the two is the classic way a shop prices itself into a loss:
  // cost + 45% gives 145, but a 45% margin means cost is 55% of the price.
  const { price, calculation } = computePrice(RULE, { cost: 100 });

  // 100 / 0.55 = 181.82 net, + 17% VAT = 212.73
  assert.equal(calculation.inputs.cost, 100);
  assert.ok(price > 210 && price < 214, `expected about 212.73, got ${price}`);
  assert.notEqual(Math.round(price), 170, "145 + VAT would be markup, not margin");
});

test("the reported margin matches the price actually proposed", () => {
  const { price, margin_percent } = computePrice(RULE, { cost: 100 });
  const net = price / 1.17;
  const recomputed = ((net - 100) / net) * 100;
  assert.ok(
    Math.abs(recomputed - margin_percent) < 0.5,
    `margin says ${margin_percent}% but the price implies ${recomputed.toFixed(2)}%`,
  );
});

test("VAT is added once and is not counted as margin", () => {
  const withVat = computePrice(RULE, { cost: 100 });
  const withoutVat = computePrice({ ...RULE, price_includes_vat: false }, { cost: 100 });

  assert.ok(withVat.price > withoutVat.price);
  // Margin is ours; VAT is not, so both must report the same margin.
  assert.ok(Math.abs(withVat.margin_percent - withoutVat.margin_percent) < 0.5);
});

test("no cost means no proposal rather than a guess", () => {
  for (const cost of [0, null, undefined, NaN]) {
    const result = computePrice(RULE, { cost });
    assert.equal(result.price, null);
    assert.equal(result.warnings[0].code, "NO_COST");
  }
});

test("rounding never eats into margin", () => {
  // Always upward, so a rounded price is never below the computed one.
  assert.equal(applyRounding(87.43, "ends_90"), 87.9);
  assert.equal(applyRounding(87.95, "ends_90"), 88.9);
  assert.equal(applyRounding(87.43, "ends_99"), 87.99);
  assert.equal(applyRounding(87.43, "nearest_shekel"), 88);
  assert.equal(applyRounding(87.43, "none"), 87.43);

  for (const rounding of ["ends_90", "ends_99", "nearest_shekel"]) {
    for (const price of [1.01, 9.5, 87.43, 199.99, 1000.5]) {
      assert.ok(
        applyRounding(price, rounding) >= price,
        `${rounding} rounded ${price} down`,
      );
    }
  }
});

test("a guard rail marks the proposal instead of silently capping it", () => {
  // Capping would hide a rule that is wrong. The number stands and is flagged.
  const thin = computePrice(
    { ...RULE, margin_percent: 5, min_margin_percent: 20 },
    { cost: 100 },
  );
  assert.ok(thin.price > 0, "the price is still produced");
  assert.ok(thin.warnings.some((warning) => warning.code === "BELOW_MIN_MARGIN"));
});

test("a large move from the current price is worth a second look", () => {
  const jump = computePrice(RULE, { cost: 100, currentPrice: 50 });
  assert.ok(jump.warnings.some((warning) => warning.code === "LARGE_CHANGE"));
  assert.equal(typeof jump.calculation.change_percent, "number");

  const steady = computePrice(RULE, { cost: 100, currentPrice: 210 });
  assert.equal(steady.warnings.some((warning) => warning.code === "LARGE_CHANGE"), false);
});

test("an uncertain market match does not drag the answer", () => {
  const rule = { ...RULE, strategy: "market_median" };
  const observations = [
    { price: 200, match_confidence: 95 },
    { price: 210, match_confidence: 90 },
    { price: 900, match_confidence: 40 }, // probably a different product
  ];

  const { price, calculation } = computePrice(rule, { cost: 100, marketPrices: observations });
  assert.equal(calculation.inputs.observations, 2, "the weak match is left out");
  assert.ok(price < 300, `an unrelated 900 should not pull the price up, got ${price}`);
});

test("no market data means no proposal", () => {
  const result = computePrice({ ...RULE, strategy: "market_median" }, { cost: 100, marketPrices: [] });
  assert.equal(result.price, null);
  assert.equal(result.warnings[0].code, "NO_MARKET_DATA");
});

test("percentiles interpolate rather than snapping to a member", () => {
  assert.equal(percentileOf([10, 20, 30], 50), 20);
  assert.equal(percentileOf([10, 20], 50), 15);
  assert.equal(percentileOf([10, 20, 30, 40], 25), 17.5);
  assert.equal(percentileOf([], 50), null);
  assert.equal(percentileOf([42], 90), 42);
});

test("a manual rule proposes nothing at all", () => {
  const result = computePrice({ ...RULE, strategy: "manual" }, { cost: 100 });
  assert.equal(result.price, null);
});

test("keystone is a multiple of cost", () => {
  const { price } = computePrice(
    { ...RULE, strategy: "keystone", markup_multiplier: 2 },
    { cost: 100 },
  );
  // 100 × 2 = 200 net, + 17% VAT = 234
  assert.ok(Math.abs(price - 234) < 0.5, `expected about 234, got ${price}`);
});
