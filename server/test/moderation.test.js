// The moderation queue: open reports, hide, restore, dismiss, block, and a log.
//
// content_reports used to be written and never read. social_posts.moderation_status
// existed and was never changed. These tests pin both: the queue orders a known
// minor first, a hide writes hidden, a restore writes published, and every
// change that lands is handed to the audit service. The feed queries are
// asserted here too, because a hidden post that the feed still selects has
// not been hidden.

import assert from "node:assert/strict";
import test from "node:test";

import { ADMIN_PERMISSIONS } from "../src/adminPermissions.js";
import { createAuditService } from "../src/adminOs/auditService.js";
import {
  authorIsMinor,
  blockReportedUser,
  dismissContentReport,
  hideReportedContent,
  listModerationLog,
  listOpenReports,
  MODERATION_ACTIONS,
  OPEN_REPORTS_SQL,
  restoreHiddenContent,
  unblockUser,
} from "../src/adminOs/moderation.js";
import { createAdminOsRoutes } from "../src/adminOs/routes.js";
import { assertAccountCanPublish, getSocialPost, listSocialComments, listSocialFeed } from "../src/social.js";

const reportId = "11111111-1111-4111-8111-111111111111";
const postId = "22222222-2222-4222-8222-222222222222";
const authorId = "33333333-3333-4333-8333-333333333333";
const otherUserId = "44444444-4444-4444-8444-444444444444";
const viewerId = "55555555-5555-4555-8555-555555555555";
const commentId = "66666666-6666-4666-8666-666666666666";

const ADMIN = {
  id: "77777777-7777-4777-8777-777777777777",
  email: "ops@mipo.pet",
  role: "admin",
};

const scriptedPool = (steps) => {
  const calls = [];
  let index = 0;
  const client = {
    query: async (sql, params) => {
      const compact = String(sql).replace(/\s+/g, " ").trim();
      calls.push({ sql: compact, params });
      if (compact === "begin" || compact === "commit" || compact === "rollback") {
        return { rows: [], rowCount: 0 };
      }
      const step = steps[index];
      index += 1;
      if (!step) throw new Error(`unexpected query: ${compact}`);
      if (step.match && !step.match.test(compact)) {
        throw new Error(`expected ${step.match} but got ${compact}`);
      }
      return step.result;
    },
    release() {},
  };
  return {
    calls,
    pool: { connect: async () => client, query: client.query },
  };
};

const auditing = () => {
  const entries = [];
  return {
    entries,
    audit: { record: async (entry) => { entries.push(entry); } },
  };
};

const postReport = (overrides = {}) => ({
  rows: [{
    id: reportId,
    content_type: "post",
    content_id: postId,
    status: "open",
    reason: "spam",
    post_id: postId,
    post_author_id: authorId,
    post_archived: false,
    post_status: "published",
    comment_id: null,
    comment_author_id: null,
    comment_status: null,
    author_birthdate: "2012-01-01",
    ...overrides,
  }],
  rowCount: 1,
});

test("a known birthdate under 18 is a minor, and an unknown one is not", () => {
  const now = new Date("2026-09-30T12:00:00Z");
  assert.equal(authorIsMinor("2012-04-01", now), true);
  assert.equal(authorIsMinor("2000-01-01", now), false);
  assert.equal(authorIsMinor("2008-09-30", now), false);
  assert.equal(authorIsMinor("2008-10-01", now), true);
  assert.equal(authorIsMinor(null, now), false);
  assert.equal(authorIsMinor("not-a-date", now), false);
});

test("open reports sort a minor first, then a person in the photo, then the oldest", () => {
  assert.match(OPEN_REPORTS_SQL, /status = 'open'/);
  assert.match(OPEN_REPORTS_SQL, /interval '18 years'/);
  assert.match(OPEN_REPORTS_SQL, /order by involves_minor desc/i);
  assert.match(OPEN_REPORTS_SQL, /reason = 'person'/);
  assert.match(OPEN_REPORTS_SQL, /created_at asc/i);
});

test("the queue reads that statement", async () => {
  let sql = "";
  const pool = {
    query: async (text) => {
      sql = text;
      return { rows: [], rowCount: 0 };
    },
  };
  assert.deepEqual(await listOpenReports(pool), []);
  assert.equal(sql, OPEN_REPORTS_SQL);
});

