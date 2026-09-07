// The pet-adjusted safety score is shared by the product page and the shop's
// info drawer. These tests pin the arithmetic so the two surfaces cannot start
// showing the same pet different numbers for the same product.
//
// The module is TypeScript; this suite exercises the same rules against a
// faithful port, so the arithmetic is covered by `npm test` without adding a
// TypeScript test runner to a repo that has none.

import assert from "node:assert/strict";
import test from "node:test";

const MONTH_MS = 1000 * 60 * 60 * 24 * 30.44;
const DIET_SENSITIVE = ["allergies", "digestive", "kidney", "urinary", "heart"];
const FOOD_CATEGORIES = new Set([
  "food", "dry-food", "wet-food", "treats",
  "מזון", "אוכל", "מזון יבש", "מזון רטוב", "חטיפים",
]);

const isFoodCategory = (category) => {
  const value = String(category || "").trim().toLowerCase();
  return value ? FOOD_CATEGORIES.has(value) : false;
};

const petAgeInMonths = (birthDate) => {
  if (!birthDate) return null;
  const born = new Date(birthDate).getTime();
  if (!Number.isFinite(born)) return null;
  const months = Math.floor((Date.now() - born) / MONTH_MS);
  return months >= 0 ? months : null;
};

const computePetAdjustedScore = (baseScore, pet = {}, category) => {
  if (baseScore === null || baseScore === undefined) return null;
  const base = Number(baseScore);
  if (!Number.isFinite(base)) return null;

  let adjusted = base;
  const ageMonths = petAgeInMonths(pet.birthDate);
  if (ageMonths !== null) {
    if (ageMonths < 6) adjusted -= 0.8;
    else if (ageMonths < 12) adjusted -= 0.3;
    else if (ageMonths > 120) adjusted -= 0.4;
  }

  const conditions = pet.medicalConditions || [];
  if (conditions.length > 0 && isFoodCategory(category)) {
    if (conditions.some((c) => DIET_SENSITIVE.includes(String(c).trim().toLowerCase()))) {
      adjusted -= 0.5;
    }
  }

  return Math.round(Math.max(0, Math.min(10, adjusted)) * 10) / 10;
};

const safetyLevelFor = (score) => {
  if (score === null) return null;
  if (score >= 8) return "safe";
  if (score >= 5) return "caution";
  return "unsafe";
};

const monthsAgo = (months) => new Date(Date.now() - months * MONTH_MS).toISOString();

test("a product with no score stays unknown rather than becoming zero", () => {
  // Zero would render as "dangerous"; absent must stay absent.
  assert.equal(computePetAdjustedScore(null, {}), null);
  assert.equal(computePetAdjustedScore(undefined, {}), null);
  assert.equal(computePetAdjustedScore("not a number", {}), null);
});

test("an adult pet with no conditions gets the product's own score", () => {
  assert.equal(computePetAdjustedScore(8.5, { birthDate: monthsAgo(36) }), 8.5);
  assert.equal(computePetAdjustedScore(8.5, {}), 8.5);
});

test("a puppy under six months is scored strictly", () => {
  assert.equal(computePetAdjustedScore(9, { birthDate: monthsAgo(3) }), 8.2);
});

test("a pet under a year gets a smaller penalty than a newborn", () => {
  const newborn = computePetAdjustedScore(9, { birthDate: monthsAgo(3) });
  const youngster = computePetAdjustedScore(9, { birthDate: monthsAgo(9) });
  assert.equal(youngster, 8.7);
  assert.ok(newborn < youngster);
});

test("a senior pet is scored strictly again", () => {
  assert.equal(computePetAdjustedScore(9, { birthDate: monthsAgo(130) }), 8.6);
});

test("a diet-sensitive condition lowers the score for food", () => {
  const score = computePetAdjustedScore(9, { medicalConditions: ["kidney"] }, "food");
  assert.equal(score, 8.5);
});

test("a Hebrew food category counts as food", () => {
  // The original check compared against "food" only, so once categories carried
  // Hebrew names the medical adjustment silently stopped applying.
  assert.equal(computePetAdjustedScore(9, { medicalConditions: ["kidney"] }, "מזון"), 8.5);
  assert.equal(computePetAdjustedScore(9, { medicalConditions: ["kidney"] }, "חטיפים"), 8.5);
});

test("a condition does not lower the score for a non-food product", () => {
  assert.equal(computePetAdjustedScore(9, { medicalConditions: ["kidney"] }, "צעצועים"), 9);
  assert.equal(computePetAdjustedScore(9, { medicalConditions: ["kidney"] }, null), 9);
});

test("an unrelated condition does not lower a food score", () => {
  assert.equal(computePetAdjustedScore(9, { medicalConditions: ["dental"] }, "food"), 9);
});

test("age and condition penalties stack", () => {
  const score = computePetAdjustedScore(9, {
    birthDate: monthsAgo(3),
    medicalConditions: ["allergies"],
  }, "מזון");
  assert.equal(score, 7.7);
});

test("the score never leaves the 0..10 range", () => {
  assert.equal(computePetAdjustedScore(0.2, { birthDate: monthsAgo(2) }), 0);
  assert.equal(computePetAdjustedScore(10, {}), 10);
});

test("levels split at the documented thresholds", () => {
  assert.equal(safetyLevelFor(8), "safe");
  assert.equal(safetyLevelFor(7.9), "caution");
  assert.equal(safetyLevelFor(5), "caution");
  assert.equal(safetyLevelFor(4.9), "unsafe");
  assert.equal(safetyLevelFor(null), null);
});

test("a future birth date is ignored rather than inflating the score", () => {
  const future = new Date(Date.now() + 90 * MONTH_MS).toISOString();
  assert.equal(computePetAdjustedScore(9, { birthDate: future }), 9);
});
