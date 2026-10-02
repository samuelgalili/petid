// Sensitive admin actions ask for a recent second factor once two-factor is on.
//
// The decision is pure. The Admin OS router is exercised with inert
// dependencies, the same way adminOsRouting.test.js does, so a refusal can be
// seen without a database or a listening socket. index.js itself is not
// imported: importing it starts the server.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { apiKeyMayPerform, apiKeyMaySkipStepUp } from "../src/adminApiKeyPolicy.js";
import { ADMIN_OS_PREFIX, createAdminOsRoutes } from "../src/adminOs/routes.js";
import {
  adminActionNeedsFreshMfa,
  manualOrderNeedsStepUp,
  priceAdjustmentNeedsStepUp,
} from "../src/adminStepUp.js";
import { mfaStepUpIsFresh, sessionClearsAdminMfaGate } from "../src/adminTwoFactor.js";

const PRODUCT = "/api/products/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const COUPON = "/api/admin/coupons/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ORDER = "/api/admin/orders/cccccccc-cccc-4ccc-8ccc-cccccccccccc";

test("with two-factor off a password session still sees the internal catalogue", () => {
  assert.equal(sessionClearsAdminMfaGate({
    enabled: false,
    requireEnrollment: true,
    enrolled: true,
    mfaVerifiedAt: null,
  }), true);
  assert.equal(sessionClearsAdminMfaGate({ enabled: false, enrolled: false }), true);
});

test("a password session that still owes a code does not see the internal catalogue", () => {
  assert.equal(sessionClearsAdminMfaGate({
    enabled: true,
    enrolled: true,
    mfaVerifiedAt: null,
  }), false);
  assert.equal(sessionClearsAdminMfaGate({
    enabled: true,
    requireEnrollment: true,
    enrolled: false,
    mfaVerifiedAt: null,
  }), false);
  assert.equal(sessionClearsAdminMfaGate({
    enabled: true,
    enrolled: true,
    mfaVerifiedAt: "2026-10-02T12:00:00.000Z",
  }), true);
  // Optional enrolment: the panel is open, and so is the internal row.
  assert.equal(sessionClearsAdminMfaGate({
    enabled: true,
    requireEnrollment: false,
    enrolled: false,
    mfaVerifiedAt: null,
  }), true);
});

test("a recent code is fresh, and a missing or future one is not", () => {
  const now = Date.parse("2026-10-02T12:00:00.000Z");
  const windowMs = 15 * 60 * 1000;
  assert.equal(mfaStepUpIsFresh(new Date(now).toISOString(), now, windowMs), true);
  assert.equal(mfaStepUpIsFresh(new Date(now - windowMs).toISOString(), now, windowMs), true);
  assert.equal(mfaStepUpIsFresh(new Date(now - windowMs - 1).toISOString(), now, windowMs), false);
  assert.equal(mfaStepUpIsFresh(null, now, windowMs), false);
  assert.equal(mfaStepUpIsFresh("not-a-date", now, windowMs), false);
  assert.equal(mfaStepUpIsFresh(new Date(now + 1000).toISOString(), now, windowMs), false);
});

test("price adjustment and attested payment are the sensitive halves of a manual order", () => {
  assert.equal(priceAdjustmentNeedsStepUp(undefined), false);
  assert.equal(priceAdjustmentNeedsStepUp(null), false);
  assert.equal(priceAdjustmentNeedsStepUp(0), false);
  assert.equal(priceAdjustmentNeedsStepUp("0"), false);
  assert.equal(priceAdjustmentNeedsStepUp(-10), true);
  assert.equal(priceAdjustmentNeedsStepUp("12.5"), true);
  assert.equal(priceAdjustmentNeedsStepUp("nope"), true);

  assert.equal(manualOrderNeedsStepUp({ payment_method: "credit-card" }), false);
  assert.equal(manualOrderNeedsStepUp({ payment_method: "cash-on-delivery" }), false);
  assert.equal(manualOrderNeedsStepUp({
    payment_method: "admin-attested",
    payment_attestation_note: "ביט",
  }), true);
  assert.equal(manualOrderNeedsStepUp({
    payment_method: "credit-card",
    admin_adjustment: -15,
    admin_adjustment_reason: "לקוח ותיק",
  }), true);
  assert.equal(manualOrderNeedsStepUp(null), true);
  assert.equal(manualOrderNeedsStepUp([]), true);
});

