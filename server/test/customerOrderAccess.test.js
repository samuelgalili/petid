import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { grantsOrderAccess, shouldRequestVerificationAfterOrder } from "../src/customerOrderAccess.js";
import { createOpaqueToken, hashOpaqueToken } from "../src/security.js";
import { signOrderTrackingToken } from "../src/orderTrackingToken.js";

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

const ORDER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORDER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TRACKING_SECRET = "tracking-secret";
const NOW = 1_700_000_000_000;

test("a mail token opens only the order it was signed for, and only as a read", () => {
  const token = signOrderTrackingToken({ id: ORDER_A }, TRACKING_SECRET, NOW);
  const orderA = { id: ORDER_A, user_id: null, accessTokenHash: null };
  const shared = { accessToken: token, trackingSecret: TRACKING_SECRET, now: NOW };

  assert.equal(grantsOrderAccess({ ...shared, order: orderA, allowTrackingToken: true }), true);
  assert.equal(grantsOrderAccess({ ...shared, order: { ...orderA, id: ORDER_B }, allowTrackingToken: true }), false);
  assert.equal(grantsOrderAccess({ ...shared, order: orderA, allowTrackingToken: false }), false);
  assert.equal(grantsOrderAccess({
    ...shared,
    order: orderA,
    trackingSecret: "other-secret",
    allowTrackingToken: true,
  }), false);
});

test("the checkout guest token still opens the order when the mail token is not accepted", () => {
  const guestToken = createOpaqueToken();
  assert.equal(grantsOrderAccess({
    order: { id: ORDER_A, user_id: null, accessTokenHash: hashOpaqueToken(guestToken) },
    accessToken: guestToken,
    trackingSecret: TRACKING_SECRET,
    allowTrackingToken: false,
  }), true);
});

test("the buyer session opens the order, and somebody else's session does not", () => {
  const order = { id: ORDER_A, user_id: "user-1", accessTokenHash: null };
  assert.equal(grantsOrderAccess({ sessionUserId: "user-1", order }), true);
  assert.equal(grantsOrderAccess({ sessionUserId: "user-2", order }), false);
  assert.equal(grantsOrderAccess({ sessionUserId: null, order }), false);
});

test("the mail token is accepted on the order read and not when a payment is started", () => {
  const source = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  const accessStart = source.indexOf("const canAccessOrder = async");
  const accessEnd = source.indexOf("const updateOrder = async", accessStart);
  const access = source.slice(accessStart, accessEnd);
  assert.match(access, /grantsOrderAccess\(/);
  assert.match(access, /allowTrackingToken: options\.allowTrackingToken === true/);
  assert.match(access, /orderTrackingSecret\(\)/);
  assert.equal(access.includes("adminApiKey"), false);

  const paymentStart = source.indexOf("const createShopPayment = async");
  const paymentEnd = source.indexOf("const releaseReservation = async", paymentStart);
  const payment = source.slice(paymentStart, paymentEnd);
  assert.match(payment, /canAccessOrder\(request, order, accessToken\)/);
  assert.equal(payment.includes("allowTrackingToken"), false);

  const readAt = source.indexOf('const accessToken = url.searchParams.get("access_token")');
  const read = source.slice(readAt, readAt + 500);
  assert.match(read, /allowTrackingToken: true/);
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
