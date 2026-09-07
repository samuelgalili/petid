import { isCharacterEvent, type CharacterEvent } from "@/lib/characterBehavior";
import type { MipoPetCharacterExpression } from "@/lib/mipoApi";

export const PET_COMPANION_REACTION_EVENT = "mipo:pet-companion-reaction";
const STORAGE_PREFIX = "mipo-pet-reaction-";
const MAX_REACTION_AGE_MS = 15 * 60 * 1000;

/**
 * Announces what happened, rather than which face to pull. The screen owns the
 * expression, so changing how the companion greets a delivered order does not
 * mean editing the code that places orders.
 *
 * The older expression-based emitter below still works and is kept for the
 * call sites that use it.
 */
export const emitPetCompanionEvent = (
  petId: string | null | undefined,
  event: CharacterEvent,
) => {
  if (!petId || !isCharacterEvent(event) || typeof window === "undefined") return;
  const detail = { petId, event, createdAt: Date.now() };
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${petId}`, JSON.stringify(detail));
  } catch {
    // The live event still works when browser storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent(PET_COMPANION_REACTION_EVENT, { detail }));
};

/** Reads and clears an event left behind by another screen. */
export const consumePetCompanionEvent = (petId: string): CharacterEvent | null => {
  if (typeof window === "undefined") return null;
  try {
    const key = `${STORAGE_PREFIX}${petId}`;
    const raw = window.sessionStorage.getItem(key);
    window.sessionStorage.removeItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { event?: string; createdAt?: number };
    if (!isCharacterEvent(parsed.event)) return null;
    if (!parsed.createdAt || Date.now() - parsed.createdAt > MAX_REACTION_AGE_MS) return null;
    return parsed.event;
  } catch {
    return null;
  }
};

const supportedExpressions = new Set<MipoPetCharacterExpression>([
  "happy",
  "curious",
  "sleepy",
  "proud",
  "celebrate",
  "attentive",
]);

export const emitPetCompanionReaction = (
  petId: string | null | undefined,
  expression: MipoPetCharacterExpression,
) => {
  if (!petId || !supportedExpressions.has(expression) || typeof window === "undefined") return;
  const detail = { petId, expression, createdAt: Date.now() };
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${petId}`, JSON.stringify(detail));
  } catch {
    // The live event still works when browser storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent(PET_COMPANION_REACTION_EVENT, { detail }));
};

export const consumePetCompanionReaction = (
  petId: string,
): MipoPetCharacterExpression | null => {
  if (typeof window === "undefined") return null;
  try {
    const key = `${STORAGE_PREFIX}${petId}`;
    const raw = window.sessionStorage.getItem(key);
    window.sessionStorage.removeItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { expression?: MipoPetCharacterExpression; createdAt?: number };
    if (!parsed.expression || !supportedExpressions.has(parsed.expression)) return null;
    if (!parsed.createdAt || Date.now() - parsed.createdAt > MAX_REACTION_AGE_MS) return null;
    return parsed.expression;
  } catch {
    return null;
  }
};
