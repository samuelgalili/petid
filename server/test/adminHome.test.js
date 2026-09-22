// The four numbers on the admin's first screen, and the queue under them.
//
// These are SQL, and SQL that is subtly wrong returns a number rather than an
// error - which is the worst way for a dashboard to fail, because a number
// looks like an answer. So this runs against a real database and checks the
// places the query can lie:
//
//   - "today" cut in UTC instead of Asia/Jerusalem, which moves an order
//     placed at 21:00 Israel time onto tomorrow;
//   - money counted before it arrives (awaiting_cod, creating) or after it
//     went away (cancelled);
//   - new customers counted from app_users only, which reports zero on a week
//     of nothing but guest checkouts.

import assert from "node:assert/strict";
import test from "node:test";

import { adminHome } from "../src/adminOs/home.js";

const DATABASE_URL = process.env.DATABASE_URL;
const dbTest = (name, fn) => test(name, { skip: DATABASE_URL ? false : "DATABASE_URL not set" }, fn);

const withDb = async (fn) => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: false });
  const tag = `h${Math.random().toString(36).slice(2, 8)}`;
  try {
    await fn({ pool, tag });
  } finally {
    await pool.query("delete from public.orders where order_number like $1", [`%${tag}%`]).catch(() => {});
    await pool.query("delete from public.shop_customers where email like $1", [`%${tag}%`]).catch(() => {});
    await pool.end();
  }
};

/**
 * An order, placed at a given moment in Israel time.
 *
 * `at` is written as a local wall clock and converted, because the whole point
 * of these tests is which DAY a given hour belongs to.
 */
const makeOrder = async (pool, tag, { at = null, total, paymentStatus = "paid", status = "processing" }) => {
  // `at` omitted means now. The queue is ordered newest-first and capped, so a
  // test that needs its own row to APPEAR has to make the newest row - an hour
  // earlier today is not enough when the database already holds newer ones.
  const when = at === null ? "now()" : "$6::timestamp at time zone 'Asia/Jerusalem'";
  const values = [`${tag}-${Math.random().toString(36).slice(2, 7)}`, `לקוח ${tag}`, status, paymentStatus, total];
  if (at !== null) values.push(at);

  const result = await pool.query(
    `insert into public.orders
       (order_number, customer_name, status, payment_status, total, created_at)
     values ($1, $2, $3, $4, $5, ${when})
     returning id`,
    values,
  );
  return result.rows[0].id;
};

/** Israel-local wall clock for "today at HH:MM", as a plain timestamp string. */
const todayAt = (hhmm) => {
  const israelDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
  return `${israelDate} ${hhmm}:00`;
};

const yesterdayAt = (hhmm) => {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const israelDate = now.toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
  return `${israelDate} ${hhmm}:00`;
};

// ─── the day boundary ────────────────────────────────────────────────────────

dbTest("the small hours belong to the day Israel is having", async () => {
  /*
   * 01:00, AND THE FIRST VERSION OF THIS TEST USED 21:00, WHICH PROVED
   * NOTHING. Israel runs two or three hours AHEAD of UTC, so an evening hour
   * converts to an earlier hour the same UTC day and both cuts agree - the
   * test passed with the timezone removed entirely.
   *
   * The hours that move are the ones just after midnight: 01:00 in Israel is
   * 22:00 or 23:00 UTC YESTERDAY. Under a UTC cut this order is filed on
   * yesterday, and the shop opens to a "today" missing every overnight sale.
   */
  await withDb(async ({ pool, tag }) => {
    const before = await adminHome({ pool });
    await makeOrder(pool, tag, { at: todayAt("01:00"), total: 100 });
    const after = await adminHome({ pool });

    assert.equal(
      Math.round(after.body.numbers.revenue_today - before.body.numbers.revenue_today),
      100,
      "an order placed after midnight Israel time did not land on today",
    );
  });
});

dbTest("yesterday is yesterday and not part of today", async () => {
  // 01:00 again, for the same reason: under a UTC cut this one slides to the
  // day before yesterday and disappears from both numbers.
  await withDb(async ({ pool, tag }) => {
    const before = await adminHome({ pool });
    await makeOrder(pool, tag, { at: yesterdayAt("01:00"), total: 250 });
    const after = await adminHome({ pool });

    assert.equal(
      Math.round(after.body.numbers.revenue_today - before.body.numbers.revenue_today), 0,
      "yesterday's money was added to today",
    );
    assert.equal(
      Math.round(after.body.numbers.revenue_yesterday - before.body.numbers.revenue_yesterday), 250,
    );
  });
});

