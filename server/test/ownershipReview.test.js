// G-6 · the ownership review queue.
//
// Ownership on legacy rows cannot be reconstructed, so the review records what
// a named human decided and never infers anything. Most of what is asserted
// here is therefore what a review action does NOT do: it must not touch
// business_id, supplier_id, order items or the product row at all.
//
// The transition rules and request validation are pure functions and tested
// directly. The atomicity and immutability claims cannot be tested with fakes -
// they are claims about a transaction - so those run against a real PostgreSQL
// when DATABASE_URL is set, and skip cleanly when it is not.

import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_OWNERSHIP_STATE,
  OWNERSHIP_ENTITY_TYPE,
  OWNERSHIP_STATES,
  OwnershipReviewError,
  allowedTransitionsFrom,
  deriveOwnershipState,
  isValidTransition,
  parseOwnershipDecision,
  recordOwnershipDecision,
  toHistoryEntry,
} from "../src/ownershipReview.js";

const {
  UNRESOLVED, IN_REVIEW, VERIFIED_MIPO_SHOP, VERIFIED_EXTERNAL_SELLER, REJECTED,
} = OWNERSHIP_STATES;

const SELLER = "11111111-1111-1111-1111-111111111111";

// ─── transition rules ────────────────────────────────────────────────────────

test("a product with no decision is unresolved", () => {
  assert.equal(deriveOwnershipState([]), UNRESOLVED);
  assert.equal(DEFAULT_OWNERSHIP_STATE, UNRESOLVED);
});

test("the newest decision is the current state", () => {
  assert.equal(deriveOwnershipState([
    { new_values: { state: VERIFIED_MIPO_SHOP } },
    { new_values: { state: IN_REVIEW } },
  ]), VERIFIED_MIPO_SHOP);
});

test("an unrecognised stored state falls back to unresolved rather than being trusted", () => {
  assert.equal(deriveOwnershipState([{ new_values: { state: "something_else" } }]), UNRESOLVED);
  assert.equal(deriveOwnershipState([{ new_values: {} }]), UNRESOLVED);
});

test("unresolved may only open a review", () => {
  assert.deepEqual(allowedTransitionsFrom(UNRESOLVED), [IN_REVIEW]);
});

test("a verified state is unreachable directly from unresolved", () => {
  assert.equal(isValidTransition(UNRESOLVED, VERIFIED_MIPO_SHOP), false);
  assert.equal(isValidTransition(UNRESOLVED, VERIFIED_EXTERNAL_SELLER), false);
  assert.equal(isValidTransition(UNRESOLVED, REJECTED), false);
});

test("an open review can settle any of four ways", () => {
  for (const to of [VERIFIED_MIPO_SHOP, VERIFIED_EXTERNAL_SELLER, REJECTED, UNRESOLVED]) {
    assert.equal(isValidTransition(IN_REVIEW, to), true, `ownership_review -> ${to}`);
  }
});

test("a settled decision can only be corrected by reopening the review", () => {
  for (const from of [VERIFIED_MIPO_SHOP, VERIFIED_EXTERNAL_SELLER, REJECTED]) {
    assert.deepEqual(allowedTransitionsFrom(from), [IN_REVIEW], `${from} must reopen first`);
    // Never silently flipped from one conclusion to another.
    assert.equal(isValidTransition(from, VERIFIED_EXTERNAL_SELLER) && from !== IN_REVIEW, false);
  }
});

// ─── request validation ──────────────────────────────────────────────────────

test("a decision note is always required", () => {
  assert.throws(() => parseOwnershipDecision({ state: IN_REVIEW }), /note is required/);
  assert.throws(() => parseOwnershipDecision({ state: IN_REVIEW, note: "   " }), /note is required/);
});

test("an unknown state is refused", () => {
  assert.throws(() => parseOwnershipDecision({ state: "verified", note: "x" }), /valid ownership review state/);
  assert.throws(() => parseOwnershipDecision({ note: "x" }), /valid ownership review state/);
});

