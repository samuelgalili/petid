// src/events.js — outbound events.
//
// Two halves:
//   emitEvent()      writes an event inside a caller-supplied transaction
//   startDispatcher() delivers pending events to the configured endpoint
//
// Nothing here throws into a business path. A failure to record or deliver an
// event must never fail the order, signup, or payment that produced it.

import { createHmac, timingSafeEqual } from "node:crypto";

export const EVENT_ORIGINS = Object.freeze({
  APP: "app",
  ADMIN: "admin",
  AUTOMATION: "automation",
  SYSTEM: "system",
});

// Every event MIPO can emit. Adding one here is the only place a new type is
// declared, so this list doubles as the contract handed to subscribers.
export const EVENT_TYPES = Object.freeze({
  USER_REGISTERED: "user.registered",

  ORDER_CREATED: "order.created",
  ORDER_PAID: "order.paid",
  ORDER_PAYMENT_FAILED: "order.payment_failed",
  ORDER_STATUS_CHANGED: "order.status_changed",
  ORDER_SHIPPED: "order.shipped",

  PET_CREATED: "pet.created",
  PET_MARKED_LOST: "pet.marked_lost",
  PET_FOUND: "pet.found",
  PET_QR_SCANNED: "pet.qr_scanned",

  CLAIM_SUBMITTED: "insurance_claim.submitted",
  BOOKING_CREATED: "service_booking.created",
  CONTENT_REPORTED: "content.reported",
});

const eventTypeValues = new Set(Object.values(EVENT_TYPES));

/**
 * Record an event. Pass the same client that is performing the business write,
 * so the event commits or rolls back with it.
 *
 * Never throws — a broken event must not break the thing that caused it.
 */
export const emitEvent = async (client, {
  type,
  entityType,
  entityId = null,
  payload = {},
  origin = EVENT_ORIGINS.APP,
}) => {
  try {
    if (!eventTypeValues.has(type)) {
      console.error(`emitEvent: unknown event type "${type}" — not recorded`);
      return null;
    }

    const result = await client.query(
      `
        insert into public.outbox_events (event_type, entity_type, entity_id, payload, origin)
        values ($1, $2, $3, $4::jsonb, $5)
        returning id
      `,
      [type, entityType, entityId, JSON.stringify(payload ?? {}), origin],
    );
    return result.rows[0]?.id || null;
  } catch (error) {
    console.error(`emitEvent: failed to record ${type}:`, error.message);
    return null;
  }
};

/**
 * Read the origin a request claims. An automation platform calling back into
 * MIPO sets X-Mipo-Origin: automation, which marks the events its writes
 * produce so they are not delivered back to it.
 *
 * Only 'automation' is honoured from a header — a caller cannot claim to be
 * the system or an admin.
 */
export const originFromRequest = (request) => (
  String(request?.headers?.["x-mipo-origin"] || "").toLowerCase() === "automation"
    ? EVENT_ORIGINS.AUTOMATION
    : EVENT_ORIGINS.APP
);

export const signPayload = (secret, body) => createHmac("sha256", secret)
  .update(body)
  .digest("hex");

export const verifySignature = (secret, body, signature) => {
  if (!secret || !signature) return false;
  const expected = Buffer.from(signPayload(secret, body), "utf8");
  const received = Buffer.from(String(signature), "utf8");
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
};

// Backoff between delivery attempts, in seconds. The last value repeats.
const BACKOFF_SECONDS = [10, 60, 300, 1800, 7200];

export const backoffSecondsFor = (attempts) => (
  BACKOFF_SECONDS[Math.min(Math.max(attempts, 1) - 1, BACKOFF_SECONDS.length - 1)]
);

export const MAX_ATTEMPTS = 8;

/**
 * Claim a batch of due events.
 *
 * FOR UPDATE SKIP LOCKED means two dispatchers can run — during a rolling
 * restart, say — without ever delivering the same event twice.
 */
export const claimDueEvents = async (client, { limit = 20, deliverAutomationOrigin = false } = {}) => {
  const result = await client.query(
    `
      update public.outbox_events
      set status = 'delivering',
          attempts = attempts + 1
      where id in (
        select id
        from public.outbox_events
        where status = 'pending'
          and next_attempt_at <= now()
          ${deliverAutomationOrigin ? "" : "and origin <> 'automation'"}
        order by occurred_at
        limit $1
        for update skip locked
      )
      returning id, event_type, entity_type, entity_id, payload, origin, occurred_at, attempts
    `,
    [limit],
  );
  return result.rows;
};

