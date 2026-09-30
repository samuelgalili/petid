import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createContentReportRoutes } from "../src/contentReportRoutes.js";

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
    writeHead(status) { this.status = status; },
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
  assert.doesNotMatch(source, /auth\?\.user\?\.id \|\| null/);
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
