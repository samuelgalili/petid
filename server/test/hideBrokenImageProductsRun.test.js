// End-to-end runs of the broken-image hide against an in-memory pool.
// The script prints one line per product; those lines are silenced here.

import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import {
  BROKEN_IMAGE_HIDE_REASON,
  BROKEN_IMAGE_PRODUCTS,
  runHideBrokenImageProducts,
} from "../scripts/hideBrokenImageProducts.mjs";

const SECOND_ID = "293af4d2-728e-4822-b3f6-0d48758637ae";
const log = console.log;
const errorLog = console.error;

before(() => {
  console.log = () => {};
  console.error = () => {};
});

after(() => {
  console.log = log;
  console.error = errorLog;
});

const norm = (sql) => String(sql).replace(/\s+/g, " ").trim().toLowerCase();

const SQL = {
  schema: "select to_regclass('public.product_shop_visibility_holds') is not null as holds, exists ( select 1 from information_schema.columns where table_schema = 'public' and table_name = 'business_products' and column_name = 'shop_hidden' ) as shop_hidden",
  products: "select id, name, in_stock, shop_hidden from public.business_products where id = any($1::uuid[])",
  holds: "select product_id, previous_shop_hidden from public.product_shop_visibility_holds where product_id = any($1::uuid[])",
  lockProduct: "select id, in_stock, shop_hidden from public.business_products where id = $1 for update",
  lockHold: "select product_id, previous_shop_hidden from public.product_shop_visibility_holds where product_id = $1 for update",
  insertHold: "insert into public.product_shop_visibility_holds (product_id, previous_shop_hidden, reason) values ($1, $2, $3)",
  hide: "update public.business_products set shop_hidden = true, updated_at = now() where id = $1 and shop_hidden is not true returning id, in_stock, shop_hidden",
  hideEvent: "insert into public.product_shop_visibility_events (product_id, action, previous_shop_hidden, resulting_shop_hidden) values ($1, 'hide', $2, true)",
  unhide: "update public.business_products set shop_hidden = $2, updated_at = now() where id = $1 returning id, in_stock, shop_hidden",
  deleteHold: "delete from public.product_shop_visibility_holds where product_id = $1",
  unhideEvent: "insert into public.product_shop_visibility_events (product_id, action, previous_shop_hidden, resulting_shop_hidden) values ($1, 'unhide', $2, $3)",
};

const visibleCatalogue = (entries) => {
  const products = new Map();
  entries.forEach((entry, index) => {
    products.set(entry.id, {
      id: entry.id,
      name: entry.name,
      in_stock: index % 3 !== 1,
      shop_hidden: false,
    });
  });
  return products;
};

const productView = (row) => ({ id: row.id, name: row.name, in_stock: row.in_stock, shop_hidden: row.shop_hidden });
const holdView = (hold) => ({ product_id: hold.product_id, previous_shop_hidden: hold.previous_shop_hidden });