test("hiding a post marks it hidden, closes the open reports, and writes the audit", async () => {
  const db = scriptedPool([
    { match: /from public.content_reports/, result: postReport() },
    { match: /moderation_status = 'hidden'/, result: { rows: [], rowCount: 1 } },
    { match: /resolution = \$3/, result: { rows: [], rowCount: 1 } },
  ]);
  const { audit, entries } = auditing();
  const result = await hideReportedContent({ pool: db.pool, audit, admin: ADMIN }, { report_id: reportId });

  assert.equal(result.status, 200);
  assert.equal(result.body.hidden, true);
  assert.equal(result.body.already, false);
  assert.equal(result.body.content_id, postId);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].actionType, MODERATION_ACTIONS.HIDE);
  assert.equal(entries[0].entityType, "social_post");
  assert.equal(entries[0].entityId, postId);
  assert.equal(entries[0].newValues.status, "hidden");
  assert.equal(entries[0].metadata.involves_minor, true);
  assert.equal(entries[0].actor.email, "ops@mipo.pet");
});

test("hiding a comment sets the comment status to hidden", async () => {
  const db = scriptedPool([
    {
      match: /from public.content_reports/,
      result: postReport({
        content_type: "comment",
        content_id: commentId,
        post_id: null,
        post_author_id: null,
        comment_id: commentId,
        comment_author_id: authorId,
        comment_status: "published",
      }),
    },
    { match: /update public.social_post_comments/, result: { rows: [], rowCount: 1 } },
    { match: /content_reports/, result: { rows: [], rowCount: 1 } },
  ]);
  const { audit, entries } = auditing();
  const result = await hideReportedContent({ pool: db.pool, audit, admin: ADMIN }, { report_id: reportId });
  assert.equal(result.body.content_type, "comment");
  assert.equal(entries[0].entityType, "social_comment");
  assert.match(db.calls.map((call) => call.sql).join("\n"), /status = 'hidden'/);
});

test("a product report cannot be hidden from this queue", async () => {
  const db = scriptedPool([
    { match: /content_reports/, result: postReport({ content_type: "product", post_id: null, post_author_id: null }) },
  ]);
  const { audit, entries } = auditing();
  await assert.rejects(
    () => hideReportedContent({ pool: db.pool, audit, admin: ADMIN }, { report_id: reportId }),
    (error) => error.statusCode === 400,
  );
  assert.equal(entries.length, 0);
});

test("hiding something that is already hidden does not write a second audit row", async () => {
  const db = scriptedPool([
    { match: /content_reports/, result: postReport({ post_status: "hidden" }) },
    { match: /social_posts/, result: { rows: [], rowCount: 0 } },
    { match: /content_reports/, result: { rows: [], rowCount: 0 } },
  ]);
  const { audit, entries } = auditing();
  const result = await hideReportedContent({ pool: db.pool, audit, admin: ADMIN }, { report_id: reportId });
  assert.equal(result.body.already, true);
  assert.equal(entries.length, 0);
});

test("restore puts a hidden post back to published and logs it", async () => {
  const db = scriptedPool([
    { match: /moderation_status = 'published'/, result: { rows: [{ id: postId }], rowCount: 1 } },
  ]);
  const { audit, entries } = auditing();
  const result = await restoreHiddenContent(
    { pool: db.pool, audit, admin: ADMIN },
    { content_type: "post", content_id: postId },
  );
  assert.equal(result.body.restored, true);
  assert.equal(entries[0].actionType, MODERATION_ACTIONS.RESTORE);
  assert.equal(entries[0].oldValues.status, "hidden");
  assert.equal(entries[0].newValues.status, "published");
});

test("restore refuses a post that is not hidden", async () => {
  const db = scriptedPool([
    { match: /social_posts/, result: { rows: [], rowCount: 0 } },
  ]);
  const { audit, entries } = auditing();
  await assert.rejects(
    () => restoreHiddenContent({ pool: db.pool, audit, admin: ADMIN }, { content_type: "post", content_id: postId }),
    (error) => error.statusCode === 404,
  );
  assert.equal(entries.length, 0);
});

test("dismiss closes the report and logs it", async () => {
  const db = scriptedPool([
    {
      match: /status = 'dismissed'/,
      result: {
        rows: [{ id: reportId, content_type: "post", content_id: postId, reason: "spam" }],
        rowCount: 1,
      },
    },
  ]);
  const { audit, entries } = auditing();
  const result = await dismissContentReport({ pool: db.pool, audit, admin: ADMIN }, { report_id: reportId });
  assert.equal(result.body.dismissed, true);
  assert.equal(entries[0].actionType, MODERATION_ACTIONS.DISMISS);
  assert.equal(entries[0].entityType, "content_report");
  assert.equal(entries[0].newValues.status, "dismissed");
});

