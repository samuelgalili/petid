// Pushing events out to n8n.
//
// The contract with the receiver is deliberately small: a signed JSON POST, a
// stable idempotency key, and a retry until it answers 2xx or the attempts run
// out. Anything cleverer would have to be reimplemented inside every workflow.
//
// Nothing here is allowed to take down the API. A dead webhook produces retries
// and a row marked `dead`; it never produces an unhandled rejection or a request
// that hangs.

import { createHmac, timingSafeEqual } from "node:crypto";

import { safeRemoteDispatcher, validateRemoteHttpUrl } from "./urlSafety.js";

const DISPATCH_BATCH = 500;
const DELIVER_BATCH = 20;
const POLL_INTERVAL_MS = 3000;
const IDLE_POLL_INTERVAL_MS = 15_000;
const BACKOFF_BASE_SECONDS = 30;
const BACKOFF_CAP_SECONDS = 3600;
const MAX_ERROR_BODY_BYTES = 2000;

// Headers the receiver is told, rather than headers it may override. A
// subscription cannot set these through its static headers.
const RESERVED_HEADERS = new Set([
  "content-type",
  "content-length",
  "host",
  "x-mipo-event",
  "x-mipo-event-id",
  "x-mipo-delivery-id",
  "x-mipo-idempotency-key",
  "x-mipo-timestamp",
  "x-mipo-signature",
  "x-mipo-attempt",
]);

/**
 * The body an n8n Webhook node receives.
 *
 * Flat and self-describing: a workflow should be able to branch on `event_type`
 * without knowing anything about this schema, and `payload` is the only part
 * whose shape varies by event.
 */
export const buildDeliveryBody = (row) => ({
  id: row.event_id,
  event_type: row.event_type,
  occurred_at: row.occurred_at instanceof Date ? row.occurred_at.toISOString() : row.occurred_at,
  source: row.source,
  entity: row.entity_id || row.entity_type
    ? { type: row.entity_type || null, id: row.entity_id || null }
    : null,
  actor: {
    customer_id: row.actor_customer_id || null,
    admin_user_id: row.actor_admin_user_id || null,
    session_id: row.session_id || null,
  },
  payload: row.payload || {},
  idempotency_key: row.idempotency_key || null,
  delivery: {
    id: row.delivery_id,
    attempt: row.attempts,
  },
});

/**
 * `sha256=<hex>` over `timestamp.body`.
 *
 * The timestamp is inside the signed string rather than beside it, so a captured
 * request cannot be replayed later with a fresh timestamp and the old signature.
 */
export const signPayload = (secret, timestamp, body) =>
  `sha256=${createHmac("sha256", String(secret)).update(`${timestamp}.${body}`).digest("hex")}`;

/** Exposed for the receiving side and for tests; constant-time by construction. */
export const verifySignature = (secret, timestamp, body, signature) => {
  const expected = Buffer.from(signPayload(secret, timestamp, body));
  const provided = Buffer.from(String(signature || ""));
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
};

// 30s, 1m, 2m, 4m … capped at an hour. A workflow that comes back after a lunch
// break still gets its events; one that is gone stops being hammered.
export const backoffSeconds = (attempts) =>
  Math.min(BACKOFF_CAP_SECONDS, BACKOFF_BASE_SECONDS * 2 ** Math.max(0, attempts - 1));

/**
 * Whether another attempt is worth making.
 *
 * 410 Gone is the one answer taken at face value: n8n returns it for a webhook
 * that no longer exists, and retrying that eight times is just noise. Everything
 * else — including 404, which an inactive n8n workflow returns and which becomes
 * 200 the moment someone activates it — is retried.
 */
export const isTerminalStatus = (status) => status === 410;

const staticHeaders = (headers) => {
  if (!headers || typeof headers !== "object" || Array.isArray(headers)) return {};
  const safe = {};
  for (const [key, value] of Object.entries(headers)) {
    const name = String(key).trim().toLowerCase();
    if (!name || RESERVED_HEADERS.has(name)) continue;
    if (!/^[a-z0-9-]+$/.test(name)) continue;
    safe[name] = String(value).slice(0, 1000);
  }
  return safe;
};

const readErrorBody = async (response) => {
  try {
    const text = await response.text();
    return text.slice(0, MAX_ERROR_BODY_BYTES);
  } catch {
    return "";
  }
};

