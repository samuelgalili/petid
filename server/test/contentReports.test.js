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
