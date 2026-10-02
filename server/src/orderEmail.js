/**
 * The mail a customer gets once a card payment has landed.
 *
 * Password reset and address verification already talk to Resend. This is the
 * same call: same endpoint, same timeout, same redaction when the provider
 * refuses. It does not decide whether the order was paid. The webhook does
 * that, and it only calls here when the paid update changed a row.
 */

import {
  configNamesForProviderStatus,
  emailFailureLogLine,
  redactEmailLog,
  summarizeProviderFailure,
} from "./emailDelivery.js";
import { signOrderTrackingToken } from "./orderTrackingToken.js";

const RESEND_URL = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 15_000;

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const readAddress = (value) => {
  if (!value) return {};
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return {};
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch {
        return {};
      }
    }
    return { address: trimmed };
  }
  return typeof value === "object" ? value : {};
};

const moneyText = (value) => {
  const parsed = Number(value);
  const amount = Number.isFinite(parsed) ? parsed : 0;
  return `₪${Math.abs(amount).toFixed(2)}`;
};

// dir=ltr plus an LTR isolate, so a leading minus stays on the left of the
// amount inside the right-to-left receipt instead of jumping to another row.
const isolateLtr = (text) => `<span dir="ltr">&#x2066;${escapeHtml(text)}&#x2069;</span>`;

const moneyHtml = (value) => isolateLtr(moneyText(value));

const siteOrigin = (appBaseUrl) => {
  try {
    const url = new URL(String(appBaseUrl || "").trim() || "https://mipo.pet");
    if (url.protocol !== "https:" && url.protocol !== "http:") return "https://mipo.pet";
    return url.origin;
  } catch {
    return "https://mipo.pet";
  }
};

/** customer_email, then the address typed at checkout. Empty when neither is usable. */
export const orderConfirmationRecipient = (order) => {
  const direct = String(order?.customer_email || "").trim();
  if (direct.includes("@")) return direct;
  const nested = String(readAddress(order?.shipping_address).email || "").trim();
  if (nested.includes("@")) return nested;
  return "";
};

export const formatShippingAddress = (shippingAddress) => {
  const address = readAddress(shippingAddress);
  const street = [address.address || address.street, address.building].filter(Boolean).join(" ");
  const cityLine = [address.city, address.zipCode || address.zip_code].filter(Boolean).join(", ");
  return [address.fullName || address.full_name, street, cityLine, address.phone]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join("\n");
};

export const orderPageUrl = (order, appBaseUrl, { trackingSecret = "", now = Date.now() } = {}) => {
  const origin = siteOrigin(appBaseUrl);
  const key = String(order?.order_number || order?.id || "").trim();
  if (!key) return `${origin}/order-history`;
  const url = new URL(`${origin}/order-tracking/${encodeURIComponent(key)}`);
  const token = signOrderTrackingToken(order, trackingSecret, now);
  if (token) url.searchParams.set("access_token", token);
  return url.toString();
};

const lineItems = (order) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.map((item) => {
    const quantity = Number(item?.quantity);
    const qty = Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
    const unit = Number(item?.price);
    const line = (Number.isFinite(unit) ? unit : 0) * qty;
    return {
      name: String(item?.product_name || item?.name || "מוצר"),
      quantity: qty,
      line,
    };
  });
};

const summaryRow = (label, valueHtml, { strong = false } = {}) => `
  <tr>
    <td style="padding:8px 0;color:#18181b;${strong ? "font-weight:700;" : ""}">${escapeHtml(label)}</td>
    <td style="padding:8px 0;color:#6C63FF;text-align:left;white-space:nowrap;${strong ? "font-weight:700;" : ""}">${valueHtml}</td>
  </tr>`;

/**
 * Hebrew, right-to-left receipt. The wording follows the unused client
 * template; the totals also show a coupon discount and the shipping line,
 * which that template left out.
 */