test("verifying ownership requires an explicit seller, for Mipo Shop too", () => {
  for (const state of [VERIFIED_MIPO_SHOP, VERIFIED_EXTERNAL_SELLER]) {
    assert.throws(
      () => parseOwnershipDecision({ state, note: "mine" }),
      /explicit seller_id is required/,
      `${state} must name a seller`,
    );
  }
});

test("a seller id is refused on a state that does not verify ownership", () => {
  assert.throws(
    () => parseOwnershipDecision({ state: IN_REVIEW, note: "opening", seller_id: SELLER }),
    /only accepted when verifying/,
  );
});

test("a malformed seller id is refused before any lookup", () => {
  assert.throws(
    () => parseOwnershipDecision({ state: VERIFIED_EXTERNAL_SELLER, note: "theirs", seller_id: "not-a-uuid" }),
    /valid id/,
  );
});

test("a valid decision parses to exactly the three recorded fields", () => {
  assert.deepEqual(
    parseOwnershipDecision({ state: VERIFIED_EXTERNAL_SELLER, note: "contract #12", seller_id: SELLER }),
    { state: VERIFIED_EXTERNAL_SELLER, note: "contract #12", sellerId: SELLER },
  );
});

test("a history entry carries the decision and nothing from the product", () => {
  const entry = toHistoryEntry({
    created_at: "2026-09-14T00:00:00Z",
    actor_email: "reviewer@mipo.pet",
    actor_role: "admin",
    old_values: { state: IN_REVIEW, business_id_at_decision: "cf941cc4-e1d1-4d7c-8122-a5df81a1e53c" },
    new_values: { state: REJECTED, seller_id: null, note: "discontinued" },
  });
  assert.equal(entry.from_state, IN_REVIEW);
  assert.equal(entry.to_state, REJECTED);
  assert.equal(entry.note, "discontinued");
  assert.equal(Object.hasOwn(entry, "product_name"), false);
  assert.equal(Object.hasOwn(entry, "source_url"), false);
});

// ─── against a real database ─────────────────────────────────────────────────
//
// Atomicity, immutability and "nothing else was touched" are claims about a
// transaction. Fakes cannot falsify them, so these use a real connection.

const DATABASE_URL = process.env.DATABASE_URL;
const dbTest = (name, fn) => test(name, { skip: DATABASE_URL ? false : "DATABASE_URL not set" }, fn);

const pgPool = async () => {
  const { default: pg } = await import("pg");
  return new pg.Pool({ connectionString: DATABASE_URL, ssl: false });
};

const actor = { id: "api-key", email: "reviewer@mipo.pet", role: "admin" };

const lookups = {
  productLookup: (client, id) => client
    .query("select id, business_id, 'manual' as source from public.business_products where id = $1", [id])
    .then((r) => r.rows[0] || null),
  sellerLookup: (client, id) => client
    .query("select id, business_name, is_verified from public.business_profiles where id = $1", [id])
    .then((r) => r.rows[0] || null),
  historyLookup: (client, id) => client
    .query(
      `select old_values, new_values, created_at, actor_email, actor_role
         from public.admin_audit_log
        where entity_type = $1 and entity_id = $2
        order by created_at desc, id desc`,
      [OWNERSHIP_ENTITY_TYPE, id],
    )
    .then((r) => r.rows),
};

/**
 * Builds an isolated seller + product, runs the body, then rolls the whole
 * thing back. Nothing survives, so the tests neither depend on nor disturb
 * anything already in the database.
 */
