// Activity guidance derived from breed reference data.
//
// EnergySheet used to match `pet.breed` — the breed's *name* — against the
// string "high". A breed name never contains it, so every pet, of every breed,
// was told 45 minutes of activity and an energy level of "בינונית". The profile
// screen derived the same thing separately from breed_information.
//
// One derivation now, and it returns null when the breed data says nothing,
// because a default here is indistinguishable from an answer.
//
// The module is TypeScript; this suite exercises the same rules against a
// faithful port, the convention petSafetyScore.test.js established.

import assert from "node:assert/strict";
import test from "node:test";

// --- port of src/lib/petActivity.ts ---

const MINUTES_BY_LEVEL = { 1: 20, 2: 30, 3: 45, 4: 60, 5: 90 };

const isEnergyLevel = (value) =>
  typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;

const levelFromExerciseNeeds = (exerciseNeeds) => {
  const text = String(exerciseNeeds || "").trim().toLowerCase();
  if (!text) return null;
  if (text.includes("very high") || text.includes("גבוהה מאוד") || text.includes("גבוה מאוד")) return 5;
  if (text.includes("high") || text.includes("גבוה")) return 4;
  if (text.includes("moderate") || text.includes("medium") || text.includes("בינוני")) return 3;
  if (text.includes("very low") || text.includes("נמוכה מאוד")) return 1;
  if (text.includes("low") || text.includes("נמוך")) return 2;
  return null;
};

const breedEnergyLevel = (breed) => {
  if (!breed) return null;
  if (isEnergyLevel(breed.energy_level)) return breed.energy_level;
  return levelFromExerciseNeeds(breed.exercise_needs);
};

const breedActivityMinutes = (breed) => {
  const level = breedEnergyLevel(breed);
  return level === null ? null : MINUTES_BY_LEVEL[level];
};

const ENERGY_LABEL_HE = { 1: "נמוכה מאוד", 2: "נמוכה", 3: "בינונית", 4: "גבוהה", 5: "גבוהה מאוד" };

const breedEnergyLabelHe = (breed) => {
  const level = breedEnergyLevel(breed);
  return level === null ? null : ENERGY_LABEL_HE[level];
};

// --- the regression this exists for ---

test("a breed NAME is not an activity level", () => {
  // The exact shape of the bug: the pet's breed string was searched for "high".
  // Passing a breed name where breed data belongs must not produce an answer.
  assert.equal(breedEnergyLevel({ exercise_needs: null, energy_level: null }), null);
  assert.equal(breedActivityMinutes({}), null);
  assert.equal(breedEnergyLabelHe({}), null);
});

test("breeds with no reference data do not all become medium", () => {
  // Every pet used to land on 45 minutes / "בינונית" regardless of breed.
  assert.equal(breedActivityMinutes(null), null);
  assert.notEqual(breedActivityMinutes(null), 45);
  assert.notEqual(breedEnergyLabelHe(null), "בינונית");
});

// --- levels ---

test("low activity", () => {
  assert.equal(breedEnergyLevel({ energy_level: 2 }), 2);
  assert.equal(breedActivityMinutes({ energy_level: 2 }), 30);
  assert.equal(breedEnergyLabelHe({ energy_level: 2 }), "נמוכה");
});

test("medium activity", () => {
  assert.equal(breedActivityMinutes({ energy_level: 3 }), 45);
  assert.equal(breedEnergyLabelHe({ energy_level: 3 }), "בינונית");
});

test("high activity", () => {
  assert.equal(breedActivityMinutes({ energy_level: 4 }), 60);
  assert.equal(breedEnergyLabelHe({ energy_level: 4 }), "גבוהה");
});

test("very high activity", () => {
  assert.equal(breedActivityMinutes({ energy_level: 5 }), 90);
  assert.equal(breedEnergyLabelHe({ energy_level: 5 }), "גבוהה מאוד");
});

// --- the free-text fallback ---

test("reads an energy level out of English exercise needs", () => {
  assert.equal(breedEnergyLevel({ exercise_needs: "High" }), 4);
  assert.equal(breedEnergyLevel({ exercise_needs: "Moderate daily walks" }), 3);
  assert.equal(breedEnergyLevel({ exercise_needs: "Low" }), 2);
});

test("reads an energy level out of Hebrew exercise needs", () => {
  assert.equal(breedEnergyLevel({ exercise_needs: "גבוהה" }), 4);
  assert.equal(breedEnergyLevel({ exercise_needs: "בינוני" }), 3);
  assert.equal(breedEnergyLevel({ exercise_needs: "נמוך" }), 2);
});

test("'very high' is tested before 'high', in both languages", () => {
  // "very high" contains "high"; testing in the wrong order silently downgrades
  // every very-high breed.
  assert.equal(breedEnergyLevel({ exercise_needs: "Very high" }), 5);
  assert.equal(breedEnergyLevel({ exercise_needs: "גבוהה מאוד" }), 5);
  assert.equal(breedEnergyLevel({ exercise_needs: "very low" }), 1);
  assert.equal(breedEnergyLevel({ exercise_needs: "נמוכה מאוד" }), 1);
});

test("a numeric level wins over free text", () => {
  assert.equal(breedEnergyLevel({ energy_level: 5, exercise_needs: "Low" }), 5);
});

test("an out-of-range numeric level is ignored, not clamped", () => {
  // A 0 or a 9 is data corruption, not a very-low or very-high breed.
  assert.equal(breedEnergyLevel({ energy_level: 0 }), null);
  assert.equal(breedEnergyLevel({ energy_level: 9 }), null);
  assert.equal(breedEnergyLevel({ energy_level: 2.5 }), null);
});

test("unrelated free text produces no level", () => {
  assert.equal(breedEnergyLevel({ exercise_needs: "לברדור רטריבר" }), null);
  assert.equal(breedEnergyLevel({ exercise_needs: "Golden Retriever" }), null);
});
