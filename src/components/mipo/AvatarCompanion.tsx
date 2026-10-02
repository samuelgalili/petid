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
 * Auto-hides on auth/onboarding routes, and on /chat and /shop, which show
 * the pet themselves. Guests never see it. Reading pages (support, terms,
 * science, breeds, install, accessibility) and unknown paths stay clear too,
 * so the control does not sit on top of text the person came to read.
 * The add-pet plus stays off /feed: that screen already has a header plus,
 * and this one covered the share button. On home it sits in the open gap
 * under the caption and above the bottom nav.
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
const RESTING_BOTTOM = 88;
const CLEAR_MARGIN = 12;
const CONTENT_SELECTORS = "h1, h2, p, button, a, img, [data-presence-visual]";

/**
 * Lowest visible home content above the nav. Layout wrappers (main, the
 * shell) are min-h-screen, so measuring them would report the viewport and
 * leave no gap at all.
 */
function visibleContentBottom(main: HTMLElement, fab: HTMLElement, navTop: number) {
  let bottom = 0;
  main.querySelectorAll(CONTENT_SELECTORS).forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (node === fab || fab.contains(node)) return;
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden" || style.position === "fixed") return;
    const rect = node.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1 || rect.top >= navTop) return;
    bottom = Math.max(bottom, Math.min(rect.bottom, navTop));
  });
  return bottom;
}

/** Top of the home control, in the gap under the content and above the nav. */
function homeFabTop(fab: HTMLElement) {
  const nav = document.querySelector('nav[aria-label="ניווט ראשי"]');
  const main = document.querySelector("main");
  const restingTop = window.innerHeight - RESTING_BOTTOM - FAB_SIZE;
  if (!(nav instanceof HTMLElement) || !(main instanceof HTMLElement)) return restingTop;

  const navTop = nav.getBoundingClientRect().top;
  const contentBottom = visibleContentBottom(main, fab, navTop);
  const aboveNav = Math.max(0, navTop - FAB_SIZE);
  const place = (top: number) => Math.min(Math.max(0, Math.ceil(top)), aboveNav);
  const minTop = contentBottom + CLEAR_MARGIN;
  const maxTop = navTop - CLEAR_MARGIN - FAB_SIZE;

  if (minTop <= maxTop) return place(Math.min(Math.max(restingTop, minTop), maxTop));

  const gap = navTop - contentBottom;
  if (gap >= FAB_SIZE) return place(contentBottom + (gap - FAB_SIZE) / 2);
  return place(contentBottom);
}

export const AvatarCompanion = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activePet } = usePetPreference();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [homeTop, setHomeTop] = useState<number | null>(null);

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
      !isAuthenticated ||
      onboardingActive ||
      isInProgressFlow(location.pathname) ||
      HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p)) ||
      READING_PATHS.includes(location.pathname) ||
      isUnknownPath(location.pathname) ||
      location.pathname === "/chat" ||
      location.pathname === "/shop" ||
      // The feed's header plus already adds a post. This plus covered the
      // share button in the same corner, so it stays off /feed until a pet
      // is actually there to show.
      (location.pathname === "/feed" && !petAvatar),
    [authLoading, isAuthenticated, location.pathname, onboardingActive, petAvatar],
  );

  const onHome = location.pathname === "/";

  useLayoutEffect(() => {
    if (!onHome || hidden) {
      setHomeTop(null);
      return;
    }
    const fab = buttonRef.current;
    if (!fab) return;

    let frame = 0;
    let cancelled = false;
    const place = () => {
      if (cancelled) return;
      const next = homeFabTop(fab);
      setHomeTop((current) => (current !== null && Math.abs(current - next) < 0.5 ? current : next));
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };

    // Home is lazy. The first pass often runs while <main> is still the
    // loading shell, and a font or a pet row can move the caption later
    // without changing this component's props. Watch the document so the
    // button follows the gap it is supposed to sit in.
    const observer = new ResizeObserver(schedule);
    const watch = () => {
      const main = document.querySelector("main");
      if (!main) return;
      observer.observe(main);
      main.querySelectorAll(CONTENT_SELECTORS).forEach((node) => {
        if (node instanceof HTMLElement) observer.observe(node);
      });
    };
    const mutations = new MutationObserver(() => {
      watch();
      schedule();
    });
    mutations.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);
    void document.fonts?.ready.then(() => {
      if (!cancelled) schedule();
    });
    watch();
    place();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      mutations.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [hidden, onHome, petAvatar, petName]);

  if (hidden) return null;

  const hasPet = Boolean(petAvatar);
  const pinOnHome = onHome && homeTop !== null;

  return (
    <motion.button
      ref={buttonRef}
      // The label said "הוסף" on every screen while the tap opened the chat.
      aria-label={
        hasPet
          ? petName
            ? `שיחה עם מיפו על ${petName}`
            : "שיחה עם מיפו"
          : "הוספת חיה"
      }
      onClick={() => navigate(hasPet ? "/chat" : "/add-pet")}
      initial={{ opacity: 0, y: onHome ? 0 : 16, scale: 0.85 }}
      animate={{
        opacity: 1,
        // The home gap is only a few pixels taller than the button. The
        // float would lift it back onto the caption.
        y: onHome ? 0 : [0, -6, 0],
        scale: 1,
      }}
      transition={{
        opacity: { duration: 0.3 },
        scale: { duration: 0.3 },
        y: onHome ? { duration: 0.2 } : { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
      }}
      whileTap={{ scale: 0.92 }}
      style={pinOnHome ? { top: homeTop } : undefined}
      className={`fixed z-[9997] left-4 flex h-14 w-14 items-center justify-center${pinOnHome ? "" : " bottom-[88px]"}`}
    >
      {/* The avatar is the one surface the brand aurora is allowed on, so the
          halo and the ring both read --gradient-primary rather than repeating
          the stops. With no pet there is no avatar, and so no aurora. */}
      <span
        className={
          hasPet
            ? "mipo-avatar-glow relative h-14 w-14"
            : "relative flex h-14 w-14 items-center justify-center rounded-full border border-mipo-line bg-white/90 backdrop-blur-sm"
        }
      >
        {hasPet ? (
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
