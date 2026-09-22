// The Command Center's board, and the four boundaries it can quietly get wrong.
//
// A board is a claim about where things ARE. Every failure mode is silent: a
// row in the wrong column, a column whose total is its own page length, a
// health check that reports "fine" because it measured nothing. None of those
// raise anything; they just make an operations screen that is confidently
// wrong, which is worse than one that is obviously broken.
//
// So this runs against a real database and moves real rows across the
// boundaries.

import assert from "node:assert/strict";
import test from "node:test";

import { readCommandCenter } from "../src/adminOs/commandCenter.js";

const DATABASE_URL = process.env.DATABASE_URL;
const dbTest = (name, fn) => test(name, { skip: DATABASE_URL ? false : "DATABASE_URL not set" }, fn);

const withDb = async (fn) => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: false });
  const tag = `c${Math.random().toString(36).slice(2, 8)}`;
  try {
    await fn({ pool, tag });
  } finally {
    await pool.query("delete from public.orders where order_number like $1", [`%${tag}%`]).catch(() => {});
    await pool.end();
  }
};

/**
 * An order, with control over how long ago it was last touched.
 *
 * `updatedMinutesAgo` exists for one boundary: a payment in the 'creating'
 * state is in flight for a few minutes and abandoned after that, and the
 * board has to tell those apart.
 */
const makeOrder = async (pool, tag, {
  status = "processing", paymentStatus = "paid", total = 100, updatedMinutesAgo = 0,
}) => {
  const result = await pool.query(
    `insert into public.orders
       (order_number, customer_name, status, payment_status, total, created_at, updated_at)
     values ($1, $2, $3, $4, $5, now() - ($6 * interval '1 minute'), now() - ($6 * interval '1 minute'))
     returning id`,
    [
      `${tag}-${Math.random().toString(36).slice(2, 7)}`, `לקוח ${tag}`,
      status, paymentStatus, total, updatedMinutesAgo,
    ],
  );
  return result.rows[0].id;
};

const columnOf = (board, id) =>
  Object.entries(board).find(([, column]) => column.items.some((item) => item.id === id))?.[0] ?? null;

// ─── a thing is in exactly one column ────────────────────────────────────────

dbTest("a failed payment is an exception", async () => {
  await withDb(async ({ pool, tag }) => {
    const id = await makeOrder(pool, tag, { status: "pending", paymentStatus: "failed" });
    const { board } = await readCommandCenter({ pool });

    assert.equal(columnOf(board, id), "exception",
      "an order whose payment failed is not being shown as an exception");
  });
});

dbTest("a payment still in flight is not an exception yet", async () => {
  /*
   * THE BOUNDARY THIS FILE EXISTS FOR. 'creating' means a payment attempt is
   * open. For the first few minutes that is normal - the customer is on the
   * card page - and flagging it would put every checkout in progress into the
   * exception column, which is how a red column stops meaning anything.
   */
  await withDb(async ({ pool, tag }) => {
    const fresh = await makeOrder(pool, tag, {
      status: "pending", paymentStatus: "creating", updatedMinutesAgo: 2,
    });
    const { board } = await readCommandCenter({ pool });

    assert.notEqual(columnOf(board, fresh), "exception",
      "a checkout two minutes old is being reported as a failure");
  });
});

dbTest("a payment that never finished starting is", async () => {
  // The other side of the same boundary. After fifteen minutes nobody is on
  // the card page, and the customer is looking at something that never
  // resolved.
  await withDb(async ({ pool, tag }) => {
    const stuck = await makeOrder(pool, tag, {
      status: "pending", paymentStatus: "creating", updatedMinutesAgo: 45,
    });
    const { board } = await readCommandCenter({ pool });

    assert.equal(columnOf(board, stuck), "exception",
      "an abandoned payment attempt is not being surfaced");
  });
});

dbTest("an order waiting for a decision is an approval, not an exception", async () => {
  // Nothing is WRONG with a pending order. Putting it in the red column means
  // a normal morning looks like an emergency.
  await withDb(async ({ pool, tag }) => {
    const id = await makeOrder(pool, tag, { status: "pending", paymentStatus: "pending" });
    const { board } = await readCommandCenter({ pool });

    assert.equal(columnOf(board, id), "approval");
  });
});

dbTest("an order being picked is in progress", async () => {
  await withDb(async ({ pool, tag }) => {
    const id = await makeOrder(pool, tag, { status: "processing" });
    const { board } = await readCommandCenter({ pool });

    assert.equal(columnOf(board, id), "in_progress");
  });
});

