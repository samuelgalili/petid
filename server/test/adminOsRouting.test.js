// Every Admin OS route declares its permission, as data.
//
// There is no RLS in the active runtime. Authorisation is entirely
// application-level, which means a route that forgets its check is not caught
// by the database, by a type, or by lint - it is a working endpoint that
// anyone with a session can call.
//
// In a 9,426-line if-chain that is unfindable by reading. So Admin OS states
// its routes as a table, and this file asserts properties over the table:
// every route names a permission, every named permission is one the permission
// module actually defines, and every mutating route takes an Idempotency-Key.
//
// The third rule exists before the first mutating route does. Writing it
// afterwards means writing it after somebody has already forgotten.

import assert from "node:assert/strict";
import test from "node:test";

import { ADMIN_PERMISSIONS, isKnownAdminPermission } from "../src/adminPermissions.js";
import { ADMIN_OS_PREFIX, createAdminOsRoutes } from "../src/adminOs/routes.js";

/** A handler built with inert dependencies: this file never touches a socket. */
const buildRoutes = (overrides = {}) => createAdminOsRoutes({
  pool: { query: async () => ({ rows: [], rowCount: 0 }) },
  sendJson: () => {},
  sendError: () => {},
  readBody: async () => ({}),
  requireAdminPermission: async () => true,
  logger: { error: () => {} },
  ...overrides,
});

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

test("the route table is not empty", () => {
  // A table-driven test over an empty table passes every rule below while
  // asserting nothing. This is the self-check.
  assert.ok(buildRoutes().routes.length > 0, "no Admin OS routes are declared");
});

test("every route names a permission the permission module defines", () => {
  for (const route of buildRoutes().routes) {
    const where = `${route.method} ${ADMIN_OS_PREFIX}${route.path}`;
    assert.ok(route.permission, `${where} declares no permission`);
    assert.ok(
      isKnownAdminPermission(route.permission),
      `${where} requires "${route.permission}", which no role can hold.\n` +
        "Since the wildcard was removed, an unknown permission is denied to\n" +
        "EVERYBODY - so this route is not insecure, it is unreachable. Both are\n" +
        "bugs and they look identical from the outside.",
    );
  }
});

test("every mutating route takes an Idempotency-Key", () => {
  for (const route of buildRoutes().routes) {
    if (!MUTATING.has(route.method)) continue;
    assert.equal(
      route.idempotent,
      true,
      `${route.method} ${ADMIN_OS_PREFIX}${route.path} mutates and is not idempotent.\n` +
        "Admin OS endpoints that change state have external or financial effects.\n" +
        "A retried request must not cause a second one.",
    );
  }
});

test("a GET is not marked idempotent, because the flag means something specific", () => {
  // The flag makes the router read the body and consume a key. A GET carrying
  // it would 409 on a second identical read, which is absurd - and would look
  // like a caching bug, not an authorisation bug, so it would take a while.
  for (const route of buildRoutes().routes) {
    if (MUTATING.has(route.method)) continue;
    assert.notEqual(
      route.idempotent,
      true,
      `${route.method} ${route.path} is a read marked idempotent`,
    );
  }
});

test("a permission failure stops the route before its handler runs", async () => {
  let handlerRan = false;
  const routes = buildRoutes({ requireAdminPermission: async () => false });
  routes.routes[0].handler = async () => { handlerRan = true; };

  const handled = await routes(
    { method: routes.routes[0].method, headers: {}, admin: null },
    {},
    new URL(`https://x${ADMIN_OS_PREFIX}${routes.routes[0].path}`),
  );

  assert.equal(handled, true, "the router must still own the response on a refusal");
  assert.equal(handlerRan, false, "the handler ran despite the permission check failing");
});

test("an unknown path under the prefix is a 404 from us, not a fall-through", async () => {
  // Falling through would let the request continue into index.js's if-chain,
  // where a laxer route could match a path that was meant to be an admin one.
  let status = null;
  const routes = buildRoutes({ sendError: (_response, code) => { status = code; } });

  const handled = await routes(
    { method: "GET", headers: {} },
    {},
    new URL(`https://x${ADMIN_OS_PREFIX}does-not-exist`),
  );

  assert.equal(handled, true);
  assert.equal(status, 404);
});

test("a path outside the prefix is not claimed", async () => {
  const handled = await buildRoutes()(
    { method: "GET", headers: {} },
    {},
    new URL("https://x/api/products"),
  );
  assert.equal(handled, false, "the module claimed a request that is not its own");
});

test("the audit log route requires AUDIT_READ specifically", () => {
  // Named rather than derived: this is the one route in Phase 1 and it exposes
  // a platform-wide record of who did what. If it ever silently became
  // PRODUCTS_READ, every seller-scoped readonly admin could read it.
  const route = buildRoutes().routes.find((candidate) => candidate.path === "audit-log");
  assert.ok(route, "the audit-log route is gone");
  assert.equal(route.permission, ADMIN_PERMISSIONS.AUDIT_READ);
});
