/**
 * AvatarCompanion — living Master presence that follows the owner.
 * Pinned above the BottomNav (inline-start), tap = open AI chat.
 *
 * Sources avatar in priority order:
 *  1. activePet from PetPreferenceContext (DB)
 *  2. localStorage `mipo-pet-draft` (created by MipoOnboarding)
 *
 * Auto-hides on auth/onboarding/chat and while the pet dashboard hero is open
 * so the large PetHeroVisual is the only center-screen presence.
 */

import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { usePetPreference } from "@/contexts/PetPreferenceContext";
import { useOverlayNav } from "@/contexts/OverlayNavContext";
import { PetHeroVisual } from "@/components/profile/PetHeroVisual";
import { resolveMasterAvatarSrc } from "@/lib/masterAvatar";
import dogIcon from "@/assets/dog-official.svg";
import catIcon from "@/assets/cat-official.png";

const HIDDEN_PREFIXES = [
  "/auth",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/splash",
  "/onboarding",
  "/add-pet",
  "/stories",
  "/story",
];

type PetDraft = {
  name?: string;
  avatarUrl?: string;
  petType?: "dog" | "cat";
};

const readDraft = (): PetDraft => {
  try {
    return JSON.parse(localStorage.getItem("mipo-pet-draft") || "{}") as PetDraft;
  } catch {
    return {};
  }
};

export const AvatarCompanion = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activePet } = usePetPreference();
  const { dashboardOpen } = useOverlayNav();
  const reduceMotion = useReducedMotion();

  const draft = readDraft();
  const name = activePet?.name || draft.name || "";
  const petType = (activePet?.pet_type || draft.petType) === "cat" ? "cat" : "dog";
  const fallback = petType === "cat" ? catIcon : dogIcon;
  const resolved = resolveMasterAvatarSrc(activePet?.avatar_url || draft.avatarUrl, fallback);

  const onboardingActive = (() => {
    try { return localStorage.getItem("mipo-onboarding-complete") !== "true"; }
    catch { return false; }
  })();

  const hidden = useMemo(
    () =>
      dashboardOpen ||
      onboardingActive ||
      HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p)) ||
      location.pathname === "/chat" ||
      location.pathname === "/" ||
      location.pathname === "/feed",
    [location.pathname, onboardingActive, dashboardOpen],
  );

  if (hidden || !name) return null;

  return (
    <motion.button
      type="button"
      aria-label={`שיחה עם ${name}`}
      onClick={() => navigate("/chat")}
      initial={{ opacity: 0, y: 16, scale: 0.85 }}
      animate={{
        opacity: 1,
        y: reduceMotion ? 0 : [0, -5, 0],
        scale: 1,
      }}
      transition={{
        opacity: { duration: 0.3 },
        scale: { duration: 0.3 },
        y: reduceMotion ? { duration: 0 } : { duration: 3.6, repeat: Infinity, ease: "easeInOut" },
      }}
      whileTap={{ scale: 0.92 }}
      className="fixed z-[9997] start-4 bottom-[88px] w-14 h-14 rounded-full overflow-hidden border-2 border-background/80 bg-background/90 backdrop-blur-sm shadow-lg"
      data-mipo-presence="companion"
    >
      <PetHeroVisual
        src={resolved.src}
        fallbackSrc={fallback}
        kind={resolved.kind}
        alt={name}
        mood="calm"
        celebrateKey={0}
        renderer="image"
        size="companion"
      />
    </motion.button>
  );
};

export default AvatarCompanion;