const withFixture = async (fn) => {
  const pool = await pgPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const seller = (await client.query(
      `insert into public.business_profiles (business_name, business_type, is_verified)
       values ('Review Fixture Seller', 'shop', true) returning id`,
    )).rows[0].id;
    const unverified = (await client.query(
      `insert into public.business_profiles (business_name, business_type, is_verified)
       values ('Unverified Seller', 'shop', false) returning id`,
    )).rows[0].id;
    // The product's CURRENT business_id is deliberately a different profile
    // from the seller the tests verify against, so "verifying did not reassign
    // the product" is a real assertion rather than a coincidence.
    const currentOwner = (await client.query(
      `insert into public.business_profiles (business_name, business_type, is_verified)
       values ('Fallback Owner On The Row', 'shop', true) returning id`,
    )).rows[0].id;
    const product = (await client.query(
      `insert into public.business_products (business_id, name, price, supplier_id)
       values ($1, 'Review Fixture Product', 10, $2) returning id`,
      [currentOwner, unverified],
    )).rows[0].id;
    return await fn({ client, seller, unverified, currentOwner, product });
  } finally {
    await client.query("rollback").catch(() => {});
    client.release();
    await pool.end();
  }
};

const decide = (client, product, decision, extra = {}) => recordOwnershipDecision(client, {
  productId: product,
  decision,
  actor,
  ...lookups,
  ...extra,
});

const note = (text) => ({ note: text });

dbTest("unresolved -> ownership_review is recorded", async () => {
  await withFixture(async ({ client, product }) => {
    const result = await decide(client, product, { state: IN_REVIEW, sellerId: null, ...note("opening") });
    assert.equal(result.from_state, UNRESOLVED);
    assert.equal(result.state, IN_REVIEW);
    assert.equal(await lookups.historyLookup(client, product).then((r) => r.length), 1);
  });
});

dbTest("unresolved -> verified is refused, and records nothing", async () => {
  await withFixture(async ({ client, product, seller }) => {
    for (const state of [VERIFIED_MIPO_SHOP, VERIFIED_EXTERNAL_SELLER]) {
      await assert.rejects(
        () => decide(client, product, { state, sellerId: seller, ...note("too early") }),
        (error) => {
          assert.ok(error instanceof OwnershipReviewError);
          assert.equal(error.code, "OWNERSHIP_REVIEW_CONFLICT");
          assert.equal(error.statusCode, 409);
          return true;
        },
      );
    }
    assert.equal(await lookups.historyLookup(client, product).then((r) => r.length), 0,
      "a refused transition must leave no history");
  });
});

dbTest("verifying against a seller that does not exist is refused", async () => {
  await withFixture(async ({ client, product }) => {
    await decide(client, product, { state: IN_REVIEW, sellerId: null, ...note("opening") });
    await assert.rejects(
      () => decide(client, product, {
        state: VERIFIED_EXTERNAL_SELLER,
        sellerId: "22222222-2222-2222-2222-222222222222",
        ...note("theirs"),
      }),
      /named seller does not exist/,
    );
  });
});

dbTest("verifying against an unverified business profile is refused", async () => {
  await withFixture(async ({ client, product, unverified }) => {
    await decide(client, product, { state: IN_REVIEW, sellerId: null, ...note("opening") });
    await assert.rejects(
      () => decide(client, product, { state: VERIFIED_MIPO_SHOP, sellerId: unverified, ...note("house") }),
      /not a verified business profile/,
    );
  });
});

dbTest("a review never touches business_id, supplier_id or the product row", async () => {
  await withFixture(async ({ client, product, seller }) => {
    const before = (await client.query(
      "select business_id, supplier_id, name, price, updated_at from public.business_products where id = $1",
      [product],
    )).rows[0];

    await decide(client, product, { state: IN_REVIEW, sellerId: null, ...note("opening") });
    await decide(client, product, { state: VERIFIED_EXTERNAL_SELLER, sellerId: seller, ...note("contract #7") });

    const after = (await client.query(
      "select business_id, supplier_id, name, price, updated_at from public.business_products where id = $1",
      [product],
    )).rows[0];

    assert.deepEqual(after, before, "the product row must be byte-identical after a verified decision");
    // And the decision emphatically did NOT move the product to the seller it named.
    assert.notEqual(after.business_id, seller, "verifying ownership must not reassign the product");
  });
});

