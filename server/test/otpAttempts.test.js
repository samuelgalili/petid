import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { OTP_ATTEMPT_LIMIT, decideOtpIssue, otpAttemptWindowMs } from "../src/otpAttempts.js";

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
  assert.match(confirmVerification, /row\.attempts >= OTP_ATTEMPT_LIMIT/);
  assert.match(confirmReset, /row\.attempts >= OTP_ATTEMPT_LIMIT/);
});
