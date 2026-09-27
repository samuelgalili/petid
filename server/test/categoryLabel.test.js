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
