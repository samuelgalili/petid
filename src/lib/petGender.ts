/**
 * Hebrew agrees verbs and adjectives with the subject's gender, so any sentence
 * written about a pet has to know it.
 *
 * The screens were inferring it from the species -- every cat feminine, every
 * dog masculine -- which is wrong about half the time and reads as carelessness
 * to the person whose pet it is. Gender is a real field on the pet, and it is
 * optional, so the third case here is not a fallback to masculine but the
 * slashed form Hebrew uses when the subject is genuinely unknown.
 */

// Deliberately `string`, not a union of the two English values: normalize()
// accepts what the database and the forms actually hold - "male", "female",
// "זכר", "נקבה", "m", "f" - and pets.gender is a plain text column. Declaring
// the narrow union made the type disagree with both the implementation and
// every caller.
export type PetGender = string | null | undefined;

const normalize = (gender: PetGender): "male" | "female" | null => {
  const value = String(gender || "").trim().toLowerCase();
  if (value === "male" || value === "זכר" || value === "m") return "male";
  if (value === "female" || value === "נקבה" || value === "f") return "female";
  return null;
};

/**
 * The suffix that agrees a masculine-stem verb with the pet.
 * מרגיש → מרגיש · מרגישה · מרגיש/ה
 */
export const petVerbSuffix = (gender: PetGender): string => {
  const resolved = normalize(gender);
  if (resolved === "female") return "ה";
  if (resolved === "male") return "";
  return "/ה";
};

/** Picks between three written forms rather than gluing on a suffix. */
export const byPetGender = (
  gender: PetGender,
  forms: { male: string; female: string; unknown?: string },
): string => {
  const resolved = normalize(gender);
  if (resolved === "female") return forms.female;
  if (resolved === "male") return forms.male;
  return forms.unknown ?? `${forms.male}/${forms.female}`;
};
