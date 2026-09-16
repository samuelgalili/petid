/**
 * Shared Mipo onboarding draft (AC-ONB-1).
 *
 * Ported from main's MipoOnboarding (`mipo-pet-draft`). aws-migration has no
 * MipoOnboarding overlay — `/onboarding` is the equivalent flow. The draft
 * survives auth remounts so persist can insert a real `pets` row (Master in
 * `avatar_url`) after sign-in.
 */

export const MIPO_DRAFT_KEY = "mipo-pet-draft";

export type OnboardingPetDraft = {
  name: string;
  breed: string;
  petType: "dog" | "cat";
  avatarUrl: string;
  photoUrl?: string;
  gender?: string;
  petId?: string;
};

export function readStoredOnboardingDraft(): OnboardingPetDraft | null {
  try {
    const raw = localStorage.getItem(MIPO_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnboardingPetDraft> | null;
    if (!parsed?.name) return null;
    const petType = parsed.petType === "cat" ? "cat" : parsed.petType === "dog" ? "dog" : null;
    if (!petType) return null;
    return {
      name: parsed.name,
      breed: parsed.breed || "",
      petType,
      avatarUrl: parsed.avatarUrl || "",
      photoUrl: parsed.photoUrl || "",
      gender: parsed.gender,
      petId: parsed.petId,
    };
  } catch {
    return null;
  }
}

export function writeStoredOnboardingDraft(draft: OnboardingPetDraft): void {
  try {
    localStorage.setItem(MIPO_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore storage quota / private mode
  }
}

export function mapOnboardingGender(gender?: string | null): "male" | "female" | undefined {
  if (!gender) return undefined;
  const value = gender.toLowerCase();
  if (value === "male" || value === "female") return value;
  return undefined;
}
