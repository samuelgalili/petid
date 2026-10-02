/**
 * AvatarCompanion — the pet, following the user across the app.
 *
 * Pinned above the BottomNav. Tap opens the AI chat, already about this pet.
 *
 * A pet is a row in the fleet (an id from PetPreferenceContext), not a picture.
 * Someone whose animal has no photo still has that animal: the control must
 * not turn back into "add a pet" and open the onboarding again.
 *
 * Avatar sources, in order, and only as the picture:
 *  1. activePet from PetPreferenceContext (DB)
 *  2. the onboarding draft in localStorage, for the window before the pet row
 *     exists
 *
 * With no pet at all the "+" is correct — there is nothing to show yet — and
 * it takes you to add one rather than to the chat.
 *
 * Auto-hides on auth/onboarding routes, and on /chat and /shop, which show
 * the pet themselves. Guests never see it. Reading pages (support, terms,
 * science, breeds, install, accessibility) and unknown paths stay clear too.
 * The control stays off /feed entirely: the chat button sat on the share
 * action in the same corner. It also keeps an 8px gap from the nav and from
 * anything it would cover; if a screen has no such gap, it stays off that
 * screen rather than sitting on the text.
 */

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { matchRoutes, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { usePetPreference } from "@/contexts/PetPreferenceContext";
import { useAuth } from "@/hooks/useAuth";
import { readStoredOnboardingDraft } from "@/lib/mipoOnboardingDraft";
import { isInProgressFlow } from "@/lib/flowSurfaces";
import { allRoutes } from "@/routes";

const HIDDEN_PREFIXES = [
  // AND THE ADMIN, WHERE IT HAS NO BUSINESS AT ALL.
  //
  // This is the CUSTOMER's companion: it offers to add a pet, or to chat with
  // Mipo about one. In the admin it floated over the dashboard's fourth number
  // and over the last row of every table, inviting the person running the shop
  // to adopt an animal. It had been there the whole time.
  "/admin",
  "/auth",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/splash",
  "/onboarding",
  "/add-pet",
  "/stories",
  "/story",
  "/checkout",
  "/cart",
  "/product",
];

// Exact paths. startsWith("/terms") would also hide /club-terms.
const READING_PATHS = [
  "/support",
  "/terms",
  "/science",
  "/breeds",
  "/install",
  "/accessibility",
];

const isUnknownPath = (pathname: string) => {
  const matches = matchRoutes(allRoutes, pathname);
  if (!matches || matches.length === 0) return true;
  return matches.some((match) => match.route.path === "*");
};

const FAB_SIZE = 56;
const FAB_LEFT = 16;
const SAFE_GAP = 8;
const CONTENT_SELECTORS = "h1, h2, p, button, a, img, [data-presence-visual]";

type Blocker = { top: number; bottom: number };

function columnOf(fab: HTMLElement | null) {
  const parsed = fab ? Number.parseFloat(getComputedStyle(fab).left) : Number.NaN;
  const left = Number.isFinite(parsed) ? parsed : FAB_LEFT;
  const size = fab && fab.offsetWidth > 0 ? fab.offsetWidth : FAB_SIZE;
  return { left, right: left + size, size };
}

function contentBlockers(fab: HTMLElement | null, left: number, right: number, limit: number): Blocker[] {
  const blockers: Blocker[] = [];
  const root = document.querySelector("main") ?? document.body;
  root.querySelectorAll(CONTENT_SELECTORS).forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (fab && (node === fab || fab.contains(node))) return;
    if (node.closest("nav")) return;
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden" || style.position === "fixed") return;
    const rect = node.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    if (rect.bottom <= 0 || rect.top >= limit) return;
    if (rect.right <= left - SAFE_GAP || rect.left >= right + SAFE_GAP) return;
    blockers.push({ top: rect.top, bottom: Math.min(rect.bottom, limit) });
  });
  return blockers;
}

/**
 * Lowest top where the control clears the nav by SAFE_GAP and does not cover
 * visible content in its column. Null when the screen has no such slot.
 */
/**
 * Top of the bottom nav in viewport coordinates.
 *
 * While a page transition is still transforming its wrapper, position:fixed
 * children stick to that wrapper. The bar's box can then sit at the end of
 * the page, below the viewport, and a control placed against the viewport
 * edge lands on the bar once the transition settles. Reserve the bar's own
 * height at the bottom of the screen in that case.
 */
function floorLimit() {
  const nav = document.querySelector('nav[aria-label="ניווט ראשי"]');
  if (!(nav instanceof HTMLElement)) return window.innerHeight;
  const rect = nav.getBoundingClientRect();
  if (rect.height < 1) return window.innerHeight;
  if (rect.top >= window.innerHeight) return window.innerHeight - rect.height;
  return Math.min(rect.top, window.innerHeight);
}

function companionTop(fab: HTMLElement | null): number | null {
  const limit = floorLimit();
  const { left, right, size } = columnOf(fab);
  let top = Math.floor(limit - SAFE_GAP - size);
  if (top < SAFE_GAP) return null;

  const blockers = contentBlockers(fab, left, right, limit);
  const overlaps = (candidate: number, blocker: Blocker) =>
    candidate < blocker.bottom + SAFE_GAP && candidate + size > blocker.top - SAFE_GAP;

  for (let i = 0; i < blockers.length + 1; i += 1) {
    const hit = blockers.filter((blocker) => overlaps(top, blocker));
    if (hit.length === 0) return top;
    const ceiling = Math.min(...hit.map((blocker) => blocker.top));
    top = Math.floor(ceiling - SAFE_GAP - size);
    if (top < SAFE_GAP) return null;
  }
  return null;
}

