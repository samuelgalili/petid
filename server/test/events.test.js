import assert from "node:assert/strict";
import test from "node:test";

import {
  EVENT_ORIGINS,
  EVENT_TYPES,
  MAX_ATTEMPTS,
  backoffSecondsFor,
  buildDeliveryBody,
  emitEvent,
  originFromRequest,
  signPayload,
  verifySignature,
} from "../src/events.js";

test("every declared event type matches the database check constraint", () => {
  const pattern = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;
  for (const type of Object.values(EVENT_TYPES)) {
    assert.ok(pattern.test(type), `${type} would be rejected by outbox_events_type_check`);
  }
});

test("only the automation origin can be claimed by a caller", () => {
  assert.equal(
    originFromRequest({ headers: { "x-mipo-origin": "automation" } }),
    EVENT_ORIGINS.AUTOMATION,
  );
  assert.equal(
    originFromRequest({ headers: { "x-mipo-origin": "AUTOMATION" } }),
    EVENT_ORIGINS.AUTOMATION,
  );
  // A caller must not be able to pass itself off as the system or an admin.
  assert.equal(originFromRequest({ headers: { "x-mipo-origin": "system" } }), EVENT_ORIGINS.APP);
  assert.equal(originFromRequest({ headers: { "x-mipo-origin": "admin" } }), EVENT_ORIGINS.APP);
  assert.equal(originFromRequest({ headers: {} }), EVENT_ORIGINS.APP);
  assert.equal(originFromRequest(undefined), EVENT_ORIGINS.APP);
});

test("an unknown event type is refused rather than written", async () => {
  let queried = false;
  const client = { query: async () => { queried = true; return { rows: [{ id: "x" }] }; } };

  const id = await emitEvent(client, {
    type: "not.a-real-type!",
    entityType: "order",
  });

  assert.equal(id, null);
  assert.equal(queried, false, "an invalid type must never reach the database");
});

test("a database failure never propagates into the business path", async () => {
  const client = { query: async () => { throw new Error("connection lost"); } };

  const id = await emitEvent(client, {
    type: EVENT_TYPES.ORDER_PAID,
    entityType: "order",
    entityId: "11111111-1111-4111-8111-111111111111",
  });

  assert.equal(id, null, "emitEvent must swallow its own failures");
});

test("emitted events carry the origin they were given", async () => {
  const captured = [];
  const client = {
    query: async (_sql, values) => { captured.push(values); return { rows: [{ id: "evt" }] }; },
  };

  await emitEvent(client, {
    type: EVENT_TYPES.ORDER_CREATED,
    entityType: "order",
    entityId: "22222222-2222-4222-8222-222222222222",
    payload: { total: 99 },
    origin: EVENT_ORIGINS.AUTOMATION,
  });

  const [type, entityType, entityId, payload, origin] = captured[0];
  assert.equal(type, "order.created");
  assert.equal(entityType, "order");
  assert.equal(entityId, "22222222-2222-4222-8222-222222222222");
  assert.deepEqual(JSON.parse(payload), { total: 99 });
  assert.equal(origin, EVENT_ORIGINS.AUTOMATION);
});

test("backoff grows and then holds at its ceiling", () => {
  assert.equal(backoffSecondsFor(1), 10);
  assert.equal(backoffSecondsFor(2), 60);
  assert.equal(backoffSecondsFor(3), 300);
  assert.equal(backoffSecondsFor(5), 7200);
  assert.equal(backoffSecondsFor(MAX_ATTEMPTS), 7200);
  // Guards against a caller passing 0 and indexing off the front.
  assert.equal(backoffSecondsFor(0), 10);
});

test("delivery bodies expose a stable id subscribers can deduplicate on", () => {
  const body = buildDeliveryBody({
    id: "evt-1",
    event_type: "order.paid",
    entity_type: "order",
    entity_id: "33333333-3333-4333-8333-333333333333",
    payload: { total: 250 },
    origin: "app",
    occurred_at: "2026-08-25T10:00:00.000Z",
    attempts: 2,
  });

  const parsed = JSON.parse(body);
  assert.equal(parsed.id, "evt-1");
  assert.equal(parsed.type, "order.paid");
  assert.equal(parsed.entity.type, "order");
  assert.equal(parsed.attempt, 2);
  assert.deepEqual(parsed.data, { total: 250 });
});

test("signatures verify the exact body and reject tampering", () => {
  const secret = "shared-secret";
  const body = JSON.stringify({ type: "order.paid", total: 100 });
  const signature = signPayload(secret, body);

  assert.equal(verifySignature(secret, body, signature), true);
  assert.equal(verifySignature(secret, JSON.stringify({ total: 999 }), signature), false);
  assert.equal(verifySignature("wrong-secret", body, signature), false);
  assert.equal(verifySignature(secret, body, "short"), false);
  assert.equal(verifySignature(secret, body, null), false);
  assert.equal(verifySignature(null, body, signature), false);
});
