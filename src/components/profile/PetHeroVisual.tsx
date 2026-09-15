import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { SCENE3D_ENABLED } from "@/components/mipo/presence/scene3d";
import { TYPE_FALLBACK_LABEL_HE, type MasterAvatarKind } from "@/lib/masterAvatar";

/** Mood halo states used by the Profile Hero / home presence. */
export type Mood = "unknown" | "asleep" | "calm" | "alert" | "attention" | "vet";

/**
 * Renderer contract for a future 3D swap.
 * V1 always uses the image path — do not import three.js / R3F / GLB loaders here.
 */
export type PetHeroRenderer = "image" | "scene3d";

export type PetHeroSize = "hero" | "nav" | "companion";

export type PetHeroVisualProps = {
  src: string;
  alt: string;
  mood: Mood;
  celebrateKey: number;
  renderer?: PetHeroRenderer;
  /** Visual box. `hero` is 200px; `nav` / `companion` fill the parent. */
  size?: PetHeroSize;
  /** `type-fallback` shows a labeled type icon — never unlabeled breed stock. */
  kind?: MasterAvatarKind;
  /** Used when the Master image fails to load. */
  fallbackSrc?: string;
};

const HALO: Record<Mood, { color: string; pulse: boolean; opacity: number }> = {
  unknown:   { color: "hsl(220 10% 60%)",  pulse: false, opacity: 0 },
  asleep:    { color: "hsl(230 50% 55%)",  pulse: false, opacity: 0.18 },
  calm:      { color: "hsl(142 65% 50%)",  pulse: false, opacity: 0.28 },
  alert:     { color: "hsl(45 90% 58%)",   pulse: true,  opacity: 0.22 },
  attention: { color: "hsl(28 92% 58%)",   pulse: true,  opacity: 0.45 },
  vet:       { color: "hsl(0 78% 58%)",    pulse: true,  opacity: 0.5  },
};

const boxClass: Record<PetHeroSize, string> = {
  hero: "relative w-[200px] h-[200px]",
  nav: "relative w-full h-full",
  companion: "relative w-full h-full",
};

const imgClass: Record<PetHeroSize, string> = {
  hero: "relative w-[200px] h-[200px] rounded-full object-contain bg-muted/40 block",
  nav: "relative w-full h-full rounded-full object-contain bg-muted/40 block",
  companion: "relative w-full h-full rounded-full object-contain bg-muted/40 block",
};

/* ─── Living image presence: breath + idle sway + halo + celebrate ─── */
const LivingImagePresence = ({
  src,
  alt,
  mood,
  celebrateKey,
  renderer,
  size,
  kind,
  fallbackSrc,
}: {
  src: string;
  alt: string;
  mood: Mood;
  celebrateKey: number;
  renderer: PetHeroRenderer;
  size: PetHeroSize;
  kind: MasterAvatarKind;
  fallbackSrc?: string;
}) => {
  const reduceMotion = useReducedMotion();
  const h = HALO[mood];
  const sleeping = mood === "asleep";
  const [wagging, setWagging] = useState(false);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  useEffect(() => {
    if (celebrateKey === 0) return;
    setWagging(true);
    const t = setTimeout(() => setWagging(false), 1500);
    return () => clearTimeout(t);
  }, [celebrateKey]);

  const displaySrc = broken && fallbackSrc ? fallbackSrc : src;
  const displayKind: MasterAvatarKind = broken && fallbackSrc ? "type-fallback" : kind;
  const isHero = size === "hero";
  const still = !!reduceMotion;

  const idle = sleeping
    ? { scale: [1, 1.02, 1], y: [0, 2, 0], rotate: [0, 0.5, 0] }
    : { scale: [1, 1.04, 1.012, 1.038, 1], y: [0, -5, -1.5, -6, 0], rotate: [-1.5, 1.3, -0.5, 1.6, -1.5] };

  const navIdle = { scale: [1, 1.045, 1], y: [0, -1.5, 0], rotate: [0, 1.2, 0] };

  return (
    <div
      className={boxClass[size]}
      data-pet-hero-renderer={renderer}
      data-pet-hero-size={size}
      data-avatar-source={displayKind}
      data-pet-hero-scene3d={renderer === "scene3d" ? (SCENE3D_ENABLED ? "live" : "deferred") : undefined}
    >
      {isHero && (
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
      )}

      {isHero && !still && (
        <motion.div
          className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[46%] h-3 rounded-full bg-black/30 blur-md pointer-events-none"
          animate={{ scaleX: [0.84, 1, 0.84], opacity: [0.16, 0.3, 0.16] }}
          transition={{ duration: sleeping ? 5.6 : 4.4, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        />
      )}

      <motion.img
        src={displaySrc}
        alt={alt}
        className={imgClass[size]}
        style={{
          opacity: mood === "unknown" ? 0.5 : sleeping ? 0.88 : 1,
          filter: sleeping ? "brightness(0.88)" : "none",
        }}
        draggable={false}
        onError={() => {
          if (fallbackSrc && displaySrc !== fallbackSrc) setBroken(true);
        }}
        animate={
          still
            ? { scale: 1, y: 0, rotate: 0 }
            : wagging
              ? { scale: [1, 1.08, 1], rotate: [0, -6, 6, -4, 4, 0], y: 0 }
              : isHero
                ? idle
                : navIdle
        }
        transition={
          still
            ? { duration: 0 }
            : wagging
              ? { duration: 1.2, ease: "easeOut" }
              : {
                  duration: sleeping ? 5.6 : isHero ? 4.4 : 3.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
        }
      />

      {sleeping && isHero && (
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

      {displayKind === "type-fallback" && (
        <span
          className={
            isHero
              ? "absolute bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-background/85 text-muted-foreground border border-border/60 pointer-events-none"
              : "sr-only"
          }
        >
          {TYPE_FALLBACK_LABEL_HE}
        </span>
      )}
    </div>
  );
};

/**
 * Mipo Presence visual.
 * V1 renders a living 2D Master (breath / idle sway / halo / celebrate).
 * `renderer` is the public contract so a future `"scene3d"` swap can land
 * without changing Profile Hero, BottomNav, or AvatarCompanion.
 *
 * F1: displaying the Master avatar is ungated — no paywall / subscription check here.
 */
export const PetHeroVisual = ({
  src,
  alt,
  mood,
  celebrateKey,
  renderer = "image",
  size = "hero",
  kind = "master",
  fallbackSrc,
}: PetHeroVisualProps) => {
  // V1 always uses LivingImagePresence. When SCENE3D_ENABLED is true, replace
  // this branch with lazy(() => import("@/components/mipo/presence/Scene3dPresence")).
  // Do not import 3D libraries from this file.
  void SCENE3D_ENABLED;
  return (
    <LivingImagePresence
      src={src}
      alt={alt}
      mood={mood}
      celebrateKey={celebrateKey}
      renderer={renderer}
      size={size}
      kind={kind}
      fallbackSrc={fallbackSrc}
    />
  );
};
