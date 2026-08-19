import assert from "node:assert/strict";
import { test } from "node:test";
import { Pool } from "pg";

import {
  backoffSeconds,
  buildDeliveryBody,
  deliverDue,
  dispatchPendingEvents,
  isTerminalStatus,
  replayDeliveries,
  sendDelivery,
  signPayload,
  verifySignature,
} from "../src/eventBus.js";

// The SSRF check resolves the target for real before anything is sent, so a
// test that wants to reach the send path has to answer the DNS question itself.
// It answers with a genuinely public address — the documentation ranges are
// themselves on the block list — while the internal-network case below uses the
// real resolver on purpose.
const publicLookup = async () => [{ address: "93.184.216.34", family: 4 }];

// ---------------------------------------------------------------------------
// Signing, backoff and body shape need no database.
// ---------------------------------------------------------------------------

test("the signature covers the timestamp, so a captured request cannot be replayed", () => {
  const body = JSON.stringify({ event_type: "order.placed" });
  const signature = signPayload("s3cret", "1700000000", body);

  assert.ok(verifySignature("s3cret", "1700000000", body, signature));
  assert.equal(
    verifySignature("s3cret", "1700009999", body, signature),
    false,
    "the same signature must not validate under a fresher timestamp",
  );
});

test("a signature does not validate under a different secret or a changed body", () => {
  const body = JSON.stringify({ total: 100 });
  const signature = signPayload("right", "1700000000", body);

  assert.equal(verifySignature("wrong", "1700000000", body, signature), false);
  assert.equal(
    verifySignature("right", "1700000000", JSON.stringify({ total: 1 }), signature),
    false,
    "changing the amount must invalidate the signature",
  );
});

test("comparing signatures of different lengths does not throw", () => {
  // timingSafeEqual raises on a length mismatch; a garbage header must be a
  // false, not a 500.
  assert.equal(verifySignature("s", "1", "{}", "short"), false);
  assert.equal(verifySignature("s", "1", "{}", ""), false);
  assert.equal(verifySignature("s", "1", "{}", undefined), false);
});

test("backoff grows and then stops growing", () => {
  assert.equal(backoffSeconds(1), 30);
  assert.equal(backoffSeconds(2), 60);
  assert.equal(backoffSeconds(3), 120);
  assert.equal(backoffSeconds(20), 3600, "an hour is the ceiling, not infinity");

  for (let attempt = 1; attempt < 12; attempt += 1) {
    assert.ok(backoffSeconds(attempt + 1) >= backoffSeconds(attempt));
  }
});

test("only 410 ends the retries", () => {
  // n8n answers 404 for a workflow that is merely deactivated, and 200 the
  // moment someone activates it. Treating that as permanent would silently drop
  // every event sent while a workflow was being edited.
  assert.equal(isTerminalStatus(404), false);
  assert.equal(isTerminalStatus(500), false);
  assert.equal(isTerminalStatus(429), false);
  assert.equal(isTerminalStatus(410), true);
});

test("the delivered body carries what a workflow branches on", () => {
  const body = buildDeliveryBody({
    delivery_id: "d1",
    event_id: "e1",
    event_type: "order.placed",
    occurred_at: new Date("2026-01-01T10:00:00Z"),
    source: "web",
    entity_type: "order",
    entity_id: "11111111-1111-1111-1111-111111111111",
    actor_customer_id: "22222222-2222-2222-2222-222222222222",
    payload: { total: 249 },
    attempts: 2,
  });

  assert.equal(body.event_type, "order.placed");
  assert.equal(body.occurred_at, "2026-01-01T10:00:00.000Z");
  assert.equal(body.entity.id, "11111111-1111-1111-1111-111111111111");
  assert.equal(body.actor.customer_id, "22222222-2222-2222-2222-222222222222");
  assert.deepEqual(body.payload, { total: 249 });
  assert.equal(body.delivery.attempt, 2);
});

test("the idempotency key is the delivery, so a retry is recognisable as one", async () => {
  const seen = [];
  const row = {
    delivery_id: "44444444-4444-4444-4444-444444444444",
    event_id: "55555555-5555-5555-5555-555555555555",
    target_url: "https://n8n.example.com/webhook/mipo",
    secret: "s3cret",
    headers: {},
    timeout_ms: 5000,
    attempts: 1,
    event_type: "order.placed",
    occurred_at: new Date(),
    source: "web",
    payload: {},
  };

  const fetchFn = async (_url, options) => {
    seen.push(options.headers);
    return { status: 200, body: null };
  };

  await sendDelivery(row, { fetchFn, lookupFn: publicLookup });
  await sendDelivery({ ...row, attempts: 2 }, { fetchFn, lookupFn: publicLookup });

  assert.equal(seen.length, 2);
  assert.equal(
    seen[0]["x-mipo-idempotency-key"],
    seen[1]["x-mipo-idempotency-key"],
    "a retry must carry the same key or the receiver cannot deduplicate it",
  );
  assert.equal(seen[0]["x-mipo-attempt"], "1");
  assert.equal(seen[1]["x-mipo-attempt"], "2");
});

