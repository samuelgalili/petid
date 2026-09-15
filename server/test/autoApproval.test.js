// The auto-approval rule, and the claim the whole thing rests on.
//
// The rule saves a human from reading 187 of 375 drafts. It is allowed to be
// wrong in one direction only: a draft approved in error must still be unable
// to reach a customer. The plan states that as a fact - "the publication gate
// independently blocks anything incomplete, so a product auto-approved in
// error does not reach the shop". A stated fact that nothing checks is how a
// labour saving quietly becomes a safety bypass, so the last section of this
// file takes a product through auto-approval against the real gate and reads
// what the gate actually says.

import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTO_APPROVAL_BLOCKERS as B,
  autoApprovableSql,
  autoApprovalBlockers,
  mayAutoApprove,
} from "../src/autoApproval.js";

const DATABASE_URL = process.env.DATABASE_URL;
const dbTest = (name, fn) => test(name, { skip: DATABASE_URL ? false : "DATABASE_URL not set" }, fn);

const withDb = async (fn) => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: false });
  const client = await pool.connect();
  try {
    await client.query("begin");
    await fn(client);
  } finally {
    await client.query("rollback").catch(() => {});
    client.release();
    await pool.end();
  }
};

/** A draft that passes every condition. Each test spoils exactly one thing. */
const approvable = (overrides = {}) => ({
  name: "MIPO Daily Chicken",
  category_id: "22222222-2222-2222-2222-222222222222",
  price: "49.90",
  image_url: "/uploads/abc.jpg",
  is_flagged: false,
  needs_price_review: false,
  needs_image_review: false,
  ...overrides,
});

// ─── the baseline ────────────────────────────────────────────────────────────

test("a complete, unflagged product is approvable", () => {
  assert.deepEqual(autoApprovalBlockers(approvable()), []);
  assert.equal(mayAutoApprove(approvable()), true);
});

// ─── one condition at a time ─────────────────────────────────────────────────

test("each condition blocks on its own", () => {
  const cases = [
    [{ name: "" }, B.MISSING_NAME],
    [{ name: "   " }, B.MISSING_NAME],
    [{ name: null }, B.MISSING_NAME],
    [{ category_id: null }, B.MISSING_CATEGORY],
    [{ price: null }, B.MISSING_PRICE],
    [{ price: "" }, B.MISSING_PRICE],
    [{ price: "0" }, B.NON_POSITIVE_PRICE],
    [{ price: "-5" }, B.NON_POSITIVE_PRICE],
    [{ image_url: "" }, B.MISSING_IMAGE],
    [{ image_url: null }, B.MISSING_IMAGE],
    [{ image_url: "/placeholder.svg" }, B.PLACEHOLDER_IMAGE],
    [{ is_flagged: true }, B.FLAGGED],
    [{ needs_price_review: true }, B.NEEDS_PRICE_REVIEW],
    [{ needs_image_review: true }, B.NEEDS_IMAGE_REVIEW],
  ];
  for (const [override, expected] of cases) {
    assert.deepEqual(
      autoApprovalBlockers(approvable(override)), [expected],
      `${JSON.stringify(override)} must block with exactly ${expected}`,
    );
  }
});

test("a zero price is distinguished from an absent one", () => {
  // C-23 counted 73 products priced at or below zero. That is a decision that
  // went wrong, not a field nobody filled, and an admin triaging the queue
  // wants to be able to tell them apart.
  assert.deepEqual(autoApprovalBlockers(approvable({ price: "0" })), [B.NON_POSITIVE_PRICE]);
  assert.deepEqual(autoApprovalBlockers(approvable({ price: null })), [B.MISSING_PRICE]);
});

test("the placeholder image is not an image", () => {
  // 69 products have no image. The legacy column is NOT NULL with a default of
  // '/placeholder.svg', so "has no image" and "has image_url set" are both
  // true of the same row - which is exactly how a placeholder ends up on a
  // product page.
  assert.deepEqual(autoApprovalBlockers(approvable({ image_url: "/placeholder.svg" })), [B.PLACEHOLDER_IMAGE]);
  assert.equal(mayAutoApprove(approvable({ image_url: "/placeholder.svg" })), false);
});

test("several faults are all reported, not just the first", () => {
  // An admin fixing a draft should learn everything wrong with it in one pass.
  const blockers = autoApprovalBlockers({ name: "", category_id: null, price: "0", image_url: "" });
  assert.deepEqual(blockers.sort(), [
    B.MISSING_CATEGORY, B.MISSING_IMAGE, B.MISSING_NAME, B.NON_POSITIVE_PRICE,
  ].sort());
});

