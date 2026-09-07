import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_ERROR_CLASS,
  calculateMipoCredits,
  calculateProviderCost,
  classifyProviderError,
  normalizeProviderUsage,
  sanitizeProviderError,
  selectPricingVersion,
} from "../src/aiAccounting.js";

test("normalizeProviderUsage maps a Gemini usage report", () => {
  const usage = normalizeProviderUsage({
    input_tokens: 1200,
    output_tokens: 340,
    cached_tokens: 800,
    total_tokens: 1540,
  });
  assert.deepEqual(usage, {
    input_tokens: 1200,
    output_tokens: 340,
    cached_tokens: 800,
    total_tokens: 1540,
  });
});

test("normalizeProviderUsage falls back to input+output when no total is reported", () => {
  const usage = normalizeProviderUsage({ input_tokens: 100, output_tokens: 25 });
  assert.equal(usage.total_tokens, 125);
});

test("normalizeProviderUsage rejects junk instead of writing NaN to the ledger", () => {
  const usage = normalizeProviderUsage({
    input_tokens: "not a number",
    output_tokens: -5,
    cached_tokens: null,
    total_tokens: undefined,
  });
  assert.deepEqual(usage, {
    input_tokens: 0,
    output_tokens: 0,
    cached_tokens: 0,
    total_tokens: 0,
  });
});

test("calculateMipoCredits is a product number, not a token count", () => {
  const usage = { total_tokens: 10420 };
  // Credits and tokens must not be the same magnitude.
  assert.equal(calculateMipoCredits(usage, 4), 41.68);
  assert.notEqual(calculateMipoCredits(usage, 4), usage.total_tokens);
});

test("calculateMipoCredits keeps a small call from rounding away to zero", () => {
  assert.ok(calculateMipoCredits({ total_tokens: 120 }, 4) > 0);
});

test("calculateMipoCredits returns zero for a model with no credit rate", () => {
  assert.equal(calculateMipoCredits({ total_tokens: 5000 }, 0), 0);
  assert.equal(calculateMipoCredits({ total_tokens: 5000 }, null), 0);
});

test("selectPricingVersion picks the version in force at the given instant", () => {
  const versions = [
    { id: "v1", effective_from: "2026-01-01T00:00:00Z", effective_to: "2026-06-01T00:00:00Z" },
    { id: "v2", effective_from: "2026-06-01T00:00:00Z", effective_to: null },
  ];
  assert.equal(selectPricingVersion(versions, new Date("2026-03-01T00:00:00Z")).id, "v1");
  assert.equal(selectPricingVersion(versions, new Date("2026-09-01T00:00:00Z")).id, "v2");
});

test("selectPricingVersion keeps historical cost reproducible after a price change", () => {
  const versions = [
    { id: "old", effective_from: "2026-01-01T00:00:00Z", effective_to: "2026-06-01T00:00:00Z", input_price_per_1m: 0.3, output_price_per_1m: 2.5, currency: "USD" },
    { id: "new", effective_from: "2026-06-01T00:00:00Z", effective_to: null, input_price_per_1m: 0.6, output_price_per_1m: 5, currency: "USD" },
  ];
  const usage = { input_tokens: 1_000_000, output_tokens: 0, cached_tokens: 0 };
  const past = calculateProviderCost(usage, selectPricingVersion(versions, new Date("2026-02-01T00:00:00Z")));
  const now = calculateProviderCost(usage, selectPricingVersion(versions, new Date("2026-09-01T00:00:00Z")));
  assert.equal(past.provider_cost, 0.3);
  assert.equal(now.provider_cost, 0.6);
});

test("selectPricingVersion returns null when nothing covers the instant", () => {
  const versions = [{ id: "v1", effective_from: "2026-06-01T00:00:00Z", effective_to: null }];
  assert.equal(selectPricingVersion(versions, new Date("2026-01-01T00:00:00Z")), null);
  assert.equal(selectPricingVersion([], new Date()), null);
});

test("calculateProviderCost prices input and output separately", () => {
  const cost = calculateProviderCost(
    { input_tokens: 1_000_000, output_tokens: 1_000_000, cached_tokens: 0 },
    { currency: "USD", input_price_per_1m: 0.3, output_price_per_1m: 2.5 },
  );
  assert.equal(cost.provider_cost, 2.8);
  assert.equal(cost.currency, "USD");
  assert.equal(cost.priced, true);
});

