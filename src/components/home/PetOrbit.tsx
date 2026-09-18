import { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { CharacterMood } from "@/lib/characterBehavior";
import { cn } from "@/lib/utils";
import PresenceAurora from "@/components/home/PresenceAurora";
import { PRESENCE_IDLE } from "@/components/home/presenceIdle";
import { useImageHasAlpha } from "@/hooks/useImageHasAlpha";

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

  // isCharacter says the PACK is ready. It does not say the picture in it is
  // actually cut out, and the generator has returned images where the
  // transparency was drawn as a chequerboard rather than written to an alpha
  // channel. petCharacter.js only checks the MIME type, which proves the
  // container and nothing about the pixels.
  //
  // So the un-cropped treatment is granted on EVIDENCE, not on a flag: the
  // image is inspected, and until it has answered, the conservative circle is
  // what renders. An opaque square never reaches the screen, not for a frame.
  const alpha = useImageHasAlpha(isCharacter && !loading ? avatarUrl : null);
  const standsFree = isCharacter && alpha === "alpha";

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
            {/* A GENERATED CHARACTER IS NOT CROPPED. A PHOTOGRAPH IS.
             *
             * petCharacter.js asks the generator for "one full-body character"
             * on "a PNG with a real alpha channel ... no backdrop, no ground
             * plane and no cast shadow", and the MIME allowlist refuses JPEG
             * precisely so that alpha is guaranteed. Then this element wrapped
             * it in `overflow-hidden rounded-full` with a 5px white ring, which
             * discarded the alpha and cut the legs and tail off the full body
             * the generator had been told to draw.
             *
             * `absolute -inset-3` was a partial admission of that - it bled the
             * art out a little so the crop bit less - but it was still a
             * circular crop of a standing character, and `object-cover` then
             * cropped it a second time inside its own square.
             *
             * So the character now stands free over the aurora on
             * object-CONTAIN, and the circle treatment applies only to the
             * photograph case, where it is correct: a real photo has a real
             * background, and un-cropping it would leave a rectangle floating
             * over the glow. isCharacter is the seam, and this component
             * already tracked it.
             *
             * pointer-events-none because the art now extends past the circle
             * and must never swallow a tap meant for an orbit button. */}
            <div
              className={cn(
                "relative z-[1] h-full w-full",
                !standsFree
                  && "overflow-hidden rounded-full border-[5px] border-white bg-mipo-soft dark:border-mipo-surface",
              )}
              data-presence-idle={still ? "still" : "live"}
              data-presence-mood={mood}
              style={still ? undefined : { animationDuration: `${idle.duration}s` }}
            >
              {loading ? (
                <div className="h-full w-full animate-pulse rounded-full bg-mipo-soft" />
              ) : (
                <div className={cn(standsFree ? "pointer-events-none absolute -inset-[12px]" : "h-full w-full")}>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.img
                      key={avatarUrl}
                      src={avatarUrl}
                      alt={petName}
                      draggable={false}
                      className={cn(
                        "h-full w-full",
                        standsFree
                          ? "object-contain drop-shadow-[0_10px_18px_rgba(21,21,26,0.18)]"
                          : "object-cover",
                      )}
                      initial={still ? false : { opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={still ? undefined : { opacity: 0, scale: 1.02 }}
                      transition={{ duration: still ? 0 : 0.28, ease: "easeOut" }}
                    />
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* The pet stands on a lit disc, not on a smudge.
             *
             * This was a 9px blurred ellipse at 15% ink - a contact shadow and
             * nothing more. Against the reference the owner sent, that is the
             * difference between a cut-out dropped onto a page and a character
             * standing on a platform: the reference's disc is lit from inside
             * and has a brighter rim, and the animal is ON it.
             *
             * OFFSET TO THE FEET, NOT TO THE BOX. The art frame is
             * `-inset-[12px]`, so the feet land 12px below this element's
             * bottom edge. A shadow at `bottom-0` sat a finger's width up the
             * animal's legs, which was only visible once it was rendered.
             *
             * The geometry lives in index.css and is deliberately fixed there:
             * it stops 9px short of the two bottom orbit buttons, adds no
             * height, and cannot be grown to the reference's proportions
             * without moving navigation - which this change does not do. */}
            {standsFree && !loading && (
              <>
                <span aria-hidden="true" className="mipo-pet-pedestal" />
                <span aria-hidden="true" className="mipo-pet-pedestal-contact" />
              </>
            )}
          </div>
        </motion.button>
      </div>

      {/* z-[2]: NAVIGATION ABOVE THE ART, ALWAYS.
       *
       * The art layer carries z-[1] and these had no z-index at all, so the
       * character was painted over the four destinations and their labels. It
       * cost nothing while the art was a circle inside the ring, and the
       * chequerboard made it visible: "מסמכים" rendered as "סמכים" and
       * "בריאות" as "בריאו", because the opaque square covered ten pixels of
       * each label's inner edge.
       *
       * The 190px art frame genuinely overlaps that strip - centred at 170 it
       * spans x 75-265, and the top-end label sits at 255-300 - so with a
       * transparent character nothing is hidden. That is the problem: it works
       * because of what the picture CONTAINS. Navigation must not depend on
       * that, for the same reason the art layer is pointer-events-none. */}
      {slots.slice(0, 4).map((slot, i) => (
        <motion.div
          key={slot.id}
          initial={still ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={still ? { duration: 0 } : { duration: 0.2, delay: CLOCKWISE_DELAY[i], ease: "easeOut" }}
          className={cn("absolute z-[2] flex flex-col items-center gap-1.5", POSITION[i])}
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
