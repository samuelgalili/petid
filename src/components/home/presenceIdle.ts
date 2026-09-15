import type { CharacterMood } from "@/lib/characterBehavior";

/**
 * Living idle for Home Presence (breath + sway).
 *
 * Same family as the PetHeroVisual polish in PRs #15/#18 — not a merge of those
 * branches. Mood only changes amplitude and tempo. Photos and generated
 * characters both idle; `prefers-reduced-motion` freezes this to identity.
 */
export const PRESENCE_IDLE = {
  neutral: {
    scale: [1, 1.036, 1.01, 1.032, 1],
    y: [0, -5, -1.5, -6, 0],
    rotate: [-1.4, 1.2, -0.4, 1.5, -1.4],
    duration: 4.6,
  },
  happy: {
    scale: [1, 1.042, 1.012, 1.036, 1],
    y: [0, -6, -1.5, -7, 0],
    rotate: [-1.6, 1.5, -0.6, 1.8, -1.6],
    duration: 3.6,
  },
  excited: {
    scale: [1, 1.048, 1.014, 1.04, 1],
    y: [0, -7, -2, -5, 0],
    rotate: [-1.8, 1.8, -1, 2, -1.8],
    duration: 2.8,
  },
  curious: {
    scale: [1, 1.028, 1.01, 1.024, 1],
    y: [0, -3, -1, -4, 0],
    rotate: [-0.6, 2.4, 1.2, -0.4, -0.6],
    duration: 3.8,
  },
  concerned: {
    scale: [1, 1.022, 1.008, 1.018, 1],
    y: [0, -2.5, -0.8, -3, 0],
    rotate: [0.4, 1.2, -0.4, 0.8, 0.4],
    duration: 4.2,
  },
} as const satisfies Record<
  CharacterMood,
  { scale: number[]; y: number[]; rotate: number[]; duration: number }
>;

export const PRESENCE_IDLE_STILL = { y: 0, rotate: 0, scale: 1 } as const;