const createPool = (products, options = {}) => {
  const state = {
    products: new Map([...products].map(([id, row]) => [id, { ...row }])),
    holds: new Map(),
    events: [],
  };
  const stats = { begins: 0, commits: 0, rollbacks: 0, connects: 0 };
  let snapshot = null;

  const clone = () => ({
    products: new Map([...state.products].map(([id, row]) => [id, { ...row }])),
    holds: new Map([...state.holds].map(([id, row]) => [id, { ...row }])),
    events: state.events.map((row) => ({ ...row })),
  });

  const query = async (sql, params = []) => {
    const text = norm(sql);
    if (options.beforeQuery) options.beforeQuery(text, params, state);
    if (text === "begin") {
      if (snapshot) throw new Error("transaction already open");
      snapshot = clone();
      stats.begins += 1;
      return { rows: [], rowCount: 0 };
    }
    if (text === "commit") {
      if (!snapshot) throw new Error("commit without begin");
      snapshot = null;
      stats.commits += 1;
      return { rows: [], rowCount: 0 };
    }
    if (text === "rollback") {
      if (snapshot) {
        state.products = snapshot.products;
        state.holds = snapshot.holds;
        state.events = snapshot.events;
        snapshot = null;
      }
      stats.rollbacks += 1;
      return { rows: [], rowCount: 0 };
    }
    if (text === SQL.schema) {
      return { rows: [{ holds: true, shop_hidden: true }], rowCount: 1 };
    }
    if (text === SQL.products) {
      const rows = params[0].map((id) => state.products.get(id)).filter(Boolean).map(productView);
      return { rows, rowCount: rows.length };
    }
    if (text === SQL.holds) {
      const rows = params[0].map((id) => state.holds.get(id)).filter(Boolean).map(holdView);
      return { rows, rowCount: rows.length };
    }
    if (text === SQL.lockProduct) {
      const row = state.products.get(params[0]);
      const rows = row ? [{ id: row.id, in_stock: row.in_stock, shop_hidden: row.shop_hidden }] : [];
      return { rows, rowCount: rows.length };
    }
    if (text === SQL.lockHold) {
      const hold = state.holds.get(params[0]);
      const rows = hold ? [holdView(hold)] : [];
      return { rows, rowCount: rows.length };
    }
    if (text === SQL.insertHold) {
      const [productId, previousShopHidden, reason] = params;
      if (state.holds.has(productId)) throw new Error(`duplicate hold for ${productId}`);
      state.holds.set(productId, {
        product_id: productId,
        previous_shop_hidden: previousShopHidden,
        reason,
      });
      return { rows: [], rowCount: 1 };
    }
    if (text === SQL.hide) {
      const row = state.products.get(params[0]);
      if (!row || row.shop_hidden === true) return { rows: [], rowCount: 0 };
      row.shop_hidden = true;
      return { rows: [{ id: row.id, in_stock: row.in_stock, shop_hidden: true }], rowCount: 1 };
    }
    if (text === SQL.hideEvent) {
      state.events.push({
        product_id: params[0],
        action: "hide",
        previous_shop_hidden: params[1],
        resulting_shop_hidden: true,
      });
      return { rows: [], rowCount: 1 };
    }
    if (text === SQL.unhide) {
      const row = state.products.get(params[0]);
      if (!row) return { rows: [], rowCount: 0 };
      row.shop_hidden = params[1];
      return {
        rows: [{ id: row.id, in_stock: row.in_stock, shop_hidden: row.shop_hidden }],
        rowCount: 1,
      };
    }
    if (text === SQL.deleteHold) {
      const removed = state.holds.delete(params[0]);
      return { rows: [], rowCount: removed ? 1 : 0 };
    }
    if (text === SQL.unhideEvent) {
      state.events.push({
        product_id: params[0],
        action: "unhide",
        previous_shop_hidden: params[1],
        resulting_shop_hidden: params[2],
      });
      return { rows: [], rowCount: 1 };
    }
    throw new Error(`unknown sql: ${text}`);
  };

  return {
    query,
    async connect() {
      stats.connects += 1;
      return { query, release() {} };
    },
    state,
    stats,
  };
};

const assertStockUnchanged = (pool, products) => {
  for (const [id, row] of products) {
    assert.equal(pool.state.products.get(id).in_stock, row.in_stock, id);
  }
};

test("hide writes all 28 allowlisted ids, each with a hold and a hide event", async () => {
  assert.equal(BROKEN_IMAGE_PRODUCTS.length, 28);
  const products = visibleCatalogue(BROKEN_IMAGE_PRODUCTS);
  const untouchedId = "00000000-0000-4000-8000-000000000099";
  products.set(untouchedId, {
    id: untouchedId,
    name: "מוצר שנשאר",
    in_stock: true,
    shop_hidden: false,
  });
  const pool = createPool(products);

  const result = await runHideBrokenImageProducts({ pool, mode: "hide" });

  assert.equal(result.wrote, true);
  assert.equal(result.plans.length, 28);
  assert.ok(result.plans.every((plan) => plan.write === true && plan.action === "hide"));
  assert.equal(pool.state.holds.size, 28);
  assert.equal(pool.state.events.length, 28);
  assert.equal(pool.stats.begins, 1);
  assert.equal(pool.stats.commits, 1);
  assert.equal(pool.stats.rollbacks, 0);
  for (const entry of BROKEN_IMAGE_PRODUCTS) {
    const row = pool.state.products.get(entry.id);
    assert.equal(row.shop_hidden, true, entry.id);
    const hold = pool.state.holds.get(entry.id);
    assert.equal(hold.previous_shop_hidden, false, entry.id);
    assert.equal(hold.reason, BROKEN_IMAGE_HIDE_REASON, entry.id);
    const events = pool.state.events.filter((event) => event.product_id === entry.id);
    assert.equal(events.length, 1, entry.id);
    assert.equal(events[0].action, "hide");
    assert.equal(events[0].previous_shop_hidden, false);
    assert.equal(events[0].resulting_shop_hidden, true);
  }
  assert.equal(pool.state.products.get(untouchedId).shop_hidden, false);
  assert.equal(pool.state.holds.has(untouchedId), false);
  assertStockUnchanged(pool, products);
});

test("hides the second allowlisted id 293af4d2-728e-4822-b3f6-0d48758637ae", async () => {
  assert.equal(BROKEN_IMAGE_PRODUCTS[1].id, SECOND_ID);
  const pool = createPool(visibleCatalogue(BROKEN_IMAGE_PRODUCTS));

  await runHideBrokenImageProducts({ pool, mode: "hide" });

  assert.equal(pool.state.products.get(SECOND_ID).shop_hidden, true);
  assert.equal(pool.state.holds.get(SECOND_ID).reason, BROKEN_IMAGE_HIDE_REASON);
  assert.equal(
    pool.state.events.some((event) => event.product_id === SECOND_ID && event.action === "hide"),
    true,
  );
  assert.equal(pool.stats.rollbacks, 0);
});

