import { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
 */
const PetOrbit = ({ slots, petName, avatarUrl, loading, onPetClick, className }: PetOrbitProps) => {
  const reduceMotion = useReducedMotion();

  return (
    <div className={cn("relative mx-auto h-[340px] w-[340px] max-w-full", className)}>
      <span aria-hidden="true" className="absolute inset-[30px] rounded-full border border-dashed border-mipo-line/90" />

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onPetClick}
        aria-label={`מצב הרוח של ${petName} — עדכון`}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <div className="mipo-gradient-ring h-[166px] w-[166px] shadow-[0_18px_42px_rgba(96,165,250,0.20)]">
          <div className="h-full w-full overflow-hidden rounded-full border-[5px] border-white bg-mipo-soft">
            {loading ? (
              <div className="h-full w-full animate-pulse bg-mipo-soft" />
            ) : (
              <img src={avatarUrl} alt={petName} className="h-full w-full object-cover" />
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
