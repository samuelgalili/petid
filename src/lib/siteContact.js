/**
 * Public customer-service contact. One place, read by the app and by the
 * server that writes the support page's meta description.
 *
 * The channel is WhatsApp. Email stays for people who write instead of chat.
 * This is a link the visitor opens. It is not a WhatsApp Business API.
 */
export const SUPPORT_EMAIL = "support@mipo.pet";
export const ACCESSIBILITY_EMAIL = "accessibility@mipo.pet";
export const SUPPORT_PAGE_URL = "https://mipo.pet/support";
export const SUPPORT_PHONE = "050-5929209";
export const SUPPORT_WHATSAPP_URL = "https://wa.me/972505929209";

/** Israeli VAT, 18% since 1 January 2025. */
export const VAT_PERCENT = 18;

export const contactLines = (language, email) => {
  if (language === "he") {
    return `דוא"ל: ${email}\nוואטסאפ: ${SUPPORT_PHONE}\n${SUPPORT_WHATSAPP_URL}`;
  }
  return `Email: ${email}\nWhatsApp: ${SUPPORT_PHONE}\n${SUPPORT_WHATSAPP_URL}`;
};

export const cancellationChannels = (language) => {
  if (language === "he") {
    return `• אימייל: ${SUPPORT_EMAIL}\n• וואטסאפ: ${SUPPORT_PHONE}\n• ${SUPPORT_WHATSAPP_URL}\n• דרך אזור "הגדרות > ניהול מידע" באפליקציה`;
  }
  return `• Email: ${SUPPORT_EMAIL}\n• WhatsApp: ${SUPPORT_PHONE}\n• ${SUPPORT_WHATSAPP_URL}\n• In-app: Settings > Data Management`;
};
