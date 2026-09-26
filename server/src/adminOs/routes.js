import { ADMIN_PERMISSIONS } from "../adminPermissions.js";
import { createAuditService } from "./auditService.js";
import { createAdminCustomer } from "./customers.js";
import { adminHome } from "./home.js";
import { createManualOrder } from "./manualOrders.js";
import { updateAdminCustomer } from "./customerEdit.js";
import { disconnectConnector, listConnectors, saveConnector, verifyConnector } from "./connectors.js";
import { createIdempotency, IdempotencyConflict, idempotencyKeyOf } from "./idempotency.js";

/**
 * The Admin OS route boundary.
 *
 * index.js is 9,426 lines and dispatches with a linear if-chain. Admin OS adds
 * on the order of forty endpoints across its phases, and appending them there
 * would make the largest file in the repository considerably larger and its
 * dispatch a longer scan. Porting the whole API to Express would put every
 * existing commercial route's auth and error handling in the blast radius in
 * exchange for ergonomics.
 *
 * productIntakeRoutes.js already demonstrates the middle path in this codebase:
 * a module that takes its dependencies by injection, owns a prefix, and returns
 * `true` when it handled the request. This follows it exactly, with one
 * addition - the routes are a DECLARED TABLE rather than an if-chain, so
 * "which permission does this endpoint require" is a value that can be read
 * and tested rather than a line of code somewhere inside a handler.
 *
 * That table is what server/test/adminOsRouting.test.js asserts over: every
 * route names a permission, and every named permission is one the permission
 * module actually defines. A route that forgets its check cannot be spotted by
 * reading 9,000 lines; it can be spotted by iterating an array.
 */

export const ADMIN_OS_PREFIX = "/api/admin/os/";

