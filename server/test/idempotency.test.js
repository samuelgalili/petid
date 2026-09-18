// 0056 · a retry must not charge twice, and a different request must not be
// mistaken for a retry.
//
// The second half is the one worth the table. A naive implementation - "have I
// seen this key? then return what I returned" - handles the retry case and
// silently DISCARDS a genuinely different request that reused a key, reporting
// success for work it never did. That failure mode is invisible: the caller
// gets a 200 with a plausible body.
//
// So every test below is about a way the helper could be wrong while looking
// right, not about the happy path.

import assert from "node:assert/strict";
import test from "node:test";

import { createIdempotency, fingerprintRequest, IdempotencyConflict } from "../src/adminOs/idempotency.js";

const DATABASE_URL = process.env.DATABASE_URL;
const dbTest = (name, fn) => test(name, { skip: DATABASE_URL ? false : "DATABASE_URL not set" }, fn);

const withPool = async (fn) => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: false });
  const scope = `test:${Math.random().toString(36).slice(2)}`;
  try {
    await fn(createIdempotency({ pool }), scope, pool);
  } finally {
    await pool.query("delete from public.idempotency_keys where scope like 'test:%'").catch(() => {});
    await pool.end();
  }
};

// ─── the fingerprint ─────────────────────────────────────────────────────────

test("the fingerprint does not depend on key order", () => {
  // Otherwise two JSON encodings of the same request look like two different
  // requests, and every retry from a client that serialises differently is
  // refused as a key reuse.
  assert.equal(
    fingerprintRequest({ amount: 320, method: "cash" }),
    fingerprintRequest({ method: "cash", amount: 320 }),
  );
});

test("the fingerprint changes when the request changes", () => {
  assert.notEqual(
    fingerprintRequest({ amount: 320, method: "cash" }),
    fingerprintRequest({ amount: 321, method: "cash" }),
  );
  // Nesting counts too - a naive top-level-only hash would miss this.
  assert.notEqual(
    fingerprintRequest({ items: [{ qty: 1 }] }),
    fingerprintRequest({ items: [{ qty: 2 }] }),
  );
});

// ─── the effect happens once ─────────────────────────────────────────────────

dbTest("a replay returns the first response and does not run the work again", async () => {
  await withPool(async (withIdempotency, scope) => {
    let runs = 0;
    const work = async () => {
      runs += 1;
      return { status: 201, body: { payment_id: "p1", amount: 320 } };
    };
    const payload = { amount: 320, method: "cash" };

    const first = await withIdempotency({ scope, key: "k1", payload }, work);
    const second = await withIdempotency({ scope, key: "k1", payload }, work);

    assert.equal(runs, 1, "the work ran twice - this is the double charge");
    assert.equal(first.replayed, false);
    assert.equal(second.replayed, true);
    assert.equal(second.status, 201);
    assert.deepEqual(second.body, { payment_id: "p1", amount: 320 });
  });
});

dbTest("a DIFFERENT request under the same key is refused, not replayed", async () => {
  await withPool(async (withIdempotency, scope) => {
    let runs = 0;
    const work = async () => {
      runs += 1;
      return { status: 201, body: { ok: true } };
    };

    await withIdempotency({ scope, key: "k2", payload: { amount: 320 } }, work);

    await assert.rejects(
      () => withIdempotency({ scope, key: "k2", payload: { amount: 999 } }, work),
      (error) => {
        assert.ok(error instanceof IdempotencyConflict);
        assert.equal(error.code, "idempotency_key_reused");
        assert.equal(error.statusCode, 409);
        return true;
      },
      "a ₪999 payment under a ₪320 payment's key must NOT be answered with the ₪320 response",
    );

    assert.equal(runs, 1);
  });
});