test("a genuinely missing product stops the run before any transaction or write", async () => {
  const missingId = BROKEN_IMAGE_PRODUCTS.at(-1).id;
  const products = visibleCatalogue(BROKEN_IMAGE_PRODUCTS);
  products.delete(missingId);
  const pool = createPool(products);

  await assert.rejects(
    () => runHideBrokenImageProducts({ pool, mode: "hide" }),
    (error) => {
      assert.equal(error.code, "BLOCKED");
      assert.match(error.message, /refusing to write: missing/);
      assert.match(error.message, new RegExp(missingId));
      return true;
    },
  );
  assert.equal(pool.stats.connects, 0);
  assert.equal(pool.stats.begins, 0);
  assert.equal(pool.stats.commits, 0);
  assert.equal(pool.stats.rollbacks, 0);
  assert.equal(pool.state.holds.size, 0);
  assert.equal(pool.state.events.length, 0);
  for (const row of pool.state.products.values()) assert.equal(row.shop_hidden, false);
});

test("a product that vanishes on the third write rolls back holds, flags and events", async () => {
  const thirdId = BROKEN_IMAGE_PRODUCTS[2].id;
  const products = visibleCatalogue(BROKEN_IMAGE_PRODUCTS);
  let locks = 0;
  const pool = createPool(products, {
    beforeQuery(text, params, state) {
      if (text !== SQL.lockProduct) return;
      locks += 1;
      if (locks === 3) {
        assert.equal(params[0], thirdId);
        state.products.delete(thirdId);
      }
    },
  });

  await assert.rejects(
    () => runHideBrokenImageProducts({ pool, mode: "hide" }),
    (error) => {
      assert.equal(error.code, "MISSING_PRODUCT");
      assert.equal(error.message, `product not found: ${thirdId}`);
      return true;
    },
  );
  assert.equal(pool.stats.begins, 1);
  assert.equal(pool.stats.commits, 0);
  assert.equal(pool.stats.rollbacks, 1);
  assert.equal(pool.state.holds.size, 0);
  assert.equal(pool.state.events.length, 0);
  assert.equal(pool.state.products.has(thirdId), true);
  for (const entry of BROKEN_IMAGE_PRODUCTS) {
    assert.equal(pool.state.products.get(entry.id).shop_hidden, false, entry.id);
  }
  assertStockUnchanged(pool, products);
});

test("unhide restores every product and deletes the holds", async () => {
  const products = visibleCatalogue(BROKEN_IMAGE_PRODUCTS);
  const pool = createPool(products);

  await runHideBrokenImageProducts({ pool, mode: "hide" });
  const restored = await runHideBrokenImageProducts({ pool, mode: "unhide" });

  assert.equal(restored.wrote, true);
  assert.equal(restored.plans.length, 28);
  assert.ok(restored.plans.every((plan) => plan.action === "unhide" && plan.write === true && plan.restore_to === false));
  assert.equal(pool.state.holds.size, 0);
  assert.equal(pool.state.events.length, 56);
  assert.equal(pool.stats.commits, 2);
  assert.equal(pool.stats.rollbacks, 0);
  for (const entry of BROKEN_IMAGE_PRODUCTS) {
    assert.equal(pool.state.products.get(entry.id).shop_hidden, false, entry.id);
    const events = pool.state.events.filter((event) => event.product_id === entry.id);
    assert.deepEqual(events.map((event) => event.action), ["hide", "unhide"]);
    assert.equal(events[1].previous_shop_hidden, true);
    assert.equal(events[1].resulting_shop_hidden, false);
  }
  assertStockUnchanged(pool, products);
});

test("running hide twice writes nothing the second time", async () => {
  const pool = createPool(visibleCatalogue(BROKEN_IMAGE_PRODUCTS));

  await runHideBrokenImageProducts({ pool, mode: "hide" });
  const again = await runHideBrokenImageProducts({ pool, mode: "hide" });

  assert.equal(again.wrote, true);
  assert.ok(again.plans.every((plan) => plan.action === "already-hidden" && plan.write === false));
  assert.equal(pool.state.holds.size, 28);
  assert.equal(pool.state.events.length, 28);
  assert.ok(pool.state.events.every((event) => event.action === "hide"));
  assert.equal(pool.stats.commits, 2);
  assert.equal(pool.stats.rollbacks, 0);
  for (const entry of BROKEN_IMAGE_PRODUCTS) {
    assert.equal(pool.state.products.get(entry.id).shop_hidden, true, entry.id);
  }
});
