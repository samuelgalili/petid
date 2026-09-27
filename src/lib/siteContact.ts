/**
 * Public contact details used by the legal copy.
 *
 * SUPPORT_PHONE comes from the build (`VITE_SUPPORT_PHONE`). Leave it empty
 * until a real number exists — the legal text then points at the support
 * email and the support page, which are already real. Do not put a
 * placeholder number here.
 */
export const SUPPORT_EMAIL = "support@mipo.pet";
export const ACCESSIBILITY_EMAIL = "accessibility@mipo.pet";
export const SUPPORT_PAGE_URL = "https://mipo.pet/support";
export const SUPPORT_PHONE = String(import.meta.env.VITE_SUPPORT_PHONE || "").trim();

/** Israeli VAT, 18% since 1 January 2025. */
export const VAT_PERCENT = 18;

export const contactLines = (language: "he" | "en", email: string): string => {
  if (language === "he") {
    const phone = SUPPORT_PHONE ? `טלפון: ${SUPPORT_PHONE}` : `דף תמיכה: ${SUPPORT_PAGE_URL}`;
    return `דוא"ל: ${email}\n${phone}`;
  }
  const phone = SUPPORT_PHONE ? `Phone: ${SUPPORT_PHONE}` : `Support page: ${SUPPORT_PAGE_URL}`;
  return `Email: ${email}\n${phone}`;
};

export const cancellationChannels = (language: "he" | "en"): string => {
  if (language === "he") {
    const phone = SUPPORT_PHONE ? `• טלפון: ${SUPPORT_PHONE}` : `• דף תמיכה: ${SUPPORT_PAGE_URL}`;
    return `• אימייל: ${SUPPORT_EMAIL}\n${phone}\n• דרך אזור "הגדרות > ניהול מידע" באפליקציה`;
  }
  const phone = SUPPORT_PHONE ? `• Phone: ${SUPPORT_PHONE}` : `• Support page: ${SUPPORT_PAGE_URL}`;
  return `• Email: ${SUPPORT_EMAIL}\n${phone}\n• In-app: Settings > Data Management`;
};
