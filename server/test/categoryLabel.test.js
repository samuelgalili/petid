import assert from "node:assert/strict";
import test from "node:test";
import { displayCategoryLabel } from "../../src/lib/categoryLabel.js";

test("an import slug is a Hebrew shelf name", () => {
  assert.equal(displayCategoryLabel(null, "dry-food"), "מזון יבש");
  assert.equal(displayCategoryLabel("", "dry-food"), "מזון יבש");
  assert.equal(displayCategoryLabel(undefined, "DRY-FOOD"), "מזון יבש");
  assert.equal(displayCategoryLabel(null, "dry food"), "מזון יבש");
  assert.equal(displayCategoryLabel(null, "wet-food"), "מזון רטוב");
  assert.equal(displayCategoryLabel(null, "food-dry"), "אוכל יבש");
  assert.equal(displayCategoryLabel(null, "food-wet"), "אוכל רטוב");
  assert.equal(displayCategoryLabel(null, null, "beds"), "מיטות");
  for (const [slug, label] of [
    ["treats", "חטיפים"],
    ["health", "בריאות"],
    ["grooming", "טיפוח"],
    ["toys", "צעצועים"],
    ["accessories", "אביזרים"],
    ["other", "אחר"],
    ["supplements", "בריאות"],
    ["snacks", "חטיפים"],
  ]) {
    assert.equal(displayCategoryLabel(null, slug), label, slug);
  }
});

test("a Hebrew category name is kept", () => {
  assert.equal(displayCategoryLabel("אוכל יבש", "dry-food"), "אוכל יבש");
  assert.equal(displayCategoryLabel("מזון", "food"), "מזון");
  assert.equal(displayCategoryLabel("בריאות", null), "בריאות");
});

test("an unknown English slug is not shown raw", () => {
  assert.equal(displayCategoryLabel(null, "warehouse-only"), "");
  assert.equal(displayCategoryLabel(null, null), "");
});

// GET /api/products/0022bbc6-4931-4a79-b0eb-21c3af245cd0 returns this shape:
// category is the import slug, category_id is set, and category_name /
// category_slug are absent. product_type inside attributes is already Hebrew
// and is not a shelf chip.
test("the live Quattro detail payload labels dry-food in Hebrew", () => {
  const product = {
    id: "0022bbc6-4931-4a79-b0eb-21c3af245cd0",
    name: "קוואטרו כלבים אדולט מיני עוף 7 ק\"ג",
    category: "dry-food",
    category_id: "8d136fea-2e86-4bc2-8f44-4b21e1b685e1",
    pet_type: "dog",
    special_diet: [],
    medical_tags: [],
    breed_tags: [],
    flavors: [],
    life_stage: null,
    dog_size: null,
    product_attributes: {
      product_type: "מזון",
      family_code: "dogs",
      family_description: "מזון כלבים",
      animal: "כלב",
    },
  };

  assert.equal(Object.hasOwn(product, "category_name"), false);
  assert.equal(Object.hasOwn(product, "category_slug"), false);
  assert.equal(
    displayCategoryLabel(product.category_name, product.category, product.category_slug),
    "מזון יבש",
  );
});
