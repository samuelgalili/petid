/**
 * Screens where a global popup would cover the thing the person is doing.
 * Onboarding, checkout and the payment handoff are the ones that matter.
 */

const IN_PROGRESS_PREFIXES = [
  "/onboarding",
  "/add-pet",
  "/checkout",
  "/payment-success",
  "/payment-failed",
  "/cart",
  "/verify-email",
  "/signup",
  "/auth",
];

export const PROFILE_PROMPT_DELAY_MS = 5000;
export const PROFILE_PROMPT_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

const sessionDismissKey = (userId: string) => `profile_prompt_dismissed_${userId}`;
const snoozeUntilKey = (userId: string) => `profile_prompt_snooze_until_${userId}`;
const firstSessionKey = "mipo_profile_prompt_first_session";
const activeSessionKey = "mipo_profile_prompt_active_session";

type KeyValueStore = Pick<Storage, "getItem" | "setItem">;

const browserStore = (kind: "localStorage" | "sessionStorage"): KeyValueStore | null => {
  try {
    return globalThis[kind] ?? null;
  } catch {
    return null;
  }
};

export const isInProgressFlow = (pathname: string) =>
  IN_PROGRESS_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export const readOnboardingFlag = () => {
  try {
    return localStorage.getItem("mipo-onboarding-complete");
  } catch {
    return null;
  }
};

/**
 * Name and city are asked after onboarding, on an ordinary page.
 * The phone is collected at checkout, not here.
 * An explicit "false" means onboarding started and has not finished, including
 * when the person left /onboarding for home in the same attempt.
 * Unset is an account that predates the flag: they are already past it.
 */
export const profilePromptAllowed = (pathname: string, onboardingFlag: string | null) => {
  if (isInProgressFlow(pathname)) return false;
  if (onboardingFlag === "false") return false;
  return true;
};

/**
 * The card stays hidden for the whole first browser session, including the
 * first landing on home. A session is the sessionStorage marker. The first
 * one is also written to localStorage, so the next tab (empty sessionStorage,
 * saved first-session id) is the second session.
 * If either store is missing, the card stays hidden.
 */
export const profilePromptPastFirstSession = (
  session: KeyValueStore | null = browserStore("sessionStorage"),
  local: KeyValueStore | null = browserStore("localStorage"),
  now = Date.now(),
) => {
  if (!session || !local) return false;
  try {
    const active = session.getItem(activeSessionKey);
    const first = local.getItem(firstSessionKey);
    if (active) return Boolean(first) && active !== first;
    if (!first) {
      const id = String(now);
      local.setItem(firstSessionKey, id);
      session.setItem(activeSessionKey, id);
      return false;
    }
    session.setItem(activeSessionKey, `later:${now}`);
    return true;
  } catch {
    return false;
  }
};

export const profilePromptSnoozed = (
  userId: string,
  now = Date.now(),
  session: KeyValueStore | null = browserStore("sessionStorage"),
  local: KeyValueStore | null = browserStore("localStorage"),
) => {
  try {
    if (session?.getItem(sessionDismissKey(userId))) return true;
    const until = Number(local?.getItem(snoozeUntilKey(userId)) || 0);
    return Number.isFinite(until) && until > now;
  } catch {
    return false;
  }
};

export const snoozeProfilePrompt = (
  userId: string,
  now = Date.now(),
  session: KeyValueStore | null = browserStore("sessionStorage"),
  local: KeyValueStore | null = browserStore("localStorage"),
) => {
  try {
    session?.setItem(sessionDismissKey(userId), "true");
    local?.setItem(snoozeUntilKey(userId), String(now + PROFILE_PROMPT_SNOOZE_MS));
  } catch {
    // Private mode: the prompt can return next time. It is still dismissible.
  }
};
