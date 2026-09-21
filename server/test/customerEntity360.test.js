// Customer 360, and the two things it used to say that were not true.
//
// This file could not exist a commit ago. The card's read logic lived inside a
// 9,400-line entry point that cannot be imported without starting a server, so
// the only way to check what the screen claimed was to read it - and reading
// is how both defects below survived for as long as the card has existed.
//
// Both are the same kind of defect, and it is the kind this codebase keeps
// producing: A NUMBER COMPUTED OVER ONE SET, PRINTED ABOVE A DIFFERENT SET.
// The order count counts every order and sits above a list cut at 100. The pet
// count excludes archived animals and sits above a list that includes them.
// Neither is visible unless you count, and nobody counts.

import assert from "node:assert/strict";
import test from "node:test";

import { ORDER_HISTORY_LIMIT, createCustomerEntity360 } from "../src/adminOs/entity360.js";

const DATABASE_URL = process.env.DATABASE_URL;
const dbTest = (name, fn) => test(name, { skip: DATABASE_URL ? false : "DATABASE_URL not set" }, fn);

const toMoney = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : fallback;
};

/**
 * The loaders are stubs, and deliberately: they are the INPUT to the
 * behaviour under test. What is being checked is what the module promises
 * about whatever it is handed - that the number it prints describes the list
 * it returns - and that promise has to hold for any loader.
 */
const withEntity360 = async (fn) => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: false });
  const tag = `e${Math.random().toString(36).slice(2, 8)}`;

  const state = { pets: [], notes: [] };
  const entity360 = createCustomerEntity360({
    pool,
    toMoney,
    attachOrderItems: async (orders) => orders.map((order) => ({ ...order, items: [], order_items: [] })),
    // Mirrors index.js's listUserPets: "all" means archived ones too.
    listUserPets: async (userId, archived) => (
      archived === "all" ? state.pets : state.pets.filter((pet) => pet.archived === (archived === "true"))
    ),
    listCustomerNotes: async () => state.notes,
  });

  try {
    await fn({ pool, entity360, tag, state });
  } finally {
    await pool.query("delete from public.orders where order_number like $1", [`${tag}%`]).catch(() => {});
    await pool.query("delete from public.shop_customers where email like $1", [`%${tag}%`]).catch(() => {});
    await pool.query("delete from public.app_users where email like $1", [`%${tag}%`]).catch(() => {});
    await pool.end();
  }
};

const makeGuest = async ({ pool, tag }, overrides = {}) => {
  const { rows } = await pool.query(
    "insert into public.shop_customers (email, full_name, phone) values ($1, $2, $3) returning id",
    [overrides.email ?? `guest.${tag}@example.com`, `אורח ${tag}`, "050-123-4567"],
  );
  return rows[0].id;
};

const makeAccount = async ({ pool, tag }) => {
  const { rows } = await pool.query(
    "insert into public.app_users (email, password_hash, full_name) values ($1, 'x', $2) returning id",
    [`account.${tag}@example.com`, `בעל חשבון ${tag}`],
  );
  return rows[0].id;
};

const placeOrders = async ({ pool, tag }, { customerId = null, userId = null, count = 1 }) => {
  await pool.query(
    `
      insert into public.orders (order_number, customer_id, user_id, total, payment_status, order_date)
      select $1 || '-' || generate_series(1, $2), $3, $4, 100, 'paid', now() - (generate_series(1, $2) || ' hours')::interval
    `,
    [tag, count, customerId, userId],
  );
};

// ─── the regression net for the extraction ───────────────────────────────────

dbTest("a guest identity comes back with its own orders", async () => {
  await withEntity360(async (context) => {
    const guestId = await makeGuest(context);
    await placeOrders(context, { customerId: guestId, count: 3 });

    const detail = await context.entity360.getAdminCustomer(guestId);
    assert.equal(detail.customer.identity_kind, "guest");
    assert.equal(detail.customer.orders_count, 3);
    assert.equal(detail.orders.length, 3);
    assert.equal(detail.customer.total_spent, 300);
  });
});

