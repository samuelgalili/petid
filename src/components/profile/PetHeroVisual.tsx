import { useEffect, useState } from "react";
import { motion } from "framer-motion";

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

/* ─── MoodAvatar: real image + breathing + state-driven halo + celebrate on real action ─── */
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
  const h = HALO[mood];
  const sleeping = mood === "asleep";
  const [wagging, setWagging] = useState(false);
  useEffect(() => {
    if (celebrateKey === 0) return;
    setWagging(true);
    const t = setTimeout(() => setWagging(false), 1500);
    return () => clearTimeout(t);
  }, [celebrateKey]);
  return (
    <div className="relative w-[200px] h-[200px]" data-pet-hero-renderer={renderer}>
      {/* Halo — mood color */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${h.color} 0%, transparent 65%)`, filter: "blur(18px)" }}
        initial={false}
        animate={
          wagging
            ? { opacity: [0.45, 0.7, 0.45], scale: [1, 1.08, 1] }
            : h.pulse
            ? { opacity: [h.opacity * 0.6, h.opacity, h.opacity * 0.6], scale: [0.95, 1.05, 0.95] }
            : { opacity: h.opacity, scale: 1 }
        }
        transition={
          wagging
            ? { duration: 0.5, repeat: 2, ease: "easeInOut" }
            : h.pulse
              ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.6 }
        }
        aria-hidden
      />
      {/* Breathing avatar */}
      <motion.img
        src={src}
        alt={alt}
        className="relative w-[200px] h-[200px] rounded-full object-contain bg-muted block"
        style={{ opacity: mood === "unknown" ? 0.5 : sleeping ? 0.85 : 1, filter: sleeping ? "brightness(0.85)" : "none" }}
        animate={
          wagging
            ? { scale: [1, 1.08, 1], rotate: [0, -6, 6, -4, 4, 0] }
            : { scale: sleeping ? [1, 1.012, 1] : [1, 1.02, 1] }
        }
        transition={
          wagging
            ? { duration: 1.2, ease: "easeOut" }
            : { duration: sleeping ? 5 : 3.2, repeat: Infinity, ease: "easeInOut" }
        }
      />
      {/* Sleeping Z marks */}
      {sleeping && (
        <motion.div
          className="absolute -top-1 right-2 text-[16px] font-bold select-none"
          style={{ color: "hsl(230 60% 70%)" }}
          animate={{ y: [-2, -10, -2], opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
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
 * V1 always renders MoodAvatar (breathing / halo / celebrate).
 * `renderer` is reserved so a future scene3d swap can land without changing call sites.
 */
export const PetHeroVisual = ({
  src,
  alt,
  mood,
  celebrateKey,
  renderer = "image",
}: PetHeroVisualProps) => {
  // V1 always uses MoodAvatar (breathing / halo / celebrate).
  // `renderer` is part of the public contract so a future `"scene3d"` swap
  // can land without changing call sites. Do not import 3D libraries here.
  return (
    <MoodAvatar src={src} alt={alt} mood={mood} celebrateKey={celebrateKey} renderer={renderer} />
  );
};
