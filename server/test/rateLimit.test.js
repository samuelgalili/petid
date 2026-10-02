import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  FixedWindowRateLimiter,
  beginLoginAttempt,
  clientAddressForRateLimit,
  normalizeClientIp,
  rateLimitIdentity,
} from "../src/security.js";

const source = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");

const sliceBetween = (startNeedle, endNeedle) => {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle);
  assert.ok(start >= 0, `missing ${startNeedle}`);
  assert.ok(end > start, `missing ${endNeedle} after ${startNeedle}`);
  return source.slice(start, end);
};

test("ipv6 addresses in one /64 share a rate-limit key", () => {
  const prefix = "2001:0db8:85a3:0000/64";
  assert.equal(normalizeClientIp("2001:db8:85a3::8a2e:370:7334"), prefix);
  assert.equal(normalizeClientIp("2001:DB8:85a3:0:ffff:ffff:ffff:ffff"), prefix);
  assert.equal(normalizeClientIp("[2001:db8:85a3::1]"), prefix);
});

test("a neighbouring /64 is a different key", () => {
  assert.notEqual(
    normalizeClientIp("2001:db8:85a3::1"),
    normalizeClientIp("2001:db8:85a3:1::1"),
  );
  assert.equal(normalizeClientIp("2001:db8:85a3:1::1"), "2001:0db8:85a3:0001/64");
});

test("ipv4 and ipv4-mapped ipv6 stay per-address and are not folded into one /64", () => {
  assert.equal(normalizeClientIp("203.0.113.9"), "203.0.113.9");
  assert.equal(normalizeClientIp("::ffff:203.0.113.9"), "203.0.113.9");
  assert.equal(normalizeClientIp("::ffff:203.0.113.10"), "203.0.113.10");
  assert.equal(normalizeClientIp("203.0.113.9:443"), "203.0.113.9");
  assert.notEqual(normalizeClientIp("203.0.113.9"), normalizeClientIp("203.0.113.10"));
});

test("the rate-limit address is the rightmost forwarded hop", () => {
  const key = clientAddressForRateLimit(
    "2001:db8:9:9::1, 2001:db8:85a3::5",
    "203.0.113.1",
  );
  assert.equal(key, "2001:0db8:85a3:0000/64");
  assert.equal(clientAddressForRateLimit(undefined, "::ffff:127.0.0.1"), "127.0.0.1");
  assert.equal(clientAddressForRateLimit("fe80::1%eth0", null), normalizeClientIp("fe80::abcd"));
});

test("an unusable address shares one bucket instead of a fresh key per request", () => {
  assert.equal(clientAddressForRateLimit("", null), "unknown");
  assert.equal(clientAddressForRateLimit("not-an-ip", "10.0.0.1"), "unknown");
});

test("account keys are trimmed, lowercased, and capped at 254 characters", () => {
  assert.equal(rateLimitIdentity(" Admin@Example.com "), "admin@example.com");
  assert.equal(rateLimitIdentity("x".repeat(400)).length, 254);
  assert.equal(rateLimitIdentity("   "), "unknown");
  assert.equal(rateLimitIdentity(null), "unknown");
});

test("peeking at a window does not consume it", () => {
  const limiter = new FixedWindowRateLimiter();
  const options = { limit: 2, windowMs: 1000 };
  for (let i = 0; i < 10; i += 1) {
    assert.equal(limiter.isBlocked("login", options, 10).blocked, false);
  }
  assert.equal(limiter.check("login", options, 10).allowed, true);
  assert.equal(limiter.check("login", options, 10).allowed, true);
  assert.equal(limiter.check("login", options, 10).allowed, false);
});