dbTest("a guest has no pets, because pets belong to accounts", async () => {
  await withEntity360(async (context) => {
    const guestId = await makeGuest(context);
    context.state.pets = [{ id: "p1", name: "לונה", archived: false }];

    const detail = await context.entity360.getAdminCustomer(guestId);
    assert.deepEqual(detail.pets, [], "a guest identity was handed somebody's pets");
  });
});

dbTest("an account owning two commerce rows is one person, not two", async () => {
  await withEntity360(async (context) => {
    const userId = await makeAccount(context);
    for (const suffix of ["a", "b"]) {
      await context.pool.query(
        "insert into public.shop_customers (email, full_name, user_id) values ($1, $2, $3)",
        [`claimed.${suffix}.${context.tag}@example.com`, `לקוח ${context.tag}`, userId],
      );
    }

    const listed = await context.entity360.listAdminCustomers({ limit: 1000, search: context.tag });
    const mine = listed.filter((row) => row.identity_id === userId);
    assert.equal(mine.length, 1, "the same person was listed twice - `distinct on` is not doing its job");
  });
});

dbTest("an id that is not a uuid is not found, not a crash", async () => {
  await withEntity360(async ({ entity360 }) => {
    assert.equal(await entity360.getAdminCustomer("not-a-uuid"), null);
    assert.equal(await entity360.getAdminCustomer(""), null);
    assert.equal(await entity360.getAdminCustomer(null), null);
  });
});

// ─── a partial history must say it is partial ────────────────────────────────

dbTest("a history that fits is not marked as cut", async () => {
  await withEntity360(async (context) => {
    const guestId = await makeGuest(context);
    await placeOrders(context, { customerId: guestId, count: 2 });

    const detail = await context.entity360.getAdminCustomer(guestId);
    assert.equal(detail.orders_truncated, false);
  });
});

dbTest("a history longer than the card can show says so", async () => {
  await withEntity360(async (context) => {
    // The exact defect: orders_count counts every order, the query stops at
    // ORDER_HISTORY_LIMIT, and the card printed both without reconciling them.
    // Somebody looking for an order they cannot find concludes it is not
    // there, which is the worst possible answer for a screen used on the
    // phone with the customer.
    const guestId = await makeGuest(context);
    await placeOrders(context, { customerId: guestId, count: ORDER_HISTORY_LIMIT + 5 });

    const detail = await context.entity360.getAdminCustomer(guestId);
    assert.equal(detail.customer.orders_count, ORDER_HISTORY_LIMIT + 5);
    assert.equal(detail.orders.length, ORDER_HISTORY_LIMIT);
    assert.equal(
      detail.orders_truncated,
      true,
      `the card is showing ${ORDER_HISTORY_LIMIT} of ${ORDER_HISTORY_LIMIT + 5} orders and saying nothing about it`,
    );
  });
});

// ─── the number above the list describes the list ────────────────────────────

dbTest("the pet count counts the pets the card is about to show", async () => {
  await withEntity360(async (context) => {
    // pet_stats counts `where not archived`. listUserPets("all") returns the
    // archived ones too. So the header said 2 and the list showed 3, and the
    // third was an animal that has died or been rehomed - displayed with no
    // mark, on a card read while talking to its owner.
    const userId = await makeAccount(context);
    await context.pool.query(
      "insert into public.shop_customers (email, full_name, user_id) values ($1, $2, $3)",
      [`pets.${context.tag}@example.com`, `לקוח ${context.tag}`, userId],
    );
    context.state.pets = [
      { id: "p1", name: "לונה", archived: false },
      { id: "p2", name: "ציפסר", archived: false },
      { id: "p3", name: "מילו", archived: true },
    ];

    const detail = await context.entity360.getAdminCustomer(userId);

    assert.equal(detail.pets.length, 3, "the archived pet was dropped; the card should show it, marked");
    assert.equal(
      detail.customer.pets_count,
      detail.pets.filter((pet) => !pet.archived).length,
      "the count above the list and the list disagree",
    );
    assert.equal(detail.archived_pets_count, 1, "nothing says one of these animals is archived");
  });
});