test("the named sensitive actions require a fresh code, and ordinary edits do not", () => {
  const needs = (method, pathname, body) => adminActionNeedsFreshMfa({ method, pathname, body });

  assert.equal(needs("DELETE", PRODUCT), true);
  assert.equal(needs("DELETE", "/api/products/bulk"), true);
  assert.equal(needs("DELETE", `${PRODUCT}?source=manual`), true);
  assert.equal(needs("PATCH", PRODUCT, { price: 10 }), false);
  assert.equal(needs("POST", "/api/products", { name: "חדש" }), false);
  assert.equal(needs("GET", "/api/products"), false);

  assert.equal(needs("POST", "/api/admin/coupons", { code: "A" }), true);
  assert.equal(needs("PATCH", COUPON, { is_active: false }), true);
  assert.equal(needs("DELETE", COUPON), true);
  assert.equal(needs("GET", "/api/admin/coupons"), false);

  assert.equal(needs("PATCH", ORDER, { payment_status: "paid" }), true);
  assert.equal(needs("PATCH", ORDER, { status: "shipped", tracking_number: "1" }), false);
  assert.equal(needs("PATCH", ORDER, null), true);
  assert.equal(needs("PATCH", "/api/admin/orders/bulk", { ids: [], updates: { status: "shipped" } }), false);

  assert.equal(needs("POST", "/api/admin/os/orders", { payment_method: "credit-card", items: [{}] }), false);
  assert.equal(needs("POST", "/api/admin/os/orders", { payment_method: "admin-attested" }), true);
  assert.equal(needs("POST", "/api/admin/os/orders", { admin_adjustment: 5 }), true);

  assert.equal(needs("POST", "/api/admin/os/connectors", { provider: "resend" }), true);
  assert.equal(needs("POST", "/api/admin/os/connectors/disconnect", { provider: "resend" }), true);
  assert.equal(needs("POST", "/api/admin/os/connectors/verify", { provider: "resend" }), false);
  assert.equal(needs("GET", "/api/admin/os/connectors"), false);

  assert.equal(needs("PATCH", "/api/admin/os/customers", { full_name: "דנה" }), true);
  assert.equal(needs("POST", "/api/admin/os/customers", { full_name: "דנה" }), false);
  assert.equal(needs("GET", "/api/admin/customers"), false);
});

test("an allowlisted API key may pass the write gate and still cannot skip step-up", () => {
  assert.equal(apiKeyMayPerform({
    twoFactorEnabled: true,
    method: "DELETE",
    pathname: PRODUCT,
    allowlist: "DELETE /api/products/*",
  }), true);
  assert.equal(apiKeyMayPerform({
    twoFactorEnabled: false,
    method: "DELETE",
    pathname: PRODUCT,
  }), true);
  assert.equal(apiKeyMaySkipStepUp({ twoFactorEnabled: true }), false);
  assert.equal(apiKeyMaySkipStepUp({ twoFactorEnabled: false }), true);
  assert.equal(adminActionNeedsFreshMfa({ method: "DELETE", pathname: PRODUCT }), true);
});

