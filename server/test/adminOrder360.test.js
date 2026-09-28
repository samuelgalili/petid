// Order 360, and the four things it can be confidently wrong about.
//
// Three of them are the same defect the customer card shipped with and had to
// be fixed for: a screen stating something it has not established. An order's
// history comes out of a delivery queue, so "the stream is empty" and "nothing
// happened to this order" are different facts that look identical on screen.
// And the person an order belongs to is derived, not stored, so an order screen
// can easily name a different customer than the customer screen does for the
// same human being.
//
// Real database, real rows, real transitions. A stub pool would only prove that
// this file and the stub agree.

import assert from "node:assert/strict";
import test from "node:test";

import { createCustomerEntity360 } from "../src/adminOs/entity360.js";
import { SIBLING_ORDER_LIMIT, createOrderEntity360 } from "../src/adminOs/order360.js";

const DATABASE_URL = process.env.DATABASE_URL;
const dbTest = (name, fn) => test(name, { skip: DATABASE_URL ? false : "DATABASE_URL not set" }, fn);

/**
 * toMoney and attachOrderItems are index.js's, and index.js cannot be imported
 * without starting a server. The two supplied here are deliberately the
 * simplest thing that satisfies the shape, because neither is what is under
 * test - and mapCustomerIdentity, which IS part of what is under test, is the
 * real one from entity360.js rather than a copy.
 */
const toMoney = (value) => Number(value || 0);
const attachOrderItems = async (rows) => rows.map((row) => ({ ...row, items: [], order_items: [] }));

const buildModule = (pool) => {
  const { mapCustomerIdentity } = createCustomerEntity360({
    pool, toMoney, attachOrderItems,
    listUserPets: async () => [],
    listCustomerNotes: async () => [],
  });
  return createOrderEntity360({ pool, toMoney, attachOrderItems, mapCustomerIdentity });
};

/**
 * ONE CONNECTION, IN A TRANSACTION THAT IS ALWAYS ROLLED BACK.
 *
 * The module takes its `pool` and only ever calls `.query` on it, so a client
 * inside a transaction satisfies it exactly - and that buys two things a
 * tag-and-delete fixture does not:
 *
 *   - Nothing this file writes is ever visible to another connection.
 *     `node --test` runs test FILES concurrently, and adminHome.test.js
 *     measures global counters with before/after deltas - `select count(*)
 *     from orders where status = 'pending'` and the day's revenue. Inserting
 *     committed orders here made that file fail, on an assertion about code
 *     this change does not touch. A screen's own test should not be able to
 *     break another screen's test by existing.
 *   - There is nothing to clean up, so a crashed test cannot leave rows behind
 *     that a later run reads as real.
 */
const withDb = async (fn) => {
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: DATABASE_URL, ssl: false });
  await client.connect();
  const tag = `o${Math.random().toString(36).slice(2, 8)}`;
  try {
    await client.query("begin");
    await fn({ pool: client, tag, module: buildModule(client) });
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end();
  }
};

/** A guest checkout: a shop_customers row and an order pointing at it. */
const makeGuestOrder = async (pool, tag, { placedMinutesAgo = 60, total = 199 } = {}) => {
  const customer = await pool.query(
    `insert into public.shop_customers (email, full_name, phone)
     values ($1, $2, '0521234567') returning id`,
    [`${tag}@example.test`, `אורח ${tag}`],
  );

  const order = await pool.query(
    `insert into public.orders
       (order_number, customer_id, customer_email, customer_name, status, payment_status,
        total, order_date, created_at, updated_at)
     values ($1, $2, $3, $4, 'pending', 'paid', $5,
             now() - ($6 * interval '1 minute'),
             now() - ($6 * interval '1 minute'),
             now() - ($6 * interval '1 minute'))
     returning id`,
    [
      `${tag}-${Math.random().toString(36).slice(2, 7)}`,
      customer.rows[0].id, `${tag}@example.test`, `אורח ${tag}`, total, placedMinutesAgo,
    ],
  );

  return { orderId: order.rows[0].id, shopCustomerId: customer.rows[0].id };
};

const addEvent = async (pool, orderId, { type, origin = "admin", minutesAgo, payload = {} }) => {
  await pool.query(
    `insert into public.outbox_events (event_type, entity_type, entity_id, payload, origin, occurred_at)
     values ($1, 'order', $2, $3::jsonb, $4, now() - ($5 * interval '1 minute'))`,
    [type, orderId, JSON.stringify(payload), origin, minutesAgo],
  );
};

