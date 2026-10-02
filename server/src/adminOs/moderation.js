/**
 * The moderation queue.
 *
 * Members can file a report. Nothing else in the API reads content_reports,
 * and nothing writes social_posts.moderation_status. A report therefore sat
 * in the table until this screen.
 *
 * Hide sets moderation_status (or a comment's status) to hidden. The feed,
 * the single-post read, and the comment list already require published, so
 * the row leaves every view on the next request. Restore sets it back.
 * Block uses profiles.blocked_at, which the feed also excludes, and clearing
 * that column puts the person's published posts back.
 *
 * Every change that lands is written through the audit service after the
 * transaction commits. A refusal writes nothing: an audit row for an action
 * that rolled back would be a record of something that did not happen.
 */

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MODERATABLE = new Set(["post", "comment"]);

export const MODERATION_ACTIONS = Object.freeze({
  HIDE: "moderation.hide",
  RESTORE: "moderation.restore",
  DISMISS: "moderation.dismiss",
  BLOCK: "moderation.block",
  UNBLOCK: "moderation.unblock",
});

const fail = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const requireUuid = (value, message) => {
  const id = typeof value === "string" ? value.trim() : "";
  if (!uuidPattern.test(id)) fail(message);
  return id;
};

export const adminActorId = (admin) => {
  const id = String(admin?.id || "");
  return uuidPattern.test(id) ? id : null;
};

/**
 * Under 18, from a date-only birthdate. Unknown birthdate is not a minor:
 * the queue cannot invent an age. A person or a child in the photo is a
 * separate flag (reason = person) and sorts next.
 */
