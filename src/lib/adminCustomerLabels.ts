/**
 * The words and formats the customer screens share.
 *
 * Two screens read the same records now - the list and the 360 - and a status
 * that reads "נמסר" on one and "delivered" on the other is the kind of
 * difference nobody reports as a bug and everybody notices. One copy.
 */

import {
  CalendarClock, Mail, MessageCircle, PhoneCall, StickyNote, type LucideIcon,
} from "lucide-react";

import type { MipoCustomerNoteKind } from "@/lib/mipoApi";

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "ממתין",
  processing: "בטיפול",
  shipped: "נשלח",
  delivered: "נמסר",
  cancelled: "בוטל",
};

export const PET_TYPE_LABELS: Record<string, string> = {
  dog: "כלב",
  cat: "חתול",
  other: "אחר",
};

export const NOTE_KINDS: Array<{ value: MipoCustomerNoteKind; label: string; icon: LucideIcon }> = [
  { value: "call", label: "שיחה", icon: PhoneCall },
  { value: "note", label: "הערה", icon: StickyNote },
  { value: "whatsapp", label: "וואטסאפ", icon: MessageCircle },
  { value: "email", label: "מייל", icon: Mail },
  { value: "meeting", label: "פגישה", icon: CalendarClock },
];

export const NOTE_KIND_BY_VALUE = new Map(NOTE_KINDS.map((kind) => [kind.value, kind]));

/**
 * Keeps the agorot when there are any.
 *
 * An order total reads ₪144.80 rather than a rounded ₪145 that will not match
 * the invoice the customer is holding.
 */
export const formatCurrency = (value: number) => `₪${value.toLocaleString("he-IL", {
  minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  maximumFractionDigits: 2,
})}`;

export const formatDate = (value?: string | null) => (
  value ? new Date(value).toLocaleDateString("he-IL") : "—"
);

/**
 * With the hour.
 *
 * A call log without it is useless: two calls on the same day are a different
 * story from one.
 */
export const formatDateTime = (value?: string | null) => (
  value
    ? new Date(value).toLocaleString("he-IL", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    })
    : "—"
);
