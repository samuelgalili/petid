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

import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
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

export const AvatarCompanion = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activePet } = usePetPreference();

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

  if (hidden) return null;

  return (
    <motion.button
      aria-label="הוסף"
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
      className="fixed z-[9997] left-4 bottom-[88px] w-14 h-14 rounded-full flex items-center justify-center border-2 border-white/20 bg-white/90 backdrop-blur-sm"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="plusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E77B6C" />
            <stop offset="50%" stopColor="#F3A85C" />
            <stop offset="100%" stopColor="#5BA8D9" />
          </linearGradient>
        </defs>
        <path d="M12 5v14M5 12h14" stroke="url(#plusGradient)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </motion.button>
  );
};

export default AvatarCompanion;