/**
 * Creates a delivery row for every active subscription that asked for the event,
 * and marks the event dispatched.
 *
 * One statement per step, in one transaction: an event is either fanned out to
 * everyone who wanted it or to nobody, never to half the list.
 */
export const dispatchPendingEvents = async (pool, { limit = DISPATCH_BATCH } = {}) => {
  const client = await pool.connect();
  try {
    await client.query("begin");

    const pending = await client.query(
      `
        select id, event_type
        from public.events
        where dispatched_at is null
        order by occurred_at
        for update skip locked
        limit $1
      `,
      [limit],
    );

    if (pending.rows.length === 0) {
      await client.query("commit");
      return { dispatched: 0, deliveries: 0 };
    }

    const eventIds = pending.rows.map((row) => row.id);

    const created = await client.query(
      `
        insert into public.event_deliveries (event_id, subscription_id)
        select e.id, s.id
        from public.events e
        join public.event_subscriptions s
          on s.is_active
         and public.event_matches_patterns(e.event_type, s.event_types)
        where e.id = any($1::uuid[])
        on conflict (event_id, subscription_id) do nothing
        returning event_id
      `,
      [eventIds],
    );

    // An event nobody subscribed to is finished the moment it is dispatched.
    // Leaving delivered_at null would grow the pending-delivery index without
    // bound for the sake of work that will never happen.
    await client.query(
      `
        update public.events e
        set dispatched_at = now(),
            delivered_at = case
              when exists (select 1 from public.event_deliveries d where d.event_id = e.id)
                then e.delivered_at
              else now()
            end
        where e.id = any($1::uuid[])
      `,
      [eventIds],
    );

    await client.query("commit");
    return { dispatched: pending.rows.length, deliveries: created.rows.length };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

const settleDelivery = async (pool, row, outcome) => {
  const { ok, responseStatus, error, terminal } = outcome;

  if (ok) {
    await pool.query(
      `
        update public.event_deliveries
        set status = 'delivered', delivered_at = now(), response_status = $2,
            last_error = null, updated_at = now()
        where id = $1
      `,
      [row.delivery_id, responseStatus ?? null],
    );
    await pool.query(
      `
        update public.event_subscriptions
        set last_success_at = now(), last_error = null, updated_at = now()
        where id = $1
      `,
      [row.subscription_id],
    );
    // The event is done once no destination is still waiting on it.
    await pool.query(
      `
        update public.events e
        set delivered_at = now()
        where e.id = $1
          and e.delivered_at is null
          and not exists (
            select 1 from public.event_deliveries d
            where d.event_id = e.id and d.status in ('pending', 'delivering')
          )
      `,
      [row.event_id],
    );
    return "delivered";
  }

  const message = String(error || "Delivery failed").slice(0, MAX_ERROR_BODY_BYTES);
  const exhausted = terminal || row.attempts >= row.max_attempts;

  await pool.query(
    exhausted
      ? `
        update public.event_deliveries
        set status = 'dead', response_status = $3, last_error = $2, updated_at = now()
        where id = $1
      `
      : `
        update public.event_deliveries
        set status = 'pending', response_status = $3, last_error = $2,
            run_after = now() + ($4 || ' seconds')::interval, updated_at = now()
        where id = $1
      `,
    exhausted
      ? [row.delivery_id, message, responseStatus ?? null]
      : [row.delivery_id, message, responseStatus ?? null, String(backoffSeconds(row.attempts))],
  );

  await pool.query(
    `
      update public.event_subscriptions
      set last_failure_at = now(), last_error = $2, updated_at = now()
      where id = $1
    `,
    [row.subscription_id, message],
  );

  // A dead delivery must not keep the event marked undelivered forever — the
  // delivery row is where the failure is recorded and looked for.
  if (exhausted) {
    await pool.query(
      `
        update public.events e
        set delivered_at = now()
        where e.id = $1
          and e.delivered_at is null
          and not exists (
            select 1 from public.event_deliveries d
            where d.event_id = e.id and d.status in ('pending', 'delivering')
          )
      `,
      [row.event_id],
    );
  }

  return exhausted ? "dead" : "retrying";
};

/**
 * POSTs one claimed delivery. Never throws; the outcome is the return value.
 *
 * `lookupFn` is injectable for the same reason urlSafety makes it injectable:
 * the SSRF check resolves the hostname for real, so a test cannot exercise the
 * send path without controlling DNS.
 */
export const sendDelivery = async (row, { fetchFn = fetch, lookupFn } = {}) => {
  let url;
  try {
    url = await validateRemoteHttpUrl(row.target_url, lookupFn ? { lookupFn } : {});
  } catch (error) {
    // A URL that no longer resolves publicly is not retried into oblivion, but
    // it is not terminal either: DNS comes back.
    return { ok: false, error: error?.message || "Invalid target URL" };
  }

  const body = JSON.stringify(buildDeliveryBody(row));
  const timestamp = String(Math.floor(Date.now() / 1000));

  const headers = {
    ...staticHeaders(row.headers),
    "content-type": "application/json",
    "x-mipo-event": row.event_type,
    "x-mipo-event-id": row.event_id,
    "x-mipo-delivery-id": row.delivery_id,
    // Stable across retries, so a receiver can recognise a repeat of work it
    // already did. This is the whole reason deliveries are rows.
    "x-mipo-idempotency-key": row.delivery_id,
    "x-mipo-attempt": String(row.attempts),
    "x-mipo-timestamp": timestamp,
  };
  if (row.secret) headers["x-mipo-signature"] = signPayload(row.secret, timestamp, body);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), row.timeout_ms || 15_000);
  try {
    const response = await fetchFn(url, {
      method: "POST",
      headers,
      body,
      redirect: "manual",
      signal: controller.signal,
      dispatcher: safeRemoteDispatcher,
    });

    if (response.status >= 200 && response.status < 300) {
      await response.body?.cancel().catch(() => {});
      return { ok: true, responseStatus: response.status };
    }

    const detail = await readErrorBody(response);
    return {
      ok: false,
      responseStatus: response.status,
      terminal: isTerminalStatus(response.status),
      error: `HTTP ${response.status}${detail ? `: ${detail}` : ""}`,
    };
  } catch (error) {
    const aborted = error?.name === "AbortError";
    return { ok: false, error: aborted ? `Timed out after ${row.timeout_ms}ms` : error?.message || String(error) };
  } finally {
    clearTimeout(timeout);
  }
};

