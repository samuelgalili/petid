/**
 * AvatarCompanion — a tiny floating MIPO avatar that follows the user
 * across the entire app. Pinned above the BottomNav, tap = open AI chat.
 *
 * Sources avatar in priority order:
 *  1. activePet from PetPreferenceContext (DB)
 *  2. localStorage `mipo-pet-draft` (created by MipoOnboarding)
 *
 * Auto-hides on auth/onboarding routes.
 */

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { usePetPreference } from "@/contexts/PetPreferenceContext";

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

function readDraftAvatar(): string | null {
  try {
    const raw = localStorage.getItem("mipo-pet-draft");
    if (!raw) return null;
    return JSON.parse(raw)?.avatarUrl || null;
  } catch {
    return null;
  }
}

export const AvatarCompanion = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activePet } = usePetPreference();

  // Re-check the draft when the route changes (cheap)
  const [draftAvatar, setDraftAvatar] = useState<string | null>(() => readDraftAvatar());
  useEffect(() => {
    setDraftAvatar(readDraftAvatar());
  }, [location.pathname]);

  const avatarUrl = activePet?.avatar_url || draftAvatar;
  const name = activePet?.name || (() => {
    try { return JSON.parse(localStorage.getItem("mipo-pet-draft") || "{}")?.name; } catch { return null; }
  })();

  // Also hide while the MIPO onboarding gate is still active — it overlays the
  // whole screen and the floating avatar would punch through it.
  const onboardingActive = (() => {
    try { return localStorage.getItem("mipo-onboarding-complete") !== "true"; }
    catch { return false; }
  })();

  const hidden = useMemo(
    () =>
      onboardingActive ||
      HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p)) ||
      location.pathname === "/chat",
    [location.pathname, onboardingActive],
  );

  if (hidden || !avatarUrl) return null;

  return (
    <motion.button
      aria-label={name ? `Open chat with ${name}` : "Open chat"}
      onClick={() => navigate("/chat")}
      initial={{ opacity: 0, y: 16, scale: 0.85 }}
      animate={{
        opacity: 1,
        y: [0, -6, 0],
        scale: 1,
      }}
      transition={{
        opacity: { duration: 0.3 },
        scale: { duration: 0.3 },
        y: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
      }}
      whileTap={{ scale: 0.92 }}
      className="fixed z-[9997] right-4 bottom-[88px] w-14 h-14 rounded-full overflow-hidden bg-white"
      style={{
        boxShadow:
          "0 8px 20px -8px rgba(231,123,108,0.55), 0 10px 30px -10px rgba(91,168,217,0.45)",
      }}
    >
      <img src={avatarUrl} alt={name || "pet"} className="w-full h-full object-cover" />
    </motion.button>
  );
};

export default AvatarCompanion;