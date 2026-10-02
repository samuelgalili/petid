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
import {
  DEFAULT_ADMIN_LOGIN_ACCOUNT_LIMIT,
  DEFAULT_LOGIN_IP_FAILURE_LIMIT,
  DEFAULT_USER_LOGIN_ACCOUNT_LIMIT,
  LOGIN_FAILURE_WINDOW_MS,
  adminLoginLimits,
  userLoginLimits,
} from "../src/loginLimits.js";

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
  const limits = adminLoginLimits({});
  const now = 1_000_000;
  const emailKey = "admin-login-email:admin@example.com";
  const open = (ip) => beginLoginAttempt(limiter, {
    ipKey: `admin-login-ip:${ip}`,
    emailKey,
  }, limits, now);

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
  const limits = adminLoginLimits({});
  const now = 2_000_000;
  const emailKey = "admin-login-email:owner@example.com";
  for (let i = 0; i < DEFAULT_ADMIN_LOGIN_ACCOUNT_LIMIT; i += 1) {
    const gate = beginLoginAttempt(limiter, {
      ipKey: "admin-login-ip:198.51.100.7",
      emailKey,
    }, limits, now);
    assert.equal(gate.allowed, true);
    gate.fail(now);
  }
  assert.equal(beginLoginAttempt(limiter, {
    ipKey: "admin-login-ip:198.51.100.8",
    emailKey,
  }, limits, now).allowed, false);
});

test("a success does not clear failures recorded for the shared address", () => {
  const limiter = new FixedWindowRateLimiter();
  const windowMs = LOGIN_FAILURE_WINDOW_MS;
  const limits = {
    ip: { limit: 8, windowMs },
    account: { limit: 100, windowMs },
  };
  const now = 3_000_000;
  const keys = {
    ipKey: "admin-login-ip:198.51.100.20",
    emailKey: "admin-login-email:owner@example.com",
  };
  for (let i = 0; i < 7; i += 1) {
    const gate = beginLoginAttempt(limiter, keys, limits, now);
    assert.equal(gate.allowed, true);
    gate.fail(now);
  }
  const success = beginLoginAttempt(limiter, keys, limits, now);
  assert.equal(success.allowed, true);
  success.succeed();
  const stillOpen = beginLoginAttempt(limiter, keys, limits, now);
  assert.equal(stillOpen.allowed, true);
  stillOpen.fail(now);
  assert.equal(beginLoginAttempt(limiter, keys, limits, now).allowed, false);
});

test("twenty failures on one account do not lock another account from the same address", () => {
  const limiter = new FixedWindowRateLimiter();
  const limits = userLoginLimits({});
  const now = 4_000_000;
  const ipKey = `user-login-ip:${normalizeClientIp("2001:db8:85a3::10")}`;
  const samePrefix = `user-login-ip:${normalizeClientIp("2001:db8:85a3::ffff")}`;
  const neighbour = `user-login-ip:${normalizeClientIp("2001:db8:85a3:1::10")}`;
  assert.equal(ipKey, samePrefix);
  assert.notEqual(ipKey, neighbour);
  assert.equal(limits.account.limit, DEFAULT_USER_LOGIN_ACCOUNT_LIMIT);
  assert.equal(limits.ip.limit, DEFAULT_LOGIN_IP_FAILURE_LIMIT);
  assert.equal(limits.account.windowMs, LOGIN_FAILURE_WINDOW_MS);

  const lockedAccount = "user-login-email:one@example.com";
  for (let i = 0; i < DEFAULT_USER_LOGIN_ACCOUNT_LIMIT; i += 1) {
    const gate = beginLoginAttempt(limiter, { ipKey, emailKey: lockedAccount }, limits, now);
    assert.equal(gate.allowed, true, `failure ${i + 1} on the first account`);
    gate.fail(now);
  }
  assert.equal(
    beginLoginAttempt(limiter, { ipKey: samePrefix, emailKey: lockedAccount }, limits, now).allowed,
    false,
  );

  const other = beginLoginAttempt(limiter, {
    ipKey: samePrefix,
    emailKey: "user-login-email:two@example.com",
  }, limits, now);
  assert.equal(other.allowed, true);
  other.succeed();
});

