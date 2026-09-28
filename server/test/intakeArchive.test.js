// Discarding a draft, and the two states that must refuse.
//
// product_drafts has carried archived_at and archived_by since 0043, and
// listDrafts has always filtered on `archived_at is null`. The column existed,
// the filter existed, and no route ever set it - so a mistaken import stayed in
// the admin's queue permanently and the owner reported it as a missing delete
// button.
//
// The interesting half is not that archiving works. It is WHICH STATES REFUSE:
// IN_REVIEW is somebody's open task and APPROVED has a catalogue product
// hanging off it by a NOT NULL foreign key. A delete that walked past either
// would take a live shop listing with it, quietly.
//
// This exercises the state rules through the same pure module the route uses,
// and the write itself against a real database in a transaction that is always
// rolled back.

import assert from "node:assert/strict";
import test from "node:test";

import {
  DRAFT_STATES,
  allowedDraftTransitions,
  isDraftTransitionAllowed,
} from "../src/productIntakeState.js";

const DATABASE_URL = process.env.DATABASE_URL;
const dbTest = (name, fn) => test(name, { skip: DATABASE_URL ? false : "DATABASE_URL not set" }, fn);

const withDb = async (fn) => {
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: DATABASE_URL, ssl: false });
  await client.connect();
  try {
    await client.query("begin");
    await fn(client);
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end();
  }
};

/** The route's own update, so the test exercises the statement that ships. */
const archive = (client, draftId, adminId) => client.query(
  `update public.product_drafts
      set state = 'ARCHIVED', archived_at = clock_timestamp(), archived_by = $2,
          updated_by = $2, updated_at = now()
    where id = $1 returning *`,
  [draftId, adminId],
);

const seed = async (client, state) => {
  const businessId = await client.query(
    `insert into public.business_profiles (business_name, business_type, is_verified)
     values ('חנות בדיקה', 'shop', true) returning id`,
  ).then((r) => r.rows[0].id);

  const adminId = await client.query(
    `insert into public.admin_users (email, password_hash, display_name, role, is_active)
     values ($1, 'x', 'בודק', 'admin', true) returning id`,
    [`archive-${Math.random().toString(36).slice(2, 9)}@example.test`],
  ).then((r) => r.rows[0].id);

  const draftId = await client.query(
    `insert into public.product_drafts (business_id, created_by, name, state)
     values ($1, $2, 'מוצר בדיקה', $3) returning id`,
    [businessId, adminId, state],
  ).then((r) => r.rows[0].id);

  return { businessId, adminId, draftId };
};

// ─── which states may be discarded ───────────────────────────────────────────

test("archiving is allowed exactly from IMPORTED, DRAFT and REJECTED", () => {
  /*
   * Spelled out one state at a time rather than looped over a list this test
   * also owns: a loop over `Object.values(DRAFT_STATES)` comparing against a
   * copy of the rule is a test that agrees with itself.
   */
  assert.equal(isDraftTransitionAllowed(DRAFT_STATES.IMPORTED, DRAFT_STATES.ARCHIVED), true);
  assert.equal(isDraftTransitionAllowed(DRAFT_STATES.DRAFT, DRAFT_STATES.ARCHIVED), true);
  assert.equal(isDraftTransitionAllowed(DRAFT_STATES.REJECTED, DRAFT_STATES.ARCHIVED), true);

  // The two that matter.
  assert.equal(isDraftTransitionAllowed(DRAFT_STATES.IN_REVIEW, DRAFT_STATES.ARCHIVED), false,
    "a draft somebody is reviewing can be discarded out from under them");
  assert.equal(isDraftTransitionAllowed(DRAFT_STATES.APPROVED, DRAFT_STATES.ARCHIVED), false,
    "an approved draft can be archived, orphaning the catalogue product that points at it");

  // And archived is terminal, so a second archive is not a transition either.
  assert.deepEqual(allowedDraftTransitions(DRAFT_STATES.ARCHIVED), []);
});

test("the refusal names what IS allowed, so the screen can say what to do instead", () => {
  // A 409 that says only "no" leaves the operator guessing. IN_REVIEW can be
  // rejected or sent back, and then archived; the answer has to carry that.
  assert.deepEqual(
    allowedDraftTransitions(DRAFT_STATES.IN_REVIEW).sort(),
    ["APPROVED", "DRAFT", "REJECTED"],
  );
  assert.deepEqual(allowedDraftTransitions(DRAFT_STATES.APPROVED), ["DRAFT"]);
});

// ─── the write ───────────────────────────────────────────────────────────────

