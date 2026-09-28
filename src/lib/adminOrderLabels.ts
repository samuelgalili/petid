/**
 * The words and tones the order screens share.
 *
 * ─── THEY HAD ALREADY DRIFTED ───────────────────────────────────────────────
 *
 * `processing` read "באריזה" on the orders list and "בטיפול" on the customer
 * card. Same column, same order, two words, and neither screen was wrong on its
 * own - which is exactly why nobody reported it. An operator reading a customer
 * card and then the queue has no way to know those describe one state.
 *
 * "באריזה" is the one kept, because it names the step somebody is doing rather
 * than the fact that somebody is doing something.
 *
 * ─── STATUS AND PAYMENT ARE NOT THE SAME AXIS ───────────────────────────────
 *
 * An order can be delivered and unpaid (cash on delivery, not collected) or
 * cancelled and paid (a refund owed). Keeping the two in separate maps is what
 * stops a screen collapsing them into one badge and losing the case that costs
 * money.
 */

import {
  CheckCircle, Clock, PackageCheck, RefreshCw, Truck, XCircle, type LucideIcon,
} from "lucide-react";

/** The four tones the admin tokens define, named by what they mean. */
export type AdminTone = "neutral" | "good" | "warn" | "bad" | "accent";

export const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS: Record<OrderStatus, { label: string; icon: LucideIcon; tone: AdminTone }> = {
  pending: { label: "ממתין", icon: Clock, tone: "warn" },
  processing: { label: "באריזה", icon: RefreshCw, tone: "accent" },
  shipped: { label: "נשלח", icon: Truck, tone: "accent" },
  delivered: { label: "נמסר", icon: CheckCircle, tone: "good" },
  cancelled: { label: "בוטל", icon: XCircle, tone: "bad" },
};

/** The one map the rest of the app reads for a status word. */
export const ORDER_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  ORDER_STATUSES.map((status) => [status, ORDER_STATUS[status].label]),
);

export const PAYMENT_STATUS: Record<string, { label: string; tone: AdminTone }> = {
  paid: { label: "שולם", tone: "good" },
  pending: { label: "ממתין", tone: "warn" },
  creating: { label: "בתשלום", tone: "warn" },
  failed: { label: "נכשל", tone: "bad" },
  awaiting_cod: { label: "תשלום במסירה", tone: "warn" },
  dev_approved: { label: "פיתוח", tone: "neutral" },
  refunded: { label: "הוחזר", tone: "neutral" },
  libra_credit: { label: "קרדיט ביטוח", tone: "accent" },
  admin_attested: { label: "אושר ע״י מנהל", tone: "good" },
};

/**
 * HOW the money arrived, which is a different question from whether it did.
 *
 * These are the values createOrder accepts, and they reached the screen as the
 * raw enum: an order card read "תשלום במסירה · cash-on-delivery", one English
 * identifier in the middle of a Hebrew line. An unknown method falls back to
 * its own value rather than to "אחר", because the method is on the receipt and
 * a screen that smooths it over leaves nobody able to reconcile it.
 */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  "credit-card": "כרטיס אשראי",
  "apple-pay": "Apple Pay",
  "google-pay": "Google Pay",
  bit: "ביט",
  paybox: "פייבוקס",
  paypal: "PayPal",
  "cash-on-delivery": "מזומן במסירה",
  // Not a method a customer can choose: an admin declaring that money reached
  // them directly. Named as such, because the difference matters in the books.
  "admin-attested": "אושר ע״י מנהל",
};

export const paymentMethodLabel = (value: string | null | undefined) =>
  PAYMENT_METHOD_LABELS[String(value || "")] || String(value || "—");

export const paymentStatusOf = (value: string | null | undefined) =>
  PAYMENT_STATUS[String(value || "")] ?? { label: String(value || "—"), tone: "neutral" as AdminTone };

export const orderStatusOf = (value: string | null | undefined) =>
  ORDER_STATUS[String(value || "") as OrderStatus] ?? ORDER_STATUS.pending;

/**
 * Medical urgency, which is a property of what was bought and not of the order.
 *
 * "רגיל" is deliberately toneless rather than green: an ordinary order is not
 * good news, it is the absence of news, and a screen where most rows glow green
 * has spent the colour that was supposed to mean something.
 */
export const ORDER_URGENCY: Record<string, { label: string; tone: AdminTone }> = {
  high: { label: "דחוף", tone: "bad" },
  medium: { label: "בינוני", tone: "warn" },
  none: { label: "רגיל", tone: "neutral" },
};

/** Tailwind pairs for a tone, as a chip and as a dot. */
export const TONE_CHIP: Record<AdminTone, string> = {
  neutral: "bg-admin-sunk text-admin-ink-muted",
  good: "bg-admin-success-soft text-admin-success",
  warn: "bg-admin-warning-soft text-admin-warning",
  bad: "bg-admin-danger-soft text-admin-danger",
  accent: "bg-admin-accent-soft text-admin-accent",
};

export const TONE_DOT: Record<AdminTone, string> = {
  neutral: "bg-admin-ink-subtle",
  good: "bg-admin-success",
  warn: "bg-admin-warning",
  bad: "bg-admin-danger",
  accent: "bg-admin-accent",
};

/**
 * What an outbox event says, in an operator's words.
 *
 * An unknown type falls back to its own dotted name rather than to something
 * reassuring: a history is the wrong place to smooth over a row nobody has
 * taught this screen to read.
 */
export const ORDER_EVENT_LABELS: Record<string, string> = {
  "order.created": "ההזמנה נוצרה",
  "order.paid": "התשלום נקלט",
  "order.payment_failed": "התשלום נכשל",
  "order.status_changed": "הסטטוס שונה",
  "order.shipped": "נשלח",
};

/**
 * Who caused an event.
 *
 * The first question about a status nobody remembers changing, and the outbox
 * has carried the answer all along.
 */
export const EVENT_ORIGIN_LABELS: Record<string, string> = {
  app: "הלקוח",
  admin: "מנהל",
  automation: "אוטומציה",
  system: "המערכת",
};

/** The medical keywords that raise an order's urgency, as one list. */
const URGENT_KEYWORDS = ["urinary", "renal", "שתן", "כליות", "kidney"];
const MEDIUM_KEYWORDS = ["gastro", "diabetic", "סוכרת", "עיכול", "derma", "עור"];

/**
 * Guessed from the product names when the order carries no urgency of its own.
 *
 * A guess, and named as one. A renal diet running out matters on a different
 * timescale from a toy, and this is the only signal available - but it reads
 * product names, so it will miss a Hebrew brand name for the same food and
 * catch a shampoo called "derma".
 */
export const detectMedicalUrgency = (items: Array<{ product_name?: string | null }>): string => {
  const text = items.map((item) => (item.product_name || "").toLowerCase()).join(" ");
  if (URGENT_KEYWORDS.some((word) => text.includes(word))) return "high";
  if (MEDIUM_KEYWORDS.some((word) => text.includes(word))) return "medium";
  return "none";
};