// ─── what counts as money ────────────────────────────────────────────────────

dbTest("money the courier has not collected is not revenue", async () => {
  // awaiting_cod is an expectation. Counting it shows a day that has not
  // happened, and the correction arrives as a customer refusing at the door.
  await withDb(async ({ pool, tag }) => {
    const before = await adminHome({ pool });
    await makeOrder(pool, tag, { at: todayAt("10:00"), total: 400, paymentStatus: "awaiting_cod" });
    const after = await adminHome({ pool });

    assert.equal(Math.round(after.body.numbers.revenue_today - before.body.numbers.revenue_today), 0);
  });
});

dbTest("a cancelled order is not revenue even when it was paid", async () => {
  await withDb(async ({ pool, tag }) => {
    const before = await adminHome({ pool });
    await makeOrder(pool, tag, { at: todayAt("10:00"), total: 400, status: "cancelled" });
    const after = await adminHome({ pool });

    assert.equal(Math.round(after.body.numbers.revenue_today - before.body.numbers.revenue_today), 0);
  });
});

// ─── the queue ───────────────────────────────────────────────────────────────

dbTest("a waiting order reaches the board with somewhere to go", async () => {
  // The flat queue this used to read became the four-column board. The claim
  // did not change: a pending order has to be findable, and the row has to
  // lead to the order it is about - a row without a destination is a
  // notification, not a task.
  await withDb(async ({ pool, tag }) => {
    const id = await makeOrder(pool, tag, {
      total: 120, status: "pending", paymentStatus: "pending",
    });

    const { body } = await adminHome({ pool });
    const row = body.board.approval.items.find((item) => item.id === id);

    assert.ok(row, "the pending order is not in the approval column");
    assert.equal(row.kind, "order_pending");
    assert.ok(row.href.includes(id), "the row does not link to the order it is about");
    assert.equal(row.amount, 120);
  });
});

dbTest("a pending order is counted as well as listed", async () => {
  // The queue is capped per kind. The NUMBER must not be, or a morning with
  // thirty waiting orders reads as eight.
  await withDb(async ({ pool, tag }) => {
    const before = await adminHome({ pool });
    for (let index = 0; index < 3; index += 1) {
      await makeOrder(pool, tag, {
        at: todayAt("09:00"), total: 10, status: "pending", paymentStatus: "pending",
      });
    }
    const after = await adminHome({ pool });

    assert.equal(after.body.numbers.pending_orders - before.body.numbers.pending_orders, 3);
  });
});

dbTest("a processing order is not waiting for anybody", async () => {
  await withDb(async ({ pool, tag }) => {
    const before = await adminHome({ pool });
    await makeOrder(pool, tag, { at: todayAt("09:00"), total: 10, status: "processing" });
    const after = await adminHome({ pool });

    assert.equal(after.body.numbers.pending_orders, before.body.numbers.pending_orders);
  });
});

// ─── new customers ───────────────────────────────────────────────────────────

dbTest("a guest who never registered still counts as a new customer", async () => {
  // customer_identities is app_users FULL JOIN shop_customers. Counting
  // app_users alone would report zero on a week of guest checkouts, which is
  // the week this shop actually has.
  await withDb(async ({ pool, tag }) => {
    const before = await adminHome({ pool });
    await pool.query(
      "insert into public.shop_customers (email, full_name) values ($1, $2)",
      [`guest-${tag}@example.com`, `אורח ${tag}`],
    );
    const after = await adminHome({ pool });

    assert.equal(
      after.body.numbers.new_customers_this_week - before.body.numbers.new_customers_this_week, 1,
    );
  });
});

dbTest("every number is a number, never null", async () => {
  // An empty table makes sum() return null, and `₪null` on a dashboard is how
  // an owner learns the screen is broken.
  await withDb(async ({ pool }) => {
    const { body } = await adminHome({ pool });
    for (const [key, value] of Object.entries(body.numbers)) {
      assert.equal(typeof value, "number", `${key} is not a number`);
      assert.ok(Number.isFinite(value), `${key} is not finite`);
    }
  });
});
