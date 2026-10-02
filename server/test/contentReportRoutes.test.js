import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createContentReportRoutes } from "../src/contentReportRoutes.js";
import {
  FixedWindowRateLimiter,
  clientAddressForRateLimit,
  rateLimitIdentity,
} from "../src/security.js";

const reporterId = "11111111-1111-4111-8111-111111111111";
const postId = "22222222-2222-4222-8222-222222222222";

const scriptedPool = (steps) => {
  const calls = [];
  let index = 0;
  return {
    calls,
    query: async (sql, params) => {
      calls.push({ sql, params });
      const step = steps[index];
      index += 1;
      if (!step) throw new Error(`unexpected query: ${sql}`);
      if (step.error) throw step.error;
      return step.result;
    },
  };
};

const capture = () => {
  const response = {
    status: 0,
    body: null,
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers || {};
    },
    end(payload) { this.raw = payload; },
  };
  const sendJson = (res, status, body) => {
    res.writeHead(status);
    res.body = body;
    res.end(JSON.stringify(body));
  };
  return { response, sendJson };
};

const route = (overrides) => createContentReportRoutes({
  pool: scriptedPool([]),
  readBody: async () => ({}),
  requireUser: async () => null,
  enforceRateLimit: () => true,
  emitEvent: () => {},
  sendJson: (res, status, body) => {
    res.writeHead(status);
    res.body = body;
  },
  ...overrides,
});

test("index.js mounts the reports route and no longer inserts reports itself", () => {
  const source = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(source, /if \(await handleContentReportRoute\(request, response, url\)\) return;/);
  assert.doesNotMatch(source, /insert into public\.content_reports/);
  assert.doesNotMatch(source, /content_type \|\| "product"/);
  // Order access may pass a nullable session id. A report must not.
  const withoutOrderAccess = source.replace(/sessionUserId: auth\?\.user\?\.id \|\| null/, "");
  assert.doesNotMatch(withoutOrderAccess, /auth\?\.user\?\.id \|\| null/);
});

test("a path that is not a report is left to the rest of the server", async () => {
  const handler = route({});
  const { response } = capture();
  const handled = await handler(
    { method: "GET" },
    response,
    new URL("http://localhost/api/feed"),
  );
  assert.equal(handled, false);
});

test("a client error is acknowledged and not stored", async () => {
  const pool = scriptedPool([]);
  const limits = [];
  const { response, sendJson } = capture();
  const handler = route({
    pool,
    sendJson,
    readBody: async () => ({ content_type: "client_error", description: "TypeError" }),
    enforceRateLimit: (request, res, scope) => {
      limits.push(scope);
      return true;
    },
  });
  const handled = await handler(
    { method: "POST" },
    response,
    new URL("http://localhost/api/reports"),
  );
  assert.equal(handled, true);
  assert.equal(response.status, 204);
  assert.deepEqual(limits, ["client-error-report"]);
  assert.equal(pool.calls.length, 0);
});

test("a report without a session is rejected before any write", async () => {
  const pool = scriptedPool([]);
  const { response, sendJson } = capture();
  const handler = route({
    pool,
    sendJson,
    readBody: async () => ({ content_type: "post", content_id: postId, reason: "spam" }),
    requireUser: async (request, res) => {
      sendJson(res, 401, { error: "Unauthorized" });
      return null;
    },
  });
  const handled = await handler(
    { method: "POST" },
    response,
    new URL("http://localhost/api/reports"),
  );
  assert.equal(handled, true);
  assert.equal(response.status, 401);
  assert.equal(pool.calls.length, 0);
});

test("a signed-in report is stored with that user and rate limited per user", async () => {
  const pool = scriptedPool([
    { result: { rowCount: 1, rows: [{}] } },
    { result: { rowCount: 0, rows: [] } },
    { result: { rowCount: 1, rows: [] } },
  ]);
  const limits = [];
  const emitted = [];
  const { response, sendJson } = capture();
  const handler = route({
    pool,
    sendJson,
    readBody: async () => ({
      content_type: "post",
      content_id: postId,
      reason: "spam",
      description: "פרסומת",
      reporter_id: "55555555-5555-4555-8555-555555555555",
    }),
    requireUser: async () => ({ user: { id: reporterId } }),
    enforceRateLimit: (request, res, scope, options, identity = "") => {
      limits.push({ scope, identity });
      return true;
    },
    emitEvent: (event) => emitted.push(event),
  });
  const handled = await handler(
    { method: "POST" },
    response,
    new URL("http://localhost/api/reports"),
  );
  assert.equal(handled, true);
  assert.equal(response.status, 201);
  assert.equal(response.body.duplicate, false);
  assert.equal(response.body.report.content_type, "post");
  assert.equal(response.body.report.content_id, postId);
  assert.equal(response.body.report.reporter_id, reporterId);
  assert.deepEqual(limits.map((entry) => entry.scope), ["report-create", "report-create-user"]);
  assert.equal(limits[1].identity, reporterId);
  assert.equal(emitted.length, 1);
  assert.equal(pool.calls[2].params[5], reporterId);
});

