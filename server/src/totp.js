import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// RFC 6238 (TOTP) over RFC 4226 (HOTP). SHA-1 is the algorithm every
// authenticator app implements, and HMAC-SHA1 is not affected by the collision
// attacks that retired SHA-1 for signatures.
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const BASE32_LOOKUP = new Map([...BASE32_ALPHABET].map((character, index) => [character, index]));

export const TOTP_DIGITS = 6;
export const TOTP_PERIOD_SECONDS = 30;
// One step either side: an authenticator whose clock drifts by up to 30 seconds
// still works, and a code stays usable for at most 90 seconds.
export const TOTP_WINDOW_STEPS = 1;
const SECRET_BYTES = 20;

export const base32Encode = (buffer) => {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
};

export const base32Decode = (value) => {
  const normalized = String(value || "").toUpperCase().replace(/[\s-]/g, "").replace(/=+$/, "");
  if (!normalized) return null;

  let bits = 0;
  let accumulator = 0;
  const bytes = [];

  for (const character of normalized) {
    const index = BASE32_LOOKUP.get(character);
    if (index === undefined) return null;
    accumulator = (accumulator << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((accumulator >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  if (bytes.length === 0) return null;
  return Buffer.from(bytes);
};

export const generateTotpSecret = () => base32Encode(randomBytes(SECRET_BYTES));

export const hotp = (secret, counter, digits = TOTP_DIGITS) => {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac("sha1", secret).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);

  return String(binary % 10 ** digits).padStart(digits, "0");
};

export const totpStepFor = (timeMs, periodSeconds = TOTP_PERIOD_SECONDS) =>
  Math.floor(Math.floor(timeMs / 1000) / periodSeconds);

export const totpCodeForStep = (secretBase32, step, { digits = TOTP_DIGITS } = {}) => {
  const secret = base32Decode(secretBase32);
  if (!secret) return null;
  return hotp(secret, step, digits);
};

export const normalizeTotpCode = (value) => String(value || "").replace(/[\s-]/g, "");

const codesEqual = (actual, expected) => {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
};

/**
 * Verifies a TOTP code and returns the step it matched, so the caller can
 * persist it. Steps at or below `lastUsedStep` are refused: a code that was
 * already accepted cannot be replayed inside its own validity window.
 */
export const verifyTotp = (secretBase32, code, {
  now = Date.now(),
  digits = TOTP_DIGITS,
  periodSeconds = TOTP_PERIOD_SECONDS,
  window = TOTP_WINDOW_STEPS,
  lastUsedStep = null,
} = {}) => {
  const normalizedCode = normalizeTotpCode(code);
  if (!new RegExp(`^\\d{${digits}}$`).test(normalizedCode)) {
    return { valid: false, step: null, reason: "malformed_code" };
  }

  const secret = base32Decode(secretBase32);
  if (!secret) return { valid: false, step: null, reason: "malformed_secret" };

  const currentStep = totpStepFor(now, periodSeconds);
  const floor = lastUsedStep === null || lastUsedStep === undefined ? null : Number(lastUsedStep);

  let matchedStep = null;
  for (let offset = -window; offset <= window; offset += 1) {
    const step = currentStep + offset;
    if (step < 0) continue;
    // Compare every candidate step even after a match so verification takes the
    // same time whichever step the code belongs to.
    if (codesEqual(hotp(secret, step, digits), normalizedCode) && matchedStep === null) {
      matchedStep = step;
    }
  }

  if (matchedStep === null) return { valid: false, step: null, reason: "mismatch" };
  if (floor !== null && Number.isFinite(floor) && matchedStep <= floor) {
    return { valid: false, step: matchedStep, reason: "replayed_code" };
  }

  return { valid: true, step: matchedStep, reason: null };
};

export const buildOtpAuthUrl = ({
  secret,
  accountName,
  issuer = "MIPO",
  digits = TOTP_DIGITS,
  periodSeconds = TOTP_PERIOD_SECONDS,
}) => {
  const label = `${issuer}:${accountName}`;
  const params = new URLSearchParams({
    secret: String(secret),
    issuer,
    algorithm: "SHA1",
    digits: String(digits),
    period: String(periodSeconds),
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
};