// ─── who the order belongs to ────────────────────────────────────────────────

dbTest("the order names the same customer the customer list names", async () => {
  /*
   * THE DISAGREEMENT THAT WOULD NEVER BE REPORTED AS A BUG. An order carries
   * user_id, customer_id and customer_email. Reading the customer off any one
   * of those gives an answer that parts company with customer_identities for
   * exactly the case the identity view exists for. Two screens would then
   * describe one human being differently and each would look right on its own.
   */
  await withDb(async ({ pool, tag, module }) => {
    const { orderId, shopCustomerId } = await makeGuestOrder(pool, tag);

    const detail = await module.getAdminOrder360(orderId);
    assert.ok(detail, "the order was not found");
    assert.ok(detail.customer, "the order came back with no customer at all");

    // For a guest the identity IS the shop_customers row, which is what the
    // customer list uses as identity_id - so the link this screen builds to
    // Customer 360 lands on the same record.
    assert.equal(detail.customer.identity_id, shopCustomerId);
    assert.equal(detail.customer.identity_kind, "guest");
    assert.equal(detail.customer.full_name, `אורח ${tag}`);
  });
});

dbTest("a guest order claimed by an account follows the account", async () => {
  // The awkward case, and the reason the identity is derived rather than read
  // off a column: somebody checked out as a guest and signed up afterwards.
  // The order is theirs, and the screen has to say so.
  await withDb(async ({ pool, tag, module }) => {
    const { orderId, shopCustomerId } = await makeGuestOrder(pool, tag);

    const user = await pool.query(
      `insert into public.app_users (email, full_name, password_hash)
       values ($1, $2, 'x') returning id`,
      [`acct-${tag}@example.test`, `בעל חשבון ${tag}`],
    );
    await pool.query("update public.shop_customers set user_id = $1 where id = $2", [
      user.rows[0].id, shopCustomerId,
    ]);

    const detail = await module.getAdminOrder360(orderId);
    assert.equal(detail.customer.identity_id, user.rows[0].id,
      "the order still points at the guest row after the account claimed it");
    assert.equal(detail.customer.identity_kind, "account");
  });
});

// ─── what happened, and whether the record reaches back ──────────────────────

dbTest("an order with no recorded events does not read as an order nothing happened to", async () => {
  /*
   * THE ONE THIS SCREEN MUST NOT GET WRONG. Every order placed before
   * migration 0020 has no events. An empty stream under a heading like
   * "what happened" is read as "nothing happened" - so somebody looking for
   * the moment a refund was approved concludes it never was.
   */
  await withDb(async ({ pool, tag, module }) => {
    const { orderId } = await makeGuestOrder(pool, tag);

    const detail = await module.getAdminOrder360(orderId);
    assert.deepEqual(detail.events, []);
    assert.equal(detail.history_covers_order, false,
      "an order with no events at all is claiming a complete history");
  });
});

dbTest("a history that starts with the order says it is complete", async () => {
  await withDb(async ({ pool, tag, module }) => {
    const { orderId } = await makeGuestOrder(pool, tag, { placedMinutesAgo: 120 });
    await addEvent(pool, orderId, { type: "order.created", origin: "app", minutesAgo: 120 });
    await addEvent(pool, orderId, {
      type: "order.status_changed", origin: "admin", minutesAgo: 30,
      payload: { status: { from: "pending", to: "shipped" } },
    });

    const detail = await module.getAdminOrder360(orderId);
    assert.equal(detail.history_covers_order, true);
    assert.equal(detail.events.length, 2);
  });
});

dbTest("a history missing its beginning says so", async () => {
  /*
   * 0020 declares an intent to sweep delivered rows. Nothing sweeps today.
   * The day something does, the early entries go first - and a stream that
   * quietly begins in the middle is worse than one that is empty, because it
   * looks complete. The flag is computed against the order's own placement
   * rather than by counting rows, so this case and the empty one answer to it
   * together.
   */
  await withDb(async ({ pool, tag, module }) => {
    const { orderId } = await makeGuestOrder(pool, tag, { placedMinutesAgo: 600 });
    // Placed ten hours ago; the earliest surviving event is from an hour ago.
    await addEvent(pool, orderId, {
      type: "order.status_changed", origin: "admin", minutesAgo: 60,
      payload: { status: { from: "processing", to: "shipped" } },
    });

    const detail = await module.getAdminOrder360(orderId);
    assert.equal(detail.events.length, 1);
    assert.equal(detail.history_covers_order, false,
      "a stream that begins nine hours after the order is claiming to be the whole story");
  });
});

