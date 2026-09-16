// How old a pet is, in one place the server and its tests both use.
//
// AGE IS A CALENDAR QUESTION, NOT AN ELAPSED-DURATION ONE. This was computed
// by dividing elapsed milliseconds by an average month of 30.4375 days, and
// that can never land on an anniversary: twelve average months is 365.25 days
// while a non-leap year is 365. A pet born exactly one year ago measured 11.99
// months, floored to 11, and was reported as ZERO years old on its own first
// birthday - and stayed wrong for six hours. The same gap made a pet born
// seven calendar months ago read as six.
//
// "How old is this pet" means "how many times has the birth month-day come
// round", so it is counted in months and days rather than milliseconds.
//
// It lives in its own module because the test used to carry a hand-written
// COPY of the implementation - "port of src/lib/petAge.ts" - and a test that
// exercises a copy keeps passing while the real thing is broken. That is
// exactly what happened: the bug shipped with a green suite.

/**
 * Whole calendar months between two instants.
 *
 * UTC throughout: birth_date carries no time and no zone, and
 * `new Date("2025-09-16")` parses as UTC midnight, so the comparison has to
 * happen in that same calendar - otherwise a pet gains a day in one timezone
 * and loses it in another.
 *
 * Mirrored by `wholeMonthsBetween` in src/lib/petAge.ts. Do not change one
 * without the other; petAge.test.js asserts the two agree.
 */
export const wholeMonthsBetween = (bornMs, nowMs) => {
  const born = new Date(bornMs);
  const now = new Date(nowMs);
  let months = (now.getUTCFullYear() - born.getUTCFullYear()) * 12
    + (now.getUTCMonth() - born.getUTCMonth());
  // The month turns over only once the day-of-month is reached: a pet born on
  // the 20th is not a month older on the 5th.
  if (now.getUTCDate() < born.getUTCDate()) months -= 1;
  return months;
};

/**
 * The API's answer for a pet, as serializePet returns it.
 *
 * A future birth date clamps to zero rather than going negative - a negative
 * age put every downstream band into its youngest bucket, which is how a pet
 * born next month became a puppy.
 */
export const calculatePetAge = (birthDate) => {
  if (!birthDate) return { age_years: null, age_months: null };
  const birth = new Date(String(birthDate));
  if (Number.isNaN(birth.getTime())) return { age_years: null, age_months: null };
  const totalMonths = Math.max(0, wholeMonthsBetween(birth.getTime(), Date.now()));
  return {
    age_years: Math.floor(totalMonths / 12),
    age_months: totalMonths % 12,
  };
};