dbTest("an archived draft leaves the queue the admin reads", async () => {
  /*
   * listDrafts filters `archived_at is null`, so this is the whole point: the
   * row has to disappear from the list, not merely change a column. A state
   * change without archived_at would leave it on screen labelled ARCHIVED,
   * which is not what "delete" means to anybody.
   */
  await withDb(async (client) => {
    const { businessId, adminId, draftId } = await seed(client, "DRAFT");

    const visible = async () => {
      const { rows } = await client.query(
        `select id from public.product_drafts
          where archived_at is null and business_id = $1`,
        [businessId],
      );
      return rows.map((row) => row.id);
    };

    assert.deepEqual(await visible(), [draftId]);
    await archive(client, draftId, adminId);
    assert.deepEqual(await visible(), [], "the archived draft is still in the queue");
  });
});

dbTest("archiving records who did it and when", async () => {
  // An operator discarding somebody else's import is a thing that gets asked
  // about later. archived_by is the answer, and it was never written.
  await withDb(async (client) => {
    const { adminId, draftId } = await seed(client, "IMPORTED");
    const { rows } = await archive(client, draftId, adminId);

    assert.equal(rows[0].state, "ARCHIVED");
    assert.equal(rows[0].archived_by, adminId);
    assert.ok(rows[0].archived_at, "archived_at was not set, so the row stays visible");
  });
});

dbTest("an approved draft still has its catalogue product pointing at it", async () => {
  /*
   * Why APPROVED refuses, demonstrated rather than asserted from the rule. The
   * foreign key is NOT NULL, so there is no version of "delete this draft" that
   * leaves a consistent catalogue behind - the product would reference a row
   * that the admin believes is gone.
   */
  await withDb(async (client) => {
    // Seeded the way approveDraft does it, because the schema insists: a draft
    // may not be APPROVED without approved_catalog_product_id
    // (product_drafts_approved_has_product), and the product may not exist
    // without origin_draft_id. The two are written in that order, in one
    // transaction, for exactly that reason.
    const { businessId, adminId, draftId } = await seed(client, "DRAFT");
    const productId = await client.query(
      `insert into public.catalog_products
         (owning_business_id, origin_draft_id, name, created_by)
       values ($1, $2, 'מוצר בדיקה', $3) returning id`,
      [businessId, draftId, adminId],
    ).then((r) => r.rows[0].id);
    await client.query(
      "update public.product_drafts set state = 'APPROVED', approved_catalog_product_id = $2 where id = $1",
      [draftId, productId],
    );

    const { rows } = await client.query(
      "select count(*)::int as n from public.catalog_products where origin_draft_id = $1",
      [draftId],
    );
    assert.equal(rows[0].n, 1);

    /*
     * TWO GUARDS, AND NEITHER IS THE ONE I FIRST ASSUMED.
     *
     * The column is nullable, so this is not a NOT NULL rule. What actually
     * holds the pair together is a trigger, catalog_products_origin_frozen,
     * which refuses any change to origin_draft_id, and a foreign key declared
     * ON DELETE RESTRICT, which refuses the delete from the other direction.
     *
     * Both are asserted because they answer different questions: the trigger
     * says the product cannot be detached from its draft, and the RESTRICT
     * says the draft cannot be removed from under the product. Together they
     * are why APPROVED has no archive transition - the database would refuse
     * whichever way the route tried to make it work.
     */
    /*
     * Each expected failure runs inside a SAVEPOINT. A statement that raises
     * puts the whole transaction into the aborted state, so without this the
     * second assertion answers 25P02 ("current transaction is aborted") and
     * proves nothing about the guard it was written for - it would look like a
     * pass or a puzzling failure depending on which way it was written.
     */
    const refuses = async (code, label, sql, params) => {
      await client.query("savepoint guard");
      let raised = null;
      try {
        await client.query(sql, params);
      } catch (error) {
        raised = error?.code ?? String(error?.message);
      }
      await client.query("rollback to savepoint guard");
      assert.equal(raised, code, label);
    };

    // The trigger's own error. A raise from PL/pgSQL, not a constraint.
    await refuses(
      "23001",
      "the origin is not frozen, so a catalogue product can be detached from its draft",
      "update public.catalog_products set origin_draft_id = null where origin_draft_id = $1",
      [draftId],
    );

    // And the foreign key's, which is a different code because it is a
    // different mechanism: ON DELETE RESTRICT raises foreign_key_violation.
    await refuses(
      "23503",
      "the draft can be deleted out from under a live catalogue product",
      "delete from public.product_drafts where id = $1",
      [draftId],
    );
  });
});
