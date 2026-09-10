// Age is derived in exactly one place: calculatePetAge on the server, which
// serializePet returns as age_years/age_months. Six client implementations used
// to recompute it with three different month lengths — 30.4375 here, 30.44 in
// the safety score, a flat 30 in the health breakdown and a flat 365-day year in
// two more — so the same animal could be four on one screen and three on
// another.
//
// src/lib/petAge.ts is now the only client derivation and it prefers what the
// API already said. The module is TypeScript; this suite exercises the same
// rules against a faithful port, so the arithmetic is covered by `npm test`
// without adding a TypeScript test runner to a repo that has none — the same
// convention petSafetyScore.test.js uses.

import assert from "node:assert/strict";
import test from "node:test";

// --- port of src/lib/petAge.ts (and of calculatePetAge, which it mirrors) ---

const MONTH_MS = 1000 * 60 * 60 * 24 * 30.4375;

const fromTotalMonths = (totalMonths) => ({
  years: Math.floor(totalMonths / 12),
  months: totalMonths % 12,
  totalMonths,
});

const petAgeMonthsFromBirthDate = (birthDate) => {
  if (!birthDate) return null;
  const born = new Date(String(birthDate)).getTime();
  if (!Number.isFinite(born)) return null;
  const months = Math.floor((Date.now() - born) / MONTH_MS);
  return months >= 0 ? months : null;
};

const petAge = (pet) => {
  if (!pet) return null;
  const { age_years: years, age_months: months } = pet;
  if (typeof years === "number" && Number.isFinite(years)
    && typeof months === "number" && Number.isFinite(months)) {
    return fromTotalMonths(Math.max(0, Math.round(years * 12 + months)));
  }
  const totalMonths = petAgeMonthsFromBirthDate(pet.birth_date);
  return totalMonths === null ? null : fromTotalMonths(totalMonths);
};

const petAgeInMonths = (pet) => petAge(pet)?.totalMonths ?? null;

// The server's own implementation, so the two can be compared directly.
const calculatePetAge = (birthDate) => {
  if (!birthDate) return { age_years: null, age_months: null };
  const birth = new Date(String(birthDate));
  if (Number.isNaN(birth.getTime())) return { age_years: null, age_months: null };
  const totalMonths = Math.max(0, Math.floor((Date.now() - birth.getTime()) / MONTH_MS));
  return { age_years: Math.floor(totalMonths / 12), age_months: totalMonths % 12 };
};

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

// --- the API's answer wins ---

test("the API's age is used as given, without recomputing from the birth date", () => {
  // A deliberately contradictory pair: if the client recomputed, it would
  // report roughly four years, not the seven the server sent.
  const age = petAge({ age_years: 7, age_months: 3, birth_date: daysAgo(365 * 4) });
  assert.equal(age.years, 7);
  assert.equal(age.months, 3);
  assert.equal(age.totalMonths, 87);
});

test("falls back to the birth date only when the API gave no age", () => {
  const age = petAge({ birth_date: daysAgo(400) });
  assert.equal(age.years, 1);
  assert.ok(age.totalMonths >= 13 && age.totalMonths <= 14);
});

test("a partial age from the API is not trusted; the birth date is used", () => {
  const age = petAge({ age_years: 3, age_months: null, birth_date: daysAgo(365) });
  assert.equal(age.years, 1);
});

test("client and server agree on the same birth date", () => {
  const birthDate = daysAgo(365 * 3 + 40);
  const server = calculatePetAge(birthDate);
  const client = petAge({ birth_date: birthDate });
  assert.equal(client.years, server.age_years);
  assert.equal(client.months, server.age_months);
});

// --- edge cases ---

test("exactly on the birthday", () => {
  const birth = new Date();
  birth.setFullYear(birth.getFullYear() - 4);
  const age = petAge({ birth_date: birth.toISOString().slice(0, 10) });
  assert.equal(age.years, 4);
  assert.equal(age.months, 0);
});

test("one day before a birthday is still the previous year", () => {
  const birth = new Date();
  birth.setFullYear(birth.getFullYear() - 4);
  birth.setDate(birth.getDate() + 1);
  const age = petAge({ birth_date: birth.toISOString().slice(0, 10) });
  assert.equal(age.years, 3);
  assert.equal(age.months, 11);
});

test("one day after a birthday is the new year", () => {
  const birth = new Date();
  birth.setFullYear(birth.getFullYear() - 4);
  birth.setDate(birth.getDate() - 1);
  const age = petAge({ birth_date: birth.toISOString().slice(0, 10) });
  assert.equal(age.years, 4);
  assert.equal(age.months, 0);
});

test("a month boundary rolls the month, not the year", () => {
  const age = petAge({ birth_date: daysAgo(Math.round(30.4375 * 7)) });
  assert.equal(age.years, 0);
  assert.equal(age.months, 7);
});

test("a leap-day birth date is a real date and produces a real age", () => {
  // 29 February 2024. The arithmetic is elapsed-time based, so a leap day is
  // not a special case — this pins that it does not become one.
  const age = petAge({ birth_date: "2024-02-29" });
  assert.notEqual(age, null);
  assert.ok(age.totalMonths > 0);
  assert.equal(age.years, Math.floor(age.totalMonths / 12));
});

test("a future birth date is unknown, not a negative age", () => {
  // Returning a negative number put every downstream age band into its
  // youngest bucket, which is how a pet born next month became a puppy.
  assert.equal(petAge({ birth_date: daysAgo(-30) }), null);
  assert.equal(petAgeInMonths({ birth_date: daysAgo(-30) }), null);
});

test("the server clamps a future birth date to zero rather than going negative", () => {
  const server = calculatePetAge(daysAgo(-30));
  assert.equal(server.age_years, 0);
  assert.equal(server.age_months, 0);
});

test("a missing birth date is unknown", () => {
  assert.equal(petAge({}), null);
  assert.equal(petAge({ birth_date: null }), null);
  assert.equal(petAge(null), null);
  assert.equal(petAge(undefined), null);
});

test("an unparseable birth date is unknown rather than NaN", () => {
  assert.equal(petAge({ birth_date: "not a date" }), null);
});

test("unknown is null, never zero", () => {
  // A zero age reads as "newborn" everywhere downstream. It must not be the
  // representation of "we do not know".
  assert.equal(petAgeInMonths({}), null);
  assert.notEqual(petAgeInMonths({}), 0);
});