test("a rate-limited report stops before authentication lookup writes anything", async () => {
  const pool = scriptedPool([]);
  let lookedUp = false;
  const { response } = capture();
  const handler = route({
    pool,
    readBody: async () => ({ content_type: "post", content_id: postId, reason: "spam" }),
    enforceRateLimit: (request, res) => {
      res.writeHead(429);
      res.end();
      return false;
    },
    requireUser: async () => {
      lookedUp = true;
      return { user: { id: reporterId } };
    },
  });
  const handled = await handler(
    { method: "POST" },
    response,
    new URL("http://localhost/api/reports"),
  );
  assert.equal(handled, true);
  assert.equal(response.status, 429);
  assert.equal(lookedUp, false);
  assert.equal(pool.calls.length, 0);
});

test("a second report of the same content returns the existing row and does not insert", async () => {
  const existingId = "66666666-6666-4666-8666-666666666666";
  const pool = scriptedPool([
    { result: { rowCount: 1, rows: [{}] } },
    { result: { rowCount: 1, rows: [{ id: existingId }] } },
  ]);
  const emitted = [];
  const { response, sendJson } = capture();
  const handler = route({
    pool,
    sendJson,
    readBody: async () => ({ content_type: "post", content_id: postId, reason: "spam" }),
    requireUser: async () => ({ user: { id: reporterId } }),
    emitEvent: (event) => emitted.push(event),
  });
  const handled = await handler(
    { method: "POST" },
    response,
    new URL("http://localhost/api/reports"),
  );
  assert.equal(handled, true);
  assert.equal(response.status, 200);
  assert.equal(response.body.duplicate, true);
  assert.equal(response.body.report.id, existingId);
  assert.equal(pool.calls.some((call) => /insert into/i.test(call.sql)), false);
  assert.equal(emitted.length, 0);
});

test("a report of content that does not exist is rejected and nothing is inserted", async () => {
  const pool = scriptedPool([
    { result: { rowCount: 0, rows: [] } },
  ]);
  const { response, sendJson } = capture();
  const handler = route({
    pool,
    sendJson,
    readBody: async () => ({ content_type: "post", content_id: postId, reason: "spam" }),
    requireUser: async () => ({ user: { id: reporterId } }),
  });
  await assert.rejects(
    () => handler(
      { method: "POST" },
      response,
      new URL("http://localhost/api/reports"),
    ),
    (error) => error.statusCode === 404 && /not found/i.test(error.message),
  );
  assert.equal(pool.calls.some((call) => /insert into/i.test(call.sql)), false);
});

const reportTable = () => {
  const rows = [];
  return {
    rows,
    async query(sql, params) {
      const compact = sql.replace(/\s+/g, " ").trim();
      if (/^select 1\b/i.test(compact)) return { rowCount: 1, rows: [{}] };
      if (/^select id\b/i.test(compact)) {
        const found = rows.find((row) => (
          row.content_type === params[0]
          && row.content_id === params[1]
          && row.reporter_id === params[2]
        ));
        return { rowCount: found ? 1 : 0, rows: found ? [{ id: found.id }] : [] };
      }
      if (/^insert into public\.content_reports/i.test(compact)) {
        const key = `${params[5]}|${params[1]}|${params[2]}`;
        if (rows.some((row) => row.key === key)) {
          throw Object.assign(new Error("duplicate key"), { code: "23505" });
        }
        rows.push({
          key,
          id: params[0],
          content_type: params[1],
          content_id: params[2],
          reporter_id: params[5],
        });
        return { rowCount: 1, rows: [] };
      }
      throw new Error(`unexpected query: ${compact}`);
    },
  };
};

