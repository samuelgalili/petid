import { formatShippingAddress, type ShippingAddressFields } from "@/lib/shippingAddress";

/**
 * The warehouse label as text, for sending to the logistics centre on WhatsApp.
 *
 * WhatsApp's click-to-chat link can prefill a message and nothing else: it
 * cannot attach a file, because a web page is not allowed to put an attachment
 * into another site's composer. So the label travels as text, and the printed
 * sheet is attached by hand when one is wanted.
 *
 * The content mirrors the printed label deliberately, prices included in the
 * omission: the warehouse does not need them.
 */

export interface DispatchItem {
  product_name: string;
  quantity: number;
  sku?: string | null;
  weight?: string | null;
  weight_unit?: string | null;
  variant?: string | null;
  size?: string | null;
}

export interface DispatchOrder {
  order_number: string;
  order_date?: string | null;
  customer_name?: string | null;
  shipping_address?: ShippingAddressFields | string | null;
  order_items?: DispatchItem[];
  special_instructions?: string | null;
  pet_name?: string | null;
}

export const BUSINESS_SENDER = "יובל דיגיטל · עוסק פטור 036574564 · יגיע כפיים 1, פתח-תקווה";

const trimmed = (value: unknown) => String(value ?? "").trim();

const addressOf = (order: DispatchOrder): ShippingAddressFields =>
  order.shipping_address && typeof order.shipping_address === "object" ? order.shipping_address : {};

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("he-IL");
};

const formatWeight = (item: DispatchItem) => {
  const raw = trimmed(item.weight);
  if (!raw) return null;
  const weight = /^\d+\.\d+$/.test(raw) ? raw.replace(/\.?0+$/, "") : raw;
  const unit = trimmed(item.weight_unit);
  return unit && !weight.toLowerCase().includes(unit.toLowerCase()) ? `${weight} ${unit}` : weight;
};

export const formatWarehouseDispatchMessage = (order: DispatchOrder): string => {
  const address = addressOf(order);
  const items = order.order_items || [];
  const totalUnits = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const orderDate = formatDate(order.order_date);

  const lines: (string | null)[] = [
    `📦 משלוח לביצוע — הזמנה ${order.order_number}`,
    orderDate ? `תאריך: ${orderDate}` : null,
    `שולח: ${BUSINESS_SENDER}`,
    "",
    "— נמען —",
    `שם: ${order.customer_name || address.fullName || "לא צוין"}`,
    `כתובת: ${formatShippingAddress(order.shipping_address) || "לא צוינה"}`,
  ];

  const phone = trimmed(address.phone);
  const phoneSecondary = trimmed(address.phoneSecondary);
  if (phone) lines.push(`טלפון: ${phone}`);
  if (phoneSecondary) lines.push(`טלפון נוסף: ${phoneSecondary}`);

  const lobbyCode = trimmed(address.lobbyCode);
  if (lobbyCode) lines.push(`קוד כניסה ללובי: ${lobbyCode}`);
  if (address.leaveAtDoor) {
    lines.push("⚠️ הלקוח אישר השארה ליד הדלת באחריותו");
  }

  lines.push("", `— פריטים (${items.length} שורות, ${totalUnits} יחידות) —`);
  if (items.length === 0) {
    lines.push("אין פריטים בהזמנה — אין לשלוח");
  } else {
    items.forEach((item, index) => {
      const details = [
        item.sku ? `מק״ט ${item.sku}` : null,
        `כמות ${item.quantity}`,
        formatWeight(item) ? `משקל ${formatWeight(item)}` : null,
        [item.variant, item.size].filter(Boolean).join(" / ") || null,
      ].filter(Boolean).join(" · ");
      lines.push(`${index + 1}. ${item.product_name} — ${details}`);
    });
  }

  const notes = [trimmed(order.special_instructions), trimmed(address.notes)].filter(Boolean);
  if (notes.length > 0) {
    lines.push("", "— הערות —", ...notes);
  }

  return lines.filter((line): line is string => line !== null).join("\n");
};

/**
 * Turns a number as a person writes it into the digits-only international form
 * wa.me needs. Israeli local numbers ("050-123-4567") become 972501234567.
 * Returns null when the result could not be a phone number, so the caller can
 * refuse to open a chat with the wrong party rather than guess.
 */
export const normalizeWhatsAppPhone = (input: string | null | undefined): string | null => {
  const raw = trimmed(input);
  if (!raw) return null;

  const hasPlus = raw.startsWith("+");
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (!hasPlus) {
    if (digits.startsWith("00")) {
      digits = digits.slice(2);
    } else if (digits.startsWith("0")) {
      // A leading zero is the Israeli trunk prefix; it is dropped, not dialled.
      digits = `972${digits.slice(1)}`;
    }
  }

  // E.164 allows up to 15 digits; anything under 8 cannot be a real number.
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
};

export const buildWhatsAppLink = (phone: string | null | undefined, message: string): string => {
  const normalized = normalizeWhatsAppPhone(phone);
  const text = encodeURIComponent(message);
  // Without a number WhatsApp opens the contact picker, which is the right
  // fallback: the admin chooses who receives it rather than nobody does.
  return normalized ? `https://wa.me/${normalized}?text=${text}` : `https://wa.me/?text=${text}`;
};