dbTest("a review deletes no product and touches no order item", async () => {
  await withFixture(async ({ client, product, seller }) => {
    const order = (await client.query(
      `insert into public.orders (order_number, customer_name, customer_email, subtotal, total)
       values ('REVIEW-TEST-1', 'Buyer', 'buyer@example.com', 10, 10) returning id`,
    )).rows[0].id;
    await client.query(
      `insert into public.order_items (order_id, product_id, product_source, product_name, quantity, price)
       values ($1, $2, 'manual', 'Review Fixture Product', 1, 10)`,
      [order, product],
    );
    const itemsBefore = (await client.query(
      "select product_id, product_name, price, quantity from public.order_items where order_id = $1", [order],
    )).rows;

    await decide(client, product, { state: IN_REVIEW, sellerId: null, ...note("opening") });
    await decide(client, product, { state: REJECTED, sellerId: null, ...note("discontinued") });

    const itemsAfter = (await client.query(
      "select product_id, product_name, price, quantity from public.order_items where order_id = $1", [order],
    )).rows;
    assert.deepEqual(itemsAfter, itemsBefore, "order items must be untouched");

    const stillThere = await client.query("select 1 from public.business_products where id = $1", [product]);
    assert.equal(stillThere.rowCount, 1, "a rejected product must not be deleted");
  });
});

dbTest("a correction keeps the previous decision in history", async () => {
  await withFixture(async ({ client, product, seller }) => {
    await decide(client, product, { state: IN_REVIEW, sellerId: null, ...note("opening") });
    await decide(client, product, { state: VERIFIED_MIPO_SHOP, sellerId: seller, ...note("house stock") });
    // Correcting requires reopening - it cannot be flipped in place.
    await assert.rejects(
      () => decide(client, product, { state: VERIFIED_EXTERNAL_SELLER, sellerId: seller, ...note("actually theirs") }),
      /cannot move from verified_mipo_shop/,
    );
    await decide(client, product, { state: IN_REVIEW, sellerId: null, ...note("reopening, evidence disputed") });
    await decide(client, product, { state: VERIFIED_EXTERNAL_SELLER, sellerId: seller, ...note("contract #9") });

    const history = (await lookups.historyLookup(client, product)).map(toHistoryEntry);
    assert.equal(history.length, 4);
    assert.equal(history[0].to_state, VERIFIED_EXTERNAL_SELLER, "newest first");
    assert.ok(
      history.some((entry) => entry.to_state === VERIFIED_MIPO_SHOP && entry.note === "house stock"),
      "the superseded decision must still be in the history",
    );
  });
});

dbTest("the decision and its audit record are the same row, so neither can exist alone", async () => {
  await withFixture(async ({ client, product, seller }) => {
    await decide(client, product, { state: IN_REVIEW, sellerId: null, ...note("opening") });

    // Force the write to fail at the last moment: an actor_admin_user_id that
    // is not a uuid makes the INSERT throw. If a decision could be persisted
    // without its audit row, the state would have advanced anyway.
    await client.query("savepoint before_failed_write");
    await assert.rejects(() => decide(client, product, {
      state: REJECTED, sellerId: null, ...note("this must not persist"),
    }, { actor: { id: "not-a-uuid", email: "x@mipo.pet", role: "admin" } }));
    await client.query("rollback to savepoint before_failed_write");

    const history = await lookups.historyLookup(client, product);
    assert.equal(history.length, 1, "the failed write left no extra row");
    assert.equal(deriveOwnershipState(history), IN_REVIEW, "and the state did not advance");
  });
});

