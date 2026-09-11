/**
 * The one client-side age derivation.
 *
 * The API is canonical: `serializePet` computes `age_years` and `age_months`
 * from `birth_date` and returns them on every pet. Six places in the client
 * recomputed the same thing anyway, with three different month lengths —
 * 30.4375 days on the server, 30.44 in the safety score, a flat 30 in the health
 * breakdown, and a flat 365-day year in two more. The same pet could therefore
 * be four years old on one screen and three on another.
 *
 * So: prefer what the API already said. Fall back to arithmetic only when a
 * caller genuinely has nothing but a birth date — and when it does, use the
 * server's constant, so the fallback and the canonical answer agree.
 *
 * See docs/pet-intelligence/43-DERIVED-DATA-CONTRACT.md (one writer per derived
 * value) and 54 §P0.2.
 */

/** Mirrors `calculatePetAge` in server/src/index.js. Do not change one without the other. */
const MONTH_MS = 1000 * 60 * 60 * 24 * 30.4375;

export interface PetAge {
  years: number;
  months: number;
  /** Whole months since birth. The unit the safety score and life-stage bands use. */
  totalMonths: number;
}

/** What the API returns on a pet, plus the raw date for the fallback. */
export interface PetAgeInput {
  age_years?: number | null;
  age_months?: number | null;
  birth_date?: string | null;
}

const fromTotalMonths = (totalMonths: number): PetAge => ({
  years: Math.floor(totalMonths / 12),
  months: totalMonths % 12,
  totalMonths,
});

/**
 * Months since a birth date.
 *
 * A future birth date returns null rather than a negative age: a pet born
 * tomorrow is not minus-one month old, and letting a negative number through
 * put every downstream age band into its youngest bucket.
 */
export const petAgeMonthsFromBirthDate = (birthDate?: string | null): number | null => {
  if (!birthDate) return null;
  const born = new Date(String(birthDate)).getTime();
  if (!Number.isFinite(born)) return null;
  const months = Math.floor((Date.now() - born) / MONTH_MS);
  return months >= 0 ? months : null;
};

/**
 * The canonical age for a pet, preferring the API's own answer.
 *
 * Returns null when the age is genuinely unknown. Callers must render that as
 * unknown — never as zero, and never as a default adult.
 */
export const petAge = (pet: PetAgeInput | null | undefined): PetAge | null => {
  if (!pet) return null;

  const years = pet.age_years;
  const months = pet.age_months;
  if (typeof years === "number" && Number.isFinite(years)
    && typeof months === "number" && Number.isFinite(months)) {
    return fromTotalMonths(Math.max(0, Math.round(years * 12 + months)));
  }

  const totalMonths = petAgeMonthsFromBirthDate(pet.birth_date);
  return totalMonths === null ? null : fromTotalMonths(totalMonths);
};

/** Age in whole months, or null when unknown. */
export const petAgeInMonths = (pet: PetAgeInput | null | undefined): number | null =>
  petAge(pet)?.totalMonths ?? null;

/** Age in fractional years, for callers that band on a decimal. Null when unknown. */
export const petAgeInYears = (pet: PetAgeInput | null | undefined): number | null => {
  const age = petAge(pet);
  return age === null ? null : age.totalMonths / 12;
};

/** "4 שנים ו-2 חודשים" / "7 חודשים". Null when the age is unknown. */
export const formatPetAgeHe = (pet: PetAgeInput | null | undefined): string | null => {
  const age = petAge(pet);
  if (age === null) return null;
  if (age.years === 0) return age.months === 1 ? "חודש" : `${age.months} חודשים`;
  const yearPart = age.years === 1 ? "שנה" : `${age.years} שנים`;
  if (age.months === 0) return yearPart;
  return `${yearPart} ו-${age.months} חודשים`;
};