test("a correct password works from an address that already has some failures", () => {
  const limiter = new FixedWindowRateLimiter();
  const limits = userLoginLimits({});
  const now = 5_000_000;
  const ipKey = `user-login-ip:${normalizeClientIp("203.0.113.40")}`;
  const owner = "user-login-email:owner@example.com";

  for (let i = 0; i < DEFAULT_USER_LOGIN_ACCOUNT_LIMIT - 1; i += 1) {
    const gate = beginLoginAttempt(limiter, { ipKey, emailKey: owner }, limits, now);
    assert.equal(gate.allowed, true);
    gate.fail(now);
  }
  const correctOnSameAccount = beginLoginAttempt(limiter, { ipKey, emailKey: owner }, limits, now);
  assert.equal(correctOnSameAccount.allowed, true);
  correctOnSameAccount.succeed();

  for (let i = 0; i < 40; i += 1) {
    const gate = beginLoginAttempt(limiter, {
      ipKey,
      emailKey: `user-login-email:other${i}@example.com`,
    }, limits, now);
    assert.equal(gate.allowed, true);
    gate.fail(now);
  }
  const correctOnFreshAccount = beginLoginAttempt(limiter, {
    ipKey,
    emailKey: "user-login-email:fresh@example.com",
  }, limits, now);
  assert.equal(correctOnFreshAccount.allowed, true);
  correctOnFreshAccount.succeed();
});

test("a correct password is refused once the address reaches its lenient cap", () => {
  const limiter = new FixedWindowRateLimiter();
  const limits = userLoginLimits({});
  const now = 6_000_000;
  const ipKey = "user-login-ip:198.51.100.77";
  for (let i = 0; i < DEFAULT_LOGIN_IP_FAILURE_LIMIT; i += 1) {
    const gate = beginLoginAttempt(limiter, {
      ipKey,
      emailKey: `user-login-email:spray${i}@example.com`,
    }, limits, now);
    assert.equal(gate.allowed, true, `address failure ${i + 1}`);
    gate.fail(now);
  }
  assert.equal(beginLoginAttempt(limiter, {
    ipKey,
    emailKey: "user-login-email:correct@example.com",
  }, limits, now).allowed, false);
});

test("an admin account still locks after 8 failures, without locking another admin on that address", () => {
  const limiter = new FixedWindowRateLimiter();
  const limits = adminLoginLimits({});
  assert.equal(limits.account.limit, 8);
  assert.equal(adminLoginLimits({ ADMIN_LOGIN_ACCOUNT_LIMIT: "100" }).account.limit, 8);
  assert.equal(adminLoginLimits({ ADMIN_LOGIN_ACCOUNT_LIMIT: "0" }).account.limit, 8);
  assert.equal(adminLoginLimits({}).account.limit, DEFAULT_ADMIN_LOGIN_ACCOUNT_LIMIT);

  const now = 7_000_000;
  const ipKey = "admin-login-ip:203.0.113.8";
  const admin = "admin-login-email:owner@example.com";
  for (let i = 0; i < 8; i += 1) {
    const gate = beginLoginAttempt(limiter, { ipKey, emailKey: admin }, limits, now);
    assert.equal(gate.allowed, true, `admin failure ${i + 1}`);
    gate.fail(now);
  }
  assert.equal(beginLoginAttempt(limiter, {
    ipKey: "admin-login-ip:203.0.113.9",
    emailKey: admin,
  }, limits, now).allowed, false);

  const otherAdmin = beginLoginAttempt(limiter, {
    ipKey,
    emailKey: "admin-login-email:other@example.com",
  }, limits, now);
  assert.equal(otherAdmin.allowed, true);
  otherAdmin.succeed();
});

test("unsafe login limit overrides keep the safe defaults", () => {
  assert.equal(userLoginLimits({ USER_LOGIN_ACCOUNT_LIMIT: "" }).account.limit, 20);
  assert.equal(userLoginLimits({ USER_LOGIN_ACCOUNT_LIMIT: "50" }).account.limit, 20);
  assert.equal(userLoginLimits({ USER_LOGIN_ACCOUNT_LIMIT: "15" }).account.limit, 15);
  assert.equal(userLoginLimits({ LOGIN_IP_FAILURE_LIMIT: "20" }).ip.limit, 100);
  assert.equal(userLoginLimits({ LOGIN_IP_FAILURE_LIMIT: "nope" }).ip.limit, 100);
  assert.equal(userLoginLimits({ LOGIN_IP_FAILURE_LIMIT: "80" }).ip.limit, 80);
  assert.equal(adminLoginLimits({ ADMIN_LOGIN_ACCOUNT_LIMIT: "4" }).account.limit, 4);
  assert.equal(userLoginLimits({}).ip.windowMs, 15 * 60 * 1000);
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

  const admin = sliceBetween('"/api/admin/login"', '"/api/admin/logout"');
  const user = sliceBetween('"/api/auth/login"', '"/api/auth/email-verification/request"');
  assert.match(admin, /adminLoginLimits\(\)/);
  assert.match(user, /userLoginLimits\(\)/);
  assert.doesNotMatch(admin, /rateLimits\.adminLogin/);
  assert.doesNotMatch(user, /rateLimits\.userLogin/);
  const opener = sliceBetween("const openLoginAttempt", "const rateLimits");
  assert.match(opener, /clientAddressForRateLimit\(/);
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
