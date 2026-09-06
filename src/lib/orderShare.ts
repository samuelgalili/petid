import { formatShippingAddress, type ShippingAddressFields } from "@/lib/shippingAddress";

export type OrderShareAddress = ShippingAddressFields;

export interface OrderShareItem {
  product_name: string;
  quantity: number;
  size?: string | null;
  variant?: string | null;
}

export interface ShareableOrder {
  order_number: string;
  order_date?: string | null;
  status?: string | null;
  payment_status?: string | null;
  total?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  shipping_address?: OrderShareAddress | null;
  pet_name?: string | null;
  special_instructions?: string | null;
  order_items?: OrderShareItem[];
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "ממתין",
  processing: "באריזה",
  shipped: "נשלח",
  delivered: "נמסר",
  cancelled: "בוטל",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "שולם",
  pending: "ממתין לתשלום",
  failed: "נכשל",
  awaiting_cod: "תשלום במסירה",
  dev_approved: "אושר בסביבת פיתוח",
  refunded: "הוחזר",
  libra_credit: "קרדיט ביטוח",
};

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("he-IL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const formatAddress = (address?: OrderShareAddress | null) => formatShippingAddress(address);

export const formatHebrewOrderShareMessage = (order: ShareableOrder) => {
  const address = order.shipping_address;
  const customerName = order.customer_name || address?.fullName || "לא צוין";
  const customerPhone = order.customer_phone || address?.phone;
  const deliveryAddress = formatAddress(address);
  const orderDate = formatDate(order.order_date);
  const lines = [
    `פרטי הזמנה ${order.order_number}`,
    orderDate ? `תאריך: ${orderDate}` : null,
    order.status ? `סטטוס הזמנה: ${ORDER_STATUS_LABELS[order.status] || order.status}` : null,
    `לקוח/ה: ${customerName}`,
    customerPhone ? `טלפון: ${customerPhone}` : null,
    deliveryAddress ? `כתובת למשלוח: ${deliveryAddress}` : null,
    order.pet_name ? `חיית מחמד: ${order.pet_name}` : null,
    "",
    "פריטים:",
  ];

  if (order.order_items?.length) {
    order.order_items.forEach((item, index) => {
      const details = [item.variant, item.size].filter(Boolean).join(" / ");
      lines.push(
        `${index + 1}. ${item.product_name} — כמות: ${item.quantity}${details ? ` (${details})` : ""}`,
      );
    });
  } else {
    lines.push("לא צוינו פריטים");
  }

  if (typeof order.total === "number" && Number.isFinite(order.total)) {
    lines.push("", `סה״כ: ₪${order.total.toFixed(2)}`);
  }
  if (order.payment_status) {
    lines.push(`מצב תשלום: ${PAYMENT_STATUS_LABELS[order.payment_status] || order.payment_status}`);
  }
  if (order.special_instructions) {
    lines.push("", `הוראות מיוחדות: ${order.special_instructions}`);
  }

  return lines.filter((line): line is string => line !== null).join("\n");
};

export const createOrderShareLinks = (order: ShareableOrder) => {
  const message = formatHebrewOrderShareMessage(order);
  const subject = `הזמנה ${order.order_number} – MIPO`;

  return {
    email: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
  };
};
