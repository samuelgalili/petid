/**
 * One way to write admin_audit_log, and one way to read it.
 *
 * There are 19 ad-hoc insert sites in index.js today, all of them going
 * through one `recordAdminAudit` helper that assumes the actor is a person
 * with a session. That assumption holds right now and stops holding in
 * Phase 6, when a reaction to an outbox event writes the row.
 *
 * The distinction is not cosmetic. "The operations lead refunded ₪320" and
 * "an agent refunded ₪320" are different sentences, and an AI agent running
 * under a service account is otherwise indistinguishable from a human with
 * the same email address. actor_type is the column that keeps them apart, and
 * a reader who cannot tell them apart cannot audit anything.
 *
 * A failed audit write never fails the thing it describes. That is the same
 * rule emitEvent follows, for the same reason: an unloggable action is bad,
 * an action that fails because logging failed is worse.
 */

export const ACTOR_TYPES = Object.freeze({
  ADMIN: "admin",
  SYSTEM: "system",
  WORKFLOW: "workflow",
  AI_AGENT: "ai_agent",
});

const ACTOR_TYPE_VALUES = new Set(Object.values(ACTOR_TYPES));

/** Filters the Audit Log screen offers. Anything else is ignored, not guessed. */
const MAX_PAGE = 200;

export const createAuditService = ({ pool, logger = console }) => {
  /**
   * Record an action.
   *
   * `actor` is either an admin session ({ id, email, role }) or one of the
   * non-human actors, named. There is no default that silently claims a
   * system write was a person's: an unknown actor_type is refused here rather
   * than by the check constraint, so the caller gets a stack trace at the call
   * site instead of a Postgres error three layers down.
   */
  const record = async ({
    actorType = ACTOR_TYPES.ADMIN,
    actor = null,
    actionType,
    entityType,
    entityId = null,
    oldValues = null,
    newValues = null,
    metadata = null,
  }) => {
    if (!ACTOR_TYPE_VALUES.has(actorType)) {
      throw new Error(`Unknown audit actor_type: ${actorType}`);
    }
    if (!actionType || !entityType) {
      throw new Error("Audit entries need an actionType and an entityType");
    }

    try {
      await pool.query(
        `
          insert into public.admin_audit_log (
            action_type, entity_type, entity_id,
            old_values, new_values, metadata,
            actor_admin_user_id, actor_email, actor_role, actor_type
          )
          values ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8, $9, $10)
        `,
        [
          actionType,
          entityType,
          entityId === null ? null : String(entityId),
          oldValues ? JSON.stringify(oldValues) : null,
          newValues ? JSON.stringify(newValues) : null,
          metadata ? JSON.stringify(metadata) : null,
          // "api-key" is index.js's marker for the bootstrap path, which has no
          // admin_users row. It must not be written into a uuid column.
          actor?.id && actor.id !== "api-key" ? actor.id : null,
          actor?.email ?? null,
          actor?.role ?? null,
          actorType,
        ],
      );
    } catch (error) {
      logger.error("Admin audit log write failed:", error.message);
    }
  };

  /**
   * Read the log. Every filter is optional and every one of them is applied in
   * SQL rather than in JavaScript, because this table is the one that grows
   * without bound and a client-side filter over 200 rows is a filter over the
   * most recent 200 rows, which is a different question than the one asked.
   */
  const list = async ({
    actorType = null,
    entityType = null,
    entityId = null,
    actionType = null,
    from = null,
    to = null,
    limit = 50,
    offset = 0,
  } = {}) => {
    const where = [];
    const params = [];
    const add = (sql, value) => {
      params.push(value);
      where.push(sql.replace("$?", `$${params.length}`));
    };

    if (actorType) {
      if (!ACTOR_TYPE_VALUES.has(actorType)) throw new Error(`Unknown actor_type filter: ${actorType}`);
      add("actor_type = $?", actorType);
    }
    if (entityType) add("entity_type = $?", String(entityType));
    if (entityId) add("entity_id = $?", String(entityId));
    if (actionType) add("action_type = $?", String(actionType));
    if (from) add("created_at >= $?", new Date(from));
    if (to) add("created_at <= $?", new Date(to));

    const cappedLimit = Math.min(Math.max(Number(limit) || 50, 1), MAX_PAGE);
    const safeOffset = Math.max(Number(offset) || 0, 0);
    params.push(cappedLimit, safeOffset);

    const result = await pool.query(
      `
        select id, action_type, entity_type, entity_id,
               old_values, new_values, metadata,
               actor_admin_user_id, actor_email, actor_role, actor_type,
               created_at
          from public.admin_audit_log
         ${where.length ? `where ${where.join(" and ")}` : ""}
         order by created_at desc, id desc
         limit $${params.length - 1} offset $${params.length}
      `,
      params,
    );

    return result.rows.map((row) => ({
      id: row.id,
      action_type: row.action_type,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      old_values: row.old_values,
      new_values: row.new_values,
      metadata: row.metadata,
      actor_type: row.actor_type,
      actor_email: row.actor_email,
      actor_role: row.actor_role,
      created_at: row.created_at,
    }));
  };

  return { record, list, ACTOR_TYPES };
};
