import { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { CharacterMood } from "@/lib/characterBehavior";
import { cn } from "@/lib/utils";
import PresenceAurora from "@/components/home/PresenceAurora";
import { PRESENCE_IDLE, PRESENCE_IDLE_STILL } from "@/components/home/presenceIdle";

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
 * Home orbit (design 4a): four destinations circling the pet.
 * Geometry is fixed at 340×340 — it fits the 512px shell down to a 320px viewport.
 * Buttons are 56px (>44px target). Tokens only, so dark mode flips for free.
 *
 * Presence V1: the centre is a living idle (breath + sway) over a CSS Aurora
 * glow — not the old flat `mipo-gradient-ring`. Hero Master rules stay in
 * PetHeroVisual; this file only paints Home.
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
  const still = !!reduceMotion;
  const idle = PRESENCE_IDLE[mood];

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
          <div className="relative h-[166px] w-[166px]" data-presence-visual="aurora">
            <PresenceAurora still={still} isCharacter={isCharacter} />
            {isCharacter && mood === "excited" && !still && (
              <>
                <motion.span
                  aria-hidden="true"
                  className="absolute -right-1 top-4 z-[2] h-2 w-2 rounded-full bg-amber-300"
                  animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4], scale: [0.8, 1.25, 0.8] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
                <motion.span
                  aria-hidden="true"
                  className="absolute -left-2 bottom-8 z-[2] h-2.5 w-2.5 rotate-45 bg-rose-300"
                  animate={{ y: [0, -6, 0], rotate: [45, 100, 45], opacity: [0.45, 1, 0.45] }}
                  transition={{ duration: 1.9, repeat: Infinity, delay: 0.25 }}
                />
              </>
            )}
            <motion.div
              className="relative z-[1] h-full w-full overflow-hidden rounded-full border-[5px] border-white bg-mipo-soft dark:border-mipo-surface"
              data-presence-idle={still ? "still" : "live"}
              animate={still ? PRESENCE_IDLE_STILL : { y: idle.y, rotate: idle.rotate, scale: idle.scale }}
              transition={still
                ? { duration: 0 }
                : { duration: idle.duration, repeat: Infinity, ease: "easeInOut" }}
            >
              {loading ? (
                <div className="h-full w-full animate-pulse bg-mipo-soft" />
              ) : (
                <div className={cn(isCharacter ? "absolute -inset-3" : "h-full w-full")}>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.img
                      key={avatarUrl}
                      src={avatarUrl}
                      alt={petName}
                      draggable={false}
                      className="h-full w-full object-cover"
                      initial={still ? false : { opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={still ? undefined : { opacity: 0, scale: 1.02 }}
                      transition={{ duration: still ? 0 : 0.28, ease: "easeOut" }}
                    />
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </div>
        </motion.button>
      </div>

      {slots.slice(0, 4).map((slot, i) => (
        <motion.div
          key={slot.id}
          initial={still ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={still ? { duration: 0 } : { duration: 0.2, delay: CLOCKWISE_DELAY[i], ease: "easeOut" }}
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