test("a subscription cannot forge the headers that identify the event", async () => {
  let sent = null;
  const fetchFn = async (_url, options) => {
    sent = options.headers;
    return { status: 200, body: null };
  };

  await sendDelivery(
    {
      delivery_id: "66666666-6666-6666-6666-666666666666",
      event_id: "77777777-7777-7777-7777-777777777777",
      target_url: "https://n8n.example.com/webhook/mipo",
      secret: "s3cret",
      headers: {
        "x-mipo-signature": "sha256=forged",
        "x-mipo-event": "order.placed",
        "x-api-key": "legitimate",
        "Bad Header": "dropped",
      },
      timeout_ms: 5000,
      attempts: 1,
      event_type: "product.viewed",
      occurred_at: new Date(),
      source: "web",
      payload: {},
    },
    { fetchFn, lookupFn: publicLookup },
  );

  assert.equal(sent["x-mipo-event"], "product.viewed", "the real event type stands");
  assert.notEqual(sent["x-mipo-signature"], "sha256=forged");
  assert.equal(sent["x-api-key"], "legitimate", "an ordinary credential header still goes through");
  assert.equal("Bad Header" in sent, false);
});

test("a target on the internal network is refused rather than fetched", async () => {
  let called = false;
  const outcome = await sendDelivery(
    {
      delivery_id: "d", event_id: "e", target_url: "http://169.254.169.254/latest/meta-data/",
      headers: {}, timeout_ms: 1000, attempts: 1, event_type: "x",
      occurred_at: new Date(), source: "system", payload: {},
    },
    { fetchFn: async () => { called = true; return { status: 200, body: null }; } },
  );

  assert.equal(called, false, "the request must not be made at all");
  assert.equal(outcome.ok, false);
});

test("a timeout is reported as a failure rather than hanging the worker", async () => {
  const outcome = await sendDelivery(
    {
      delivery_id: "d", event_id: "e", target_url: "https://n8n.example.com/webhook/mipo",
      headers: {}, timeout_ms: 1000, attempts: 1, event_type: "x",
      occurred_at: new Date(), source: "system", payload: {},
    },
    {
      lookupFn: publicLookup,
      fetchFn: async (_url, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => {
          reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
        });
      }),
    },
  );

  assert.equal(outcome.ok, false);
  assert.match(outcome.error, /Timed out/);
});

// ---------------------------------------------------------------------------
// Fan-out and delivery state need a migrated database.
// ---------------------------------------------------------------------------

const databaseUrl = process.env.TEST_DATABASE_URL;
const describe = databaseUrl ? test : test.skip;

const withPool = async (run) => {
  const pool = new Pool({ connectionString: databaseUrl, ssl: false, max: 2 });
  try {
    return await run(pool);
  } finally {
    await pool.end();
  }
};

// deliverDue drains the whole table by design — a worker has no business
// filtering by test. So each test starts from a clean bus instead: stale
// subscriptions from an earlier run would otherwise receive these events too,
// and a leftover event would be fanned out into a subscription under test.
const resetBus = async (pool) => {
  await pool.query("delete from public.event_subscriptions");
  await pool.query("delete from public.event_deliveries");
  await pool.query(
    `update public.events
     set dispatched_at = coalesce(dispatched_at, now()),
         delivered_at = coalesce(delivered_at, now())
     where dispatched_at is null`,
  );
};

const newSubscription = async (pool, { name, eventTypes, url = "https://n8n.example.com/webhook/t" }) => {
  const result = await pool.query(
    `insert into public.event_subscriptions (name, target_url, event_types, secret)
     values ($1, $2, $3::text[], 'test-secret') returning id`,
    [name, url, eventTypes],
  );
  return result.rows[0].id;
};

describe("wildcards match a family of events, and nothing else", async () => {
  await withPool(async (pool) => {
    const cases = [
      ["order.placed", ["order.*"], true],
      ["order.placed", ["order.placed"], true],
      ["order.placed", ["*"], true],
      ["order.placed", ["product.*"], false],
      ["order.placed", [], false],
      ["orderly.placed", ["order.*"], false],
      ["order", ["order.*"], false],
    ];

    for (const [eventType, patterns, expected] of cases) {
      const result = await pool.query(
        "select public.event_matches_patterns($1, $2::text[]) as matched",
        [eventType, patterns],
      );
      assert.equal(
        result.rows[0].matched,
        expected,
        `${eventType} against ${JSON.stringify(patterns)}`,
      );
    }
  });
});

