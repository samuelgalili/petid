// Seller isolation: the response-shape and write-scope decisions.
//
// These are the decisions that used to be a boolean. `asAdmin ? fullRow :
// publicRow` handed every internal catalogue field - cost_price,
// commission_rate, supplier_id, and every Seller's business_id - to ANY valid
// admin session, with no role or scope test. It was unreachable while all
// admins were platform-wide, which is exactly why it survived review; M1b is
// what makes it reachable.
//
// So the assertions below are mostly about what a Seller-scoped identity does
// NOT receive.

import assert from "node:assert/strict";
import test from "node:test";
import { ADMIN_ROLES } from "../src/adminPermissions.js";
import {
  NO_ACCESS,
  adminProductView,
  mayActOnRow,
  resolveWriteBusinessId,
  sessionSellerScope,
} from "../src/sellerScope.js";

const SELLER_A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const SELLER_B = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";

const identity = (role, businessId = null) => ({
  id: "admin-1", email: "a@example.com", role, business_id: businessId, identity_source: "session",
});

const apiKey = {
  id: "api-key", email: "api-key", role: ADMIN_ROLES.ADMIN,
  business_id: null, identity_source: "api_key",
};

const productOf = (businessId) => ({
  id: "p1", name: "קולר", business_id: businessId,
  cost_price: 20, commission_rate: 0.15, supplier_id: "sup-1",
});

// ─── response shape ──────────────────────────────────────────────────────────

test("an anonymous caller gets the public shape", () => {
  assert.equal(adminProductView(null, productOf(SELLER_A)), "public");
  assert.equal(adminProductView(undefined, productOf(SELLER_A)), "public");
});

test("a platform admin still gets the full row - behaviour unchanged", () => {
  for (const role of [ADMIN_ROLES.ADMIN, ADMIN_ROLES.PRODUCT_MANAGER]) {
    assert.equal(adminProductView(identity(role), productOf(SELLER_A)), "full", role);
    assert.equal(adminProductView(identity(role), productOf(SELLER_B)), "full", role);
  }
});

test("the api-key identity gets the full row and is never Seller-scoped", () => {
  assert.equal(adminProductView(apiKey, productOf(SELLER_A)), "full");
  assert.equal(sessionSellerScope(apiKey), null, "null means unconfined, which is correct for a platform identity");
});

test("a Seller admin gets the full row only for its OWN products", () => {
  const seller = identity(ADMIN_ROLES.SELLER_ADMIN, SELLER_A);
  assert.equal(adminProductView(seller, productOf(SELLER_A)), "full");
  assert.equal(
    adminProductView(seller, productOf(SELLER_B)), "public",
    "this is the leak: another Seller's cost_price, commission_rate and supplier_id",
  );
});

test("a readonly Seller admin is scoped the same way", () => {
  const readonly = identity(ADMIN_ROLES.READONLY_ADMIN, SELLER_A);
  assert.equal(adminProductView(readonly, productOf(SELLER_A)), "full");
  assert.equal(adminProductView(readonly, productOf(SELLER_B)), "public");
});

test("a product with no owner is never shown in full to a Seller admin", () => {
  // Scraped rows carry business_id: null. A Seller must not read internals off
  // a row nobody owns.
  const seller = identity(ADMIN_ROLES.SELLER_ADMIN, SELLER_A);
  assert.equal(adminProductView(seller, productOf(null)), "public");
  assert.equal(adminProductView(seller, { id: "p" }), "public", "no business_id at all");
  assert.equal(adminProductView(seller, null), "public");
});

test("a Seller-scoped identity with no scope sees nothing in full", () => {
  // The database makes this row unrepresentable. The code must not depend on
  // that: treating a missing scope as unrestricted turns the narrowest identity
  // into the widest.
  for (const missing of [null, undefined, ""]) {
    const broken = identity(ADMIN_ROLES.SELLER_ADMIN, missing);
    assert.equal(adminProductView(broken, productOf(SELLER_A)), "public", String(missing));
    assert.equal(adminProductView(broken, productOf(missing)), "public", String(missing));
  }
});

