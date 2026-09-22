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

test("every mutating route takes an Idempotency-Key, or says in writing why not", () => {
  // The rule is unchanged: a retried Admin OS write must not cause a second
  // one. What changed is the ONE shape it could not express.
  //
  // `POST connectors/verify` re-asks a provider whether a key is still good.
  // Replaying a stored answer is not safety, it is the opposite: the owner
  // fixes a key, presses check, and is shown the verdict from before the fix.
  // Its write is a status column set to what the provider just said, so
  // repeating it converges rather than accumulating - there is nothing to
  // double.
  //
  // So a route may opt out by declaring `replayIsThePoint` with a reason. The
  // reason is a string this test reads, which makes the exception visible in
  // the route table instead of being a silently missing flag - the shape the
  // original rule was written to prevent.
  for (const route of buildRoutes().routes) {
    if (!MUTATING.has(route.method)) continue;
    if (route.idempotent === true) continue;

    assert.ok(
      typeof route.replayIsThePoint === "string" && route.replayIsThePoint.length > 30,
      `${route.method} ${ADMIN_OS_PREFIX}${route.path} mutates and is not idempotent.\n` +
        "Admin OS endpoints that change state have external or financial effects.\n" +
        "A retried request must not cause a second one. If repetition really is\n" +
        "the feature, say so in `replayIsThePoint` and the exception becomes\n" +
        "readable in the route table.",
    );
  }
});

test("an idempotent route does not also claim replay is the point", () => {
  // Both flags together is a route whose author disagreed with themselves,
  // and the router would honour the first one silently.
  for (const route of buildRoutes().routes) {
    assert.ok(
      !(route.idempotent === true && route.replayIsThePoint),
      `${route.method} ${route.path} is marked idempotent AND claims replay is the point`,
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

// ─── what an idempotent handler has to hand back ─────────────────────────────
//
// THE CONTRACT THAT WAS BROKEN IN PRODUCTION. An idempotent route's result is
// STORED before it is sent, so its handler returns { status, body } instead of
// writing the response itself. The manual order handler returned createOrder's
// own { order, accessToken }, so the dispatcher called sendJson with an
// undefined status and an undefined body: the endpoint answered with nothing,
// and the screen failed on "Cannot read properties of null (reading 'order')"
// after an admin had filled in the entire form.
//
// Nothing caught it. The unit tests called the handler's inner function
// directly and the e2e mocked the route, so neither ever met the dispatcher.
// The shape is a property of the table, so it is asserted over the table.

const idempotentRoutes = () => buildRoutes().routes.filter((route) => route.idempotent);

test("there is at least one idempotent route to check", () => {
  assert.ok(idempotentRoutes().length > 0, "no idempotent routes are declared");
});

test("an idempotent handler returns a response rather than writing one", async () => {
  // Called with a payload each handler can actually complete. A handler that
  // REFUSES the payload throws, which is its own correct behaviour and not
  // what this is about - so a throw is accepted and only a resolved value is
  // held to the shape.
  const routes = createAdminOsRoutes({
    pool: { query: async () => ({ rows: [{ id: "1" }], rowCount: 1 }) },
    sendJson: () => {},
    sendError: () => {},
    readBody: async () => ({}),
    requireAdminPermission: async () => true,
    logger: { error: () => {} },
    createOrder: async () => ({ order: { id: "o-1", order_number: "MP-1" }, accessToken: "t" }),
  }).routes.filter((route) => route.idempotent);

  const request = { admin: { id: "admin-1", email: "ops@mipo.pet" }, headers: {} };
  const payload = {
    full_name: "בדיקה",
    items: [{ product_id: "p-1", quantity: 1 }],
    provider: "runway",
  };

  for (const route of routes) {
    const where = `${route.method} ${ADMIN_OS_PREFIX}${route.path}`;
    let result;
    try {
      result = await route.handler(request, {}, new URL("https://x/api"), payload);
    } catch {
      continue;
    }

    assert.ok(result && typeof result === "object", `${where} resolved to ${result}`);
    assert.equal(typeof result.status, "number", `${where} returned no numeric status`);
    assert.ok("body" in result, `${where} returned no body`);
  }
});

test("the manual order handler answers with the order it created", async () => {
  // The specific failure, stated specifically: the body has to carry the order,
  // because that is what the screen reads to print the warehouse label.
  const route = createAdminOsRoutes({
    pool: { query: async () => ({ rows: [], rowCount: 0 }) },
    sendJson: () => {},
    sendError: () => {},
    readBody: async () => ({}),
    requireAdminPermission: async () => true,
    logger: { error: () => {} },
    createOrder: async () => ({ order: { id: "o-1", order_number: "MP-1" }, accessToken: "secret" }),
  }).routes.find((entry) => entry.method === "POST" && entry.path === "orders");

  assert.ok(route, "the manual order route is gone");

  const result = await route.handler(
    { admin: { id: "admin-1", email: "ops@mipo.pet" }, headers: {} },
    {},
    new URL("https://x/api"),
    { items: [{ product_id: "p-1", quantity: 1 }] },
  );

  assert.equal(result.status, 201);
  assert.equal(result.body.order.order_number, "MP-1");
  // The guest access token is a capability. It has no use on this screen and
  // does not belong in a browser or a log.
  assert.equal(JSON.stringify(result.body).includes("secret"), false, "the access token was handed to the admin screen");
});