/** Claims and delivers up to `limit` due deliveries. Returns what happened. */
export const deliverDue = async (pool, { limit = DELIVER_BATCH, fetchFn = fetch, lookupFn } = {}) => {
  const counts = { claimed: 0, delivered: 0, retrying: 0, dead: 0 };

  for (let index = 0; index < limit; index += 1) {
    const claimed = await pool.query("select * from public.claim_next_delivery()");
    const row = claimed.rows[0];
    if (!row) break;

    counts.claimed += 1;
    const outcome = await sendDelivery(row, { fetchFn, lookupFn });
    const settled = await settleDelivery(pool, row, outcome);
    counts[settled] += 1;
  }

  return counts;
};

/** Puts dead deliveries back in the queue, after the workflow has been fixed. */
export const replayDeliveries = async (pool, { deliveryIds = [], subscriptionId = null } = {}) => {
  const ids = (Array.isArray(deliveryIds) ? deliveryIds : []).filter(Boolean);
  if (ids.length === 0 && !subscriptionId) return { replayed: 0 };

  const result = await pool.query(
    `
      update public.event_deliveries
      set status = 'pending', attempts = 0, run_after = now(), last_error = null,
          response_status = null, updated_at = now()
      where status = 'dead'
        and ($1::uuid[] is null or id = any($1::uuid[]))
        and ($2::uuid is null or subscription_id = $2::uuid)
      returning id
    `,
    [ids.length > 0 ? ids : null, subscriptionId],
  );
  return { replayed: result.rowCount };
};

/**
 * Sends a synthetic event to one subscription so the person wiring up a workflow
 * finds out now, not at three in the morning. It bypasses the tables entirely —
 * a test must not leave a delivery row behind.
 */
export const testSubscription = async (pool, subscriptionId, { fetchFn = fetch } = {}) => {
  const result = await pool.query(
    "select id, target_url, secret, headers, timeout_ms from public.event_subscriptions where id = $1",
    [subscriptionId],
  );
  const subscription = result.rows[0];
  if (!subscription) return { ok: false, error: "Subscription not found" };

  const outcome = await sendDelivery(
    {
      delivery_id: "00000000-0000-0000-0000-000000000000",
      event_id: "00000000-0000-0000-0000-000000000000",
      subscription_id: subscription.id,
      target_url: subscription.target_url,
      secret: subscription.secret,
      headers: subscription.headers,
      timeout_ms: subscription.timeout_ms,
      attempts: 1,
      event_type: "system.test",
      occurred_at: new Date(),
      source: "system",
      payload: { message: "בדיקת חיבור מ־MIPO" },
    },
    { fetchFn },
  );

  await pool.query(
    outcome.ok
      ? "update public.event_subscriptions set last_success_at = now(), last_error = null, updated_at = now() where id = $1"
      : "update public.event_subscriptions set last_failure_at = now(), last_error = $2, updated_at = now() where id = $1",
    outcome.ok
      ? [subscription.id]
      : [subscription.id, String(outcome.error || "").slice(0, MAX_ERROR_BODY_BYTES)],
  );

  return outcome;
};

