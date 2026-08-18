import assert from "node:assert/strict";
import { test } from "node:test";
import { Pool } from "pg";

import { CLIENT_EVENT_TYPES, buildEventRow } from "../src/events.js";

// Shaping and validation need no database, so these run everywhere.
test("a client cannot claim to be someone, or invent a server-owned event", () => {
  assert.equal(
    CLIENT_EVENT_TYPES.has("order.placed"),
    false,
    "order.placed is written by the server inside the order transaction; accepting it from a browser would let anyone fake a sale",
  );
  assert.equal(CLIENT_EVENT_TYPES.has("product.viewed"), true);
});

test("event rows are shaped before they reach the database", () => {
  const row = buildEventRow({
    event_type: "  product.viewed  ",
    actor_customer_id: "not-a-uuid",
    entity_id: "6f5e44bc-37a6-4957-8ddb-bb5310adada4",
    entity_type: "product",
    source: "nonsense",
    payload: { price: 10 },
  });

  assert.equal(row.eventType, "product.viewed");
  assert.equal(row.actorCustomerId, null, "a malformed id becomes null rather than reaching SQL");
  assert.equal(row.entityId, "6f5e44bc-37a6-4957-8ddb-bb5310adada4");
  assert.equal(row.source, "web", "an unrecognised source falls back rather than failing the write");
  assert.deepEqual(row.payload, { price: 10 });
});

test("an oversized payload is dropped, not stored", () => {
  const row = buildEventRow({
    event_type: "search.performed",
    payload: { q: "x".repeat(20_000) },
  });
  assert.deepEqual(row.payload, { truncated: true });
});

test("a payload that cannot be serialised does not throw", () => {
  const circular = {};
  circular.self = circular;
  const row = buildEventRow({ event_type: "page.viewed", payload: circular });
  assert.deepEqual(row.payload, {});
});

test("an event without a type is rejected", () => {
  assert.throws(() => buildEventRow({ event_type: "  " }), /event_type is required/);
});

// The rest describe schema behaviour, so they need a migrated database.
const databaseUrl = process.env.TEST_DATABASE_URL;
const describe = databaseUrl ? test : test.skip;

const withPool = async (run) => {
  const pool = new Pool({ connectionString: databaseUrl, ssl: false, max: 1 });
  try {
    return await run(pool);
  } finally {
    await pool.end();
  }
};

describe("the same event cannot be recorded twice", async () => {
  await withPool(async (pool) => {
    const key = `test-idempotency-${Date.now()}`;
    const insert = `
      insert into public.events (event_type, source, idempotency_key)
      values ('product.viewed', 'web', $1)
      on conflict (idempotency_key) where idempotency_key is not null do nothing
      returning id
    `;

    const first = await pool.query(insert, [key]);
    const second = await pool.query(insert, [key]);

    assert.equal(first.rowCount, 1);
    assert.equal(second.rowCount, 0, "a retried delivery must not duplicate the row");

    await pool.query("delete from public.events where idempotency_key = $1", [key]);
  });
});

describe("signing in claims the browsing that came before it", async () => {
  await withPool(async (pool) => {
    const sessionId = `test-session-${Date.now()}`;
    const email = `attach-${Date.now()}@example.com`;

    const customer = await pool.query(
      "insert into public.customers (email, full_name) values ($1, 'בדיקה') returning id",
      [email],
    );
    const customerId = customer.rows[0].id;

    await pool.query(
      `insert into public.events (event_type, session_id, source)
       values ('product.viewed', $1, 'web'), ('search.performed', $1, 'web')`,
      [sessionId],
    );

    const attached = await pool.query(
      "select public.attach_session_events_to_customer($1, $2) as count",
      [sessionId, customerId],
    );
    assert.equal(attached.rows[0].count, 2, "both anonymous events should now belong to the person");

    const remaining = await pool.query(
      "select count(*)::int as count from public.events where session_id = $1 and actor_customer_id is null",
      [sessionId],
    );
    assert.equal(remaining.rows[0].count, 0);

    await pool.query("delete from public.events where session_id = $1", [sessionId]);
    await pool.query("delete from public.customers where id = $1", [customerId]);
  });
});

describe("an event outlives the thing it describes", async () => {
  await withPool(async (pool) => {
    const sessionId = `test-outlive-${Date.now()}`;
    // entity_id is deliberately not a foreign key: a log that disappears with
    // its subject is not a log.
    await pool.query(
      `insert into public.events (event_type, session_id, entity_type, entity_id, source)
       values ('product.viewed', $1, 'product', '00000000-0000-0000-0000-0000000000ff', 'web')`,
      [sessionId],
    );

    const stored = await pool.query(
      "select entity_id from public.events where session_id = $1",
      [sessionId],
    );
    assert.equal(stored.rowCount, 1);

    await pool.query("delete from public.events where session_id = $1", [sessionId]);
  });
});