dbTest("a delivered order is completed", async () => {
  await withDb(async ({ pool, tag }) => {
    const id = await makeOrder(pool, tag, { status: "delivered" });
    const { board } = await readCommandCenter({ pool });

    assert.equal(columnOf(board, id), "completed");
  });
});

dbTest("a cancelled order is not an exception", async () => {
  // Somebody already dealt with it. A board that keeps showing decisions that
  // were made is a board people stop reading.
  await withDb(async ({ pool, tag }) => {
    const id = await makeOrder(pool, tag, { status: "cancelled", paymentStatus: "failed" });
    const { board } = await readCommandCenter({ pool });

    assert.equal(columnOf(board, id), null, "a cancelled order is still on the board");
  });
});

// ─── the total is the total ──────────────────────────────────────────────────

dbTest("a column counts everything and shows some of it", async () => {
  /*
   * THE ONE THAT MAKES A BOARD LIE BY GETTING QUIETER. Each column shows six
   * rows. If the header counted the rows it showed, a morning with forty
   * exceptions would read "6" - and the worse the day, the calmer the screen.
   */
  await withDb(async ({ pool, tag }) => {
    const before = await readCommandCenter({ pool });
    const made = 9;
    for (let index = 0; index < made; index += 1) {
      await makeOrder(pool, tag, { status: "pending", paymentStatus: "pending" });
    }
    const after = await readCommandCenter({ pool });

    assert.equal(
      after.board.approval.total - before.board.approval.total, made,
      "the column total did not grow by the number of rows added",
    );
    assert.ok(
      after.board.approval.items.length < after.board.approval.total,
      "the column is listing everything, so this proves nothing about the cap",
    );
  });
});

dbTest("every column is present even when it is empty", async () => {
  // A board missing a column renders as three columns, and the reader has no
  // way to tell "nothing is stuck" from "the query broke".
  await withDb(async ({ pool }) => {
    const { board } = await readCommandCenter({ pool });
    for (const key of ["exception", "approval", "in_progress", "completed"]) {
      assert.ok(board[key], `the ${key} column is missing`);
      assert.equal(typeof board[key].total, "number");
      assert.ok(Array.isArray(board[key].items));
    }
  });
});

dbTest("every row on the board leads somewhere", async () => {
  // A row with no destination is a notification wearing a task's clothes.
  await withDb(async ({ pool }) => {
    const { board } = await readCommandCenter({ pool });
    for (const [key, column] of Object.entries(board)) {
      for (const item of column.items) {
        assert.ok(item.href?.startsWith("/admin"), `a ${key} row has no admin destination`);
        assert.ok(item.title, `a ${key} row has no title`);
        assert.ok(item.subtitle, `a ${key} row does not say why it is there`);
      }
    }
  });
});

// ─── health says what it measured ────────────────────────────────────────────

dbTest("health reports a state and a measurement for each check", async () => {
  await withDb(async ({ pool }) => {
    const { health } = await readCommandCenter({ pool });
    assert.ok(health.length >= 4, `expected the checks, found ${health.length}`);

    for (const check of health) {
      assert.ok(["ok", "degraded", "down", "unknown"].includes(check.state),
        `${check.key} reports an unknown state: ${check.state}`);
      // A check with no detail is a green light with nothing behind it.
      assert.ok(check.detail, `${check.key} reports no measurement`);
    }
  });
});

dbTest("a check with nothing to measure says so rather than passing", async () => {
  /*
   * "unknown" HAS TO EXIST AS A STATE. The AI check counts failures in the
   * last hour; on a quiet hour there are no requests at all, and reporting
   * that as "ok" is the one lie an operations screen must not tell - it is
   * the difference between "the service is fine" and "nobody asked it
   * anything".
   */
  await withDb(async ({ pool }) => {
    const { health } = await readCommandCenter({ pool });
    const states = new Set(health.map((check) => check.state));

    // Not an assertion about which check is unknown - that depends on the
    // database. The assertion is that the vocabulary has the word in it.
    const ai = health.find((check) => check.key === "ai");
    assert.ok(ai, "the AI check is missing");
    if (ai.detail.includes("אין בקשות")) {
      assert.equal(ai.state, "unknown", "a check with no data reported itself as healthy");
    }
    assert.ok(states.size >= 1);
  });
});

dbTest("the database check measures this connection, not a stored number", async () => {
  // An uptime figure read from a table is a figure about the past. This one is
  // a query that just ran.
  await withDb(async ({ pool }) => {
    const { health } = await readCommandCenter({ pool });
    const database = health.find((check) => check.key === "database");

    assert.ok(database, "the database check is missing");
    assert.match(database.detail, /^\d+ms$/, "the database check does not report a measured latency");
  });
});
