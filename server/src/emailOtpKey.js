/**
 * HMAC key for password-reset and email-verification codes.
 *
 * The admin API key used to be this secret. A leak of that key then forged
 * a valid code for any address. This key is separate: `OTP_HMAC_KEY` when
 * it is set, otherwise a purpose-separated digest of `DATABASE_URL`, which
 * the API already requires to boot. Production therefore needs no new
 * secret. Codes already issued under the old key stop matching and expire
 * on their own.
 *
 * The admin API key is never read here.
 */

import { createHash, createHmac } from "node:crypto";

const PURPOSE = "mipo-email-otp-v1\0";

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string} Empty only when neither a dedicated key nor a database URL is set.
 */
export const otpHmacKey = (env = process.env) => {
  const dedicated = String(env.OTP_HMAC_KEY || "").trim();
  if (dedicated) return dedicated;
  const databaseUrl = String(env.DATABASE_URL || "").trim();
  if (!databaseUrl) return "";
  return createHash("sha256")
    .update(PURPOSE)
    .update(databaseUrl)
    .digest("base64url");
};

const hmacHex = (key, message) => {
  const secret = String(key || "");
  if (!secret) {
    const error = new Error("OTP HMAC key is not configured");
    error.statusCode = 500;
    throw error;
  }
  return createHmac("sha256", secret).update(message).digest("hex");
};

/** Same message the reset codes were hashed with. Only the key changed. */
export const hashPasswordResetOtp = (email, otp, key) => hmacHex(
  key,
  `${normalizeEmail(email)}:${String(otp || "")}`,
);

/** Prefixed so a reset code is not a verification code under the same key. */
export const hashEmailVerificationOtp = (email, otp, key) => hmacHex(
  key,
  `verify:${normalizeEmail(email)}:${String(otp || "")}`,
);