dbTest("the per-product review lock is exclusive, and scoped to one product", async () => {
  // The race test below exercises the happy path but does not falsify the
  // lock's absence - it passes with the lock removed, because two awaited
  // connections in one Node process tend to serialise on their own. This one
  // tests the lock directly: while one transaction holds a product's key, a
  // second must not be able to take it, and a different product must be free.
  const pool = await pgPool();
  const holder = await pool.connect();
  const other = await pool.connect();
  const key = (id) => `ownership_review:${id}`;
  try {
    await holder.query("begin");
    await holder.query("select pg_advisory_xact_lock(hashtext($1))", [key("product-a")]);

    const sameProduct = await other.query(
      "select pg_try_advisory_xact_lock(hashtext($1)) as taken", [key("product-a")],
    );
    assert.equal(sameProduct.rows[0].taken, false,
      "a second reviewer must not take a lock the first is holding");

    const differentProduct = await other.query(
      "select pg_try_advisory_xact_lock(hashtext($1)) as taken", [key("product-b")],
    );
    assert.equal(differentProduct.rows[0].taken, true,
      "reviewing a different product must not be blocked");

    // Transaction-scoped: committing releases it with nothing to clean up.
    await holder.query("commit");
    const afterRelease = await other.query(
      "select pg_try_advisory_xact_lock(hashtext($1)) as taken", [key("product-a")],
    );
    assert.equal(afterRelease.rows[0].taken, true, "the lock must release on commit");
  } finally {
    await holder.query("rollback").catch(() => {});
    holder.release();
    other.release();
    await pool.end();
  }
});

dbTest("a reviewer cannot decide from state another reviewer has already superseded", async () => {
  // The falsifying test for the lock. Reviewer A is forced to pause after it
  // has read the current state but before it writes; reviewer B then runs to
  // completion. Without the lock A would write a second decision from state it
  // read before B existed. With the lock, B cannot even begin until A commits,
  // so B reads A's result and conflicts - which is the point.
  const pool = await pgPool();
  const setup = await pool.connect();
  let seller;
  let product;
  try {
    seller = (await setup.query(
      `insert into public.business_profiles (business_name, business_type, is_verified)
       values ('Interleave Fixture Seller', 'shop', true) returning id`,
    )).rows[0].id;
    product = (await setup.query(
      `insert into public.business_products (business_id, name, price)
       values ($1, 'Interleave Fixture Product', 10) returning id`,
      [seller],
    )).rows[0].id;
    setup.release();

    let announceARead;
    const aHasRead = new Promise((resolve) => { announceARead = resolve; });

    const reviewerA = (async () => {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const result = await decide(client, product, { state: IN_REVIEW, sellerId: null, ...note("A") }, {
          historyLookup: async (c, id) => {
            const rows = await lookups.historyLookup(c, id);
            announceARead();       // A has now read the state...
            await new Promise((r) => setTimeout(r, 150)); // ...and dawdles before writing
            return rows;
          },
        });
        await client.query("commit");
        return { ok: true, result };
      } catch (error) {
        await client.query("rollback").catch(() => {});
        return { ok: false, error };
      } finally {
        client.release();
      }
    })();

    const reviewerB = (async () => {
      await aHasRead;
      const client = await pool.connect();
      try {
        await client.query("begin");
        const result = await decide(client, product, { state: IN_REVIEW, sellerId: null, ...note("B") });
        await client.query("commit");
        return { ok: true, result };
      } catch (error) {
        await client.query("rollback").catch(() => {});
        return { ok: false, error };
      } finally {
        client.release();
      }
    })();

    const outcomes = await Promise.all([reviewerA, reviewerB]);
    const history = await lookups.historyLookup(pool, product);

    assert.equal(history.length, 1, "two reviewers must not both write a decision");
    assert.equal(outcomes.filter((outcome) => outcome.ok).length, 1, "exactly one may succeed");
    assert.equal(
      outcomes.find((outcome) => !outcome.ok).error.code,
      "OWNERSHIP_REVIEW_CONFLICT",
      "the loser must get a stable conflict",
    );
  } finally {
    const cleanup = await pool.connect();
    if (product) await cleanup.query("delete from public.admin_audit_log where entity_id = $1", [product]);
    if (product) await cleanup.query("delete from public.business_products where id = $1", [product]);
    if (seller) await cleanup.query("delete from public.business_profiles where id = $1", [seller]);
    cleanup.release();
    await pool.end();
  }
});