// ─── fail closed ─────────────────────────────────────────────────────────────

test("nonsense in a numeric field is not a price", () => {
  // Number([]) is 0, Number(true) is 1, Number(' ') is 0. A rule written as
  // Number(price) > 0 would approve a product priced `true`.
  for (const price of [true, [], {}, " ", "abc", "1.2.3", NaN, Infinity, "1e3"]) {
    assert.equal(
      mayAutoApprove(approvable({ price })), false,
      `price=${JSON.stringify(price)} must not be treated as a positive price`,
    );
  }
});

test("a missing or malformed row is never approvable", () => {
  for (const row of [null, undefined, "product", 42, []]) {
    assert.equal(mayAutoApprove(row), false, String(row));
    assert.ok(autoApprovalBlockers(row).length > 0);
  }
});

test("NULL flags are not the same as false, and neither approves by accident", () => {
  // is_flagged is nullable. NULL means nobody ever set it, which is not a
  // flag - so it must NOT block. The test exists because the opposite mistake
  // (treating NULL as flagged) would silently reject most of the catalogue.
  assert.deepEqual(autoApprovalBlockers(approvable({ is_flagged: null })), []);
  assert.deepEqual(autoApprovalBlockers(approvable({ needs_price_review: null })), []);
  // And a truthy non-boolean does not flag either: only true does.
  assert.deepEqual(autoApprovalBlockers(approvable({ is_flagged: "yes" })), []);
});

// ─── the U-6 switch ──────────────────────────────────────────────────────────

test("the review flags are honoured by default", () => {
  assert.equal(mayAutoApprove(approvable({ needs_price_review: true })), false);
  assert.equal(mayAutoApprove(approvable({ needs_image_review: true })), false);
});

test("and can be relaxed without rewriting the rule, if U-6 says they are stale", () => {
  const relaxed = { honourReviewFlags: false };
  assert.equal(mayAutoApprove(approvable({ needs_price_review: true }), relaxed), true);
  assert.equal(mayAutoApprove(approvable({ needs_image_review: true }), relaxed), true);
  // Relaxing the flags must not relax anything else. This is the test that
  // stops "ignore the stale flags" from quietly becoming "approve everything".
  assert.deepEqual(autoApprovalBlockers(approvable({ price: "0" }), relaxed), [B.NON_POSITIVE_PRICE]);
  assert.deepEqual(autoApprovalBlockers(approvable({ image_url: "" }), relaxed), [B.MISSING_IMAGE]);
  assert.deepEqual(autoApprovalBlockers(approvable({ is_flagged: true }), relaxed), [B.FLAGGED]);
});

// ─── the SQL says the same thing as the predicate ────────────────────────────

dbTest("the SQL fragment and the JavaScript predicate agree on every combination", async () => {
  // The same cross-product discipline sellerEligibility.test.js uses. The rule
  // will be counted in SQL and enforced in JavaScript, and the only way to know
  // those are one rule is to ask both about the same rows.
  await withDb(async (client) => {
    const { rows: [business] } = await client.query(
      `insert into public.business_profiles (business_name, business_type)
       values ('Auto-approval probe', 'shop') returning id`,
    );
    const { rows: [category] } = await client.query(
      `select id from public.product_categories limit 1`,
    );

    const names = ["Real name", "   "];
    const prices = ["49.90", "0"];
    const images = ["/uploads/a.jpg", "/placeholder.svg"];
    const flags = [false, true];

    const created = [];
    for (const name of names) {
      for (const price of prices) {
        for (const image of images) {
          for (const flagged of flags) {
            for (const priceReview of flags) {
              for (const categoryId of [category.id, null]) {
                const { rows } = await client.query(
                  `insert into public.business_products
                     (business_id, name, price, image_url, category_id,
                      is_flagged, needs_price_review, needs_image_review)
                   values ($1, $2, $3, $4, $5, $6, $7, false)
                   returning id, name, price, image_url, category_id,
                             is_flagged, needs_price_review, needs_image_review`,
                  [business.id, name, price, image, categoryId, flagged, priceReview],
                );
                created.push(rows[0]);
              }
            }
          }
        }
      }
    }

    const { rows: passing } = await client.query(
      `select p.id from public.business_products p
        where p.business_id = $1 and ${autoApprovableSql("p")}`,
      [business.id],
    );
    const passingIds = new Set(passing.map((row) => row.id));

    for (const row of created) {
      assert.equal(
        passingIds.has(row.id), mayAutoApprove(row),
        `SQL and JS disagree for ${JSON.stringify({
          name: row.name, price: row.price, image: row.image_url,
          category: row.category_id === null ? null : "set",
          flagged: row.is_flagged, priceReview: row.needs_price_review,
        })}`,
      );
    }
    assert.ok(passingIds.size > 0, "the fixture must contain some approvable rows");
    assert.ok(passingIds.size < created.length, "and some unapprovable ones");
  });
});