test("calculateProviderCost does not bill cached tokens at the full input rate", () => {
  const version = { currency: "USD", input_price_per_1m: 0.3, output_price_per_1m: 2.5, cached_input_price_per_1m: 0.075 };
  const cost = calculateProviderCost(
    { input_tokens: 1_000_000, output_tokens: 0, cached_tokens: 1_000_000 },
    version,
  );
  // All input was cached, so it prices at the cached rate, not the input rate.
  assert.equal(cost.provider_cost, 0.075);
});

test("calculateProviderCost handles per-unit models such as image generation", () => {
  const cost = calculateProviderCost(
    { total_tokens: 0 },
    { currency: "USD", unit_price: 0.039, unit: "image" },
    { quantity: 3 },
  );
  assert.equal(cost.provider_cost, 0.117);
});

test("calculateProviderCost reports unpriced rather than pretending a call was free", () => {
  assert.deepEqual(calculateProviderCost({ total_tokens: 5000 }, null), {
    provider_cost: 0,
    currency: "USD",
    priced: false,
  });
  const noRates = calculateProviderCost({ total_tokens: 5000 }, { currency: "USD" });
  assert.equal(noRates.priced, false);
});

test("the three quantities stay distinct for one real call", () => {
  const usage = normalizeProviderUsage({ input_tokens: 9000, output_tokens: 1420, total_tokens: 10420 });
  const credits = calculateMipoCredits(usage, 4);
  const cost = calculateProviderCost(usage, {
    currency: "USD",
    input_price_per_1m: 0.3,
    output_price_per_1m: 2.5,
  });
  assert.equal(usage.total_tokens, 10420);
  assert.equal(credits, 41.68);
  assert.equal(cost.provider_cost, 0.006250);
  assert.ok(usage.total_tokens !== credits && credits !== cost.provider_cost);
});

test("classifyProviderError sends rate limits and 5xx to fallback", () => {
  assert.equal(classifyProviderError({ status: 429 }), AI_ERROR_CLASS.FALLBACK);
  assert.equal(classifyProviderError({ status: 503 }), AI_ERROR_CLASS.FALLBACK);
  assert.equal(classifyProviderError({ status: 500 }), AI_ERROR_CLASS.FALLBACK);
});

test("classifyProviderError marks an auth failure fallback so the account can be degraded", () => {
  assert.equal(classifyProviderError({ status: 401 }), AI_ERROR_CLASS.FALLBACK);
  assert.equal(classifyProviderError({ status: 403 }), AI_ERROR_CLASS.FALLBACK);
});

test("classifyProviderError never retries a bad request or a safety refusal", () => {
  assert.equal(classifyProviderError({ status: 400 }), AI_ERROR_CLASS.NON_RETRYABLE);
  assert.equal(classifyProviderError({ status: 422 }), AI_ERROR_CLASS.NON_RETRYABLE);
  assert.equal(classifyProviderError({ code: "invalid_schema" }), AI_ERROR_CLASS.NON_RETRYABLE);
  // Re-sending refused content to another provider is not a resilience strategy.
  assert.equal(classifyProviderError({ code: "safety" }), AI_ERROR_CLASS.NON_RETRYABLE);
});

test("classifyProviderError treats timeouts and network faults as retryable", () => {
  assert.equal(classifyProviderError({ code: "timeout" }), AI_ERROR_CLASS.RETRYABLE);
  assert.equal(classifyProviderError({ code: "network" }), AI_ERROR_CLASS.RETRYABLE);
});

test("sanitizeProviderError strips an API key echoed back in a URL", () => {
  const dirty = "request to https://generativelanguage.googleapis.com/v1beta/models/x:generateContent?key=AIzaSyDUMMYKEY1234567890 failed";
  const clean = sanitizeProviderError(dirty);
  assert.ok(!clean.includes("AIzaSyDUMMYKEY1234567890"));
  assert.ok(clean.includes("[redacted]"));
});

test("sanitizeProviderError strips bearer tokens and api key fields", () => {
  assert.ok(!sanitizeProviderError('{"api_key":"sk-abcdef1234567890"}').includes("sk-abcdef1234567890"));
  assert.ok(!sanitizeProviderError("Authorization: Bearer sk-live-9876543210").includes("sk-live-9876543210"));
});

test("sanitizeProviderError bounds the stored message", () => {
  assert.ok(sanitizeProviderError("x".repeat(5000)).length <= 300);
  assert.equal(sanitizeProviderError(""), null);
  assert.equal(sanitizeProviderError(null), null);
});
