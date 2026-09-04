import { useCallback, useEffect, useRef, useState } from "react";

import {
  decideReaction,
  isCharacterEvent,
  resolveBaseMood,
  type ActiveReaction,
  type CharacterEvent,
  type CharacterMood,
} from "@/lib/characterBehavior";
import {
  consumePetCompanionEvent,
  PET_COMPANION_REACTION_EVENT,
} from "@/lib/petCompanionReactions";

/**
 * Runs the companion's state machine:
 *
 *   neutral_idle -> event -> reaction -> reaction complete -> neutral_idle
 *
 * The base mood is passed in and owned by the screen. This hook only decides
 * whether an arriving event gets to interrupt, for how long, and when to hand
 * the character back to its mood.
 */
export const usePetCompanionMood = (
  petId: string | null | undefined,
  baseMoodInput: Parameters<typeof resolveBaseMood>[0],
) => {
  const baseMood = resolveBaseMood(baseMoodInput);
  const [reactionMood, setReactionMood] = useState<CharacterMood | null>(null);
  const active = useRef<ActiveReaction | null>(null);
  const lastShownAt = useRef<Partial<Record<CharacterEvent, number>>>({});
  const timer = useRef<number | null>(null);

  const clearTimer = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const trigger = useCallback((event: CharacterEvent) => {
    const decision = decideReaction(event, {
      active: active.current,
      lastShownAt: lastShownAt.current[event] ?? null,
    });
    if (decision.action === "ignore") return decision.because;

    clearTimer();
    const startedAt = Date.now();
    active.current = { reaction: decision.reaction, startedAt };
    lastShownAt.current[event] = startedAt;
    setReactionMood(decision.reaction.mood);

    timer.current = window.setTimeout(() => {
      active.current = null;
      timer.current = null;
      setReactionMood(null);
    }, decision.reaction.duration);

    return "started" as const;
  }, []);

  // A reaction raised on another screen is left in storage and picked up here,
  // so navigating home right after the thing happened still shows it.
  useEffect(() => {
    if (!petId) return;
    const stored = consumePetCompanionEvent(petId);
    if (stored) trigger(stored);

    const handle = (domEvent: Event) => {
      const detail = (domEvent as CustomEvent<{ petId?: string; event?: string }>).detail;
      if (detail?.petId !== petId || !isCharacterEvent(detail?.event)) return;
      trigger(detail.event);
    };
    window.addEventListener(PET_COMPANION_REACTION_EVENT, handle);
    return () => window.removeEventListener(PET_COMPANION_REACTION_EVENT, handle);
  }, [petId, trigger]);

  // Switching pets must not leave the previous pet's reaction on screen.
  useEffect(() => {
    clearTimer();
    active.current = null;
    lastShownAt.current = {};
    setReactionMood(null);
  }, [petId]);

  useEffect(() => clearTimer, []);

  return {
    /** What the character should show right now. */
    mood: reactionMood ?? baseMood,
    /** The mood it will return to once any reaction finishes. */
    baseMood,
    isReacting: reactionMood !== null,
    trigger,
  };
};