test("successful logins never fill the lockout, and a success clears account failures", () => {
  const limiter = new FixedWindowRateLimiter();
  const options = { limit: 8, windowMs: 15 * 60 * 1000 };
  const now = 1_000_000;
  const emailKey = "admin-login-email:admin@example.com";
  const open = (ip) => beginLoginAttempt(limiter, {
    ipKey: `admin-login-ip:${ip}`,
    emailKey,
  }, options, now);

  for (let i = 0; i < 20; i += 1) {
    const gate = open("203.0.113.8");
    assert.equal(gate.allowed, true);
    gate.succeed();
  }

  for (let i = 0; i < 7; i += 1) {
    const gate = open("203.0.113.8");
    assert.equal(gate.allowed, true);
    gate.fail(now);
  }
  const recovered = open("203.0.113.8");
  assert.equal(recovered.allowed, true);
  recovered.succeed();

  for (let i = 0; i < 8; i += 1) {
    const gate = open("203.0.113.9");
    assert.equal(gate.allowed, true, `failure ${i + 1} after a successful login`);
    gate.fail(now);
  }
  assert.equal(open("203.0.113.9").allowed, false);
});

test("eight failed logins lock the next one, including from another address", () => {
  const limiter = new FixedWindowRateLimiter();
  const options = { limit: 8, windowMs: 15 * 60 * 1000 };
  const now = 2_000_000;
  const emailKey = "user-login-email:owner@example.com";
  for (let i = 0; i < 8; i += 1) {
    const gate = beginLoginAttempt(limiter, {
      ipKey: "user-login-ip:198.51.100.7",
      emailKey,
    }, options, now);
    assert.equal(gate.allowed, true);
    gate.fail(now);
  }
  assert.equal(beginLoginAttempt(limiter, {
    ipKey: "user-login-ip:198.51.100.8",
    emailKey,
  }, options, now).allowed, false);
});

test("a success does not clear failures recorded for the shared address", () => {
  const limiter = new FixedWindowRateLimiter();
  const options = { limit: 8, windowMs: 15 * 60 * 1000 };
  const now = 3_000_000;
  const keys = {
    ipKey: "admin-login-ip:198.51.100.20",
    emailKey: "admin-login-email:owner@example.com",
  };
  for (let i = 0; i < 7; i += 1) {
    const gate = beginLoginAttempt(limiter, keys, options, now);
    assert.equal(gate.allowed, true);
    gate.fail(now);
  }
  const success = beginLoginAttempt(limiter, keys, options, now);
  assert.equal(success.allowed, true);
  success.succeed();
  const stillOpen = beginLoginAttempt(limiter, keys, options, now);
  assert.equal(stillOpen.allowed, true);
  stillOpen.fail(now);
  assert.equal(beginLoginAttempt(limiter, keys, options, now).allowed, false);
});

test("login routes count a failure only after a rejected password", () => {
  for (const [start, end] of [
    ['"/api/admin/login"', '"/api/admin/logout"'],
    ['"/api/auth/login"', '"/api/auth/email-verification/request"'],
  ]) {
    const block = sliceBetween(start, end);
    assert.match(block, /openLoginAttempt\(/);
    assert.match(block, /gate\.succeed\(\)/);
    assert.match(block, /error\.statusCode === 401\) gate\.fail\(\)/);
    assert.doesNotMatch(block, /enforceRateLimit\(/);
  }
});

test("signup, password reset, verification resend, and chat keep a request limit", () => {
  const signup = sliceBetween('"/api/auth/signup"', '"/api/auth/login"');
  assert.match(signup, /enforceRateLimit\(request, response, "signup-ip", rateLimits\.signup\)/);
  assert.match(signup, /enforceRateLimit\(request, response, "signup-email", rateLimits\.signup/);

  const reset = sliceBetween('"/api/auth/password-reset/request"', '"/api/auth/password-reset/confirm"');
  assert.match(reset, /"password-reset-request-ip"/);
  assert.match(reset, /"password-reset-request-email"/);

  const resend = sliceBetween('"/api/auth/email-verification/request"', '"/api/auth/email-verification/confirm"');
  assert.match(resend, /"email-verification-request-ip"/);
  assert.match(resend, /"email-verification-request-user"/);

  const chat = sliceBetween('"/api/ai/chat"', "const publicPetMatch");
  assert.match(chat, /"ai-chat-ip", rateLimits\.aiChatIp/);
  assert.match(chat, /"ai-chat", rateLimits\.aiChat, auth\.user\.id/);
});
