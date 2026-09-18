import type { CharacterMood } from "@/lib/characterBehavior";

/**
 * Living idle for Home Presence: breath and rise. No sway.
 *
 * Same family as the PetHeroVisual polish in PRs #15/#18 — not a merge of those
 * branches. Runtime motion is the matching CSS keyframes in `src/index.css`
 * (`presence-idle-*`); these tokens stay the documented source for those
 * curves, so the rotation is deleted from BOTH or from neither - a token file
 * that still lists a curve the stylesheet no longer runs is a lie that reads
 * like documentation. Mood only changes amplitude and tempo. Photos and generated
 * characters both idle; `prefers-reduced-motion` freezes the disc.
 */
export const PRESENCE_IDLE = {
  neutral: {
    scale: [1, 1.036, 1.01, 1.032, 1],
    y: [0, -5, -1.5, -6, 0],
    duration: 4.6,
  },
  happy: {
    scale: [1, 1.042, 1.012, 1.036, 1],
    y: [0, -6, -1.5, -7, 0],
    duration: 3.6,
  },
  excited: {
    scale: [1, 1.048, 1.014, 1.04, 1],
    y: [0, -7, -2, -5, 0],
    duration: 2.8,
  },
  curious: {
    scale: [1, 1.028, 1.01, 1.024, 1],
    y: [0, -3, -1, -4, 0],
    duration: 3.8,
  },
  concerned: {
    scale: [1, 1.022, 1.008, 1.018, 1],
    y: [0, -2.5, -0.8, -3, 0],
    duration: 4.2,
  },
} as const satisfies Record<
  CharacterMood,
  { scale: number[]; y: number[]; duration: number }
>;
