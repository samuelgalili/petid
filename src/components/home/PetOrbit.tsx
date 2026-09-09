import { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { CharacterMood } from "@/lib/characterBehavior";
import { cn } from "@/lib/utils";

export type OrbitSlot = {
  /** Stable key, also used for the attention lookup */
  id: string;
  /** Visible label under the button */
  label: string;
  icon: ReactNode;
  onClick: () => void;
  /** Renders the coral attention dot + extends the aria-label */
  attention?: boolean;
  /** Screen-reader suffix, e.g. "חיסון בעוד 12 ימים" */
  attentionLabel?: string;
};

type PetOrbitProps = {
  /** Exactly 4 slots, in RTL reading order: top-start, top-end, bottom-start, bottom-end */
  slots: OrbitSlot[];
  petName: string;
  avatarUrl: string;
  /** Drives the micro animation. The picture comes from avatarUrl; this is the motion. */
  mood?: CharacterMood;
  isCharacter?: boolean;
  loading?: boolean;
  /** Tapping the pet — mood check-in */
  onPetClick: () => void;
  className?: string;
};

const POSITION = [
  "top-[26px] right-[34px]",
  "top-[26px] left-[34px]",
  "bottom-[12px] right-[34px]",
  "bottom-[12px] left-[34px]",
];

const CLOCKWISE_DELAY = [0, 0.12, 0.04, 0.08];

/**
 * Micro animation per mood. Neutral is the dominant state, so it is the
 * quietest thing here: a 3px drift over five seconds reads as breathing, not as
 * movement. Nothing bounces, floats or waves.
 */
const MOOD_ANIMATION = {
  neutral: { y: [0, -3, 0], rotate: [0, -0.5, 0], scale: [1, 1.008, 1] },
  happy: { y: [0, -5, 0], rotate: [0, -1.1, 0.8, 0], scale: [1, 1.018, 1] },
  excited: { y: [0, -7, 0, -3, 0], rotate: [0, -1.4, 1.4, 0], scale: [1, 1.026, 1] },
  curious: { y: [0, -2, 0], rotate: [0, 2.2, 1, 0], scale: [1, 1.012, 1] },
  concerned: { y: [0, -2, 0], rotate: [0, 1, -0.5, 0], scale: [1, 1.014, 1] },
} satisfies Record<CharacterMood, { y: number[]; rotate: number[]; scale: number[] }>;

const MOOD_DURATION: Record<CharacterMood, number> = {
  neutral: 5.2,
  happy: 3.2,
  excited: 2.5,
  curious: 3.4,
  concerned: 3.1,
};

/**
 * Home orbit (design 4a): four destinations circling the pet.
 * Geometry is fixed at 340×340 — it fits the 512px shell down to a 320px viewport.
 * Buttons are 56px (>44px target). Tokens only, so dark mode flips for free.
 */
const PetOrbit = ({
  slots,
  petName,
  avatarUrl,
  mood = "neutral",
  isCharacter = false,
  loading,
  onPetClick,
  className,
}: PetOrbitProps) => {
  const reduceMotion = useReducedMotion();

  return (
    <div className={cn("relative mx-auto h-[340px] w-[340px] max-w-full", className)}>
      <span aria-hidden="true" className="absolute inset-[30px] rounded-full border border-dashed border-mipo-line/90" />

      {/* Centred by the wrapper, not by a transform on the button itself.
          whileTap animates `transform`, and Framer Motion owns that property
          outright once it does: the -translate-x-1/2/-translate-y-1/2 that used
          to centre this button were discarded on the first tap, so the pet
          dropped 85px down the screen and stayed there — the transform was
          left as `none` after the animation finished. Any transform this button
          needs now belongs to Framer alone. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onPetClick}
          aria-label={`מצב הרוח והדמות של ${petName} — עדכון`}
        >
          <div className={cn(
            "mipo-gradient-ring relative h-[166px] w-[166px] shadow-[0_18px_42px_rgba(96,165,250,0.20)]",
            isCharacter && "shadow-[0_20px_52px_rgba(139,92,246,0.24)]",
          )}>
          {isCharacter && mood === "excited" && !reduceMotion && (
            <>
              <motion.span
                aria-hidden="true"
                className="absolute -right-1 top-4 h-2 w-2 rounded-full bg-amber-300"
                animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4], scale: [0.8, 1.25, 0.8] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
              <motion.span
                aria-hidden="true"
                className="absolute -left-2 bottom-8 h-2.5 w-2.5 rotate-45 bg-rose-300"
                animate={{ y: [0, -6, 0], rotate: [45, 100, 45], opacity: [0.45, 1, 0.45] }}
                transition={{ duration: 1.9, repeat: Infinity, delay: 0.25 }}
              />
            </>
          )}
          <div className="relative h-full w-full overflow-hidden rounded-full border-[5px] border-white bg-mipo-soft dark:border-mipo-surface">
            {loading ? (
              <div className="h-full w-full animate-pulse bg-mipo-soft" />
            ) : (
              <motion.div
                className={cn(isCharacter ? "absolute -inset-3" : "h-full w-full")}
                animate={isCharacter && !reduceMotion ? MOOD_ANIMATION[mood] : { y: 0, rotate: 0, scale: 1 }}
                transition={isCharacter && !reduceMotion
                  ? { duration: MOOD_DURATION[mood], repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0 }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.img
                    key={avatarUrl}
                    src={avatarUrl}
                    alt={petName}
                    className="h-full w-full object-cover"
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0, scale: 1.02 }}
                    transition={{ duration: reduceMotion ? 0 : 0.28, ease: "easeOut" }}
                  />
                </AnimatePresence>
              </motion.div>
            )}
          </div>
          </div>
        </motion.button>
      </div>

      {slots.slice(0, 4).map((slot, i) => (
        <motion.div
          key={slot.id}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.2, delay: CLOCKWISE_DELAY[i], ease: "easeOut" }}
          className={cn("absolute flex flex-col items-center gap-1.5", POSITION[i])}
        >
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={slot.onClick}
            aria-label={slot.attention && slot.attentionLabel ? `${slot.label} — ${slot.attentionLabel}` : slot.label}
            className="relative flex h-14 w-14 items-center justify-center rounded-full border border-mipo-ink/[0.07] bg-mipo-surface text-mipo-ink shadow-[0_8px_20px_rgba(21,21,26,0.06)]"
          >
            {slot.icon}
            {slot.attention && (
              <span aria-hidden="true" className="absolute left-[3px] top-[3px] h-[9px] w-[9px] rounded-full border-2 border-mipo-surface bg-mipo-coral" />
            )}
          </motion.button>
          <span className="text-[11.5px] font-semibold text-mipo-muted">{slot.label}</span>
        </motion.div>
      ))}
    </div>
  );
};

export default PetOrbit;