dbTest("the history runs oldest first and keeps the origin and the transition", async () => {
  // Oldest first, because a history is read forwards. And the origin is the
  // answer to "did a person do this or did an automation", which is the first
  // question asked about a status nobody remembers changing.
  await withDb(async ({ pool, tag, module }) => {
    const { orderId } = await makeGuestOrder(pool, tag, { placedMinutesAgo: 300 });
    await addEvent(pool, orderId, { type: "order.created", origin: "app", minutesAgo: 300 });
    await addEvent(pool, orderId, {
      type: "order.status_changed", origin: "automation", minutesAgo: 100,
      payload: { status: { from: "pending", to: "processing" } },
    });
    await addEvent(pool, orderId, {
      type: "order.shipped", origin: "admin", minutesAgo: 10,
      payload: { tracking_number: "IL999" },
    });

    const { events } = await module.getAdminOrder360(orderId);
    assert.deepEqual(events.map((event) => event.type),
      ["order.created", "order.status_changed", "order.shipped"]);
    assert.deepEqual(events.map((event) => event.origin), ["app", "automation", "admin"]);
    assert.equal(events[1].payload.status.to, "processing",
      "the transition was flattened away, so the screen cannot say what moved");
    assert.equal(events[2].payload.tracking_number, "IL999");
  });
});

// ─── the customer's other orders ─────────────────────────────────────────────

dbTest("the other orders are the same customer's, and never this one", async () => {
  // Listing the order you are looking at among "their other orders" is how a
  // second order gets counted, and a repeat customer gets invented.
  await withDb(async ({ pool, tag, module }) => {
    const { orderId, shopCustomerId } = await makeGuestOrder(pool, tag, { placedMinutesAgo: 10 });

    const others = [];
    for (let index = 0; index < SIBLING_ORDER_LIMIT + 2; index += 1) {
      const row = await pool.query(
        `insert into public.orders
           (order_number, customer_id, customer_email, status, payment_status, total, order_date, created_at)
         values ($1, $2, $3, 'delivered', 'paid', 50,
                 now() - ($4 * interval '1 day'), now() - ($4 * interval '1 day'))
         returning id`,
        [`${tag}-s${index}`, shopCustomerId, `${tag}@example.test`, index + 1],
      );
      others.push(row.rows[0].id);
    }

    const { sibling_orders: siblings } = await module.getAdminOrder360(orderId);

    assert.ok(!siblings.some((order) => order.id === orderId),
      "the order is listed among the customer's other orders");
    assert.equal(siblings.length, SIBLING_ORDER_LIMIT,
      "the sibling list is not bounded by SIBLING_ORDER_LIMIT");
    // Most recent first: the newest of the eight is the one placed one day ago.
    assert.equal(siblings[0].id, others[0]);
    for (const sibling of siblings) assert.ok(others.includes(sibling.id));
  });
});

// ─── the shape of a bad request ──────────────────────────────────────────────

dbTest("a malformed id is not found rather than a database error", async () => {
  // The id arrives from a URL somebody typed. Passing it to postgres as a uuid
  // raises 22P02, which the route would turn into a 500 - an error page for
  // what is a wrong link.
  await withDb(async ({ module }) => {
    assert.equal(await module.getAdminOrder360("not-a-uuid"), null);
    assert.equal(await module.getAdminOrder360(""), null);
    assert.equal(await module.getAdminOrder360(null), null);
    // Right length and shape, wrong version nibble: this is what a truncated
    // copy-paste looks like.
    assert.equal(await module.getAdminOrder360("zzzzzzzz-1111-4111-8111-111111111111"), null);
  });
});

dbTest("an order that does not exist is null, not an empty order", async () => {
  await withDb(async ({ module }) => {
    assert.equal(await module.getAdminOrder360("11111111-2222-4333-8444-555555555555"), null);
  });
});
