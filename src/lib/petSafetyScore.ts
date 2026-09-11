// Pet-adjusted product safety score.
//
// A product carries one safety_score for everybody. What is safe for an adult
// dog is not automatically safe for a twelve-week-old puppy or a cat with
// kidney disease, so the stored score is adjusted against the pet actually
// looking at it.
//
// Lifted out of ProductInfoDrawer so the drawer and the product page cannot
// drift apart and show the same pet two different numbers for the same product.

import { petAgeInMonths } from "@/lib/petAge";

export interface PetSafetyContext {
  birthDate?: string | null;
  /** The API's own age, preferred over recomputing from birthDate. */
  ageYears?: number | null;
  ageMonths?: number | null;
  breed?: string | null;
  medicalConditions?: string[] | null;
}

export type SafetyLevel = "safe" | "caution" | "unsafe";

// Conditions where what the animal eats is part of the treatment.
const DIET_SENSITIVE_CONDITIONS = ["allergies", "digestive", "kidney", "urinary", "heart"];

// The category arrives as free text and, once the category tree is in place,
// as its Hebrew display name. Both spellings mean food, so both are matched -
// checking for "food" alone silently stopped firing for Hebrew categories.
const FOOD_CATEGORIES = new Set([
  "food", "dry-food", "wet-food", "treats",
  "מזון", "אוכל", "מזון יבש", "מזון רטוב", "חטיפים",
]);

export const isFoodCategory = (category?: string | null): boolean => {
  const value = String(category || "").trim().toLowerCase();
  if (!value) return false;
  return FOOD_CATEGORIES.has(value);
};

// Age used its own 30.44-day month here, against the server's 30.4375. The
// difference is small and the principle is not: one derivation, one answer.
const contextAgeInMonths = (pet: PetSafetyContext): number | null => petAgeInMonths({
  age_years: pet.ageYears,
  age_months: pet.ageMonths,
  birth_date: pet.birthDate,
});

/**
 * Adjust a product's base score for one pet. Returns null when the product has
 * no score at all - "we do not know" must not render as zero, which reads as
 * "dangerous".
 */
export const computePetAdjustedScore = (
  baseScore: number | null | undefined,
  pet: PetSafetyContext = {},
  category?: string | null,
): number | null => {
  if (baseScore === null || baseScore === undefined) return null;
  const base = Number(baseScore);
  if (!Number.isFinite(base)) return null;

  let adjusted = base;

  const ageMonths = contextAgeInMonths(pet);
  if (ageMonths !== null) {
    if (ageMonths < 6) adjusted -= 0.8;
    else if (ageMonths < 12) adjusted -= 0.3;
    else if (ageMonths > 120) adjusted -= 0.4;
  }

  const conditions = pet.medicalConditions || [];
  if (conditions.length > 0 && isFoodCategory(category)) {
    const hasDietSensitive = conditions.some((condition) =>
      DIET_SENSITIVE_CONDITIONS.includes(String(condition).trim().toLowerCase()));
    if (hasDietSensitive) adjusted -= 0.5;
  }

  return Math.round(Math.max(0, Math.min(10, adjusted)) * 10) / 10;
};

export const safetyLevelFor = (score: number | null): SafetyLevel | null => {
  if (score === null) return null;
  if (score >= 8) return "safe";
  if (score >= 5) return "caution";
  return "unsafe";
};

export const SAFETY_LABEL_HE: Record<SafetyLevel, string> = {
  safe: "מתאים",
  caution: "בזהירות",
  unsafe: "לא מומלץ",
};

/**
 * Why the score moved, in the owner's words. A bare number invites "says who?";
 * naming the reason is what makes it act on.
 */
export const explainAdjustment = (
  baseScore: number | null | undefined,
  adjusted: number | null,
  pet: PetSafetyContext = {},
  category?: string | null,
  petName?: string | null,
): string | null => {
  if (adjusted === null || baseScore === null || baseScore === undefined) return null;
  if (Math.abs(Number(baseScore) - adjusted) < 0.05) return null;

  const who = petName || "החיה שלך";
  const ageMonths = contextAgeInMonths(pet);
  const reasons: string[] = [];

  if (ageMonths !== null) {
    if (ageMonths < 6) reasons.push("גיל צעיר מאוד");
    else if (ageMonths < 12) reasons.push("גיל צעיר");
    else if (ageMonths > 120) reasons.push("גיל מבוגר");
  }

  if ((pet.medicalConditions || []).length > 0 && isFoodCategory(category)) {
    const hasDietSensitive = (pet.medicalConditions || []).some((condition) =>
      DIET_SENSITIVE_CONDITIONS.includes(String(condition).trim().toLowerCase()));
    if (hasDietSensitive) reasons.push("רגישות תזונתית מתועדת");
  }

  if (reasons.length === 0) return null;
  return `הציון הותאם ל${who} לפי ${reasons.join(" ו")}.`;
};