describe("fan-out reaches every interested subscription exactly once", async () => {
  await withPool(async (pool) => {
    await resetBus(pool);
    const key = `bus-fanout-${Date.now()}`;
    const orders = await newSubscription(pool, { name: `${key}-orders`, eventTypes: ["order.*"] });
    const everything = await newSubscription(pool, { name: `${key}-all`, eventTypes: ["*"] });
    const products = await newSubscription(pool, { name: `${key}-products`, eventTypes: ["product.viewed"] });

    const event = await pool.query(
      "insert into public.events (event_type, source, idempotency_key) values ('order.placed', 'web', $1) returning id",
      [key],
    );
    const eventId = event.rows[0].id;

    await dispatchPendingEvents(pool);
    // Running it again is what happens after a crash between the two steps.
    await dispatchPendingEvents(pool);

    const deliveries = await pool.query(
      "select subscription_id from public.event_deliveries where event_id = $1",
      [eventId],
    );
    const targets = deliveries.rows.map((row) => row.subscription_id).sort();
    assert.deepEqual(targets, [orders, everything].sort(), "product-only must not receive an order");
    assert.equal(deliveries.rowCount, 2, "a second dispatch must not duplicate a delivery");

    await pool.query("delete from public.events where id = $1", [eventId]);
    await pool.query("delete from public.event_subscriptions where id = any($1::uuid[])", [
      [orders, everything, products],
    ]);
  });
});

describe("an event nobody wants is finished, not left pending forever", async () => {
  await withPool(async (pool) => {
    await resetBus(pool);
    const key = `bus-unwanted-${Date.now()}`;
    const event = await pool.query(
      "insert into public.events (event_type, source, idempotency_key) values ('page.viewed', 'web', $1) returning id",
      [key],
    );

    await dispatchPendingEvents(pool);

    const row = await pool.query(
      "select dispatched_at, delivered_at from public.events where id = $1",
      [event.rows[0].id],
    );
    assert.ok(row.rows[0].dispatched_at, "it was offered");
    assert.ok(
      row.rows[0].delivered_at,
      "with no subscriber there is nothing left to send, and the pending index must not carry it",
    );

    await pool.query("delete from public.events where id = $1", [event.rows[0].id]);
  });
});

describe("a failed delivery is retried, and a retried delivery is not sent twice at once", async () => {
  await withPool(async (pool) => {
    await resetBus(pool);
    const key = `bus-retry-${Date.now()}`;
    const subscription = await newSubscription(pool, { name: key, eventTypes: ["order.*"] });
    const event = await pool.query(
      "insert into public.events (event_type, source, idempotency_key) values ('order.placed', 'web', $1) returning id",
      [key],
    );
    const eventId = event.rows[0].id;

    await dispatchPendingEvents(pool);

    let calls = 0;
    await deliverDue(pool, {
      lookupFn: publicLookup,
      fetchFn: async () => {
        calls += 1;
        return { status: 500, text: async () => "boom" };
      },
    });
    assert.equal(calls, 1);

    const afterFailure = await pool.query(
      "select status, attempts, run_after > now() as backed_off, last_error from public.event_deliveries where event_id = $1",
      [eventId],
    );
    assert.equal(afterFailure.rows[0].status, "pending");
    assert.equal(afterFailure.rows[0].attempts, 1);
    assert.equal(afterFailure.rows[0].backed_off, true, "an immediate retry would be a tight loop");
    assert.match(afterFailure.rows[0].last_error, /500/);

    // A backed-off delivery is not due, so a second pass must find nothing.
    const idle = await deliverDue(pool, { lookupFn: publicLookup, fetchFn: async () => ({ status: 200, body: null }) });
    assert.equal(idle.claimed, 0);

    // Now let it be due and succeed.
    await pool.query("update public.event_deliveries set run_after = now() where event_id = $1", [eventId]);
    const sent = await deliverDue(pool, { lookupFn: publicLookup, fetchFn: async () => ({ status: 200, body: null }) });
    assert.equal(sent.delivered, 1);

    const settled = await pool.query(
      `select d.status, d.response_status, e.delivered_at, s.last_success_at
       from public.event_deliveries d
       join public.events e on e.id = d.event_id
       join public.event_subscriptions s on s.id = d.subscription_id
       where d.event_id = $1`,
      [eventId],
    );
    assert.equal(settled.rows[0].status, "delivered");
    assert.equal(settled.rows[0].response_status, 200);
    assert.ok(settled.rows[0].delivered_at, "the event is done once its last destination took it");
    assert.ok(settled.rows[0].last_success_at, "the subscription records that it is healthy");

    await pool.query("delete from public.events where id = $1", [eventId]);
    await pool.query("delete from public.event_subscriptions where id = $1", [subscription]);
  });
});