export const authorIsMinor = (birthdate, now = new Date()) => {
  if (!birthdate) return false;
  const born = new Date(`${String(birthdate).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(born.getTime())) return false;
  const cutoff = new Date(Date.UTC(now.getUTCFullYear() - 18, now.getUTCMonth(), now.getUTCDate()));
  return born.getTime() > cutoff.getTime();
};

const optionalBlockReason = (value) => {
  if (value === null || value === undefined || value === "") return "חסימה ממסך המודרציה";
  if (typeof value !== "string") fail("סיבת החסימה צריכה להיות טקסט");
  const normalized = value.trim();
  if (!normalized) return "חסימה ממסך המודרציה";
  if (normalized.length > 300) fail("סיבת החסימה ארוכה מדי");
  return normalized;
};

const withTransaction = async (pool, work) => {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    try { await client.query("rollback"); } catch { /* the transaction is already closed */ }
    throw error;
  } finally {
    client.release();
  }
};

const actorOf = (admin) => ({
  id: adminActorId(admin),
  email: admin?.email ?? null,
  role: admin?.role ?? null,
});

const writeAudit = async (audit, entry) => {
  if (!audit?.record || !entry) return;
  await audit.record(entry);
};

// Minors first (known birthdate under 18), then a person-or-child report,
// then the oldest open report. The alias is what the screen badges.
export const OPEN_REPORTS_SQL = `
  select
    report.id,
    report.content_type,
    report.content_id,
    report.reason,
    report.description,
    report.status,
    report.created_at,
    coalesce(post.user_id, comment.user_id) as author_id,
    author.full_name as author_name,
    reporter.full_name as reporter_name,
    coalesce(post.moderation_status, comment.status) as content_status,
    left(coalesce(post.caption, comment.body, ''), 180) as excerpt,
    (author.birthdate is not null and author.birthdate > (current_date - interval '18 years')) as involves_minor,
    (profile.blocked_at is not null) as author_blocked
  from public.content_reports report
  left join public.social_posts post
    on report.content_type = 'post' and post.id::text = report.content_id
  left join public.social_post_comments comment
    on report.content_type = 'comment' and comment.id::text = report.content_id
  left join public.app_users author
    on author.id = coalesce(post.user_id, comment.user_id)
  left join public.app_users reporter
    on reporter.id = report.reporter_id
  left join public.profiles profile
    on profile.id = author.id
  where report.status = 'open'
  order by involves_minor desc,
           (report.reason = 'person') desc,
           report.created_at asc,
           report.id asc
  limit 100
`;

const serializeReport = (row) => ({
  id: row.id,
  content_type: row.content_type,
  content_id: row.content_id,
  reason: row.reason,
  description: row.description || null,
  status: row.status,
  created_at: row.created_at,
  author_id: row.author_id || null,
  author_name: row.author_name || null,
  reporter_name: row.reporter_name || null,
  content_status: row.content_status || null,
  excerpt: row.excerpt || null,
  involves_minor: Boolean(row.involves_minor),
  urgent_person: row.reason === "person",
  author_blocked: Boolean(row.author_blocked),
});

export const listOpenReports = async (pool) => {
  const result = await pool.query(OPEN_REPORTS_SQL);
  return result.rows.map(serializeReport);
};

export const HIDDEN_CONTENT_SQL = `
  select
    hidden.content_type,
    hidden.content_id,
    hidden.excerpt,
    hidden.author_id,
    hidden.author_name,
    hidden.hidden_at,
    hidden.author_blocked
  from (
    select
      'post'::text as content_type,
      post.id::text as content_id,
      left(coalesce(post.caption, ''), 180) as excerpt,
      post.user_id as author_id,
      author.full_name as author_name,
      post.updated_at as hidden_at,
      (profile.blocked_at is not null) as author_blocked
    from public.social_posts post
    left join public.app_users author on author.id = post.user_id
    left join public.profiles profile on profile.id = post.user_id
    where post.moderation_status = 'hidden' and post.archived = false
    union all
    select
      'comment'::text,
      comment.id::text,
      left(comment.body, 180),
      comment.user_id,
      author.full_name,
      comment.updated_at,
      (profile.blocked_at is not null)
    from public.social_post_comments comment
    left join public.app_users author on author.id = comment.user_id
    left join public.profiles profile on profile.id = comment.user_id
    where comment.status = 'hidden'
  ) hidden
  order by hidden.hidden_at desc
  limit 50
`;

const serializeHidden = (row) => ({
  content_type: row.content_type,
  content_id: row.content_id,
  excerpt: row.excerpt || null,
  author_id: row.author_id || null,
  author_name: row.author_name || null,
  hidden_at: row.hidden_at,
  author_blocked: Boolean(row.author_blocked),
});

export const listHiddenContent = async (pool) => {
  const result = await pool.query(HIDDEN_CONTENT_SQL);
  return result.rows.map(serializeHidden);
};

export const BLOCKED_USERS_SQL = `
  select
    profile.id as user_id,
    author.full_name as author_name,
    profile.blocked_at,
    profile.blocked_reason
  from public.profiles profile
  left join public.app_users author on author.id = profile.id
  where profile.blocked_at is not null
  order by profile.blocked_at desc
  limit 50
`;

export const listBlockedUsers = async (pool) => {
  const result = await pool.query(BLOCKED_USERS_SQL);
  return result.rows.map((row) => ({
    user_id: row.user_id,
    author_name: row.author_name || null,
    blocked_at: row.blocked_at,
    blocked_reason: row.blocked_reason || null,
  }));
};

export const listModerationLog = async (audit) => {
  const entries = await audit.list({ actionTypePrefix: "moderation.", limit: 50 });
  return entries;
};

const REPORT_TARGET_SQL = `
  select
    report.id,
    report.content_type,
    report.content_id,
    report.status,
    report.reason,
    post.id as post_id,
    post.user_id as post_author_id,
    post.archived as post_archived,
    post.moderation_status as post_status,
    comment.id as comment_id,
    comment.user_id as comment_author_id,
    comment.status as comment_status,
    author.birthdate as author_birthdate
  from public.content_reports report
  left join public.social_posts post
    on report.content_type = 'post' and post.id::text = report.content_id
  left join public.social_post_comments comment
    on report.content_type = 'comment' and comment.id::text = report.content_id
  left join public.app_users author
    on author.id = coalesce(post.user_id, comment.user_id)
  where report.id = $1
  limit 1
`;

const loadReport = async (client, reportId) => {
  const result = await client.query(REPORT_TARGET_SQL, [reportId]);
  if (!result.rows[0]) fail("הדיווח לא נמצא", 404);
  return result.rows[0];
};

const contentOf = (row) => {
  if (row.content_type === "post") {
    if (!row.post_id) fail("התוכן לא נמצא", 404);
    if (row.post_archived) fail("התוכן כבר לא זמין", 404);
    return { contentType: "post", contentId: String(row.post_id), authorId: row.post_author_id, entityType: "social_post" };
  }
  if (row.content_type === "comment") {
    if (!row.comment_id) fail("התוכן לא נמצא", 404);
    if (row.comment_status === "deleted") fail("תגובה שנמחקה לא ניתנת להסתרה", 409);
    return { contentType: "comment", contentId: String(row.comment_id), authorId: row.comment_author_id, entityType: "social_comment" };
  }
  return null;
};

const closeOpenReports = async (client, contentType, contentId, resolution, reviewerId) => {
  const result = await client.query(
    `
      update public.content_reports
      set status = 'actioned',
          resolution = $3,
          reviewed_at = now(),
          reviewed_by = $4
      where content_type = $1
        and content_id = $2
        and status = 'open'
    `,
    [contentType, contentId, resolution, reviewerId],
  );
  return result.rowCount;
};

export const hideReportedContent = async ({ pool, audit, admin }, body = {}) => {
  const reportId = requireUuid(body.report_id || body.reportId, "נדרש דיווח");
  const reviewerId = adminActorId(admin);

  const outcome = await withTransaction(pool, async (client) => {
    const row = await loadReport(client, reportId);
    if (!MODERATABLE.has(row.content_type)) fail("אפשר להסתיר רק רגע או תגובה", 400);
    const content = contentOf(row);

    const hidden = content.contentType === "post"
      ? await client.query(
        `
          update public.social_posts
          set moderation_status = 'hidden', updated_at = now()
          where id = $1::uuid
            and archived = false
            and moderation_status is distinct from 'hidden'
        `,
        [content.contentId],
      )
      : await client.query(
        `
          update public.social_post_comments
          set status = 'hidden', updated_at = now()
          where id = $1::uuid
            and status = 'published'
        `,
        [content.contentId],
      );

    const closed = await closeOpenReports(client, content.contentType, content.contentId, "hidden", reviewerId);
    const changed = hidden.rowCount > 0 || closed > 0;
    return {
      status: 200,
      body: {
        hidden: true,
        already: !changed,
        content_type: content.contentType,
        content_id: content.contentId,
      },
      audit: changed ? {
        actor: actorOf(admin),
        actionType: MODERATION_ACTIONS.HIDE,
        entityType: content.entityType,
        entityId: content.contentId,
        oldValues: { status: "published" },
        newValues: { status: "hidden" },
        metadata: {
          report_id: reportId,
          content_type: content.contentType,
          content_id: content.contentId,
          reason: row.reason,
          involves_minor: authorIsMinor(row.author_birthdate),
        },
      } : null,
    };
  });

  await writeAudit(audit, outcome.audit);
  return { status: outcome.status, body: outcome.body };
};

export const restoreHiddenContent = async ({ pool, audit, admin }, body = {}) => {
  const contentType = String(body.content_type || body.contentType || "").trim();
  if (!MODERATABLE.has(contentType)) fail("אפשר להחזיר רק רגע או תגובה");
  const contentId = requireUuid(body.content_id || body.contentId, "נדרש מזהה תוכן");

  const outcome = await withTransaction(pool, async (client) => {
    const restored = contentType === "post"
      ? await client.query(
        `
          update public.social_posts
          set moderation_status = 'published', updated_at = now()
          where id = $1::uuid
            and archived = false
            and moderation_status = 'hidden'
          returning id
        `,
        [contentId],
      )
      : await client.query(
        `
          update public.social_post_comments
          set status = 'published', updated_at = now()
          where id = $1::uuid
            and status = 'hidden'
          returning id
        `,
        [contentId],
      );

    if (restored.rowCount === 0) fail("אין מה להחזיר", 404);

    return {
      status: 200,
      body: { restored: true, content_type: contentType, content_id: contentId },
      audit: {
        actor: actorOf(admin),
        actionType: MODERATION_ACTIONS.RESTORE,
        entityType: contentType === "post" ? "social_post" : "social_comment",
        entityId: contentId,
        oldValues: { status: "hidden" },
        newValues: { status: "published" },
        metadata: { content_type: contentType, content_id: contentId },
      },
    };
  });

  await writeAudit(audit, outcome.audit);
  return { status: outcome.status, body: outcome.body };
};

export const dismissContentReport = async ({ pool, audit, admin }, body = {}) => {
  const reportId = requireUuid(body.report_id || body.reportId, "נדרש דיווח");
  const reviewerId = adminActorId(admin);

  const outcome = await withTransaction(pool, async (client) => {
    const updated = await client.query(
      `
        update public.content_reports
        set status = 'dismissed',
            resolution = 'dismissed',
            reviewed_at = now(),
            reviewed_by = $2
        where id = $1
          and status = 'open'
        returning id, content_type, content_id, reason
      `,
      [reportId, reviewerId],
    );
    if (updated.rowCount === 0) fail("הדיווח כבר נסגר", 409);
    const row = updated.rows[0];
    return {
      status: 200,
      body: { dismissed: true, report_id: reportId },
      audit: {
        actor: actorOf(admin),
        actionType: MODERATION_ACTIONS.DISMISS,
        entityType: "content_report",
        entityId: reportId,
        oldValues: { status: "open" },
        newValues: { status: "dismissed" },
        metadata: {
          report_id: reportId,
          content_type: row.content_type,
          content_id: row.content_id,
          reason: row.reason,
        },
      },
    };
  });

  await writeAudit(audit, outcome.audit);
  return { status: outcome.status, body: outcome.body };
};

export const blockReportedUser = async ({ pool, audit, admin }, body = {}) => {
  const reportId = body.report_id || body.reportId
    ? requireUuid(body.report_id || body.reportId, "נדרש דיווח")
    : null;
  const directUserId = body.user_id || body.userId
    ? requireUuid(body.user_id || body.userId, "נדרש משתמש")
    : null;
  if (!reportId && !directUserId) fail("נדרש דיווח או משתמש");
  const reason = optionalBlockReason(body.reason);
  const reviewerId = adminActorId(admin);

  const outcome = await withTransaction(pool, async (client) => {
    let userId = directUserId;
    let reportReason = null;
    let involvesMinor = false;
    if (reportId) {
      const row = await loadReport(client, reportId);
      userId = row.post_author_id || row.comment_author_id || null;
      if (!userId) fail("אין משתמש לחסום", 400);
      reportReason = row.reason;
      involvesMinor = authorIsMinor(row.author_birthdate);
    }

    const existing = await client.query(
      "select id, blocked_at from public.profiles where id = $1 for update",
      [userId],
    );
    if (existing.rowCount === 0) fail("המשתמש לא נמצא", 404);
    const already = Boolean(existing.rows[0].blocked_at);

    await client.query(
      `
        update public.profiles
        set blocked_at = coalesce(blocked_at, now()),
            blocked_by = coalesce(blocked_by, $2),
            blocked_reason = coalesce(blocked_reason, $3),
            updated_at = now()
        where id = $1
      `,
      [userId, reviewerId, reason],
    );

    let closed = 0;
    if (reportId) {
      const closedResult = await client.query(
        `
          update public.content_reports
          set status = 'actioned',
              resolution = 'blocked',
              reviewed_at = now(),
              reviewed_by = $2
          where id = $1 and status = 'open'
        `,
        [reportId, reviewerId],
      );
      closed = closedResult.rowCount;
    }

    return {
      status: 200,
      body: { blocked: true, already, user_id: userId },
      audit: {
        actor: actorOf(admin),
        actionType: MODERATION_ACTIONS.BLOCK,
        entityType: "app_user",
        entityId: userId,
        oldValues: { blocked_at: already ? existing.rows[0].blocked_at : null },
        newValues: { blocked: true, blocked_reason: reason },
        metadata: {
          report_id: reportId,
          user_id: userId,
          already,
          closed_report: closed > 0,
          reason: reportReason,
          involves_minor: involvesMinor,
        },
      },
    };
  });

  await writeAudit(audit, outcome.audit);
  return { status: outcome.status, body: outcome.body };
};

export const unblockUser = async ({ pool, audit, admin }, body = {}) => {
  const userId = requireUuid(body.user_id || body.userId, "נדרש משתמש");

  const outcome = await withTransaction(pool, async (client) => {
    const updated = await client.query(
      `
        update public.profiles
        set blocked_at = null,
            blocked_by = null,
            blocked_reason = null,
            updated_at = now()
        where id = $1
          and blocked_at is not null
        returning id
      `,
      [userId],
    );
    if (updated.rowCount === 0) fail("אין חסימה לשחרר", 404);
    return {
      status: 200,
      body: { unblocked: true, user_id: userId },
      audit: {
        actor: actorOf(admin),
        actionType: MODERATION_ACTIONS.UNBLOCK,
        entityType: "app_user",
        entityId: userId,
        oldValues: { blocked: true },
        newValues: { blocked: false },
        metadata: { user_id: userId },
      },
    };
  });

  await writeAudit(audit, outcome.audit);
  return { status: outcome.status, body: outcome.body };
};