test("block updates the author of the report, not some other id in the body", async () => {
  const db = scriptedPool([
    { match: /content_reports/, result: postReport() },
    { match: /from public.profiles/, result: { rows: [{ id: authorId, blocked_at: null }], rowCount: 1 } },
    { match: /update public.profiles/, result: { rows: [], rowCount: 1 } },
    { match: /resolution = 'blocked'/, result: { rows: [], rowCount: 1 } },
  ]);
  const { audit, entries } = auditing();
  const result = await blockReportedUser(
    { pool: db.pool, audit, admin: ADMIN },
    { report_id: reportId, user_id: otherUserId },
  );
  assert.equal(result.body.user_id, authorId);
  const profileUpdate = db.calls.find((call) => /update public.profiles/.test(call.sql));
  assert.equal(profileUpdate.params[0], authorId);
  assert.equal(entries[0].actionType, MODERATION_ACTIONS.BLOCK);
  assert.equal(entries[0].entityId, authorId);
});

test("unblock clears the block and logs it", async () => {
  const db = scriptedPool([
    { match: /blocked_at = null/, result: { rows: [{ id: authorId }], rowCount: 1 } },
  ]);
  const { audit, entries } = auditing();
  const result = await unblockUser({ pool: db.pool, audit, admin: ADMIN }, { user_id: authorId });
  assert.equal(result.body.unblocked, true);
  assert.equal(entries[0].actionType, MODERATION_ACTIONS.UNBLOCK);
});

test("the moderation log asks the audit service for the moderation prefix", async () => {
  let filters = null;
  const entries = await listModerationLog({
    list: async (next) => {
      filters = next;
      return [{ id: "1", action_type: MODERATION_ACTIONS.HIDE }];
    },
  });
  assert.equal(filters.actionTypePrefix, "moderation.");
  assert.equal(entries.length, 1);
});

test("an action prefix is applied in the audit query", async () => {
  let sql = "";
  let params = [];
  const audit = createAuditService({
    pool: {
      query: async (text, values) => {
        sql = text;
        params = values;
        return { rows: [] };
      },
    },
    logger: { error: () => {} },
  });
  await audit.list({ actionTypePrefix: "moderation." });
  assert.match(sql, /action_type like/i);
  assert.equal(params[0], "moderation.%");
});

test("moderation routes require full admin access, and the writes are idempotent", () => {
  const routes = createAdminOsRoutes({
    pool: { query: async () => ({ rows: [], rowCount: 0 }) },
    sendJson: () => {},
    sendError: () => {},
    readBody: async () => ({}),
    requireAdminPermission: async () => true,
    logger: { error: () => {} },
  }).routes.filter((route) => route.path.startsWith("moderation/"));

  assert.ok(routes.length >= 8, "the moderation routes are missing");
  for (const route of routes) {
    assert.equal(route.permission, ADMIN_PERMISSIONS.FULL_ACCESS, route.path);
    if (route.method === "POST") assert.equal(route.idempotent, true, route.path);
  }
});

test("the feed, the single post, and the comment list omit hidden and blocked content", async () => {
  const queries = [];
  const pool = {
    query: async (sql) => {
      queries.push(String(sql));
      if (/from public.social_posts/.test(sql) && /where post.id = \$2/.test(sql)) {
        return {
          rows: [{
            id: postId,
            caption: "שלום",
            poll_options: [],
            user_id: authorId,
            storage_key: "a.jpg",
            media_type: "image",
          }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    },
  };

  await listSocialFeed(pool, viewerId, { limit: 10 });
  await getSocialPost(pool, viewerId, postId);
  await listSocialComments(pool, viewerId, postId);

  // Feed, the direct post read, the post read inside the comment list, then
  // the comments themselves.
  assert.equal(queries.length, 4);
  for (const sql of queries) {
    assert.match(sql, /blocked_at is not null/);
  }
  assert.match(queries[0], /moderation_status = 'published'/);
  assert.match(queries[1], /moderation_status = 'published'/);
  assert.match(queries[3], /comment.status = 'published'/);
});

test("a blocked account cannot publish", async () => {
  const pool = {
    query: async () => ({ rows: [{ blocked_at: "2026-01-01T00:00:00.000Z" }], rowCount: 1 }),
  };
  await assert.rejects(
    () => assertAccountCanPublish(pool, authorId),
    (error) => error.statusCode === 403 && /לא יכול לפרסם/.test(error.message),
  );
});
