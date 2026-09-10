/**
 * Activity guidance derived from breed reference data.
 *
 * There is no measured activity in Mipo yet — no walks, no sessions, nothing
 * that observes what an animal actually did (see
 * docs/pet-intelligence/37-ACTIVITY-DATA-CONTRACT.md). The only thing available
 * is `breed_information.energy_level` (1–5) and `exercise_needs` (free text),
 * and those describe **the breed**, not the animal in front of you.
 *
 * Two screens derived this independently and one of them was broken: EnergySheet
 * matched `pet.breed` — the breed's *name* — against the string "high". A breed
 * name never contains it, so every pet was told 45 minutes and "בינונית",
 * regardless of breed, age or anything else.
 *
 * So: one derivation, and it returns null when it does not know. A caller that
 * gets null must render "unknown" — never a default, because a default here is
 * indistinguishable from an answer.
 */

export interface BreedActivitySource {
  /** 1-5 from breed_information. The stronger signal when present. */
  energy_level?: number | null;
  /** Free text from breed_information, in English or Hebrew. */
  exercise_needs?: string | null;
}

/** 1 (very low) to 5 (very high). Null when the breed data says nothing. */
export type EnergyLevel = 1 | 2 | 3 | 4 | 5;

const MINUTES_BY_LEVEL: Record<EnergyLevel, number> = { 1: 20, 2: 30, 3: 45, 4: 60, 5: 90 };

const isEnergyLevel = (value: unknown): value is EnergyLevel =>
  typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;

/**
 * Read an energy level out of the breed's free-text exercise needs.
 *
 * Order matters: "very high" has to be tested before "high", or every
 * very-high breed reads as high.
 */
const levelFromExerciseNeeds = (exerciseNeeds?: string | null): EnergyLevel | null => {
  const text = String(exerciseNeeds || "").trim().toLowerCase();
  if (!text) return null;
  if (text.includes("very high") || text.includes("גבוהה מאוד") || text.includes("גבוה מאוד")) return 5;
  if (text.includes("high") || text.includes("גבוה")) return 4;
  if (text.includes("moderate") || text.includes("medium") || text.includes("בינוני")) return 3;
  if (text.includes("very low") || text.includes("נמוכה מאוד")) return 1;
  if (text.includes("low") || text.includes("נמוך")) return 2;
  return null;
};

/**
 * The breed's typical energy level, or null when the breed data does not say.
 *
 * This is a prior about a breed. It is never a fact about the animal, and it
 * must not be persisted as one — see docs/pet-intelligence/35 and 54 §P0.6.
 */
export const breedEnergyLevel = (breed?: BreedActivitySource | null): EnergyLevel | null => {
  if (!breed) return null;
  if (isEnergyLevel(breed.energy_level)) return breed.energy_level;
  return levelFromExerciseNeeds(breed.exercise_needs);
};

/** Suggested daily activity minutes for the breed, or null when unknown. */
export const breedActivityMinutes = (breed?: BreedActivitySource | null): number | null => {
  const level = breedEnergyLevel(breed);
  return level === null ? null : MINUTES_BY_LEVEL[level];
};

export const ENERGY_LABEL_HE: Record<EnergyLevel, string> = {
  1: "נמוכה מאוד",
  2: "נמוכה",
  3: "בינונית",
  4: "גבוהה",
  5: "גבוהה מאוד",
};

/** Null when unknown. Callers render that as unknown, not as "בינונית". */
export const breedEnergyLabelHe = (breed?: BreedActivitySource | null): string | null => {
  const level = breedEnergyLevel(breed);
  return level === null ? null : ENERGY_LABEL_HE[level];
};
