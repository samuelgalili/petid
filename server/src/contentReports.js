import { randomUUID } from "node:crypto";

import { EVENT_TYPES } from "./events.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DESCRIPTION_MAX = 500;

// Stable reason codes. Hebrew labels live in the feed UI. `person` is the
// urgent case a later moderation queue sorts first (a person or a child in
// the photo). Product reasons stay so an existing shop report still validates.
export const CONTENT_REPORT_REASONS = Object.freeze({
  post: Object.freeze(["spam", "harassment", "inappropriate", "person", "other"]),
  comment: Object.freeze(["spam", "harassment", "inappropriate", "person", "other"]),
  product: Object.freeze(["price", "image", "description", "other"]),
});

const STORED_TYPES = new Set(Object.keys(CONTENT_REPORT_REASONS));

const fail = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

export const isClientErrorReport = (body) => (
  Boolean(body)
  && typeof body === "object"
  && !Array.isArray(body)
  && typeof body.content_type === "string"
  && body.content_type.trim().toLowerCase() === "client_error"
);

const optionalDescription = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") fail("Description must be text");
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > DESCRIPTION_MAX) {
    fail(`Description must be ${DESCRIPTION_MAX} characters or fewer`);
  }
  return normalized;
};

const isReportObject = (body) => (
  Boolean(body) && typeof body === "object" && !Array.isArray(body)
);

/**
 * A stored report. The reporter is the session user, never a field in the
 * body. Client error telemetry is not a content report.
 *
 * A JSON body of null, a number, a string, or an array is not a report.
 * `JSON.parse("null")` is null, and reading a field off it throws a TypeError
 * with no status code, which the process would report as a 500.
 */
export const normalizeContentReport = (body = {}, reporterId) => {
  if (!reporterId || !uuidPattern.test(String(reporterId))) {
    fail("Authentication is required", 401);
  }
  if (!isReportObject(body)) fail("A valid content report is required");
  const contentType = typeof body.content_type === "string"
    ? body.content_type.trim().toLowerCase()
    : "";
  if (!STORED_TYPES.has(contentType)) fail("A valid content type is required");

  const contentId = typeof body.content_id === "string" ? body.content_id.trim() : "";
  if (!uuidPattern.test(contentId)) fail("A valid content id is required");

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!CONTENT_REPORT_REASONS[contentType].includes(reason)) fail("A valid reason is required");

  return {
    contentType,
    contentId,
    reason,
    description: optionalDescription(body.description),
    reporterId: String(reporterId),
  };
};

// One predicate, one error. A missing id, an archived post, an unpublished
// post, a private post of someone else, and an unpublished comment all miss
// this query and raise the same not-found error. A second message would tell
// the caller which of those it was.
const NOT_FOUND_MESSAGE = "Content was not found";

const contentExistsSql = {
  post: `
    select 1
    from public.social_posts post
    where post.id = $1
      and post.archived = false
      and post.moderation_status = 'published'
      and (post.visibility = 'public' or post.user_id = $2)
    limit 1
  `,
  comment: `
    select 1
    from public.social_post_comments comment
    join public.social_posts post on post.id = comment.post_id
    where comment.id = $1
      and comment.status = 'published'
      and post.archived = false
      and post.moderation_status = 'published'
      and (post.visibility = 'public' or post.user_id = $2)
    limit 1
  `,
  product: `
    select 1
    from public.business_products product
    where product.id = $1
    limit 1
  `,
};

const findExistingReport = async (pool, report) => {
  const existing = await pool.query(
    `
      select id
      from public.content_reports
      where content_type = $1
        and content_id = $2
        and reporter_id = $3
      order by created_at asc
      limit 1
    `,
    [report.contentType, report.contentId, report.reporterId],
  );
  return existing.rows[0]?.id || null;
};

const targetExists = async (pool, report) => {
  const params = report.contentType === "product"
    ? [report.contentId]
    : [report.contentId, report.reporterId];
  const found = await pool.query(contentExistsSql[report.contentType], params);
  return found.rowCount > 0;
};

export const submitContentReport = async (pool, report) => {
  if (!(await targetExists(pool, report))) fail(NOT_FOUND_MESSAGE, 404);

  const existingId = await findExistingReport(pool, report);
  if (existingId) {
    return { ...report, id: existingId, duplicate: true };
  }

  const id = randomUUID();
  try {
    await pool.query(
      `
        insert into public.content_reports (
          id, content_type, content_id, reason, description, reporter_id
        )
        values ($1, $2, $3, $4, $5, $6)
      `,
      [id, report.contentType, report.contentId, report.reason, report.description, report.reporterId],
    );
  } catch (error) {
    if (error?.code !== "23505") throw error;
    const racedId = await findExistingReport(pool, report);
    if (!racedId) throw error;
    return { ...report, id: racedId, duplicate: true };
  }

  return { ...report, id, duplicate: false };
};

/**
 * Store one content report, or acknowledge a client error without writing a
 * moderation row. Emits content.reported only for a newly stored report.
 */
export const handleContentReport = async (pool, { body, reporterId, emit }) => {
  if (isClientErrorReport(body)) {
    return { status: 204, body: null };
  }

  const report = normalizeContentReport(body, reporterId);
  const stored = await submitContentReport(pool, report);
  if (!stored.duplicate && emit) {
    await emit({
      type: EVENT_TYPES.CONTENT_REPORTED,
      entityType: "content_report",
      entityId: stored.id,
      payload: {
        content_type: stored.contentType,
        content_id: stored.contentId,
        reason: stored.reason,
        reporter_id: stored.reporterId,
      },
    });
  }

  return {
    status: stored.duplicate ? 200 : 201,
    body: {
      duplicate: stored.duplicate,
      report: {
        id: stored.id,
        content_type: stored.contentType,
        content_id: stored.contentId,
        reporter_id: stored.reporterId,
      },
    },
  };
};