export const renderOrderConfirmationHtml = (order, appBaseUrl, options = {}) => {
  const address = readAddress(order?.shipping_address);
  const customerName = String(
    order?.customer_name || address.fullName || address.full_name || "",
  ).trim() || "לקוח";
  const orderNumber = String(order?.order_number || "").trim();
  const coupon = String(order?.coupon_code || "").trim();
  const discount = Number(order?.discount_amount);
  const discountAmount = Number.isFinite(discount) ? discount : 0;
  const shippingAmount = Number(order?.shipping);
  const shipping = Number.isFinite(shippingAmount) ? shippingAmount : 0;
  const pageUrl = orderPageUrl(order, appBaseUrl, options);
  const origin = siteOrigin(appBaseUrl);
  let host = "mipo.pet";
  try {
    host = new URL(origin).host;
  } catch {
    host = "mipo.pet";
  }

  const itemsHtml = lineItems(order).map((item) => summaryRow(
    `${item.name} × ${item.quantity}`,
    moneyHtml(item.line),
  )).join("");

  const discountLabel = coupon ? `הנחה (${coupon})` : "הנחה";
  const discountHtml = discountAmount > 0
    ? summaryRow(discountLabel, isolateLtr(`-${moneyText(discountAmount)}`))
    : "";
  const couponOnlyHtml = coupon && discountAmount <= 0
    ? summaryRow("קופון", escapeHtml(coupon))
    : "";
  const shippingHtml = summaryRow("משלוח", shipping === 0 ? "חינם" : moneyHtml(shipping));
  const totalHtml = summaryRow("סה״כ ששולם", moneyHtml(order?.total), { strong: true });
  const subtotalHtml = summaryRow("סכום ביניים", moneyHtml(order?.subtotal));
  const addressText = formatShippingAddress(order?.shipping_address);
  const addressHtml = addressText
    ? `
      <div style="background:#faf7f4;border:1px solid #e8e0d8;border-radius:12px;padding:16px;margin-top:16px;">
        <strong>כתובת משלוח:</strong>
        <p style="margin:8px 0 0;">${escapeHtml(addressText).replace(/\n/g, "<br>")}</p>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ההזמנה שלך התקבלה</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;color:#18181b;font-family:Arial,sans-serif;">
  <div dir="rtl" style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#ffffff;border-radius:16px;padding:32px;">
      <h1 style="margin:0 0 8px;font-size:24px;text-align:center;color:#18181b;">ההזמנה שלך התקבלה! 🎉</h1>
      <p style="margin:24px 0 0;">שלום ${escapeHtml(customerName)},</p>
      <p style="margin:12px 0 0;">תודה על ההזמנה שלך! התשלום אושר, קיבלנו את ההזמנה ואנחנו מתחילים להכין אותה.</p>
      <table role="presentation" width="100%" style="border-collapse:collapse;background:#faf7f4;border:1px solid #e8e0d8;border-radius:12px;margin-top:24px;">
        <tr>
          <td style="padding:8px 12px;">מספר הזמנה:</td>
          <td style="padding:8px 12px;color:#6C63FF;font-weight:600;text-align:left;">${escapeHtml(orderNumber)}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;">סטטוס:</td>
          <td style="padding:8px 12px;text-align:left;"><span style="display:inline-block;padding:6px 12px;border-radius:20px;background:#dcfce7;color:#166534;font-size:12px;font-weight:600;">שולם</span></td>
        </tr>
      </table>
      <h3 style="margin:24px 0 12px;">פריטים בהזמנה:</h3>
      <table role="presentation" width="100%" style="border-collapse:collapse;background:#faf7f4;border:1px solid #e8e0d8;border-radius:12px;">
        ${itemsHtml}
        ${subtotalHtml}
        ${discountHtml}
        ${couponOnlyHtml}
        ${shippingHtml}
        ${totalHtml}
      </table>
      <p style="margin:8px 0 0;color:#71717a;font-size:12px;">המחירים כוללים מע״מ</p>
      ${addressHtml}
      <div style="text-align:center;margin-top:32px;">
        <a href="${escapeHtml(pageUrl)}" style="display:inline-block;padding:14px 28px;background:#6C63FF;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:600;">צפה בהזמנה</a>
      </div>
      <div style="text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid #e4e4e7;color:#71717a;font-size:12px;">
        <p style="margin:0;">MIPO - המקום לכל מה שחיית המחמד שלך צריכה 🐾</p>
        <p style="margin:8px 0 0;"><a href="${escapeHtml(origin)}" style="color:#6C63FF;">${escapeHtml(host)}</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
};

const postToResend = async (fetchImpl, { apiKey, fromEmail, to, subject, html }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    return await fetchImpl(RESEND_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Sends one confirmation. `transitioned: false` is a repeated webhook: the
 * paid update matched no row, and nothing is sent. A missing address is
 * skipped with no log line. Provider failures are logged without the key,
 * the address, or the tracking token, and returned, not thrown.
 */
export const sendOrderConfirmationEmail = async ({
  transitioned = true,
  order,
  apiKey,
  fromEmail,
  appBaseUrl,
  trackingSecret = "",
  now = Date.now(),
  fetchImpl = globalThis.fetch,
} = {}) => {
  if (transitioned === false) {
    return { sent: false, reason: "not_first_transition" };
  }

  const to = orderConfirmationRecipient(order);
  if (!to) return { sent: false, reason: "missing_email" };

  if (!String(apiKey || "").trim()) {
    console.error("[mipo] order confirmation email was not sent: missing config RESEND_API_KEY");
    return { sent: false, reason: "not_configured" };
  }

  const orderNumber = String(order?.order_number || "").trim();
  const subject = orderNumber
    ? `ההזמנה ${orderNumber} התקבלה - MIPO`
    : "ההזמנה שלך התקבלה - MIPO";
  const html = renderOrderConfirmationHtml(order, appBaseUrl, { trackingSecret, now });

  let response;
  try {
    response = await postToResend(fetchImpl, {
      apiKey,
      fromEmail,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("[mipo] order confirmation email request failed:", redactEmailLog(error?.message));
    return { sent: false, reason: "send_failed" };
  }

  if (!response?.ok) {
    const details = await response?.text?.().catch(() => "") || "";
    const summary = summarizeProviderFailure(response?.status, details);
    const configNames = configNamesForProviderStatus(response?.status, fromEmail);
    console.error(emailFailureLogLine("order confirmation", summary, configNames));
    return { sent: false, reason: "send_failed" };
  }

  return { sent: true, reason: "sent" };
};
