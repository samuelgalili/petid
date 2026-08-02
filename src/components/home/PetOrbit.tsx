import { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { MipoPetCharacterExpression } from "@/lib/mipoApi";
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
  /** Generated expression images use full-body idle motion instead of a static portrait. */
  characterExpression?: MipoPetCharacterExpression;
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

const REACTION_ANIMATIONS = {
  neutral: { y: [0, -3, 0], rotate: [0, -0.7, 0], scale: [1, 1.01, 1] },
  happy: { y: [0, -7, 0, -3, 0], rotate: [0, -1.5, 1.5, 0], scale: [1, 1.025, 1] },
  curious: { y: [0, -2, 0], rotate: [0, 2.5, 1.2, 0], scale: [1, 1.012, 1] },
  sleepy: { y: [0, 2, 0], rotate: [0, -0.8, 0], scale: [1, 0.985, 1] },
  proud: { y: [0, -4, 0], rotate: [0, 0.7, 0], scale: [1, 1.018, 1] },
  celebrate: { y: [0, -10, 0, -5, 0], rotate: [0, -2, 2, 0], scale: [1, 1.035, 1] },
  attentive: { y: [0, -3, 0], rotate: [0, 1.2, -0.6, 0], scale: [1, 1.018, 1] },
} satisfies Record<MipoPetCharacterExpression, { y: number[]; rotate: number[]; scale: number[] }>;

const REACTION_DURATION: Record<MipoPetCharacterExpression, number> = {
  neutral: 3.8,
  happy: 2.8,
  curious: 3.4,
  sleepy: 4.8,
  proud: 3.6,
  celebrate: 2.5,
  attentive: 3.1,
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
  characterExpression = "neutral",
  isCharacter = false,
  loading,
  onPetClick,
  className,
}: PetOrbitProps) => {
  const reduceMotion = useReducedMotion();

  return (
    <div className={cn("relative mx-auto h-[340px] w-[340px] max-w-full", className)}>
      <span aria-hidden="true" className="absolute inset-[30px] rounded-full border border-dashed border-mipo-line/90" />

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onPetClick}
        aria-label={`מצב הרוח והדמות של ${petName} — עדכון`}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <div className={cn(
          "mipo-gradient-ring relative h-[166px] w-[166px] shadow-[0_18px_42px_rgba(96,165,250,0.20)]",
          isCharacter && "shadow-[0_20px_52px_rgba(139,92,246,0.24)]",
        )}>
          {isCharacter && characterExpression === "celebrate" && !reduceMotion && (
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
                animate={isCharacter && !reduceMotion ? REACTION_ANIMATIONS[characterExpression] : { y: 0, rotate: 0, scale: 1 }}
                transition={isCharacter && !reduceMotion
                  ? { duration: REACTION_DURATION[characterExpression], repeat: Infinity, ease: "easeInOut" }
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
