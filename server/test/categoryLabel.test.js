import assert from "node:assert/strict";
import test from "node:test";
import { displayCategoryLabel } from "../../src/lib/categoryLabel.js";

test("an import slug is a Hebrew shelf name", () => {
  assert.equal(displayCategoryLabel(null, "dry-food"), "מזון יבש");
  assert.equal(displayCategoryLabel("", "dry-food"), "מזון יבש");
  assert.equal(displayCategoryLabel(undefined, "DRY-FOOD"), "מזון יבש");
  assert.equal(displayCategoryLabel(null, "dry food"), "מזון יבש");
  assert.equal(displayCategoryLabel(null, "wet-food"), "מזון רטוב");
  assert.equal(displayCategoryLabel(null, "treats"), "חטיפים");
  assert.equal(displayCategoryLabel(null, "accessories"), "אביזרים");
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
