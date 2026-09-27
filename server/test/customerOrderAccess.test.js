import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { shouldRequestVerificationAfterOrder } from "../src/customerOrderAccess.js";

const unverified = { id: "user-1", email: "new@example.com", email_verified_at: null };
const verified = { id: "user-2", email: "old@example.com", email_verified_at: "2026-09-01T00:00:00.000Z" };

test("an unverified customer is not blocked, and verification is requested after the order", () => {
  assert.equal(shouldRequestVerificationAfterOrder({ currentUser: unverified, placedByAdmin: null }), true);
});

test("a guest has no account to verify", () => {
  assert.equal(shouldRequestVerificationAfterOrder({ currentUser: null, placedByAdmin: null }), false);
});

test("a verified customer is not asked again", () => {
  assert.equal(shouldRequestVerificationAfterOrder({ currentUser: verified, placedByAdmin: null }), false);
});

test("an admin placing the order does not email a verification code mid-call", () => {
  assert.equal(
    shouldRequestVerificationAfterOrder({ currentUser: unverified, placedByAdmin: { id: "admin-1" } }),
    false,
  );
});

test("createOrder no longer refuses an unverified email, and payment checks stay", () => {
  const source = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.equal(
    source.includes("email_verification_required"),
    false,
    "an unverified customer is still refused before a payment session exists",
  );
  assert.match(source, /shouldRequestVerificationAfterOrder/);
  assert.match(source, /The order total changed/);
  assert.match(source, /cardcomWebhookAuthorized/);

  const cardcom = readFileSync(new URL("../src/cardcom.js", import.meta.url), "utf8");
  assert.match(cardcom, /export const cardcomWebhookAuthorized/);
  assert.match(cardcom, /chargedAmountMinor/);
});