const buildRoutes = (overrides = {}) => createAdminOsRoutes({
  pool: {
    query: async (sql) => {
      // A claim that returns no row is read as a conflict and retried. The
      // inert pool has to look like the insert landed, or the router loops.
      if (String(sql).includes("insert into public.idempotency_keys")) {
        return { rows: [{ id: "claim-1" }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
  },
  sendJson: () => {},
  sendError: () => {},
  readBody: async () => ({}),
  requireAdminPermission: async (request) => {
    request.admin = { id: "admin-1", email: "ops@mipo.pet", mfa_enrolled: true };
    return true;
  },
  logger: { error: () => {} },
  createOrder: async () => ({ order: { id: "o-1" } }),
  ...overrides,
});

const call = (handle, method, path, body) => handle(
  { method, headers: { "idempotency-key": "key-1" }, admin: null },
  {},
  new URL(`https://x${path}`),
);

test("a sensitive Admin OS route fails closed when step-up is not wired", async () => {
  let status = null;
  let handlerRan = false;
  const handle = buildRoutes({
    sendError: (_response, code) => { status = code; },
  });
  const route = handle.routes.find((entry) => entry.method === "PATCH" && entry.path === "customers");
  route.handler = async () => {
    handlerRan = true;
    return { status: 200, body: {} };
  };

  const handled = await call(handle, "PATCH", `${ADMIN_OS_PREFIX}customers`);
  assert.equal(handled, true);
  assert.equal(status, 503);
  assert.equal(handlerRan, false);
});

test("a refused step-up does not run the handler or store a replay", async () => {
  let handlerRan = false;
  let stored = false;
  const handle = buildRoutes({
    requireFreshAdminMfa: async () => false,
    readBody: async () => ({ payment_method: "admin-attested", payment_attestation_note: "ביט", items: [{}] }),
  });
  const route = handle.routes.find((entry) => entry.method === "POST" && entry.path === "orders");
  route.handler = async () => {
    handlerRan = true;
    stored = true;
    return { status: 201, body: { order: { id: "o-1" } } };
  };

  const handled = await call(handle, "POST", `${ADMIN_OS_PREFIX}orders`);
  assert.equal(handled, true);
  assert.equal(handlerRan, false);
  assert.equal(stored, false);
});

test("a manual order that does not mark payment or adjust price does not ask for a code", async () => {
  let asked = false;
  let created = false;
  const handle = buildRoutes({
    requireFreshAdminMfa: async () => {
      asked = true;
      return false;
    },
    readBody: async () => ({ payment_method: "credit-card", items: [{ product_id: "p-1" }] }),
    createOrder: async () => {
      created = true;
      return { order: { id: "o-1" } };
    },
  });

  await call(handle, "POST", `${ADMIN_OS_PREFIX}orders`);
  assert.equal(asked, false);
  assert.equal(created, true);
});

test("connecting a provider asks for a code before the handler", async () => {
  let asked = false;
  let saved = false;
  const handle = buildRoutes({
    requireFreshAdminMfa: async () => {
      asked = true;
      return true;
    },
    readBody: async () => ({ provider: "resend", secret: "not-logged" }),
  });
  const route = handle.routes.find((entry) => entry.method === "POST" && entry.path === "connectors");
  const original = route.handler;
  route.handler = async (...args) => {
    saved = true;
    return original(...args);
  };

  await call(handle, "POST", `${ADMIN_OS_PREFIX}connectors`);
  assert.equal(asked, true);
  assert.equal(saved, true);
});

test("the catalogue and the sensitive routes are wired in the server", () => {
  const source = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.equal(source.includes("sessionClearsAdminMfaGate"), true);
  assert.equal(source.includes("ensureFreshAdminMfa"), true);
  assert.equal(source.includes("requireFreshAdminMfa,"), true);

  const catalogue = source.slice(
    source.indexOf('url.pathname === "/api/products"'),
    source.indexOf('url.pathname === "/api/categories"'),
  );
  assert.match(catalogue, /resolveAdminIdentity/);
  assert.equal(catalogue.includes("requireAdmin"), false);

  const productGet = source.slice(
    source.indexOf("const publicProductMatch"),
    source.indexOf("const publicProductMatch") + 900,
  );
  assert.match(productGet, /resolveAdminIdentity/);

  for (const marker of [
    "deleteProduct(",
    "bulkDeleteProducts(",
    "createAdminCoupon(",
    "updateAdminCoupon(",
    "deleteAdminCoupon(",
    "updateOrder(",
  ]) {
    const at = source.indexOf(marker);
    assert.ok(at > 0, marker);
    const window = source.slice(Math.max(0, at - 500), at);
    assert.match(window, /ensureFreshAdminMfa/, `${marker} is not behind a fresh code`);
  }
});