describe("attempts run out, and a dead delivery can be replayed", async () => {
  await withPool(async (pool) => {
    await resetBus(pool);
    const key = `bus-dead-${Date.now()}`;
    const subscription = await pool.query(
      `insert into public.event_subscriptions (name, target_url, event_types, max_attempts)
       values ($1, 'https://n8n.example.com/webhook/dead', '{"order.*"}', 2) returning id`,
      [key],
    );
    const subscriptionId = subscription.rows[0].id;

    const event = await pool.query(
      "insert into public.events (event_type, source, idempotency_key) values ('order.placed', 'web', $1) returning id",
      [key],
    );
    const eventId = event.rows[0].id;

    await dispatchPendingEvents(pool);

    const failing = async () => ({ status: 500, text: async () => "still down" });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await pool.query("update public.event_deliveries set run_after = now() where event_id = $1", [eventId]);
      await deliverDue(pool, { lookupFn: publicLookup, fetchFn: failing });
    }

    const dead = await pool.query(
      `select d.status, d.attempts, e.delivered_at
       from public.event_deliveries d join public.events e on e.id = d.event_id
       where d.event_id = $1`,
      [eventId],
    );
    assert.equal(dead.rows[0].status, "dead");
    assert.equal(dead.rows[0].attempts, 2);
    assert.ok(
      dead.rows[0].delivered_at,
      "a dead delivery is recorded on the delivery, not by leaving the event pending forever",
    );

    const { replayed } = await replayDeliveries(pool, { subscriptionId });
    assert.equal(replayed, 1);

    const revived = await pool.query(
      "select status, attempts, last_error from public.event_deliveries where event_id = $1",
      [eventId],
    );
    assert.equal(revived.rows[0].status, "pending");
    assert.equal(revived.rows[0].attempts, 0, "a replay starts its retry budget over");
    assert.equal(revived.rows[0].last_error, null);

    await pool.query("delete from public.events where id = $1", [eventId]);
    await pool.query("delete from public.event_subscriptions where id = $1", [subscriptionId]);
  });
});

describe("410 is taken at face value and stops the retries immediately", async () => {
  await withPool(async (pool) => {
    await resetBus(pool);
    const key = `bus-gone-${Date.now()}`;
    const subscription = await newSubscription(pool, { name: key, eventTypes: ["order.*"] });
    const event = await pool.query(
      "insert into public.events (event_type, source, idempotency_key) values ('order.placed', 'web', $1) returning id",
      [key],
    );

    await dispatchPendingEvents(pool);
    await deliverDue(pool, { lookupFn: publicLookup, fetchFn: async () => ({ status: 410, text: async () => "gone" }) });

    const result = await pool.query(
      "select status, attempts from public.event_deliveries where event_id = $1",
      [event.rows[0].id],
    );
    assert.equal(result.rows[0].status, "dead");
    assert.equal(result.rows[0].attempts, 1, "a deleted webhook is not worth eight tries");

    await pool.query("delete from public.events where id = $1", [event.rows[0].id]);
    await pool.query("delete from public.event_subscriptions where id = $1", [subscription]);
  });
});

describe("an inactive subscription stops receiving without losing its history", async () => {
  await withPool(async (pool) => {
    await resetBus(pool);
    const key = `bus-paused-${Date.now()}`;
    const subscription = await newSubscription(pool, { name: key, eventTypes: ["order.*"] });

    const first = await pool.query(
      "insert into public.events (event_type, source, idempotency_key) values ('order.placed', 'web', $1) returning id",
      [`${key}-1`],
    );
    await dispatchPendingEvents(pool);

    await pool.query("update public.event_subscriptions set is_active = false where id = $1", [subscription]);

    const second = await pool.query(
      "insert into public.events (event_type, source, idempotency_key) values ('order.placed', 'web', $1) returning id",
      [`${key}-2`],
    );
    await dispatchPendingEvents(pool);

    const created = await pool.query(
      "select count(*)::int as count from public.event_deliveries where subscription_id = $1",
      [subscription],
    );
    assert.equal(created.rows[0].count, 1, "the paused subscription must not be fanned out to");

    // The queued delivery from before the pause is held, not sent.
    const claimed = await deliverDue(pool, { lookupFn: publicLookup, fetchFn: async () => ({ status: 200, body: null }) });
    assert.equal(claimed.claimed, 0, "a paused destination is not delivered to either");

    await pool.query("delete from public.events where id = any($1::uuid[])", [
      [first.rows[0].id, second.rows[0].id],
    ]);
    await pool.query("delete from public.event_subscriptions where id = $1", [subscription]);
  });
});