const installLimiter = () => {
  const limiter = new FixedWindowRateLimiter();
  const enforceRateLimit = (request, response, scope, options, identity = "") => {
    const identifier = identity
      ? rateLimitIdentity(identity)
      : clientAddressForRateLimit(request.headers?.["x-forwarded-for"], request.socket?.remoteAddress);
    const result = limiter.check(`${scope}:${identifier}`, options);
    if (result.allowed) return true;
    const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
    response.writeHead(429, { "retry-after": String(retryAfter) });
    response.body = { error: "Too many requests" };
    response.end(JSON.stringify(response.body));
    return false;
  };
  return { enforceRateLimit };
};

const requestFrom = (ip) => ({
  method: "POST",
  headers: { "x-forwarded-for": ip },
  socket: { remoteAddress: ip },
});

const postIdFor = (n) => `22222222-2222-4222-8222-${String(n).padStart(12, "2")}`;
const userIdFor = (n) => `11111111-1111-4111-8111-${String(n).padStart(12, "1")}`;

const assertRetryAfter = (response) => {
  assert.match(String(response.headers?.["retry-after"] || ""), /^[1-9]\d*$/);
};

const dispatch = async (handler, request) => {
  const { response, sendJson } = capture();
  try {
    const handled = await handler(request, response, new URL("http://localhost/api/reports"));
    return { handled, response, thrown: null };
  } catch (error) {
    return { handled: true, response, thrown: error };
  }
};

test("reports use the shared limiter, which sends Retry-After, and read at most 16KB", () => {
  const index = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");
  const routes = readFileSync(new URL("../src/contentReportRoutes.js", import.meta.url), "utf8");
  const security = readFileSync(new URL("../src/security.js", import.meta.url), "utf8");
  assert.match(index, /const retryAfter = Math\.max\(1, Math\.ceil\(\(resetAt - Date\.now\(\)\) \/ 1000\)\)/);
  assert.match(index, /"retry-after": String\(retryAfter\)/);
  assert.match(index, /new FixedWindowRateLimiter\(\)/);
  assert.match(index, /clientAddressForRateLimit/);
  assert.match(index, /error\.statusCode \? error\.message : "Internal server error"/);
  assert.match(security, /this\.entries = new Map\(\)/);
  assert.match(routes, /readBody\(request, 16 \* 1024\)/);
  assert.match(routes, /limit: 10/);
  assert.match(routes, /limit: 30/);
  assert.doesNotMatch(routes, /redis/i);
  const clientAt = routes.indexOf('"client-error-report"');
  const ipAt = routes.indexOf('enforceRateLimit(request, response, "report-create"');
  const authAt = routes.indexOf("const auth = await requireUser");
  const userAt = routes.indexOf('enforceRateLimit(request, response, "report-create-user"');
  assert.ok(clientAt > 0 && clientAt < ipAt && ipAt < authAt && authAt < userAt);
});

test("the eleventh report by one user is 429 with Retry-After and no new row", async () => {
  const pool = reportTable();
  const { enforceRateLimit } = installLimiter();
  const emitted = [];
  for (let n = 1; n <= 11; n += 1) {
    const { response, thrown } = await dispatch(route({
      pool,
      readBody: async () => ({ content_type: "post", content_id: postIdFor(n), reason: "spam" }),
      requireUser: async () => ({ user: { id: reporterId, email: "pii-token-9f3a@example.com" } }),
      enforceRateLimit,
      emitEvent: (event) => emitted.push(event),
    }), requestFrom(`203.0.113.${n}`));
    if (n <= 10) {
      assert.equal(thrown, null);
      assert.equal(response.status, 201);
    } else {
      assert.equal(thrown, null);
      assert.equal(response.status, 429);
      assertRetryAfter(response);
      assert.equal(JSON.stringify(response.body).includes("pii-token-9f3a@example.com"), false);
    }
  }
  assert.equal(pool.rows.length, 10);
  assert.equal(emitted.length, 10);
});

