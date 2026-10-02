import assert from "node:assert/strict";
import test from "node:test";

import {
  handleContentReport,
  isClientErrorReport,
  normalizeContentReport,
  submitContentReport,
} from "../src/contentReports.js";

const reporterId = "11111111-1111-4111-8111-111111111111";
const postId = "22222222-2222-4222-8222-222222222222";
const commentId = "33333333-3333-4333-8333-333333333333";
const productId = "44444444-4444-4444-8444-444444444444";
const otherReporter = "55555555-5555-4555-8555-555555555555";

const scriptedPool = (steps) => {
  const calls = [];
  let index = 0;
  return {
    calls,
    query: async (sql, params) => {
      calls.push({ sql: sql.replace(/\s+/g, " ").trim(), params });
      const step = steps[index];
      index += 1;
      if (!step) throw new Error(`unexpected query: ${sql}`);
      if (step.error) throw step.error;
      return step.result;
    },
  };
};

test("a client error is not a content report", () => {
  assert.equal(isClientErrorReport({ content_type: "client_error", reason: "error" }), true);
  assert.equal(isClientErrorReport({ content_type: " Client_Error " }), true);
  assert.equal(isClientErrorReport({ content_type: "post" }), false);
});

test("a client error is acknowledged without a database write", async () => {
  const pool = scriptedPool([]);
  const emitted = [];
  const result = await handleContentReport(pool, {
    body: { content_type: "client_error", description: "boom" },
    reporterId: null,
    emit: (event) => emitted.push(event),
  });
  assert.equal(result.status, 204);
  assert.equal(result.body, null);
  assert.equal(pool.calls.length, 0);
  assert.equal(emitted.length, 0);
});

test("content reports require an authenticated reporter", () => {
  assert.throws(
    () => normalizeContentReport({
      content_type: "post",
      content_id: postId,
      reason: "spam",
    }, null),
    (error) => error.statusCode === 401,
  );
});

test("the reporter is the session user, not the body", () => {
  const report = normalizeContentReport({
    content_type: "post",
    content_id: postId,
    reason: "harassment",
    reporter_id: otherReporter,
    description: "  note  ",
  }, reporterId);
  assert.equal(report.reporterId, reporterId);
  assert.equal(report.description, "note");
  assert.equal(report.contentType, "post");
});

test("rejects an unknown target, a bad reason, and a long note", () => {
  assert.throws(
    () => normalizeContentReport({ content_type: "user", content_id: postId, reason: "spam" }, reporterId),
    /content type/i,
  );
  assert.throws(
    () => normalizeContentReport({ content_type: "post", content_id: "nope", reason: "spam" }, reporterId),
    /content id/i,
  );
  assert.throws(
    () => normalizeContentReport({ content_type: "comment", content_id: commentId, reason: "price" }, reporterId),
    /reason/i,
  );
  assert.throws(
    () => normalizeContentReport({
      content_type: "post",
      content_id: postId,
      reason: "other",
      description: "x".repeat(501),
    }, reporterId),
    /500/,
  );
});

test("stores a post report with the session reporter", async () => {
  const pool = scriptedPool([
    { result: { rowCount: 1, rows: [{ "?column?": 1 }] } },
    { result: { rowCount: 0, rows: [] } },
    { result: { rowCount: 1, rows: [] } },
  ]);
  const emitted = [];
  const result = await handleContentReport(pool, {
    body: {
      content_type: "post",
      content_id: postId,
      reason: "person",
      description: "ילד בתמונה",
      reporter_id: otherReporter,
    },
    reporterId,
    emit: async (event) => {
      emitted.push(event);
    },
  });

  assert.equal(result.status, 201);
  assert.equal(result.body.duplicate, false);
  assert.equal(result.body.report.content_type, "post");
  assert.equal(result.body.report.content_id, postId);
  assert.equal(result.body.report.reporter_id, reporterId);
  assert.match(pool.calls[0].sql, /social_posts/);
  assert.deepEqual(pool.calls[0].params, [postId, reporterId]);
  assert.match(pool.calls[2].sql, /insert into public.content_reports/i);
  assert.deepEqual(pool.calls[2].params.slice(1), [
    "post",
    postId,
    "person",
    "ילד בתמונה",
    reporterId,
  ]);
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].type, "content.reported");
  assert.equal(emitted[0].payload.reporter_id, reporterId);
  assert.equal(emitted[0].payload.description, undefined);
});