test("an unknown role gets nothing - it must not fall through to platform", () => {
  // The fail-open this catches is written as a negation: `if (!isSellerScoped)
  // return full` reads "not a Seller" as "platform", so any role added without
  // updating these files would receive every internal field and every Seller's
  // rows. Both functions test for platform explicitly instead.
  const rogue = { id: "x", role: "super_admin", business_id: SELLER_A };
  assert.equal(adminProductView(rogue, productOf(SELLER_A)), "public");
  assert.equal(mayActOnRow(rogue, SELLER_A), false);
  assert.equal(
    sessionSellerScope(rogue), NO_ACCESS,
    "null here would mean 'no scope filter', i.e. every Seller's rows",
  );
});

// ─── row-level access for admin routes ───────────────────────────────────────

test("mayActOnRow follows the same rule as the view", () => {
  assert.equal(mayActOnRow(identity(ADMIN_ROLES.ADMIN), SELLER_B), true);
  assert.equal(mayActOnRow(identity(ADMIN_ROLES.SELLER_ADMIN, SELLER_A), SELLER_A), true);
  assert.equal(mayActOnRow(identity(ADMIN_ROLES.SELLER_ADMIN, SELLER_A), SELLER_B), false);
  assert.equal(mayActOnRow(identity(ADMIN_ROLES.SELLER_ADMIN, SELLER_A), null), false);
  assert.equal(mayActOnRow(null, SELLER_A), false);
});

// ─── session scope ───────────────────────────────────────────────────────────

test("sessionSellerScope distinguishes unconfined from no-access", () => {
  assert.equal(sessionSellerScope(identity(ADMIN_ROLES.ADMIN)), null, "platform: unconfined");
  assert.equal(sessionSellerScope(identity(ADMIN_ROLES.SELLER_ADMIN, SELLER_A)), SELLER_A);
  assert.equal(
    sessionSellerScope(identity(ADMIN_ROLES.SELLER_ADMIN, null)), NO_ACCESS,
    "a Seller role without a Seller must not collapse to null, which means unconfined",
  );
  assert.equal(sessionSellerScope(null), NO_ACCESS);
});

// ─── where a write's business_id comes from ──────────────────────────────────

test("a Seller-scoped write always uses the session's Seller", () => {
  const seller = identity(ADMIN_ROLES.SELLER_ADMIN, SELLER_A);
  assert.deepEqual(resolveWriteBusinessId(seller, undefined), { ok: true, businessId: SELLER_A });
  assert.deepEqual(resolveWriteBusinessId(seller, null), { ok: true, businessId: SELLER_A });
  assert.deepEqual(resolveWriteBusinessId(seller, SELLER_A), { ok: true, businessId: SELLER_A });
});

test("a body naming another Seller is refused, not silently overridden", () => {
  const seller = identity(ADMIN_ROLES.SELLER_ADMIN, SELLER_A);
  const result = resolveWriteBusinessId(seller, SELLER_B);
  assert.equal(result.ok, false);
  assert.equal(result.status, 404, "404, not 403: a 403 would confirm the other Seller exists");
  assert.equal(result.attemptedCrossSeller, true, "the attempt must be visible so it can be audited");
});

test("a platform admin must name the Seller - there is no fallback", () => {
  const platform = identity(ADMIN_ROLES.ADMIN);
  const missing = resolveWriteBusinessId(platform, undefined);
  assert.equal(missing.ok, false);
  assert.equal(missing.status, 400);
  assert.match(missing.error, /must name the Seller/);

  assert.deepEqual(resolveWriteBusinessId(platform, SELLER_B), { ok: true, businessId: SELLER_B });
});

test("DEFAULT_BUSINESS_ID is never consulted for a new owner", () => {
  const previous = process.env.DEFAULT_BUSINESS_ID;
  process.env.DEFAULT_BUSINESS_ID = SELLER_B;
  try {
    const result = resolveWriteBusinessId(identity(ADMIN_ROLES.ADMIN), undefined);
    assert.equal(result.ok, false, "the fallback that made legacy ownership unreconstructible");
  } finally {
    if (previous === undefined) delete process.env.DEFAULT_BUSINESS_ID;
    else process.env.DEFAULT_BUSINESS_ID = previous;
  }
});

test("an identity with no usable scope cannot write at all", () => {
  const broken = identity(ADMIN_ROLES.SELLER_ADMIN, null);
  const result = resolveWriteBusinessId(broken, SELLER_A);
  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
});
