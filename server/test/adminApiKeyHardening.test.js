import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  apiKeyMayPerform,
  apiKeyMaySkipStepUp,
  bootstrapMayResetPassword,
  bootstrapRouteOpen,
  passwordResetDebugEnabled,
} from "../src/adminApiKeyPolicy.js";
import {
  hashEmailVerificationOtp,
  hashPasswordResetOtp,
  otpHmacKey,
} from "../src/emailOtpKey.js";

const DATABASE_URL = "postgres://mipo:db-password@localhost:5432/mipo";

test("the email OTP key is not the admin API key", () => {
  const derived = otpHmacKey({ DATABASE_URL });
  assert.ok(derived.length > 20);
  assert.equal(derived.includes("db-password"), false);
  assert.equal(derived.includes("admin-key-value"), false);
  assert.equal(
    derived,
    otpHmacKey({ DATABASE_URL, ADMIN_API_KEY: "admin-key-value" }),
  );
  assert.equal(otpHmacKey({ ADMIN_API_KEY: "admin-key-value" }), "");
  assert.equal(
    otpHmacKey({
      ADMIN_API_KEY: "admin-key-value",
      DATABASE_URL,
      OTP_HMAC_KEY: "  dedicated-otp  ",
    }),
    "dedicated-otp",
  );
  assert.notEqual(derived, DATABASE_URL);
  assert.notEqual(derived, "admin-key-value");

  const source = readFileSync(new URL("../src/emailOtpKey.js", import.meta.url), "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.equal(code.includes("ADMIN_API_KEY"), false);
  assert.equal(code.includes("console."), false);
});

test("reset and verification hashes follow the key, not an admin credential", () => {
  const derived = otpHmacKey({ DATABASE_URL });
  const dedicated = otpHmacKey({ OTP_HMAC_KEY: "dedicated-otp", DATABASE_URL });
  const reset = hashPasswordResetOtp("Owner@Example.com", "123456", derived);
  assert.equal(reset, hashPasswordResetOtp(" owner@example.com ", "123456", derived));
  assert.notEqual(reset, hashPasswordResetOtp("owner@example.com", "123456", dedicated));
  assert.notEqual(reset, hashPasswordResetOtp("owner@example.com", "123456", "admin-key-value"));
  assert.notEqual(
    reset,
    hashEmailVerificationOtp("owner@example.com", "123456", derived),
  );
  assert.equal(reset.includes("123456"), false);
  assert.equal(reset.includes("db-password"), false);
  assert.throws(() => hashPasswordResetOtp("owner@example.com", "123456", ""), /OTP HMAC key is not configured/);
});

test("PASSWORD_RESET_DEBUG is ignored in production", () => {
  assert.equal(passwordResetDebugEnabled({ NODE_ENV: "production", PASSWORD_RESET_DEBUG: "true" }), false);
  assert.equal(passwordResetDebugEnabled({ NODE_ENV: "production", PASSWORD_RESET_DEBUG: "false" }), false);
  assert.equal(passwordResetDebugEnabled({ NODE_ENV: "development", PASSWORD_RESET_DEBUG: "true" }), true);
  assert.equal(passwordResetDebugEnabled({ NODE_ENV: "test", PASSWORD_RESET_DEBUG: "true" }), true);
  assert.equal(passwordResetDebugEnabled({ PASSWORD_RESET_DEBUG: "true" }), true);
  assert.equal(passwordResetDebugEnabled({ NODE_ENV: "development", PASSWORD_RESET_DEBUG: "false" }), false);
  assert.equal(passwordResetDebugEnabled({ NODE_ENV: "development", PASSWORD_RESET_DEBUG: "TRUE" }), false);
});

test("with two-factor off the admin API key may still call write routes", () => {
  assert.equal(apiKeyMayPerform({
    twoFactorEnabled: false,
    method: "POST",
    pathname: "/api/products",
  }), true);
  assert.equal(apiKeyMayPerform({
    twoFactorEnabled: false,
    method: "PATCH",
    pathname: "/api/products/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  }), true);
  assert.equal(apiKeyMaySkipStepUp({ twoFactorEnabled: false }), true);
});

test("with two-factor on the admin API key is limited to reads unless allowlisted", () => {
  assert.equal(apiKeyMayPerform({
    twoFactorEnabled: true,
    method: "GET",
    pathname: "/api/admin/products/ownership-review",
  }), true);
  assert.equal(apiKeyMayPerform({
    twoFactorEnabled: true,
    method: "HEAD",
    pathname: "/api/db/health",
  }), true);
  assert.equal(apiKeyMayPerform({
    twoFactorEnabled: true,
    method: "POST",
    pathname: "/api/products",
  }), false);
  assert.equal(apiKeyMayPerform({
    twoFactorEnabled: true,
    method: "PATCH",
    pathname: "/api/products/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  }), false);
  assert.equal(apiKeyMayPerform({
    twoFactorEnabled: true,
    method: "DELETE",
    pathname: "/api/products/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  }), false);
  assert.equal(apiKeyMayPerform({
    twoFactorEnabled: true,
    method: "POST",
    pathname: "/api/products",
    allowlist: "GET /api/products",
  }), false);
  assert.equal(apiKeyMayPerform({
    twoFactorEnabled: true,
    method: "POST",
    pathname: "/api/products",
    allowlist: "POST /api/products, DELETE /api/admin/customers",
  }), true);
  assert.equal(apiKeyMayPerform({
    twoFactorEnabled: true,
    method: "PATCH",
    pathname: "/api/products/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    allowlist: "/api/products/*",
  }), true);
  assert.equal(apiKeyMayPerform({
    twoFactorEnabled: true,
    method: "POST",
    pathname: "/api/admin/coupons",
    allowlist: "*",
  }), false);
  assert.equal(apiKeyMayPerform({
    twoFactorEnabled: true,
    method: "POST",
    pathname: "/api/admin/coupons",
    allowlist: "/*",
  }), false);
  assert.equal(apiKeyMaySkipStepUp({ twoFactorEnabled: true }), false);
});

test("production bootstrap cannot reset an existing admin without the one-time flag", () => {
  assert.equal(bootstrapRouteOpen({
    nodeEnv: "production",
    existingAdminCount: 0,
    bootstrapEnabled: "",
  }), true);
  assert.equal(bootstrapMayResetPassword({
    nodeEnv: "production",
    bootstrapEnabled: "",
  }), false);
  assert.equal(bootstrapRouteOpen({
    nodeEnv: "production",
    existingAdminCount: 2,
    bootstrapEnabled: "false",
  }), false);
  assert.equal(bootstrapRouteOpen({
    nodeEnv: "production",
    existingAdminCount: 2,
    bootstrapEnabled: "true",
  }), true);
  assert.equal(bootstrapMayResetPassword({
    nodeEnv: "production",
    bootstrapEnabled: "true",
  }), true);
  assert.equal(bootstrapMayResetPassword({
    nodeEnv: "production",
    bootstrapEnabled: "yes",
  }), true);
  assert.equal(bootstrapRouteOpen({
    nodeEnv: "production",
    existingAdminCount: Number.NaN,
    bootstrapEnabled: "",
  }), false);
  assert.equal(bootstrapRouteOpen({
    nodeEnv: "development",
    existingAdminCount: 4,
    bootstrapEnabled: "",
  }), true);
  assert.equal(bootstrapMayResetPassword({
    nodeEnv: "test",
    bootstrapEnabled: "",
  }), true);
});

test("the API no longer hashes email codes with the admin API key", () => {
  const source = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.equal(/createHmac\([^)]*adminApiKey/.test(source), false);
  assert.equal(source.includes("adminApiKey || databaseUrl"), false);
  assert.equal(source.includes("otpHmacKey"), true);
  assert.equal(source.includes("passwordResetDebugEnabled"), true);
  assert.equal(source.includes("apiKeyMayPerform"), true);
  assert.equal(source.includes("apiKeyMaySkipStepUp"), true);
  assert.equal(source.includes("bootstrapRouteOpen"), true);
  assert.equal(source.includes("bootstrapMayResetPassword"), true);
  assert.match(source, /PASSWORD_RESET_DEBUG must be disabled in production/);
});