test("a second report of the same content is not inserted and does not emit again", async () => {
  const existingId = "66666666-6666-4666-8666-666666666666";
  const pool = scriptedPool([
    { result: { rowCount: 1, rows: [{}] } },
    { result: { rowCount: 1, rows: [{ id: existingId }] } },
  ]);
  const emitted = [];
  const result = await handleContentReport(pool, {
    body: { content_type: "comment", content_id: commentId, reason: "spam" },
    reporterId,
    emit: (event) => emitted.push(event),
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.duplicate, true);
  assert.equal(result.body.report.id, existingId);
  assert.equal(result.body.report.content_type, "comment");
  assert.equal(result.body.report.content_id, commentId);
  assert.equal(result.body.report.reporter_id, reporterId);
  assert.equal(pool.calls.some((call) => /insert into/i.test(call.sql)), false);
  assert.equal(emitted.length, 0);
});

test("a unique-index race returns the existing report", async () => {
  const existingId = "77777777-7777-4777-8777-777777777777";
  const pool = scriptedPool([
    { result: { rowCount: 1, rows: [{}] } },
    { result: { rowCount: 0, rows: [] } },
    { error: Object.assign(new Error("duplicate key"), { code: "23505" }) },
    { result: { rowCount: 1, rows: [{ id: existingId }] } },
  ]);
  const stored = await submitContentReport(pool, normalizeContentReport({
    content_type: "post",
    content_id: postId,
    reason: "other",
  }, reporterId));
  assert.equal(stored.duplicate, true);
  assert.equal(stored.id, existingId);
});

test("a missing post is rejected and nothing is inserted", async () => {
  const pool = scriptedPool([
    { result: { rowCount: 0, rows: [] } },
  ]);
  await assert.rejects(
    () => submitContentReport(pool, normalizeContentReport({
      content_type: "post",
      content_id: postId,
      reason: "spam",
    }, reporterId)),
    (error) => error.statusCode === 404,
  );
  assert.equal(pool.calls.length, 1);
});

test("a comment report checks the comment and its visible post", async () => {
  const pool = scriptedPool([
    { result: { rowCount: 1, rows: [{}] } },
    { result: { rowCount: 0, rows: [] } },
    { result: { rowCount: 1, rows: [] } },
  ]);
  await submitContentReport(pool, normalizeContentReport({
    content_type: "comment",
    content_id: commentId,
    reason: "inappropriate",
  }, reporterId));
  assert.match(pool.calls[0].sql, /social_post_comments/);
  assert.match(pool.calls[0].sql, /visibility = 'public'/);
});

test("a product report checks the catalogue row", async () => {
  const pool = scriptedPool([
    { result: { rowCount: 1, rows: [{}] } },
    { result: { rowCount: 0, rows: [] } },
    { result: { rowCount: 1, rows: [] } },
  ]);
  const stored = await submitContentReport(pool, normalizeContentReport({
    content_type: "product",
    content_id: productId,
    reason: "price",
  }, reporterId));
  assert.equal(stored.duplicate, false);
  assert.match(pool.calls[0].sql, /business_products/);
  assert.deepEqual(pool.calls[0].params, [productId]);
});

const memoryPool = ({ visible = true, holdInserts = 0 } = {}) => {
  const rows = [];
  let insertsStarted = 0;
  let releaseInserts = () => {};
  const insertGate = holdInserts > 0
    ? new Promise((resolve) => {
      releaseInserts = resolve;
    })
    : null;
  return {
    rows,
    async query(sql, params) {
      const compact = sql.replace(/\s+/g, " ").trim();
      if (/^select 1\b/i.test(compact)) {
        return { rowCount: visible ? 1 : 0, rows: visible ? [{}] : [] };
      }
      if (/^select id\b/i.test(compact)) {
        const found = rows.find((row) => (
          row.content_type === params[0]
          && row.content_id === params[1]
          && row.reporter_id === params[2]
        ));
        return { rowCount: found ? 1 : 0, rows: found ? [{ id: found.id }] : [] };
      }
      if (/^insert into public\.content_reports/i.test(compact)) {
        insertsStarted += 1;
        if (insertGate && insertsStarted <= holdInserts) {
          if (insertsStarted === holdInserts) releaseInserts();
          await insertGate;
        }
        const key = `${params[5]}|${params[1]}|${params[2]}`;
        if (rows.some((row) => row.key === key)) {
          throw Object.assign(new Error("duplicate key"), { code: "23505" });
        }
        rows.push({
          key,
          id: params[0],
          content_type: params[1],
          content_id: params[2],
          description: params[4],
          reporter_id: params[5],
        });
        return { rowCount: 1, rows: [] };
      }
      throw new Error(`unexpected query: ${compact}`);
    },
  };
};

const publicKeys = (body) => ({
  top: Object.keys(body).sort(),
  report: Object.keys(body.report).sort(),
});

const LEAK = /stack|select\s|insert\s|column |\/server\/|\.js:\d+|pii-token-9f3a@example\.com/i;

test("a note of 500 characters is kept and whitespace becomes null", async () => {
  const note = "א".repeat(500);
  const pool = memoryPool();
  await submitContentReport(pool, normalizeContentReport({
    content_type: "post",
    content_id: postId,
    reason: "other",
    description: note,
  }, reporterId));
  assert.equal(pool.rows[0].description, note);

  const blank = memoryPool();
  await submitContentReport(blank, normalizeContentReport({
    content_type: "comment",
    content_id: commentId,
    reason: "spam",
    description: " \n\t ",
  }, reporterId));
  assert.equal(blank.rows[0].description, null);
});

test("a non-text note is rejected", () => {
  for (const description of [12, true, { text: "note" }, ["note"]]) {
    assert.throws(
      () => normalizeContentReport({
        content_type: "post",
        content_id: postId,
        reason: "spam",
        description,
      }, reporterId),
      (error) => error.statusCode === 400 && /text/i.test(error.message) && !LEAK.test(error.message),
    );
  }
});

test("json null and other non-objects are a 400, not a crash", () => {
  for (const body of [null, 0, 1, true, false, "post", "", [], ["post"]]) {
    assert.throws(
      () => normalizeContentReport(body, reporterId),
      (error) => error.statusCode === 400 && !(error instanceof TypeError) && !LEAK.test(error.message),
    );
  }
});

test("malformed reports never become a server error", async () => {
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
    { content_type: "post", content_id: postId, reason: "spam", description: 12 },
    { content_type: "post", content_id: postId, reason: "spam", description: { text: "pii-token-9f3a@example.com" } },
    { content_type: "comment", content_id: commentId, reason: "price" },
    { content_type: "product", content_id: productId, reason: "harassment" },
    { content_type: "user", content_id: postId, reason: "spam", email: "pii-token-9f3a@example.com" },
    { content_type: "client-error", description: "pii-token-9f3a@example.com" },
    { content_type: ["post"], content_id: postId, reason: "spam" },
    { content_type: "post", content_id: "   ", reason: "spam" },
    { content_type: "post", content_id: "00000000-0000-0000-0000-000000000000", reason: "other" },
  ];
  assert.ok(malformed.length >= 20);
  const logs = [];
  const original = console.error;
  console.error = (...args) => logs.push(args.map(String).join(" "));
  try {
    for (const body of malformed) {
      const pool = memoryPool();
      await assert.rejects(
        () => handleContentReport(pool, { body, reporterId, emit: () => {} }),
        (error) => {
          assert.equal(error.statusCode, 400);
          assert.equal(error instanceof TypeError, false);
          assert.equal(LEAK.test(error.message), false);
          return true;
        },
      );
      assert.equal(pool.rows.length, 0);
    }
  } finally {
    console.error = original;
  }
  assert.equal(logs.join("\n").includes("pii-token-9f3a@example.com"), false);
});

