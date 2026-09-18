// Who acted, and whether a reader can tell.
//
// admin_audit_log has recorded actor_email and actor_role since it existed,
// and that was sufficient while every actor was a person with a session.
// Phase 6 has reactions to outbox events writing rows, and Phase 9 has AI
// agents doing the same. An agent running under a service account is
// indistinguishable from a human with that address.
//
// "The operations lead refunded ₪320" and "an agent refunded ₪320" are
// different sentences. An audit log that cannot tell them apart is not an
// audit log, and the failure is silent: every row still looks complete.

import assert from "node:assert/strict";
import test from "node:test";

import { ACTOR_TYPES, createAuditService } from "../src/adminOs/auditService.js";

const DATABASE_URL = process.env.DATABASE_URL;
const dbTest = (name, fn) => test(name, { skip: DATABASE_URL ? false : "DATABASE_URL not set" }, fn);

const withDb = async (fn) => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: false });
  const marker = `test.${Math.random().toString(36).slice(2)}`;
  try {
    await fn(createAuditService({ pool, logger: { error: () => {} } }), marker, pool);
  } finally {
    await pool.query("delete from public.admin_audit_log where entity_type like 'test.%'").catch(() => {});
    await pool.end();
  }
};

// ─── the value is validated at the call site, not three layers down ──────────

test("an unknown actor type is refused before it reaches the database", async () => {
  const audit = createAuditService({ pool: { query: async () => {} }, logger: { error: () => {} } });
  await assert.rejects(
    () => audit.record({ actorType: "robot", actionType: "x", entityType: "y" }),
    /Unknown audit actor_type/,
    "a bad actor type must fail at the call site with a stack trace, not as a\n" +
      "Postgres check-constraint error inside a catch that swallows it",
  );
});

test("an entry with no action or entity is refused", async () => {
  const audit = createAuditService({ pool: { query: async () => {} }, logger: { error: () => {} } });
  await assert.rejects(() => audit.record({ actionType: "x" }), /actionType and an entityType/);
  await assert.rejects(() => audit.record({ entityType: "y" }), /actionType and an entityType/);
});

test("a failed write does not fail the action it describes", async () => {
  // Same rule emitEvent follows. An unloggable action is bad; an action that
  // fails BECAUSE logging failed is worse, and on a payment path it is a
  // customer charged with no order.
  const audit = createAuditService({
    pool: { query: async () => { throw new Error("database is down"); } },
    logger: { error: () => {} },
  });
  await audit.record({ actionType: "payment.recorded", entityType: "order", entityId: "o1" });
});

// ─── the column carries the distinction ──────────────────────────────────────

dbTest("a system write is distinguishable from a person's", async () => {
  await withDb(async (audit, marker) => {
    await audit.record({
      actorType: ACTOR_TYPES.ADMIN,
      actor: { id: null, email: "ops@mipo.pet", role: "admin" },
      actionType: "order.refunded",
      entityType: marker,
      entityId: "order-1",
    });
    await audit.record({
      actorType: ACTOR_TYPES.AI_AGENT,
      actor: { id: null, email: "ops@mipo.pet", role: "admin" },
      actionType: "order.refunded",
      entityType: marker,
      entityId: "order-2",
    });

    const entries = await audit.list({ entityType: marker });
    assert.equal(entries.length, 2);

    // Same email, same role, same action. Only actor_type separates them, which
    // is exactly the case the column exists for.
    const byEntity = new Map(entries.map((entry) => [entry.entity_id, entry]));
    assert.equal(byEntity.get("order-1").actor_type, "admin");
    assert.equal(byEntity.get("order-2").actor_type, "ai_agent");
    assert.equal(byEntity.get("order-1").actor_email, byEntity.get("order-2").actor_email);
  });
});

dbTest("existing rows are admin, not null and not unknown", async () => {
  await withDb(async (audit, marker, pool) => {
    // The migration defaults to 'admin', which is true of every row that was in
    // this table before it ran: all of them were written by a person's session.
    // A nullable column would have made every historical row unclassifiable.
    await pool.query(
      `insert into public.admin_audit_log (action_type, entity_type, entity_id, actor_email, actor_role)
       values ('legacy.write', $1, 'x', 'someone@mipo.pet', 'admin')`,
      [marker],
    );
    const entries = await audit.list({ entityType: marker });
    assert.equal(entries[0].actor_type, "admin");
  });
});

dbTest("the check constraint refuses an actor type the service would have caught", async () => {
  await withDb(async (audit, marker, pool) => {
    // Defence in depth: the service validates, and so does the table. A second
    // writer that does not go through the service still cannot invent a type.
    await assert.rejects(
      () => pool.query(
        `insert into public.admin_audit_log (action_type, entity_type, actor_type)
         values ('x', $1, 'robot')`,
        [marker],
      ),
      /admin_audit_log_actor_type_check/,
    );
  });
});

// ─── filtering happens in SQL ────────────────────────────────────────────────

dbTest("a filter is applied in SQL, not to the most recent page", async () => {
  await withDb(async (audit, marker) => {
    // 60 system rows then one admin row. A client-side filter over a 50-row
    // page would find the admin row here by luck. Ask for the admin rows with a
    // small limit and the page must still contain it.
    for (let index = 0; index < 60; index += 1) {
      await audit.record({
        actorType: ACTOR_TYPES.SYSTEM,
        actionType: "reaction.ran",
        entityType: marker,
        entityId: `sys-${index}`,
      });
    }
    await audit.record({
      actorType: ACTOR_TYPES.ADMIN,
      actor: { id: null, email: "ops@mipo.pet", role: "admin" },
      actionType: "order.refunded",
      entityType: marker,
      entityId: "the-one",
    });
    for (let index = 0; index < 60; index += 1) {
      await audit.record({
        actorType: ACTOR_TYPES.SYSTEM,
        actionType: "reaction.ran",
        entityType: marker,
        entityId: `sys-late-${index}`,
      });
    }

    const admins = await audit.list({ entityType: marker, actorType: ACTOR_TYPES.ADMIN, limit: 5 });
    assert.equal(admins.length, 1);
    assert.equal(admins[0].entity_id, "the-one");
  });
});

dbTest("limit is capped, so a caller cannot ask for the whole table", async () => {
  await withDb(async (audit, marker) => {
    for (let index = 0; index < 3; index += 1) {
      await audit.record({ actorType: ACTOR_TYPES.SYSTEM, actionType: "x", entityType: marker, entityId: `${index}` });
    }
    // 100000 must not become the SQL limit. The cap is 200.
    const entries = await audit.list({ entityType: marker, limit: 100000 });
    assert.ok(entries.length <= 200);
  });
});

dbTest("an unknown actor_type filter is an error, not a silent empty list", async () => {
  await withDb(async (audit) => {
    // Returning [] for a typo tells the reader "nothing happened", which is a
    // different and much worse answer than "that is not a thing".
    await assert.rejects(() => audit.list({ actorType: "robot" }), /Unknown actor_type filter/);
  });
});