export const createAdminOsRoutes = ({
  pool,
  sendJson,
  sendError,
  readBody,
  requireAdminPermission,
  // Injected rather than imported, because it lives in index.js and this
  // module is mounted before it is defined. Passing it also keeps the one
  // function that knows what an order is as the ONLY function that makes one.
  createOrder,
  // Reads whether outbound mail can reach a customer. Injected because it
  // lives in index.js, which this module is mounted from.
  emailState = null,
  logger = console,
}) => {
  const audit = createAuditService({ pool, logger });
  const withIdempotency = createIdempotency({ pool });

  /**
   * Every Admin OS endpoint, with the permission it requires stated as data.
   *
   * `idempotent: true` means the route takes an Idempotency-Key and a replay
   * returns the first response. Phase 1 has no such route yet - it ships the
   * mechanism, and Phase 3's payment and order endpoints are the first users.
   * The flag is declared here now so the routing test's "every mutating route
   * is idempotent" rule exists before the first mutating route does, rather
   * than being written after somebody forgets.
   */
  const routes = [
    {
      method: "GET",
      path: "audit-log",
      permission: ADMIN_PERMISSIONS.AUDIT_READ,
      idempotent: false,
      handler: async (request, response, url) => {
        const q = url.searchParams;
        try {
          const entries = await audit.list({
            actorType: q.get("actor_type"),
            entityType: q.get("entity_type"),
            entityId: q.get("entity_id"),
            actionType: q.get("action_type"),
            from: q.get("from"),
            to: q.get("to"),
            limit: q.get("limit"),
            offset: q.get("offset"),
          });
          sendJson(response, 200, { entries });
        } catch (error) {
          // A bad filter value is the caller's mistake, not a server fault.
          sendError(response, 400, error.message);
        }
      },
    },
  ];

  routes.push({
    method: "GET",
    path: "home",
    // FULL_ACCESS: the strip carries revenue and the queue names customers, so
    // it is not a lighter capability than the screens it summarises.
    permission: ADMIN_PERMISSIONS.FULL_ACCESS,
    idempotent: false,
    handler: async (request, response) => {
      const result = await adminHome({ pool, emailState });
      sendJson(response, result.status, result.body);
    },
  });

  routes.push({
    method: "POST",
    path: "customers",
    // FULL_ACCESS, which is what all four existing customer endpoints require.
    // A narrower CUSTOMERS_WRITE would be more correct and changes the
    // permission matrix for four roles; the owner chose the conservative one
    // for now.
    permission: ADMIN_PERMISSIONS.FULL_ACCESS,
    idempotent: true,
    handler: async (request, response, url, payload) =>
      createAdminCustomer({ pool, audit, admin: request.admin }, payload),
  });

  routes.push({
    method: "PATCH",
    path: "customers",
    // FULL_ACCESS, matching the rest of the customer endpoints. Correcting
    // somebody's contact details is not a smaller capability than reading
    // them: a delivery goes where the address says.
    permission: ADMIN_PERMISSIONS.FULL_ACCESS,
    idempotent: true,
    handler: async (request, response, url, payload) =>
      updateAdminCustomer({ pool, audit, admin: request.admin }, payload),
  });

  routes.push({
    method: "POST",
    path: "orders",
    // FULL_ACCESS, matching manual customer creation. Placing an order for
    // somebody else, and being able to declare it paid, is at least as strong
    // a capability as opening their record.
    permission: ADMIN_PERMISSIONS.FULL_ACCESS,
    // A phone order taken twice is a customer charged twice and a warehouse
    // picking twice, so this needs the same replay protection the customer
    // endpoint has.
    idempotent: true,
    handler: async (request, response, url, payload) =>
      createManualOrder({ createOrder, audit, admin: request.admin }, payload),
  });

  // ─── connectors (Phase 7) ──────────────────────────────────────────────
  //
  // FULL_ACCESS on all four, including the read: the list carries which
  // providers are connected and what a failed verification said, which is
  // operational detail about the platform's own integrations.
  routes.push({
    method: "GET",
    path: "connectors",
    permission: ADMIN_PERMISSIONS.FULL_ACCESS,
    idempotent: false,
    handler: async (request, response) => {
      sendJson(response, 200, { connectors: await listConnectors({ pool }) });
    },
  });

  routes.push({
    method: "POST",
    path: "connectors",
    permission: ADMIN_PERMISSIONS.FULL_ACCESS,
    idempotent: true,
    handler: async (request, response, url, payload) => {
      const connector = await saveConnector(
        { pool, audit, admin: request.admin },
        String(payload?.provider || ""),
        payload,
      );
      return { status: 200, body: { connector } };
    },
  });

  routes.push({
    method: "POST",
    path: "connectors/verify",
    permission: ADMIN_PERMISSIONS.FULL_ACCESS,
    idempotent: false,
    replayIsThePoint:
      "Re-asks the provider whether the key is still good. Replaying a stored "
      + "answer would show a verdict from before the owner fixed the key. The "
      + "write is a status column set to what the provider just said, so "
      + "repeating it converges rather than accumulating.",
    handler: async (request, response) => {
      const payload = await readBody(request);
      const connector = await verifyConnector(
        { pool, audit, admin: request.admin },
        String(payload?.provider || ""),
      );
      sendJson(response, 200, { connector });
    },
  });

  routes.push({
    method: "POST",
    path: "connectors/disconnect",
    permission: ADMIN_PERMISSIONS.FULL_ACCESS,
    idempotent: true,
    handler: async (request, response, url, payload) => {
      const connector = await disconnectConnector(
        { pool, audit, admin: request.admin },
        String(payload?.provider || ""),
      );
      return { status: 200, body: { connector } };
    },
  });

  const byKey = new Map(routes.map((route) => [`${route.method} ${route.path}`, route]));

  const handle = async (request, response, url) => {
    if (!url.pathname.startsWith(ADMIN_OS_PREFIX)) return false;

    const path = url.pathname.slice(ADMIN_OS_PREFIX.length);
    const route = byKey.get(`${request.method} ${path}`);

    if (!route) {
      // Claimed the prefix, so a miss here is a 404 from us rather than a fall
      // through into the if-chain, where an unrelated route might match.
      sendError(response, 404, "Not found");
      return true;
    }

    if (!(await requireAdminPermission(request, response, route.permission))) return true;

    try {
      if (!route.idempotent) {
        await route.handler(request, response, url);
        return true;
      }

      const key = idempotencyKeyOf(request);
      const payload = await readBody(request);
      const result = await withIdempotency(
        {
          scope: `${route.method} ${ADMIN_OS_PREFIX}${route.path}`,
          key,
          payload,
          actorId: request.admin?.id && request.admin.id !== "api-key" ? request.admin.id : null,
        },
        // An idempotent handler RETURNS { status, body } rather than writing
        // the response, because the result has to be stored before it is sent.
        () => route.handler(request, response, url, payload),
      );

      // A replay is answered from the store. The header is there so a caller
      // debugging a "why did nothing happen" can see that nothing was supposed
      // to happen.
      sendJson(response, result.status, result.body, {
        "Idempotency-Replayed": result.replayed ? "true" : "false",
      });
      return true;
    } catch (error) {
      if (error instanceof IdempotencyConflict) {
        sendError(response, error.statusCode, error.message, { code: error.code });
        return true;
      }
      logger.error(`Admin OS ${request.method} ${path} failed:`, error.message);
      sendError(response, error.statusCode || 500, error.statusCode ? error.message : "Internal error");
      return true;
    }
  };

  // Exported for the routing test, which asserts properties over the table
  // rather than over the handlers.
  handle.routes = routes;
  handle.audit = audit;

  return handle;
};
