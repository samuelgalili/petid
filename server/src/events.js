// Recording behaviour is a side effect of the request, never its purpose.
//
// A failed insert here must not fail a checkout, a signup or a product save, so
// every writer swallows its own errors and logs them. The event stream is
// allowed to lose a row; the order is not.

const MAX_PAYLOAD_BYTES = 8 * 1024;
const MAX_SESSION_ID_LENGTH = 128;

// Event types the browser is allowed to post. Anything else is rejected, so a
// client cannot invent `order.placed` and pollute the record the server owns.
export const CLIENT_EVENT_TYPES = new Set([
  "product.viewed",
  "product.list_viewed",
  "search.performed",
  "search.no_results",
  "cart.item_added",
  "cart.item_removed",
  "cart.viewed",
  "checkout.started",
  "checkout.abandoned",
  "category.viewed",
  "page.viewed",
]);

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const asUuid = (value) => {
  const text = String(value || "").trim();
  return uuidPattern.test(text) ? text : null;
};

const asShortText = (value, maxLength) => {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
};

// Payloads come from browsers, so they are capped rather than trusted. A giant
// or circular object is dropped down to an empty one instead of throwing.
const sanitizePayload = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  try {
    const serialized = JSON.stringify(payload);
    if (serialized.length > MAX_PAYLOAD_BYTES) return { truncated: true };
    return JSON.parse(serialized);
  } catch {
    return {};
  }
};

export const buildEventRow = (event) => {
  const eventType = asShortText(event.event_type, 100);
  if (!eventType) throw new Error("event_type is required");

  return {
    eventType,
    occurredAt: event.occurred_at instanceof Date ? event.occurred_at : null,
    actorCustomerId: asUuid(event.actor_customer_id),
    actorAdminUserId: asUuid(event.actor_admin_user_id),
    sessionId: asShortText(event.session_id, MAX_SESSION_ID_LENGTH),
    entityType: asShortText(event.entity_type, 60),
    entityId: asUuid(event.entity_id),
    source: ["web", "admin", "api", "import", "system"].includes(event.source) ? event.source : "web",
    payload: sanitizePayload(event.payload),
    idempotencyKey: asShortText(event.idempotency_key, 200),
  };
};

// Writes one event. Pass a client to join an open transaction — an order and
// its `order.placed` event should commit together or not at all.
export const recordEvent = async (db, event) => {
  try {
    const row = buildEventRow(event);
    const result = await db.query(
      `
        insert into public.events (
          event_type, occurred_at, actor_customer_id, actor_admin_user_id,
          session_id, entity_type, entity_id, source, payload, idempotency_key
        ) values ($1, coalesce($2, now()), $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
        on conflict (idempotency_key) where idempotency_key is not null do nothing
        returning id
      `,
      [
        row.eventType,
        row.occurredAt,
        row.actorCustomerId,
        row.actorAdminUserId,
        row.sessionId,
        row.entityType,
        row.entityId,
        row.source,
        JSON.stringify(row.payload),
        row.idempotencyKey,
      ],
    );
    return result.rows[0]?.id || null;
  } catch (error) {
    console.error("event_record_failed", event?.event_type, error?.message);
    return null;
  }
};

// Same contract, for the several events a single request can produce.
export const recordEvents = async (db, events) => {
  const ids = [];
  for (const event of events) {
    ids.push(await recordEvent(db, event));
  }
  return ids;
};

// Called when an anonymous visitor becomes a known person, so the browsing that
// led up to the signup or the order is not orphaned.
export const attachSessionToCustomer = async (db, sessionId, customerId) => {
  const session = asShortText(sessionId, MAX_SESSION_ID_LENGTH);
  const customer = asUuid(customerId);
  if (!session || !customer) return 0;

  try {
    const result = await db.query(
      "select public.attach_session_events_to_customer($1, $2) as attached",
      [session, customer],
    );
    return result.rows[0]?.attached || 0;
  } catch (error) {
    console.error("event_session_attach_failed", error?.message);
    return 0;
  }
};

// Resolves the customer behind a signed-in user, so shop events carry the same
// id that orders and the CRM use rather than the login id.
export const customerIdForAppUser = async (db, appUserId) => {
  const id = asUuid(appUserId);
  if (!id) return null;

  try {
    const result = await db.query(
      "select id from public.customers where app_user_id = $1 limit 1",
      [id],
    );
    return result.rows[0]?.id || null;
  } catch (error) {
    console.error("event_customer_lookup_failed", error?.message);
    return null;
  }
};