test("missing and hidden targets raise one identical not-found error", async () => {
  const seen = [];
  const pool = {
    async query(sql) {
      seen.push(sql.replace(/\s+/g, " ").trim());
      return { rowCount: 0, rows: [] };
    },
  };
  const bodies = [
    { content_type: "post", content_id: postId, reason: "spam" },
    { content_type: "comment", content_id: commentId, reason: "harassment" },
    { content_type: "product", content_id: productId, reason: "image" },
  ];
  const errors = [];
  for (const body of bodies) {
    try {
      await submitContentReport(pool, normalizeContentReport(body, reporterId));
      assert.fail("expected a not-found error");
    } catch (error) {
      errors.push({ statusCode: error.statusCode, message: error.message });
    }
  }
  assert.deepEqual(errors[0], { statusCode: 404, message: "Content was not found" });
  assert.deepEqual(errors[1], errors[0]);
  assert.deepEqual(errors[2], errors[0]);
  assert.match(seen[0], /social_posts/);
  assert.match(seen[0], /archived = false/);
  assert.match(seen[0], /moderation_status = 'published'/);
  assert.match(seen[0], /visibility = 'public' or post\.user_id = \$2/);
  assert.match(seen[1], /social_post_comments/);
  assert.match(seen[1], /comment\.status = 'published'/);
  assert.match(seen[1], /archived = false/);
  assert.match(seen[1], /moderation_status = 'published'/);
  assert.match(seen[1], /visibility = 'public' or post\.user_id = \$2/);
  assert.equal(LEAK.test(errors[0].message), false);
});