dbTest("two concurrent requests with one key: exactly one runs", async () => {
  await withPool(async (withIdempotency, scope) => {
    let runs = 0;
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const work = async () => {
      runs += 1;
      await gate;
      return { status: 201, body: { ok: true } };
    };
    const payload = { amount: 50 };

    // The case a check-then-act misses: both read "not seen", both charge.
    const a = withIdempotency({ scope, key: "k3", payload }, work);
    // Give the first call time to claim the row before the second arrives.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const b = withIdempotency({ scope, key: "k3", payload }, work).catch((error) => error);

    release();
    await a;
    const second = await b;

    assert.equal(runs, 1, "both requests ran the work");
    assert.ok(second instanceof IdempotencyConflict);
    assert.equal(
      second.code,
      "idempotency_in_progress",
      "the second request was told the first had completed when it had not - " +
        "that is a guess about money",
    );
  });
});

dbTest("a failed attempt releases the key so a real retry can proceed", async () => {
  await withPool(async (withIdempotency, scope) => {
    let runs = 0;
    const failing = async () => {
      runs += 1;
      throw new Error("gateway timeout");
    };
    const succeeding = async () => {
      runs += 1;
      return { status: 201, body: { ok: true } };
    };
    const payload = { amount: 10 };

    await assert.rejects(() => withIdempotency({ scope, key: "k4", payload }, failing));

    // Without the release, this would be refused for 24 hours and the operator
    // would work around it by inventing a second key - which defeats the point.
    const retry = await withIdempotency({ scope, key: "k4", payload }, succeeding);
    assert.equal(retry.status, 201);
    assert.equal(retry.replayed, false);
    assert.equal(runs, 2);
  });
});

dbTest("the same key on a different endpoint is a different key", async () => {
  await withPool(async (withIdempotency, scope) => {
    const payload = { amount: 320 };
    const a = await withIdempotency(
      { scope: `${scope}:payments`, key: "shared", payload },
      async () => ({ status: 201, body: { kind: "payment" } }),
    );
    const b = await withIdempotency(
      { scope: `${scope}:messages`, key: "shared", payload },
      async () => ({ status: 202, body: { kind: "message" } }),
    );

    assert.equal(a.body.kind, "payment");
    assert.equal(
      b.body.kind,
      "message",
      "a reused key returned the OTHER endpoint's response - scoping is what stops this",
    );
    assert.equal(b.replayed, false);
  });
});

dbTest("a missing key is refused rather than silently unprotected", async () => {
  await withPool(async (withIdempotency, scope) => {
    await assert.rejects(
      () => withIdempotency({ scope, key: null, payload: {} }, async () => ({ status: 200, body: {} })),
      (error) => error.code === "idempotency_key_required",
    );
  });
});

// ─── the constraint is in the database, not only in the helper ───────────────

dbTest("the unique constraint exists, so a second process cannot bypass the helper", async () => {
  await withPool(async (withIdempotency, scope, pool) => {
    await pool.query(
      "insert into public.idempotency_keys (scope, idempotency_key, request_fingerprint) values ($1, $2, $3)",
      [scope, "direct", "abc"],
    );
    await assert.rejects(
      () => pool.query(
        "insert into public.idempotency_keys (scope, idempotency_key, request_fingerprint) values ($1, $2, $3)",
        [scope, "direct", "def"],
      ),
      /idempotency_keys_scope_key_unique|duplicate key/,
      "without the unique index, two API processes both claim the key and both charge",
    );
  });
});

dbTest("a completed row must carry the response it completed with", async () => {
  await withPool(async (withIdempotency, scope, pool) => {
    // A completed row with no stored response replays as "nothing", and the
    // caller retries for real - which is the double charge, arrived at by a
    // different route.
    await assert.rejects(
      () => pool.query(
        `insert into public.idempotency_keys (scope, idempotency_key, request_fingerprint, status)
         values ($1, $2, $3, 'completed')`,
        [scope, "no-response", "abc"],
      ),
      /idempotency_keys_completed_has_response/,
    );
  });
});