dbTest("the relaxed SQL and the relaxed predicate also agree", async () => {
  await withDb(async (client) => {
    const { rows: [business] } = await client.query(
      `insert into public.business_profiles (business_name, business_type)
       values ('Relaxed probe', 'shop') returning id`,
    );
    const { rows: [category] } = await client.query(`select id from public.product_categories limit 1`);
    const created = [];
    for (const priceReview of [true, false]) {
      for (const imageReview of [true, false]) {
        const { rows } = await client.query(
          `insert into public.business_products
             (business_id, name, price, image_url, category_id,
              is_flagged, needs_price_review, needs_image_review)
           values ($1, 'Named', 10.00, '/uploads/a.jpg', $2, false, $3, $4)
           returning id, name, price, image_url, category_id,
                     is_flagged, needs_price_review, needs_image_review`,
          [business.id, category.id, priceReview, imageReview],
        );
        created.push(rows[0]);
      }
    }

    const options = { honourReviewFlags: false };
    const { rows: passing } = await client.query(
      `select p.id from public.business_products p
        where p.business_id = $1 and ${autoApprovableSql("p", options)}`,
      [business.id],
    );
    assert.equal(passing.length, created.length,
      "with the flags relaxed, all four combinations pass");
    for (const row of created) assert.equal(mayAutoApprove(row, options), true);
  });
});

// ─── the claim the rule depends on ───────────────────────────────────────────

dbTest("a draft that passes the rule STILL cannot be published", async () => {
  // The load-bearing claim, checked against the real gate rather than quoted.
  //
  // Auto-approval creates an UNPUBLISHED catalog_product and nothing else. The
  // publication gate wants an active variant, a priced offer, availability and
  // an approved image, none of which exist yet. So the rule cannot put an
  // unfinished product in the shop even when it is wrong - and, just as
  // importantly, approving 187 drafts does NOT make 187 products publishable.
  await withDb(async (client) => {
    const { rows: [business] } = await client.query(
      `insert into public.business_profiles
         (business_name, business_type, is_verified, commercial_status)
       values ('Gate probe', 'shop', true, 'approved') returning id`,
    );
    const { rows: [category] } = await client.query(`select id from public.product_categories limit 1`);
    const { rows: [actor] } = await client.query(
      `select id from public.admin_users where email = 'system+legacy-migration@mipo.pet'`,
    );

    // A draft that the rule would wave straight through.
    const row = approvable({ category_id: category.id });
    assert.deepEqual(autoApprovalBlockers(row), [], "the fixture must be approvable");

    const { rows: [draft] } = await client.query(
      `insert into public.product_drafts
         (business_id, state, name, category_id, proposed_price, created_by,
          submitted_by, submitted_at)
       values ($1, 'IN_REVIEW', $2, $3, $4, $5, $5, now()) returning id`,
      [business.id, row.name, category.id, row.price, actor.id],
    );
    const { rows: [product] } = await client.query(
      `insert into public.catalog_products
         (owning_business_id, origin_draft_id, name, category_id, attributes, created_by)
       values ($1, $2, $3, $4, '{}'::jsonb, $5) returning id`,
      [business.id, draft.id, row.name, category.id, actor.id],
    );
    await client.query(
      `update public.product_drafts set state = 'APPROVED', approved_catalog_product_id = $2
        where id = $1`,
      [draft.id, product.id],
    );

    const { rows: [gate] } = await client.query(
      `select p.publication_state,
              (select count(*) from public.product_variants v
                where v.catalog_product_id = p.id and v.archived_at is null
                  and v.status = 'ACTIVE')::int as active_variants,
              (select count(*) from public.product_media m
                where m.catalog_product_id = p.id and m.archived_at is null
                  and m.approved_at is not null)::int as approved_images
         from public.catalog_products p where p.id = $1`,
      [product.id],
    );

    assert.equal(gate.publication_state, "UNPUBLISHED",
      "approval must not publish anything");
    assert.equal(gate.active_variants, 0,
      "approval creates no variant - so the gate's no_active_variant holds");
    assert.equal(gate.approved_images, 0,
      "and no approved image - OD-3 requires one and approval does not supply it");
  });
});

// ─── the rule and the measurement must be the same rule ──────────────────────