test("the eleventh request from one address is 429 before authentication", async () => {
  const pool = reportTable();
  const { enforceRateLimit } = installLimiter();
  let lookups = 0;
  for (let n = 1; n <= 11; n += 1) {
    const { response, thrown } = await dispatch(route({
      pool,
      readBody: async () => ({ content_type: "post", content_id: postId, reason: "spam" }),
      requireUser: async (request, res) => {
        lookups += 1;
        res.writeHead(401);
        res.body = { error: "Authentication is required" };
        res.end();
        return null;
      },
      enforceRateLimit,
    }), requestFrom("198.51.100.20"));
    assert.equal(thrown, null);
    assert.equal(response.status, n <= 10 ? 401 : 429);
    if (n === 11) assertRetryAfter(response);
  }
  assert.equal(lookups, 10);
  assert.equal(pool.rows.length, 0);
});

test("eleven people behind one address share the address bucket", async () => {
  const pool = reportTable();
  const { enforceRateLimit } = installLimiter();
  for (let n = 1; n <= 11; n += 1) {
    const { response, thrown } = await dispatch(route({
      pool,
      readBody: async () => ({ content_type: "post", content_id: postIdFor(n), reason: "other" }),
      requireUser: async () => ({ user: { id: userIdFor(n) } }),
      enforceRateLimit,
      emitEvent: () => {},
    }), requestFrom("198.51.100.40"));
    assert.equal(thrown, null);
    assert.equal(response.status, n <= 10 ? 201 : 429);
    if (n === 11) assertRetryAfter(response);
  }
  assert.equal(pool.rows.length, 10);
});

test("invalid and duplicate reports consume the per-user bucket", async () => {
  const pool = reportTable();
  const { enforceRateLimit } = installLimiter();
  const emitted = [];
  for (let n = 1; n <= 11; n += 1) {
    const { response, thrown } = await dispatch(route({
      pool,
      readBody: async () => (n === 1
        ? { content_type: "post", content_id: postId, reason: "spam", description: "pii-token-9f3a@example.com" }
        : { content_type: "post", content_id: postId, reason: "spam" }),
      requireUser: async () => ({ user: { id: reporterId } }),
      enforceRateLimit,
      emitEvent: (event) => emitted.push(event),
    }), requestFrom(`203.0.113.${n}`));
    if (n === 1) assert.equal(response.status, 201);
    else if (n <= 10) assert.equal(response.status, 200);
    else {
      assert.equal(response.status, 429);
      assertRetryAfter(response);
    }
    assert.equal(thrown, null);
  }
  assert.equal(pool.rows.length, 1);
  assert.equal(emitted.length, 1);

  const invalidPool = reportTable();
  const invalidLimiter = installLimiter();
  for (let n = 1; n <= 11; n += 1) {
    const { response, thrown } = await dispatch(route({
      pool: invalidPool,
      readBody: async () => ({
        content_type: "post",
        content_id: postId,
        reason: "price",
        description: "pii-token-9f3a@example.com",
      }),
      requireUser: async () => ({ user: { id: reporterId } }),
      enforceRateLimit: invalidLimiter.enforceRateLimit,
    }), requestFrom(`198.51.100.${n}`));
    if (n <= 10) {
      assert.equal(thrown?.statusCode, 400);
      assert.equal(String(thrown.message).includes("pii-token-9f3a@example.com"), false);
    } else {
      assert.equal(thrown, null);
      assert.equal(response.status, 429);
      assertRetryAfter(response);
    }
  }
  assert.equal(invalidPool.rows.length, 0);
});

test("client errors have their own bucket and do not block content reports", async () => {
  const pool = reportTable();
  const { enforceRateLimit } = installLimiter();
  const handlerFor = (body) => route({
    pool,
    readBody: async () => body,
    requireUser: async () => ({ user: { id: reporterId } }),
    enforceRateLimit,
    emitEvent: () => {},
  });
  for (let n = 1; n <= 30; n += 1) {
    const { response, thrown } = await dispatch(
      handlerFor({ content_type: "client_error", description: "TypeError pii-token-9f3a@example.com" }),
      requestFrom("203.0.113.50"),
    );
    assert.equal(thrown, null);
    assert.equal(response.status, 204);
  }
  const stillOpen = await dispatch(
    handlerFor({ content_type: "post", content_id: postIdFor(1), reason: "spam" }),
    requestFrom("203.0.113.50"),
  );
  assert.equal(stillOpen.response.status, 201);
  const blockedTelemetry = await dispatch(
    handlerFor({ content_type: "client_error", description: "again" }),
    requestFrom("203.0.113.50"),
  );
  assert.equal(blockedTelemetry.response.status, 429);
  assertRetryAfter(blockedTelemetry.response);
  const secondReport = await dispatch(
    handlerFor({ content_type: "post", content_id: postIdFor(2), reason: "other" }),
    requestFrom("203.0.113.51"),
  );
  assert.equal(secondReport.response.status, 201);
  assert.equal(pool.rows.length, 2);
});