dbTest("concurrent decisions on one product produce exactly one decision", async () => {
  // This one cannot use the rolled-back fixture: concurrency needs two real
  // connections seeing the same committed row. It cleans up after itself.
  const pool = await pgPool();
  const setup = await pool.connect();
  let seller;
  let product;
  try {
    seller = (await setup.query(
      `insert into public.business_profiles (business_name, business_type, is_verified)
       values ('Concurrency Fixture Seller', 'shop', true) returning id`,
    )).rows[0].id;
    product = (await setup.query(
      `insert into public.business_products (business_id, name, price)
       values ($1, 'Concurrency Fixture Product', 10) returning id`,
      [seller],
    )).rows[0].id;
    setup.release();

    // Both reviewers open the review at the same moment, from unresolved.
    // Exactly one may win: the advisory lock makes the second read the first
    // one's result, and unresolved -> ownership_review is then no longer valid.
    const attempt = async () => {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const result = await decide(client, product, {
          state: IN_REVIEW, sellerId: null, ...note("racing"),
        });
        await client.query("commit");
        return { ok: true, result };
      } catch (error) {
        await client.query("rollback").catch(() => {});
        return { ok: false, error };
      } finally {
        client.release();
      }
    };

    const [first, second] = await Promise.all([attempt(), attempt()]);
    const winners = [first, second].filter((outcome) => outcome.ok);
    const losers = [first, second].filter((outcome) => !outcome.ok);

    assert.equal(winners.length, 1, "exactly one concurrent reviewer may win");
    assert.equal(losers.length, 1);
    assert.equal(losers[0].error.code, "OWNERSHIP_REVIEW_CONFLICT",
      "the loser must get a stable conflict, not a crash");

    const history = await lookups.historyLookup(pool, product);
    assert.equal(history.length, 1, "a race must not write two decisions");
  } finally {
    const cleanup = await pool.connect();
    if (product) await cleanup.query("delete from public.admin_audit_log where entity_id = $1", [product]);
    if (product) await cleanup.query("delete from public.business_products where id = $1", [product]);
    if (seller) await cleanup.query("delete from public.business_profiles where id = $1", [seller]);
    cleanup.release();
    await pool.end();
  }
});

dbTest("a decision records the reviewer, both states and the note, and no product content", async () => {
  await withFixture(async ({ client, product, seller }) => {
    await decide(client, product, { state: IN_REVIEW, sellerId: null, ...note("opening") });
    await decide(client, product, { state: VERIFIED_EXTERNAL_SELLER, sellerId: seller, ...note("contract #7") });

    const row = (await client.query(
      `select action_type, entity_type, entity_id, old_values, new_values, metadata,
              actor_email, actor_role, created_at
         from public.admin_audit_log
        where entity_type = $1 and entity_id = $2
        order by created_at desc, id desc limit 1`,
      [OWNERSHIP_ENTITY_TYPE, product],
    )).rows[0];

    assert.equal(row.action_type, `product_ownership.${VERIFIED_EXTERNAL_SELLER}`);
    assert.equal(row.old_values.state, IN_REVIEW);
    assert.equal(row.new_values.state, VERIFIED_EXTERNAL_SELLER);
    assert.equal(row.new_values.seller_id, seller);
    assert.equal(row.new_values.note, "contract #7");
    assert.equal(row.actor_email, "reviewer@mipo.pet");
    assert.ok(row.created_at);

    // Nothing that could carry a token, a customer or product copy.
    const serialized = JSON.stringify(row);
    assert.doesNotMatch(serialized, /source_url|https?:\/\//i, "no URLs in the audit record");
    assert.doesNotMatch(serialized, /Review Fixture Product/, "no product content in the audit record");
  });
});