export const AvatarCompanion = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activePet, pets, loading: petsLoading } = usePetPreference();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [top, setTop] = useState<number | null>(null);
  const [parked, setParked] = useState(false);

  // The draft is read through its own reader rather than hand-parsed here: it
  // validates the shape and swallows the private-mode throw, which the inline
  // JSON.parse only half did. It is only the picture for the moment before a
  // pet row exists. A saved pet with no photo is still a pet.
  const draft = readStoredOnboardingDraft();
  const savedPet = Boolean(activePet?.id) || pets.length > 0;
  const draftAvatar = draft?.avatarUrl || draft?.photoUrl || "";
  const hasPet = savedPet || Boolean(draft?.name && draftAvatar);
  const petName = activePet?.name || draft?.name || null;
  const petAvatar = (savedPet ? activePet?.avatar_url : draftAvatar) || null;

  // aws-migration has no MipoOnboardingGate. Hiding when
  // mipo-onboarding-complete is unset would make Companion never appear on
  // mipo.pet. Only hide when that flag is explicitly "false".
  const onboardingActive = (() => {
    try { return localStorage.getItem("mipo-onboarding-complete") === "false"; }
    catch { return false; }
  })();

  // AND /shop, WHICH NOW SHOWS THE PET ITSELF.
  //
  // Same reason as /chat, and the design canvas states it as the system's
  // first rule: "האורורה היחידה במערכת... ברגע שהזוהר מופיע במקום שני, הוא
  // מפסיק לומר ״זו החיה שלך״." The shop's resting state is the pet under its
  // own aurora with the search field beneath it; this companion parked a
  // second aurora in the corner of that screen, over the results grid at that.
  const hidden = useMemo(
    () =>
      authLoading ||
      petsLoading ||
      !isAuthenticated ||
      onboardingActive ||
      isInProgressFlow(location.pathname) ||
      HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p)) ||
      READING_PATHS.includes(location.pathname) ||
      isUnknownPath(location.pathname) ||
      location.pathname === "/chat" ||
      location.pathname === "/shop" ||
      // The feed already has its own actions in this corner. The chat
      // control covered the share button on desktop and on mobile.
      location.pathname === "/feed",
    [authLoading, isAuthenticated, location.pathname, onboardingActive, petsLoading],
  );

  useLayoutEffect(() => {
    if (hidden) {
      setTop(null);
      setParked(false);
      return;
    }

    let frame = 0;
    let cancelled = false;
    const apply = () => {
      if (cancelled) return;
      const next = companionTop(buttonRef.current);
      if (next === null) {
        setParked(true);
        setTop(null);
        return;
      }
      setParked(false);
      setTop((current) => (current !== null && Math.abs(current - next) < 0.5 ? current : next));
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(apply);
    };

    const observer = new ResizeObserver(schedule);
    const watch = () => {
      const main = document.querySelector("main");
      if (main) observer.observe(main);
      const nav = document.querySelector('nav[aria-label="ניווט ראשי"]');
      if (nav) observer.observe(nav);
    };
    const mutations = new MutationObserver(() => {
      watch();
      schedule();
    });
    mutations.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    void document.fonts?.ready.then(() => {
      if (!cancelled) schedule();
    });
    watch();
    apply();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      mutations.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [hidden, hasPet, location.pathname, petAvatar, petName]);

  if (hidden || parked) return null;

  const showPhoto = Boolean(hasPet && petAvatar);

  return (
    <motion.button
      ref={buttonRef}
      type="button"
      aria-label={
        hasPet
          ? petName
            ? `שיחה עם מיפו על ${petName}`
            : "שיחה עם מיפו"
          : "הוספת חיה"
      }
      onClick={() => navigate(hasPet ? "/chat" : "/add-pet")}
      initial={{ opacity: 0 }}
      animate={{ opacity: top === null ? 0 : 1, y: 0 }}
      transition={{ opacity: { duration: 0.2 } }}
      whileTap={{ scale: 0.92 }}
      style={top === null ? { top: 0, visibility: "hidden" } : { top }}
      className={`fixed z-[9997] left-4 flex h-14 w-14 items-center justify-center${top === null ? " pointer-events-none" : ""}`}
    >
      {/* The avatar is the one surface the brand aurora is allowed on, so the
          halo and the ring both read --gradient-primary rather than repeating
          the stops. With no photo there is no aurora, and with no pet at all
          there is only the plus. */}
      <span
        className={
          showPhoto
            ? "mipo-avatar-glow relative h-14 w-14"
            : "relative flex h-14 w-14 items-center justify-center rounded-full border border-mipo-line bg-white/90 backdrop-blur-sm"
        }
      >
        {showPhoto ? (
          <img
            src={petAvatar as string}
            // Decorative: the button around it is already labelled with the
            // pet's name, so alt="" keeps a screen reader from announcing the
            // name twice.
            //
            // It also stops this image from colliding with the home screen's
            // own avatar. Both carried alt={petName}, which put two images
            // with the same accessible name on every screen and made
            // getByRole("img", { name }) ambiguous - the Playwright smoke test
            // that guards the home Presence failed on a strict mode violation
            // and blocked the deploy.
            alt=""
            className="h-full w-full rounded-full bg-mipo-soft object-cover"
          />
        ) : hasPet ? (
          <span aria-hidden className="text-base font-semibold text-mipo-ink">
            {(petName || "מ").trim().slice(0, 1)}
          </span>
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