test("malformed bodies, including json null, are 400 and never 500", async () => {
  const malformed = [
    null,
    0,
    1,
    true,
    false,
    "post",
    "",
    [],
    ["post"],
    { content_type: "nope", description: "pii-token-9f3a@example.com" },
    { content_type: "post" },
    { content_type: "post", content_id: "nope", reason: "spam" },
    { content_type: "post", content_id: 123, reason: "spam" },
    { content_type: "post", content_id: null, reason: "spam" },
    { content_type: "post", content_id: { id: postId }, reason: "spam" },
    { content_type: "post", content_id: postId, reason: "price" },
    { content_type: "post", content_id: postId, reason: "Spam" },
    { content_type: "post", content_id: postId, reason: "" },
    { content_type: "post", content_id: postId, reason: null },
    { content_type: "post", content_id: postId, reason: ["spam"] },
    { content_type: "post", content_id: postId, reason: "spam", description: "x".repeat(501) },
    { content_type: "post", content_id: postId, reason: "spam", description: { text: "pii-token-9f3a@example.com" } },
    { content_type: "comment", content_id: "33333333-3333-4333-8333-333333333333", reason: "price" },
    { content_type: "product", content_id: "44444444-4444-4444-8444-444444444444", reason: "person" },
    { content_type: "user", content_id: postId, reason: "spam" },
  ];
  assert.ok(malformed.length >= 20);
  const logs = [];
  const original = console.error;
  console.error = (...args) => logs.push(args.map(String).join(" "));
  const allowed = new Set([400, 401, 404, 413, 429]);
  try {
    for (const body of malformed) {
      const pool = reportTable();
      const { response, thrown } = await dispatch(route({
        pool,
        readBody: async () => body,
        requireUser: async () => ({ user: { id: reporterId, email: "pii-token-9f3a@example.com" } }),
      }), requestFrom("203.0.113.60"));
      const status = thrown ? (thrown.statusCode || 500) : response.status;
      assert.equal(allowed.has(status), true, `status ${status} for ${JSON.stringify(body)}`);
      assert.notEqual(status, 500);
      assert.equal(pool.rows.length, 0);
      if (thrown) assert.equal(String(thrown.message).includes("pii-token-9f3a@example.com"), false);
    }

    const broken = await dispatch(route({
      readBody: async () => {
        throw Object.assign(new Error("Invalid JSON"), { statusCode: 400 });
      },
    }), requestFrom("203.0.113.61"));
    assert.equal(broken.thrown?.statusCode, 400);

    const oversized = await dispatch(route({
      readBody: async () => {
        throw Object.assign(new Error("Request body too large"), { statusCode: 413 });
      },
    }), requestFrom("203.0.113.62"));
    assert.equal(oversized.thrown?.statusCode, 413);
  } finally {
    console.error = original;
  }
  assert.equal(logs.join("\n").includes("pii-token-9f3a@example.com"), false);
});

test("a database failure is left for the server handler and is not logged with the note", async () => {
  const logs = [];
  const original = console.error;
  console.error = (...args) => logs.push(args.map(String).join(" "));
  try {
    const { thrown } = await dispatch(route({
      pool: scriptedPool([{ error: new Error("connect ECONNREFUSED") }]),
      readBody: async () => ({
        content_type: "post",
        content_id: postId,
        reason: "spam",
        description: "pii-token-9f3a@example.com",
      }),
      requireUser: async () => ({ user: { id: reporterId } }),
    }), requestFrom("203.0.113.70"));
    assert.equal(thrown?.statusCode, undefined);
    const clientMessage = thrown.statusCode ? thrown.message : "Internal server error";
    assert.equal(clientMessage, "Internal server error");
    assert.equal(clientMessage.includes("ECONNREFUSED"), false);
    assert.equal(clientMessage.includes("pii-token-9f3a@example.com"), false);
  } finally {
    console.error = original;
  }
  assert.equal(logs.join("\n").includes("pii-token-9f3a@example.com"), false);
});
