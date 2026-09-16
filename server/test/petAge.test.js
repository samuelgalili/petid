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

// The REAL implementations, imported. This file used to carry a hand-written
// port of both - "port of src/lib/petAge.ts" - and a test that exercises a
// copy keeps passing while the shipped code is broken. That is not a
// hypothetical: the anniversary bug below lived in production under a green
// suite, because the copy in this file was correct and the real code was not.
//
// The client's petAge.ts cannot be imported here (TypeScript, no loader in the
// server runner), so its arithmetic is pinned against this module by reading
// its source at the bottom of this file.
import { calculatePetAge, wholeMonthsBetween } from "../src/petAge.js";

const fromTotalMonths = (totalMonths) => ({
  years: Math.floor(totalMonths / 12),
  months: totalMonths % 12,
  totalMonths,
});

// The client's shape, over the server's arithmetic - which is the point: the
// two must not be able to disagree.
const petAgeMonthsFromBirthDate = (birthDate) => {
  if (!birthDate) return null;
  const born = new Date(String(birthDate)).getTime();
  if (!Number.isFinite(born)) return null;
  const months = wholeMonthsBetween(born, Date.now());
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

// --- the anniversary, which is where this broke ---

test("a pet is one year old on its first birthday, not zero", () => {
  // The shipped bug. Twelve average months of 30.4375 days is 365.25, so a
  // year of 365 days measured 11.99 months and floored to 11 - a puppy's first
  // birthday displayed as "0 years", for six hours, every non-leap year.
  const born = Date.UTC(2025, 8, 16);
  const birthday = Date.UTC(2026, 8, 16);
  assert.equal(wholeMonthsBetween(born, birthday), 12);
  assert.equal(wholeMonthsBetween(born, birthday - 1), 11, "the day before is still 11");
});

test("every exact anniversary lands, for twenty years", () => {
  // One case would have passed by luck. The old arithmetic drifts further out
  // with each year, so the whole range is checked.
  const born = Date.UTC(2006, 2, 7);
  for (let year = 1; year <= 20; year += 1) {
    assert.equal(
      wholeMonthsBetween(born, Date.UTC(2006 + year, 2, 7)), year * 12,
      `${year} years after the birth date must be ${year * 12} months`,
    );
  }
});

test("a calendar month is a month whatever its length", () => {
  // February is 28 days and March 31; an average-month divisor gets both wrong
  // in opposite directions.
  assert.equal(wholeMonthsBetween(Date.UTC(2026, 1, 15), Date.UTC(2026, 2, 15)), 1, "Feb 15 to Mar 15");
  assert.equal(wholeMonthsBetween(Date.UTC(2026, 2, 15), Date.UTC(2026, 3, 15)), 1, "Mar 15 to Apr 15");
  assert.equal(wholeMonthsBetween(Date.UTC(2026, 1, 15), Date.UTC(2026, 8, 16)), 7, "Feb 15 to Sep 16");
});

test("a leap-day pet has its anniversary in March on common years", () => {
  const born = Date.UTC(2024, 1, 29);
  assert.equal(wholeMonthsBetween(born, Date.UTC(2025, 1, 28)), 11, "28 Feb is not yet a year");
  assert.equal(wholeMonthsBetween(born, Date.UTC(2025, 2, 1)), 12, "1 March is");
  assert.equal(wholeMonthsBetween(born, Date.UTC(2028, 1, 29)), 48, "and the real date when it exists");
});

test("the day of the month has to be reached before the month turns", () => {
  const born = Date.UTC(2026, 0, 20);
  assert.equal(wholeMonthsBetween(born, Date.UTC(2026, 1, 5)), 0, "born on the 20th, not a month older on the 5th");
  assert.equal(wholeMonthsBetween(born, Date.UTC(2026, 1, 20)), 1);
});

// --- the client's copy may not drift from this one ---

test("src/lib/petAge.ts computes months the same way", async () => {
  // The client is TypeScript and cannot be imported here, so its arithmetic is
  // pinned by reading it. This is the guard that the deleted hand-written port
  // pretended to be.
  const { readFileSync } = await import("node:fs");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src/lib/petAge.ts"),
    "utf8",
  );
  const squash = (text) => text.replace(/\s+/g, " ").trim();
  for (const required of [
    "(now.getUTCFullYear() - born.getUTCFullYear()) * 12",
    "(now.getUTCMonth() - born.getUTCMonth())",
    "if (now.getUTCDate() < born.getUTCDate()) months -= 1;",
  ]) {
    assert.ok(
      squash(source).includes(squash(required)),
      `the client must compute months the same way; missing: ${required}`,
    );
  }
  // And must no longer divide by an average month. Comments are stripped
  // first: this file's own history note explains the 30.4375 constant, and a
  // bare search matched that prose - the third guard in this codebase to
  // refuse the very file it describes.
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");
  assert.equal(/30\.4375/.test(code), false,
    "an average-month divisor cannot land on an anniversary");
});
