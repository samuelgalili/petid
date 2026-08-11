import assert from "node:assert/strict";
import test from "node:test";
import { normalizeProductEnrichment } from "../src/productIntel.js";

test("normalizes inconsistent AI enrichment fields before they reach the UI", () => {
  const result = normalizeProductEnrichment({
    name: { title: "  Healthy food  " },
    sizes: "Large",
    colors: { label: "Blue" },
    flavors: [{ name: "Chicken" }, "Beef"],
    benefits: [{ title: "Joint support", description: "With glucosamine" }],
    feeding_guide: { range: "Adult", amount: "2 cups" },
    brandWebsite: { url: "https://example.com" },
    suggestedPrice: "49.90",
    variants: { label: "not-an-array" },
  });

  assert.equal(result.name, "Healthy food");
  assert.deepEqual(result.sizes, ["Large"]);
  assert.deepEqual(result.colors, ["Blue"]);
  assert.deepEqual(result.flavors, ["Chicken", "Beef"]);
  assert.deepEqual(result.benefits, ["Joint support: With glucosamine"]);
  assert.equal(result.feedingGuide, "Adult: 2 cups");
  assert.equal(result.brandWebsite, "https://example.com");
  assert.equal(result.suggestedPrice, 49.9);
  assert.deepEqual(result.variants, []);
});

test("drops opaque objects instead of leaking object values into React", () => {
  const result = normalizeProductEnrichment({
    sizes: [{ unexpected: "value" }],
    benefits: [null, {}, undefined],
    suggestedPrice: "not-a-number",
  });

  assert.deepEqual(result.sizes, []);
  assert.deepEqual(result.benefits, []);
  assert.equal(result.suggestedPrice, null);
  assert.equal(JSON.stringify(result).includes("[object Object]"), false);
});
