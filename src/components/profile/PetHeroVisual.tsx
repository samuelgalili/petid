import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/** Mood halo states used by the Profile Hero avatar. */
export type Mood = "unknown" | "asleep" | "calm" | "alert" | "attention" | "vet";

/**
 * Renderer contract for a future 3D swap.
 * V1 always uses the image path — do not import three.js / R3F / GLB loaders here.
 */
export type PetHeroRenderer = "image" | "scene3d";

export type PetHeroVisualProps = {
  src: string;
  alt: string;
  mood: Mood;
  celebrateKey: number;
  renderer?: PetHeroRenderer;
};

const HALO: Record<Mood, { color: string; pulse: boolean; opacity: number }> = {
  unknown:   { color: "hsl(220 10% 60%)",  pulse: false, opacity: 0 },
  asleep:    { color: "hsl(230 50% 55%)",  pulse: false, opacity: 0.18 },
  calm:      { color: "hsl(142 65% 50%)",  pulse: false, opacity: 0.28 },
  alert:     { color: "hsl(45 90% 58%)",   pulse: false, opacity: 0.35 },
  attention: { color: "hsl(28 92% 58%)",   pulse: true,  opacity: 0.45 },
  vet:       { color: "hsl(0 78% 58%)",    pulse: true,  opacity: 0.5  },
};

/* ─── MoodAvatar: Master image + living idle + halo + celebrate on real action ─── */
const MoodAvatar = ({
  src,
  alt,
  mood,
  celebrateKey,
  renderer,
}: {
  src: string;
  alt: string;
  mood: Mood;
  celebrateKey: number;
  renderer: PetHeroRenderer;
}) => {
  const reduceMotion = useReducedMotion();
  const h = HALO[mood];
  const sleeping = mood === "asleep";
  const [wagging, setWagging] = useState(false);
  useEffect(() => {
    if (celebrateKey === 0) return;
    setWagging(true);
    const t = setTimeout(() => setWagging(false), 1500);
    return () => clearTimeout(t);
  }, [celebrateKey]);

  const still = !!reduceMotion;

  return (
    <div className="relative w-[200px] h-[200px]" data-pet-hero-renderer={renderer}>
      {/* Halo — mood color */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${h.color} 0%, transparent 65%)`, filter: "blur(18px)" }}
        initial={false}
        animate={
          still
            ? { opacity: h.opacity, scale: 1 }
            : wagging
              ? { opacity: [0.45, 0.7, 0.45], scale: [1, 1.08, 1] }
              : h.pulse
                ? { opacity: [h.opacity * 0.6, h.opacity, h.opacity * 0.6], scale: [0.95, 1.05, 0.95] }
                : { opacity: h.opacity, scale: 1 }
        }
        transition={
          still
            ? { duration: 0 }
            : wagging
              ? { duration: 0.5, repeat: 2, ease: "easeInOut" }
              : h.pulse
                ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.6 }
        }
        aria-hidden
      />
      {/* Ground shadow — reads as weight while the body breathes */}
      {!still && (
        <motion.div
          className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[46%] h-3 rounded-full bg-black/30 blur-md pointer-events-none"
          animate={{ scaleX: [0.84, 1, 0.84], opacity: [0.16, 0.3, 0.16] }}
          transition={{ duration: sleeping ? 5.6 : 4.4, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        />
      )}
      {/* Living idle: breath + slight sway. Master src is unchanged (#12 resolveHeroSrc). */}
      <motion.img
        src={src}
        alt={alt}
        className="relative w-[200px] h-[200px] rounded-full object-contain bg-muted block"
        draggable={false}
        style={{ opacity: mood === "unknown" ? 0.5 : sleeping ? 0.88 : 1, filter: sleeping ? "brightness(0.88)" : "none" }}
        animate={
          still
            ? { scale: 1, y: 0, rotate: 0 }
            : wagging
              ? { scale: [1, 1.08, 1], rotate: [0, -6, 6, -4, 4, 0], y: 0 }
              : sleeping
                ? { scale: [1, 1.02, 1], y: [0, 2, 0], rotate: [0, 0.5, 0] }
                : { scale: [1, 1.04, 1.012, 1.038, 1], y: [0, -5, -1.5, -6, 0], rotate: [-1.5, 1.3, -0.5, 1.6, -1.5] }
        }
        transition={
          still
            ? { duration: 0 }
            : wagging
              ? { duration: 1.2, ease: "easeOut" }
              : { duration: sleeping ? 5.6 : 4.4, repeat: Infinity, ease: "easeInOut" }
        }
      />
      {/* Sleeping Z marks */}
      {sleeping && (
        <motion.div
          className="absolute -top-1 right-2 text-[16px] font-bold select-none"
          style={{ color: "hsl(230 60% 70%)" }}
          animate={still ? { opacity: 0.6 } : { y: [-2, -10, -2], opacity: [0.3, 0.9, 0.3] }}
          transition={still ? { duration: 0 } : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        >
          z
        </motion.div>
      )}
    </div>
  );
};

/**
 * Profile Hero visual wrapper.
 * V1 always renders MoodAvatar (living idle / halo / celebrate) with renderer="image".
 * `renderer` is reserved so a future scene3d swap can land without changing call sites.
 * Do not import three.js / R3F / GLB here.
 *
 * F1: displaying the Master avatar is ungated — no paywall / subscription check here.
 */
export const PetHeroVisual = ({
  src,
  alt,
  mood,
  celebrateKey,
  renderer = "image",
}: PetHeroVisualProps) => {
  return (
    <MoodAvatar src={src} alt={alt} mood={mood} celebrateKey={celebrateKey} renderer={renderer} />
  );
};
