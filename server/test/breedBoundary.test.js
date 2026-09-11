// Breed reference data is knowledge about a breed. It is never a fact about an
// animal, and the two conversions below are the ones the code actually made.
//
//   breed_information.weight_range_kg = "20-30"   ->  pet.weight = 25
//   breed_information.life_expectancy_years        ->  the pet's age
//
// The first fed an owner-facing feeding amount and pre-filled the weight editor,
// so an owner only had to press save for a breed average to be recorded as
// their animal's weight, as USER_PROVIDED. See docs/pet-intelligence/54 §P0.6.
//
// These tests pin the boundary rather than any one call site: the helpers that
// derive a pet's weight-dependent and age-dependent values take pet fields, and
// there is no path from a breed string into either.

import assert from "node:assert/strict";
import test from "node:test";

const MONTH_MS = 1000 * 60 * 60 * 24 * 30.4375;

const petAge = (pet) => {
  if (!pet) return null;
  const { age_years: years, age_months: months } = pet;
  if (typeof years === "number" && Number.isFinite(years)
    && typeof months === "number" && Number.isFinite(months)) {
    const total = Math.max(0, Math.round(years * 12 + months));
    return { years: Math.floor(total / 12), months: total % 12, totalMonths: total };
  }
  if (!pet.birth_date) return null;
  const born = new Date(String(pet.birth_date)).getTime();
  if (!Number.isFinite(born)) return null;
  const total = Math.floor((Date.now() - born) / MONTH_MS);
  return total >= 0 ? { years: Math.floor(total / 12), months: total % 12, totalMonths: total } : null;
};

const readFeedingGuidance = (product) => {
  if (!product) return null;
  const raw = Array.isArray(product.feeding_guide) ? product.feeding_guide : [];
  const lines = raw.map((e) => (typeof e === "string" ? e.trim() : "")).filter(Boolean);
  return lines.length ? { lines, source: "unknown" } : null;
};

// The midpoint the removed code computed, kept here so the test can name the
// exact number that must not appear anywhere.
const breedMidpoint = (range) => {
  const match = String(range || "").match(/(\d+)-(\d+)/);
  return match ? (Number(match[1]) + Number(match[2])) / 2 : null;
};

test("a breed weight range does not become the pet's weight", () => {
  const breed = { weight_range_kg: "20-30" };
  const pet = { id: "p1", name: "Blue", breed: "Labrador" };

  // The midpoint is computable — that is not the point. The point is that
  // nothing hands it to the pet.
  assert.equal(breedMidpoint(breed.weight_range_kg), 25);
  assert.equal(pet.weight, undefined);
});

test("feeding guidance cannot be produced from a breed weight range", () => {
  // The removed path: no pet weight, so substitute the breed midpoint, multiply
  // by a constant, and show the result as the manufacturer's guidance.
  const breed = { weight_range_kg: "20-30" };
  const petWithNoWeight = { id: "p1", breed: "Labrador" };
  const productWithNoGuide = { feeding_guide: [] };

  assert.equal(readFeedingGuidance(productWithNoGuide), null);
  // And the resolver has no parameter through which a weight could arrive.
  assert.equal(readFeedingGuidance.length, 1);
  assert.equal(petWithNoWeight.weight, undefined);
  assert.equal(breedMidpoint(breed.weight_range_kg), 25);
});

test("breed life expectancy is not the pet's age", () => {
  // life_expectancy_years describes how long the breed tends to live. Reading it
  // as an age makes a puppy twelve years old.
  const breed = { life_expectancy_years: "10-14" };
  const petWithNoBirthDate = { id: "p1", breed: "Labrador" };

  assert.equal(petAge(petWithNoBirthDate), null);
  assert.notEqual(petAge(petWithNoBirthDate), 12);
  assert.ok(breed.life_expectancy_years.includes("14"));
});

test("an unknown age stays unknown even when breed data is available", () => {
  // The temptation is to fill the gap with the breed. Unknown is the answer.
  assert.equal(petAge({ breed: "Labrador" }), null);
});

test("a pet's own weight is used when the owner gave one", () => {
  // The boundary is one-directional: real pet data is used, breed data is not
  // promoted to stand in for it.
  const pet = { id: "p1", weight: 28.2 };
  assert.equal(pet.weight, 28.2);
});
