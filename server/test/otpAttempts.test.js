import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { OTP_ATTEMPT_LIMIT, decideOtpIssue, otpAttemptWindowMs, otpSubmissionBlocked } from "../src/otpAttempts.js";
import { PASSWORD_RESET_NEUTRAL_MESSAGE, passwordResetAcknowledgement } from "../src/passwordResetAck.js";

const windowMs = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-10-02T12:00:00.000Z");
const source = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");

const sliceBetween = (startNeedle, endNeedle) => {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle);
  assert.ok(start >= 0, `missing ${startNeedle}`);
  assert.ok(end > start, `missing ${endNeedle} after ${startNeedle}`);
  return source.slice(start, end);
};

test("requesting another code keeps the guesses already spent", () => {
  const row = { attempts: 4, used: false, updated_at: new Date(now - 60_000) };
  assert.deepEqual(decideOtpIssue(row, now, windowMs), { locked: false, attempts: 4 });
});

test("five wrong codes lock the address, and the lock ends with the window", () => {
  const locked = { attempts: OTP_ATTEMPT_LIMIT, used: false, updated_at: new Date(now - windowMs + 1) };
  assert.deepEqual(decideOtpIssue(locked, now, windowMs), { locked: true, attempts: OTP_ATTEMPT_LIMIT });

  const expired = { attempts: OTP_ATTEMPT_LIMIT, used: false, updated_at: new Date(now - windowMs) };
  assert.deepEqual(decideOtpIssue(expired, now, windowMs), { locked: false, attempts: 0 });
});

test("a code that was accepted starts the next one at zero", () => {
  const row = { attempts: OTP_ATTEMPT_LIMIT, used: true, updated_at: new Date(now - 1000) };
  assert.deepEqual(decideOtpIssue(row, now, windowMs), { locked: false, attempts: 0 });
});

test("an address with no code yet is not locked", () => {
  assert.deepEqual(decideOtpIssue(undefined, now, windowMs), { locked: false, attempts: 0 });
  assert.deepEqual(
    decideOtpIssue({ attempts: 0, used: false, updated_at: new Date(now - 1000) }, now, windowMs),
    { locked: false, attempts: 0 },
  );
});

test("the lockout window defaults to 24 hours and ignores an unsafe setting", () => {
  assert.equal(otpAttemptWindowMs(undefined), windowMs);
  assert.equal(otpAttemptWindowMs(""), windowMs);
  assert.equal(otpAttemptWindowMs("0"), windowMs);
  assert.equal(otpAttemptWindowMs("9999"), windowMs);
  assert.equal(otpAttemptWindowMs("12"), 12 * 60 * 60 * 1000);
});

test("verification and password reset both keep the counter across a new code", () => {
  const holder = sliceBetween("const withOtpDecision", "const issueEmailVerification");
  assert.match(holder, /decideOtpIssue\(/);

  for (const [start, end] of [
    ["const issueEmailVerification", "const confirmEmailVerification"],
    ["const requestPasswordReset", "const confirmPasswordReset"],
  ]) {
    const block = sliceBetween(start, end);
    assert.match(block, /withOtpDecision\(/);
    assert.match(block, /attempts = excluded\.attempts/);
    assert.match(block, /for update/);
    assert.doesNotMatch(block, /attempts = 0,/);
  }

  const confirmVerification = sliceBetween("const confirmEmailVerification", "const requestPasswordReset");
  const confirmReset = sliceBetween("const confirmPasswordReset", "const logoutUser");
  for (const block of [confirmVerification, confirmReset]) {
    const blockedAt = block.indexOf("otpSubmissionBlocked(row)");
    const expiredAt = block.indexOf("row.expires_at");
    assert.ok(blockedAt >= 0, "confirm must reject a locked address");
    assert.ok(expiredAt > blockedAt, "the lock is checked before the code expiry");
  }
});

test("a wrong code on a locked address stays a 429 for the whole lock window", () => {
  const tenMinutes = 10 * 60 * 1000;
  const expiredCode = {
    attempts: OTP_ATTEMPT_LIMIT,
    used: false,
    updated_at: new Date(now - tenMinutes - 5_000),
    expires_at: new Date(now - 5_000),
  };
  assert.equal(otpSubmissionBlocked(expiredCode, now, windowMs), true);
  assert.equal(otpSubmissionBlocked({
    attempts: OTP_ATTEMPT_LIMIT,
    used: false,
    updated_at: new Date(now - windowMs + 1),
  }, now, windowMs), true);
  assert.equal(otpSubmissionBlocked({
    attempts: OTP_ATTEMPT_LIMIT,
    used: false,
    updated_at: new Date(now - windowMs),
  }, now, windowMs), false);
  assert.equal(otpSubmissionBlocked(undefined, now, windowMs), false);
});

test("a locked reset and an unknown address share one neutral acknowledgement", () => {
  const unknown = passwordResetAcknowledgement({ emailDelivery: "sent", production: true });
  const locked = passwordResetAcknowledgement({ emailDelivery: "sent", production: true });
  assert.deepEqual(unknown, locked);
  assert.equal(unknown.ok, true);
  assert.equal(unknown.message, PASSWORD_RESET_NEUTRAL_MESSAGE);
  assert.equal(unknown.message, "If an account exists for this address, a code will be sent");
  assert.equal(unknown.email_delivery, "sent");
  assert.equal(Object.hasOwn(unknown, "debug_otp"), false);

  const mailed = passwordResetAcknowledgement({
    emailDelivery: "sent",
    debugOtp: "123456",
    production: false,
  });
  assert.equal(mailed.message, unknown.message);

  const block = sliceBetween("const requestPasswordReset", "const confirmPasswordReset");
  assert.equal(block.match(/passwordResetAcknowledgement\(/g).length, 1);
  assert.ok(block.indexOf("passwordResetAcknowledgement(") > block.lastIndexOf("issued.locked"));
  assert.doesNotMatch(block, /locked:\s*true/);
  const ui = readFileSync(new URL("../../src/pages/ForgotPassword.tsx", import.meta.url), "utf8");
  const copy = readFileSync(new URL("../../src/lib/userFacingErrors.ts", import.meta.url), "utf8");
  assert.match(ui, /PASSWORD_RESET_NEUTRAL_TEXT/);
  assert.doesNotMatch(ui, /קוד אימות נשלח לאימייל שלך/);
  assert.match(copy, /אם הכתובת קיימת במערכת, יישלח אליה קוד\./);
  assert.match(copy, /"Too many invalid reset attempts": "יותר מדי ניסיונות שגויים לאיפוס/);
  assert.match(copy, /"Invalid or expired reset code": "הקוד שגוי או שפג תוקפו\./);
  assert.match(copy, /"Too many requests": "יותר מדי בקשות/);
  const verify = readFileSync(new URL("../../src/pages/VerifyEmail.tsx", import.meta.url), "utf8");
  assert.match(verify, /EMAIL_VERIFICATION_LOCK_TEXT/);
  assert.doesNotMatch(verify, /נסו שוב בעוד כמה דקות/);
  assert.match(copy, /הכתובת נעולה לזמן ארוך/);
  const chat = readFileSync(new URL("../../src/contexts/ChatContext.tsx", import.meta.url), "utf8");
  assert.match(chat, /CHAT_HOURLY_LIMIT_TEXT/);
  assert.match(copy, /הגעתם למגבלת ההודעות לשעה\./);
});