/** What the integrations screen shows: destinations, and how they are doing. */
export const getBusStatus = async (pool) => {
  const subscriptions = await pool.query(
    `
      select s.id, s.name, s.target_url, s.event_types, s.is_active,
             s.max_attempts, s.timeout_ms, s.headers,
             (s.secret is not null and s.secret <> '') as has_secret,
             s.last_success_at, s.last_failure_at, s.last_error, s.created_at,
             count(d.id) filter (where d.status = 'pending') as pending,
             count(d.id) filter (where d.status = 'delivered') as delivered,
             count(d.id) filter (where d.status = 'dead') as dead
      from public.event_subscriptions s
      left join public.event_deliveries d on d.subscription_id = s.id
      group by s.id
      order by s.created_at
    `,
  );

  const backlog = await pool.query(
    `
      select
        (select count(*) from public.events where dispatched_at is null) as awaiting_dispatch,
        (select count(*) from public.event_deliveries where status = 'pending') as awaiting_delivery,
        (select count(*) from public.event_deliveries where status = 'dead') as dead
    `,
  );

  const recentFailures = await pool.query(
    `
      select d.id, d.status, d.attempts, d.response_status, d.last_error, d.updated_at,
             e.event_type, s.name as subscription_name
      from public.event_deliveries d
      join public.events e on e.id = d.event_id
      join public.event_subscriptions s on s.id = d.subscription_id
      where d.status = 'dead' or d.last_error is not null
      order by d.updated_at desc
      limit 50
    `,
  );

  return {
    subscriptions: subscriptions.rows,
    backlog: backlog.rows[0],
    recent_failures: recentFailures.rows,
  };
};

/** Event names the admin screen offers, so subscriptions are not typed blind. */
export const knownEventTypes = async (pool) => {
  const result = await pool.query(
    "select event_type, count(*) as events from public.events group by 1 order by 2 desc limit 100",
  );
  return result.rows;
};

/**
 * The worker. Same shape as JobWorker and for the same reasons, but on its own
 * loop: an import that takes a minute must not delay an order webhook.
 */
export class EventBusWorker {
  constructor(pool, {
    pollIntervalMs = POLL_INTERVAL_MS,
    idlePollIntervalMs = IDLE_POLL_INTERVAL_MS,
    fetchFn = fetch,
    logger = console,
  } = {}) {
    this.pool = pool;
    this.pollIntervalMs = pollIntervalMs;
    this.idlePollIntervalMs = idlePollIntervalMs;
    this.fetchFn = fetchFn;
    this.logger = logger;
    this.timer = null;
    this.running = false;
    this.draining = false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.scheduleNext(0);
  }

  async stop() {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    while (this.draining) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  scheduleNext(delayMs) {
    if (!this.running) return;
    this.timer = setTimeout(() => {
      void this.tick();
    }, delayMs);
    if (typeof this.timer.unref === "function") this.timer.unref();
  }

  async tick() {
    if (!this.running) return;

    let worked = false;
    try {
      worked = await this.runOnce();
    } catch (error) {
      this.logger.error("event_bus_tick_failed", error?.message);
    }

    // Busy queues drain at the fast interval; an idle bus polls rarely, because
    // most of the time nobody has subscribed to anything.
    this.scheduleNext(worked ? this.pollIntervalMs : this.idlePollIntervalMs);
  }

  async runOnce() {
    this.draining = true;
    try {
      const fanOut = await dispatchPendingEvents(this.pool);
      const sent = await deliverDue(this.pool, { fetchFn: this.fetchFn });

      if (sent.dead > 0) {
        this.logger.warn("event_bus_deliveries_dead", sent.dead);
      }
      return fanOut.deliveries > 0 || sent.claimed > 0;
    } finally {
      this.draining = false;
    }
  }
}