export const markDelivered = async (db, id) => db.query(
  `
    update public.outbox_events
    set status = 'delivered', delivered_at = now(), last_error = null
    where id = $1
  `,
  [id],
);

export const markFailed = async (db, id, attempts, error) => {
  const exhausted = attempts >= MAX_ATTEMPTS;
  return db.query(
    `
      update public.outbox_events
      set status = $2,
          next_attempt_at = now() + ($3 || ' seconds')::interval,
          last_error = $4
      where id = $1
    `,
    [
      id,
      exhausted ? "failed" : "pending",
      exhausted ? 0 : backoffSecondsFor(attempts),
      String(error).slice(0, 1000),
    ],
  );
};

/**
 * Events whose origin excludes them from delivery are closed out as 'skipped'
 * rather than left pending forever.
 */
export const skipAutomationOriginEvents = async (db) => db.query(
  `
    update public.outbox_events
    set status = 'skipped', delivered_at = now()
    where status = 'pending' and origin = 'automation'
  `,
);

export const buildDeliveryBody = (event) => JSON.stringify({
  id: event.id,
  type: event.event_type,
  entity: { type: event.entity_type, id: event.entity_id },
  origin: event.origin,
  occurred_at: event.occurred_at,
  attempt: event.attempts,
  data: event.payload,
});

/**
 * Start the delivery loop. Returns a stop function.
 *
 * With no endpoint configured this does nothing at all — events still
 * accumulate in the outbox, so turning delivery on later replays everything
 * that happened while it was off.
 */
export const startDispatcher = ({
  pool,
  fetchImpl = fetch,
  endpointUrl = process.env.AUTOMATION_WEBHOOK_URL,
  secret = process.env.AUTOMATION_WEBHOOK_SECRET,
  intervalMs = Number(process.env.AUTOMATION_DISPATCH_INTERVAL_MS || 5000),
  batchSize = Number(process.env.AUTOMATION_DISPATCH_BATCH || 20),
  timeoutMs = Number(process.env.AUTOMATION_DISPATCH_TIMEOUT_MS || 10000),
  deliverAutomationOrigin = process.env.AUTOMATION_DELIVER_OWN_EVENTS === "true",
} = {}) => {
  if (!endpointUrl) {
    console.log("outbox dispatcher: AUTOMATION_WEBHOOK_URL not set — events recorded but not delivered");
    return () => {};
  }

  let stopped = false;
  let running = false;

  const deliverOne = async (event) => {
    const body = buildDeliveryBody(event);
    const headers = {
      "content-type": "application/json",
      "x-mipo-event-id": event.id,
      "x-mipo-event-type": event.event_type,
    };
    if (secret) headers["x-mipo-signature"] = signPayload(secret, body);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(endpointUrl, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`endpoint returned ${response.status}`);
      await markDelivered(pool, event.id);
    } finally {
      clearTimeout(timer);
    }
  };

  const tick = async () => {
    if (stopped || running) return;
    running = true;
    const client = await pool.connect().catch(() => null);
    if (!client) { running = false; return; }

    let events = [];
    try {
      await client.query("begin");
      events = await claimDueEvents(client, { limit: batchSize, deliverAutomationOrigin });
      await client.query("commit");
    } catch (error) {
      await client.query("rollback").catch(() => {});
      console.error("outbox dispatcher: claim failed:", error.message);
    } finally {
      client.release();
    }

    for (const event of events) {
      if (stopped) break;
      try {
        await deliverOne(event);
      } catch (error) {
        await markFailed(pool, event.id, event.attempts, error.message).catch(() => {});
      }
    }

    running = false;
  };

  const timer = setInterval(() => { tick().catch(() => {}); }, intervalMs);
  if (typeof timer.unref === "function") timer.unref();

  console.log(`outbox dispatcher: delivering to ${new URL(endpointUrl).origin} every ${intervalMs}ms`);

  return () => {
    stopped = true;
    clearInterval(timer);
  };
};
