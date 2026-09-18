import { createHash } from "node:crypto";

/**
 * Retry deduplication for admin endpoints with external or financial effects.
 *
 * The rule this implements: a retried request must not cause a second effect,
 * and a DIFFERENT request carrying a reused key must not be mistaken for a
 * retry. The second half is the one that is easy to get wrong and expensive to
 * get wrong - a naive "have I seen this key? then return what I returned"
 * silently drops the second request's ₪320 and reports success.
 *
 * CLAIM BEFORE WORK. The row is inserted with status 'in_progress' before the
 * handler runs. Two concurrent requests with one key therefore collide on the
 * unique constraint instead of both executing, which is the case a
 * check-then-act would miss: both read "not seen", both charge.
 *
 * Four outcomes, and each is a different HTTP answer:
 *
 *   fresh key                 -> run the work, store the response
 *   same key, same request,
 *     first still running     -> 409 in_progress. NOT a replay: the first
 *                                request has no answer yet, and inventing one
 *                                would be a guess about money.
 *   same key, same request,
 *     first completed         -> 200-with-stored-response. The actual replay.
 *   same key, DIFFERENT
 *     request                 -> 409 key_reused. A caller bug, surfaced.
 *
 * On a thrown error the claim is released, so a failed attempt does not lock
 * the key for 24 hours. That is only safe because the work is required to be
 * atomic - it either committed or it did not. An endpoint that performs two
 * independent side effects must not use this helper as its only protection.
 */

/** What "the same request" means: the body, canonicalised so key order cannot lie. */
const canonical = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
    .join(",")}}`;
};

export const fingerprintRequest = (payload) =>
  createHash("sha256").update(canonical(payload)).digest("hex");

/** Shape of every refusal this module raises, so routes can map them uniformly. */
export class IdempotencyConflict extends Error {
  constructor(code, message) {
    super(message);
    this.name = "IdempotencyConflict";
    this.code = code;
    this.statusCode = 409;
  }
}

export const IDEMPOTENCY_HEADER = "idempotency-key";

/**
 * Pull the key off a request. Returns null when absent; whether that is fatal
 * is the route's decision, because a read endpoint does not need one.
 */
export const idempotencyKeyOf = (request) => {
  const raw = request?.headers?.[IDEMPOTENCY_HEADER];
  const key = String(Array.isArray(raw) ? raw[0] : raw || "").trim();
  if (!key) return null;
  // Bounded, because it is a unique-index key and an unbounded one is a cheap
  // way to bloat the index.
  if (key.length > 200) {
    throw new IdempotencyConflict("idempotency_key_too_long", "Idempotency-Key must be at most 200 characters");
  }
  return key;
};

export const createIdempotency = ({ pool }) => {
  /**
   * @param scope     the endpoint, e.g. "POST /api/admin/os/payments"
   * @param key       the caller's Idempotency-Key
   * @param payload   what was asked - hashed, never stored in full
   * @param actorId   the admin user, for reading the table later
   * @param work      async () => ({ status, body }). MUST be atomic.
   */
  const run = async ({ scope, key, payload, actorId = null }, work) => {
    if (!key) throw new IdempotencyConflict("idempotency_key_required", "Idempotency-Key header is required");

    const fingerprint = fingerprintRequest(payload);

    // An expired claim is deleted rather than reused, so a key can come back
    // round after its window without inheriting an old fingerprint.
    await pool.query("delete from public.idempotency_keys where expires_at <= now()");

    const claimed = await pool.query(
      `
        insert into public.idempotency_keys (scope, idempotency_key, request_fingerprint, actor_admin_user_id)
        values ($1, $2, $3, $4)
        on conflict on constraint idempotency_keys_scope_key_unique do nothing
        returning id
      `,
      [scope, key, fingerprint, actorId],
    );

    if (claimed.rowCount === 0) {
      const existing = await pool.query(
        `
          select request_fingerprint, status, response_status, response_body
            from public.idempotency_keys
           where scope = $1 and idempotency_key = $2
        `,
        [scope, key],
      );

      // The row expired between the delete and the select. Treat as fresh
      // rather than as a phantom conflict.
      if (existing.rowCount === 0) return run({ scope, key, payload, actorId }, work);

      const row = existing.rows[0];

      if (row.request_fingerprint !== fingerprint) {
        throw new IdempotencyConflict(
          "idempotency_key_reused",
          "This Idempotency-Key was used for a different request",
        );
      }

      if (row.status !== "completed") {
        throw new IdempotencyConflict(
          "idempotency_in_progress",
          "A request with this Idempotency-Key is still in progress",
        );
      }

      return { status: row.response_status, body: row.response_body, replayed: true };
    }

    let result;
    try {
      result = await work();
    } catch (error) {
      // Release, so a retry after a transient failure is not refused for a day.
      await pool
        .query(
          "delete from public.idempotency_keys where scope = $1 and idempotency_key = $2 and status = 'in_progress'",
          [scope, key],
        )
        .catch(() => {});
      throw error;
    }

    const status = Number(result?.status ?? 200);
    const body = result?.body ?? null;

    await pool.query(
      `
        update public.idempotency_keys
           set status = 'completed',
               response_status = $3,
               response_body = $4::jsonb,
               completed_at = now()
         where scope = $1 and idempotency_key = $2
      `,
      [scope, key, status, body === null ? null : JSON.stringify(body)],
    );

    return { status, body, replayed: false };
  };

  return run;
};
