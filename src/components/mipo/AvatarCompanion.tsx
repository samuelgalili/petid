/**
 * AvatarCompanion — the pet, following the user across the app.
 *
 * Pinned above the BottomNav. Tap opens the AI chat, already about this pet.
 *
 * It is called the avatar companion and it drew a PLUS SIGN. The pet's name
 * was read from the context on every render and then never used, the avatar
 * was never read at all, and the glyph was painted in three hexes belonging to
 * no palette in this app. So on every screen, the one element whose whole job
 * is to keep the pet present showed a "+" in colours that were not the brand's.
 *
 * Avatar sources, in order:
 *  1. activePet from PetPreferenceContext (DB)
 *  2. the onboarding draft in localStorage, for the window before the pet row
 *     exists
 *
 * With no pet at all the "+" is correct - there is nothing to show yet - and
 * it takes you to add one rather than to the chat, which is what the icon has
 * always promised and never did.
 *
 * Auto-hides on auth/onboarding routes, and on /chat, which shows the pet
 * itself.
 */

import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { usePetPreference } from "@/contexts/PetPreferenceContext";
import { readStoredOnboardingDraft } from "@/lib/mipoOnboardingDraft";

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

  // The draft is read through its own reader rather than hand-parsed here: it
  // validates the shape and swallows the private-mode throw, which the inline
  // JSON.parse only half did.
  const draft = readStoredOnboardingDraft();
  const petName = activePet?.name || draft?.name || null;
  const petAvatar = activePet?.avatar_url || draft?.avatarUrl || draft?.photoUrl || null;

  // aws-migration has no MipoOnboardingGate. Hiding when
  // mipo-onboarding-complete is unset would make Companion never appear on
  // mipo.pet. Only hide when that flag is explicitly "false".
  const onboardingActive = (() => {
    try { return localStorage.getItem("mipo-onboarding-complete") === "false"; }
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

  const hasPet = Boolean(petAvatar);

  return (
    <motion.button
      // The label said "הוסף" on every screen while the tap opened the chat.
      aria-label={
        hasPet
          ? petName
            ? `שיחה עם מיפו על ${petName}`
            : "שיחה עם מיפו"
          : "הוספת חיה"
      }
      onClick={() => navigate(hasPet ? "/chat" : "/add-pet")}
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
      className="fixed z-[9997] left-4 bottom-[88px] flex h-14 w-14 items-center justify-center"
    >
      {/* The avatar is the one surface the brand aurora is allowed on, so the
          halo and the ring both read --gradient-primary rather than repeating
          the stops. With no pet there is no avatar, and so no aurora. */}
      {hasPet && (
        <span
          aria-hidden
          className="absolute -inset-1 rounded-full opacity-40 blur-md"
          style={{ background: "var(--gradient-primary)" }}
        />
      )}
      <span
        className={
          hasPet
            ? "mipo-gradient-ring relative h-14 w-14 !p-[2px]"
            : "relative flex h-14 w-14 items-center justify-center rounded-full border border-mipo-line bg-white/90 backdrop-blur-sm"
        }
      >
        {hasPet ? (
          <img
            src={petAvatar as string}
            alt={petName || "החיה שלי"}
            className="h-full w-full rounded-full bg-mipo-soft object-cover"
          />
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              className="text-mipo-ink"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </motion.button>
  );
};

export default AvatarCompanion;