test("a stored report response and event carry identifiers only", async () => {
  const pool = memoryPool();
  const emitted = [];
  const result = await handleContentReport(pool, {
    body: {
      content_type: "post",
      content_id: postId,
      reason: "person",
      description: "pii-token-9f3a@example.com saw 203.0.113.9",
      reporter_id: otherReporter,
      email: "pii-token-9f3a@example.com",
      name: "Dana",
      ip: "203.0.113.9",
    },
    reporterId,
    emit: (event) => emitted.push(event),
  });
  assert.deepEqual(publicKeys(result.body), {
    top: ["duplicate", "report"],
    report: ["content_id", "content_type", "id", "reporter_id"],
  });
  assert.equal(result.body.report.reporter_id, reporterId);
  assert.equal(result.body.report.reporter_id === otherReporter, false);
  const serialized = JSON.stringify({ body: result.body, event: emitted[0] });
  assert.equal(serialized.includes("pii-token-9f3a@example.com"), false);
  assert.equal(serialized.includes("203.0.113.9"), false);
  assert.equal(serialized.includes("Dana"), false);
  assert.equal(serialized.includes(otherReporter), false);
  assert.deepEqual(Object.keys(emitted[0].payload).sort(), [
    "content_id",
    "content_type",
    "reason",
    "reporter_id",
  ]);
  assert.equal(emitted[0].payload.reporter_id, reporterId);
  assert.equal(pool.rows.length, 1);
});

test("five identical reports at once store one row and one event", async () => {
  const pool = memoryPool({ holdInserts: 5 });
  const emitted = [];
  const results = await Promise.all(Array.from({ length: 5 }, () => handleContentReport(pool, {
    body: {
      content_type: "post",
      content_id: postId,
      reason: "spam",
      description: "pii-token-9f3a@example.com",
    },
    reporterId,
    emit: (event) => emitted.push(event),
  })));
  assert.equal(pool.rows.length, 1);
  assert.equal(results.every((result) => result.status === 200 || result.status === 201), true);
  assert.equal(new Set(results.map((result) => result.body.report.id)).size, 1);
  assert.equal(results.filter((result) => result.status === 201).length, 1);
  assert.equal(emitted.length, 1);
  assert.equal(JSON.stringify(emitted[0]).includes("pii-token-9f3a@example.com"), false);
});

test("two people can report the same target", async () => {
  const pool = memoryPool();
  const first = await handleContentReport(pool, {
    body: { content_type: "post", content_id: postId, reason: "spam" },
    reporterId,
    emit: () => {},
  });
  const second = await handleContentReport(pool, {
    body: { content_type: "post", content_id: postId, reason: "harassment" },
    reporterId: otherReporter,
    emit: () => {},
  });
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal(pool.rows.length, 2);
  assert.notEqual(first.body.report.id, second.body.report.id);
});

test("a database failure is not rewritten as a client error", async () => {
  const pool = scriptedPool([
    { error: new Error("connect ECONNREFUSED") },
  ]);
  await assert.rejects(
    () => submitContentReport(pool, normalizeContentReport({
      content_type: "post",
      content_id: postId,
      reason: "spam",
    }, reporterId)),
    (error) => error.statusCode === undefined && /ECONNREFUSED/.test(error.message),
  );
});