dbTest("autoApprovableSql agrees with C-29, the number the decision is made on", async () => {
  // C-29 in production-catalogue-measure.yml reports how many products the
  // rule would pass. That number is what decides whether the flags are worth
  // chasing and how big the manual queue is. If the measurement and the
  // enforced rule drift apart, the decision gets made on a number that
  // describes a rule nobody implemented.
  //
  // C-29 was written before 0051 deployed, so its category test also accepts
  // the free-text spellings 0051 has since filed. With every product now
  // carrying a category_id that branch can only widen the match, never narrow
  // it, so the two agree - and this test fails the day that stops being true.
  const { readFileSync } = await import("node:fs");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  // Resolved from this file, not from the working directory. `npm test
  // --prefix server` runs with cwd=server/, where a repo-root-relative path
  // does not exist - so running this file by hand from the repo root passed
  // while the real invocation failed with ENOENT.
  const workflow = readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)),
      "../../.github/workflows/production-catalogue-measure.yml"),
    "utf8",
  );
  const squash = (text) => text.replace(/\s+/g, " ").trim();
  const c29Condition = `
    p.name is not null and btrim(p.name) <> '' and p.price > 0
      and (p.category_id is not null or a.category_id is not null
           or lower(btrim(coalesce(p.category, ''))) in ('dry-food', 'wet-food'))
      and p.image_url is not null and p.image_url <> '/placeholder.svg'
      and not coalesce(p.is_flagged, false)
      and not coalesce(p.needs_image_review, false)
      and not coalesce(p.needs_price_review, false)`;
  // Anchored to the LABEL as well as the condition. Matching the condition
  // alone passed against a workflow that had been edited, because C-29 has
  // three near-identical filter clauses and the substring was still present in
  // one of the others - the search found a different clause and reported
  // agreement. An anchor that can be satisfied by the wrong occurrence is not
  // an anchor.
  assert.ok(
    squash(workflow).includes(`${squash(c29Condition)}) as both_flags_consulted`),
    "C-29 has changed shape - reconcile it with autoApprovableSql before trusting either",
  );

  await withDb(async (client) => {
    const { rows: [business] } = await client.query(
      `insert into public.business_profiles (business_name, business_type)
       values ('C-29 agreement', 'shop') returning id`,
    );
    const { rows: [category] } = await client.query(`select id from public.product_categories limit 1`);
    for (const name of ["Named", " "]) {
      for (const price of ["10.00", "0"]) {
        for (const image of ["/uploads/a.jpg", "/placeholder.svg"]) {
          for (const flagged of [true, false]) {
            for (const review of [true, false]) {
              await client.query(
                `insert into public.business_products
                   (business_id, name, price, image_url, category, category_id,
                    is_flagged, needs_price_review, needs_image_review)
                 values ($1, $2, $3, $4, 'dry-food', $5, $6, $7, $7)`,
                [business.id, name, price, image, category.id, flagged, review],
              );
            }
          }
        }
      }
    }

    const { rows } = await client.query(
      `select count(*) filter (where ${autoApprovableSql("p")})::int as by_rule,
              count(*) filter (where ${c29Condition})::int as by_c29
         from public.business_products p
         left join public.product_category_aliases a
           on a.alias = lower(btrim(coalesce(p.category, '')))
        where p.business_id = $1`,
      [business.id],
    );
    assert.equal(rows[0].by_rule, rows[0].by_c29,
      "the enforced rule and the measured rule must pass the same products");
    assert.ok(rows[0].by_rule > 0, "the fixture must contain passing rows for this to mean anything");
  });
});

dbTest("approval cannot skip review: the state machine has no IMPORTED to APPROVED edge", async () => {
  // The rule decides WHETHER to approve. It does not get to decide HOW, and
  // the chain IMPORTED -> DRAFT -> IN_REVIEW -> APPROVED is not negotiable -
  // which is also what keeps a submitted-by on every approved draft.
  const { DRAFT_STATES, isDraftTransitionAllowed, mayApproveDraft } =
    await import("../src/productIntakeState.js");
  assert.equal(isDraftTransitionAllowed(DRAFT_STATES.IMPORTED, DRAFT_STATES.APPROVED), false);
  assert.equal(isDraftTransitionAllowed(DRAFT_STATES.DRAFT, DRAFT_STATES.APPROVED), false);
  assert.equal(isDraftTransitionAllowed(DRAFT_STATES.IN_REVIEW, DRAFT_STATES.APPROVED), true);
  // And the submitter still may not be the approver, however automatic the
  // decision was.
  assert.equal(mayApproveDraft("actor-1", "actor-1"), false);
  assert.equal(mayApproveDraft("actor-2", "actor-1"), true);
});
