/**
 * A read-only link for the order confirmation mail.
 *
 * Checkout already mints a guest token, but only its hash is stored
 * (`orders.access_token_hash`). The plaintext lives in the buyer's browser,
 * so the webhook that sends the mail cannot put that token back on the link.
 * This token is a separate capability: HMAC-signed, bound to one order id,
 * and expired. It is not the guest token and it is not an admin credential.
 *
 * There is no dedicated secret for this in production. `ORDER_TRACKING_SECRET`
 * overrides when it is set. Otherwise the key is a purpose-separated digest of
 * `DATABASE_URL`, which the API already requires to boot. `ADMIN_API_KEY` is
 * never read here: that key authorizes admin routes.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ORDER_TRACKING_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const TOKEN_PREFIX = "ot1";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const normalizeOrderId = (value) => {
  const id = String(value || "").trim().toLowerCase();
  return UUID_PATTERN.test(id) ? id : "";
};

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string} Empty when nothing usable is configured. Callers then omit the token.
 */
export const orderTrackingSecret = (env = process.env) => {
  const dedicated = String(env.ORDER_TRACKING_SECRET || "").trim();
  if (dedicated) return dedicated;
  const databaseUrl = String(env.DATABASE_URL || "").trim();
  if (!databaseUrl) return "";
  return createHash("sha256")
    .update("mipo-order-tracking-v1\0")
    .update(databaseUrl)
    .digest("base64url");
};

/** Empty when the order has no id or no secret is configured. */
export const signOrderTrackingToken = (order, secret, now = Date.now()) => {
  const orderId = normalizeOrderId(order?.id);
  const key = String(secret || "");
  if (!orderId || !key) return "";
  const exp = Math.trunc(now + ORDER_TRACKING_TOKEN_TTL_MS);
  if (!Number.isSafeInteger(exp)) return "";
  const body = `${TOKEN_PREFIX}.${orderId}.${exp}`;
  const sig = createHmac("sha256", key).update(body).digest("base64url");
  return `${body}.${sig}`;
};

/**
 * True only when the signature matches, the token has not expired, and the
 * order id inside it is this order. A token minted for another order fails
 * even when the signature is genuine.
 */
export const verifyOrderTrackingToken = (token, order, secret, now = Date.now()) => {
  const key = String(secret || "");
  if (!key) return false;
  const raw = String(token || "");
  if (!raw || raw.length > 512) return false;
  const parts = raw.split(".");
  if (parts.length !== 4) return false;
  const [prefix, orderId, expText, sig] = parts;
  if (prefix !== TOKEN_PREFIX) return false;
  if (!UUID_PATTERN.test(orderId)) return false;
  if (!/^[0-9]{1,16}$/.test(expText)) return false;
  if (!/^[A-Za-z0-9_-]{43}$/.test(sig)) return false;
  const exp = Number(expText);
  if (!Number.isSafeInteger(exp) || exp <= now) return false;

  const body = `${prefix}.${orderId}.${expText}`;
  const expected = createHmac("sha256", key).update(body).digest("base64url");
  const actualBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) return false;
  if (!timingSafeEqual(actualBuf, expectedBuf)) return false;

  const expectedOrderId = normalizeOrderId(order?.id);
  return Boolean(expectedOrderId) && expectedOrderId === orderId.toLowerCase();
};
