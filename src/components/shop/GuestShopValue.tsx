import { FREE_SHIPPING_THRESHOLD, SHIPPING_ESTIMATE_HE } from "@/lib/shipping";
import { GUEST_VALUE_LINE, SUPPORT_WHATSAPP_DISPLAY, SUPPORT_WHATSAPP_URL } from "@/lib/supportContact";

/**
 * One short strip for someone who is not signed in.
 *
 * Shipping copy is the figures in src/lib/shipping.ts: free only from the
 * threshold, and the owner's 3–5 business days. Nothing here says the
 * delivery is free for every order, or that it is faster than that.
 */
export const GuestShopValue = () => (
  <section
    data-testid="guest-value-strip"
    dir="rtl"
    aria-label="למה Mipo"
    className="rounded-3xl border border-mipo-line bg-white px-4 py-3 text-right"
  >
    <h2 className="text-sm font-semibold leading-5 text-mipo-ink">{GUEST_VALUE_LINE}</h2>
    <p className="mt-1 text-xs leading-5 text-mipo-muted">
      {`משלוח חינם מעל ₪${FREE_SHIPPING_THRESHOLD} · משלוח תוך ${SHIPPING_ESTIMATE_HE} · `}
      <a
        href={SUPPORT_WHATSAPP_URL}
        className="font-medium text-mipo-ink underline underline-offset-4"
        rel="noopener noreferrer"
      >
        תמיכה בוואטסאפ <span dir="ltr">{SUPPORT_WHATSAPP_DISPLAY}</span>
      </a>
    </p>
  </section>
);
