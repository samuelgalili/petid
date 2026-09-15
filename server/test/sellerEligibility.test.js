// "May this business sell?" - the whole truth table.
//
// Two independent fields, and both must hold:
//
//     is_verified IS TRUE  AND  commercial_status = 'approved'
//
// The point of testing the full cross product rather than a few cases is that
// this predicate replaced four different spellings of the same rule. If any of
// them had been more permissive than the others, it would have looked exactly
// like a passing test somewhere else.

import assert from "node:assert/strict";
import test from "node:test";
import {
  COMMERCIAL_STATUSES,
  assertSellerEligible,
  isKnownCommercialStatus,
  isSellerEligible,
  mayPrepareCatalogueData,
  sellerEligibleSql,
  sellerIneligibilityReason,
} from "../src/sellerEligibility.js";

const DATABASE_URL = process.env.DATABASE_URL;
const dbTest = (name, fn) => test(name, { skip: DATABASE_URL ? false : "DATABASE_URL not set" }, fn);

const withDb = async (fn) => {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: false });
  const client = await pool.connect();
  try {
    await client.query("begin");
    return await fn(client);
  } finally {
    await client.query("rollback").catch(() => {});
    client.release();
    await pool.end();
  }
};

const business = (isVerified, commercialStatus) => ({
  id: "b1", is_verified: isVerified, commercial_status: commercialStatus,
});

const ALL_STATUSES = Object.values(COMMERCIAL_STATUSES);

// ─── the seven required cases ────────────────────────────────────────────────

test("verified + approved is the only combination that may sell", () => {
  assert.equal(isSellerEligible(business(true, "approved")), true);
});

test("verified + pending is blocked - it may prepare data, not sell", () => {
  assert.equal(isSellerEligible(business(true, "pending")), false);
  assert.equal(sellerIneligibilityReason(business(true, "pending")), "seller_pending");
  // The distinction pending exists for:
  assert.equal(mayPrepareCatalogueData(business(true, "pending")), true);
});

test("verified + suspended is blocked", () => {
  assert.equal(isSellerEligible(business(true, "suspended")), false);
  assert.equal(sellerIneligibilityReason(business(true, "suspended")), "seller_suspended");
  assert.equal(mayPrepareCatalogueData(business(true, "suspended")), false,
    "a suspended business does not get to keep building a catalogue");
});

test("verified + none is blocked - the default for every pre-existing row", () => {
  assert.equal(isSellerEligible(business(true, "none")), false);
  assert.equal(sellerIneligibilityReason(business(true, "none")), "seller_none");
  assert.equal(mayPrepareCatalogueData(business(true, "none")), false);
});

test("unverified + approved is blocked - both halves are required", () => {
  assert.equal(isSellerEligible(business(false, "approved")), false);
  assert.equal(sellerIneligibilityReason(business(false, "approved")), "seller_not_verified");
});

test("NULL is_verified + approved is blocked", () => {
  // is_verified is nullable, so it is three-valued. A truthiness test would
  // treat NULL as unverified here by luck rather than by rule - and the same
  // truthiness test written the other way round elsewhere would not.
  assert.equal(isSellerEligible(business(null, "approved")), false);
  assert.equal(isSellerEligible(business(undefined, "approved")), false);
  assert.equal(sellerIneligibilityReason(business(null, "approved")), "seller_not_verified");
});

test("a verified non-Seller business is blocked, whatever its type", () => {
  // A verified vet with no commercial approval may not sell. The type is not
  // consulted at all - see the next test for the other half of that statement.
  const vet = { id: "v", business_type: "vet", is_verified: true, commercial_status: "none" };
  assert.equal(isSellerEligible(vet), false);
  assert.equal(sellerIneligibilityReason(vet), "seller_none");
});

// ─── business_type is not, and never becomes, a commercial status ────────────

test("business_type is not consulted in either direction", () => {
  // A verified APPROVED vet may sell; a verified 'shop' that is not approved
  // may not. Both halves matter: the first says the type does not block, the
  // second says the type does not grant. 'shop' was being used as a proxy for
  // "is a Seller", and it is a dropdown entry.
  const approvedVet = { business_type: "vet", is_verified: true, commercial_status: "approved" };
  const unapprovedShop = { business_type: "shop", is_verified: true, commercial_status: "none" };

  assert.equal(isSellerEligible(approvedVet), true);
  assert.equal(isSellerEligible(unapprovedShop), false,
    "business_type = 'shop' must never stand in for commercial_status");
});

// ─── everything else fails closed ────────────────────────────────────────────

test("the full cross product answers exactly one way", () => {
  for (const verified of [true, false, null, undefined]) {
    for (const status of ALL_STATUSES) {
      const expected = verified === true && status === "approved";
      assert.equal(
        isSellerEligible(business(verified, status)), expected,
        `is_verified=${String(verified)} commercial_status=${status}`,
      );
    }
  }
});

test("an unknown or missing status is not eligible", () => {
  for (const status of ["Approved", "APPROVED", "active", "", null, undefined]) {
    assert.equal(isSellerEligible(business(true, status)), false, String(status));
  }
  assert.equal(sellerIneligibilityReason(business(true, "active")), "commercial_status_unknown");
  assert.equal(isKnownCommercialStatus("approved"), true);
  assert.equal(isKnownCommercialStatus("Approved"), false);
});

test("a missing business is not eligible", () => {
  assert.equal(isSellerEligible(null), false);
  assert.equal(isSellerEligible(undefined), false);
  assert.equal(sellerIneligibilityReason(null), "business_not_found");
});

test("assertSellerEligible names which half failed", () => {
  assert.doesNotThrow(() => assertSellerEligible(business(true, "approved"), "b1"));
  assert.throws(() => assertSellerEligible(business(true, "pending"), "b1"), /pending.*may prepare data but not sell/);
  assert.throws(() => assertSellerEligible(business(true, "suspended"), "b1"), /approval was withdrawn/);
  assert.throws(() => assertSellerEligible(business(true, "none"), "b1"), /never been approved/);
  assert.throws(() => assertSellerEligible(business(false, "approved"), "b1"), /not verified/);
  assert.throws(() => assertSellerEligible(null, "b1"), /No business_profile/);
});

// ─── the SQL fragment says the same thing as the predicate ───────────────────

dbTest("the SQL fragment and the JavaScript predicate agree on every row", async () => {
  await withDb(async (client) => {
    const created = [];
    for (const verified of [true, false, null]) {
      for (const status of ALL_STATUSES) {
        const { rows } = await client.query(
          `insert into public.business_profiles
             (business_name, business_type, is_verified, commercial_status)
           values ($1, 'shop', $2, $3) returning id, is_verified, commercial_status`,
          [`Eligibility ${verified}/${status}`, verified, status],
        );
        created.push(rows[0]);
      }
    }

    const { rows: eligible } = await client.query(
      `select b.id from public.business_profiles b
        where b.id = any($1) and ${sellerEligibleSql("b")}`,
      [created.map((row) => row.id)],
    );
    const eligibleIds = new Set(eligible.map((row) => row.id));

    for (const row of created) {
      assert.equal(
        eligibleIds.has(row.id), isSellerEligible(row),
        `SQL and JS disagree for is_verified=${String(row.is_verified)} status=${row.commercial_status}`,
      );
    }
    assert.equal(eligibleIds.size, 1, "exactly one of the nine combinations may sell");
  });
});

// ─── the column itself ───────────────────────────────────────────────────────

dbTest("commercial_status is NOT NULL and defaults to none", async () => {
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select column_name, data_type, is_nullable, column_default
         from information_schema.columns
        where table_schema = 'public' and table_name = 'business_profiles'
          and column_name = 'commercial_status'`,
    );
    assert.equal(rows.length, 1, "the column must exist");
    assert.equal(rows[0].is_nullable, "NO",
      "unlike is_verified: a two-valued column cannot be read wrong by accident");
    assert.match(rows[0].column_default, /'none'/);
  });
});

dbTest("no existing business was approved by the migration", async () => {
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select count(*) filter (where commercial_status <> 'none') as approved_or_pending,
              count(*) as total
         from public.business_profiles`,
    );
    assert.equal(
      Number(rows[0].approved_or_pending), 0,
      "defaulting to anything but 'none' would retroactively legitimise every row the legacy fallback touched",
    );
  });
});

dbTest("a business created the existing way cannot sell", async () => {
  await withDb(async (client) => {
    // Exactly the shape ensureDefaultBusinessProfile inserts.
    const { rows } = await client.query(
      `insert into public.business_profiles
         (business_name, business_type, is_verified, is_featured)
       values ('Mipo Shop', 'shop', true, true)
       returning id, is_verified, commercial_status`,
    );
    assert.equal(rows[0].commercial_status, "none");
    assert.equal(isSellerEligible(rows[0]), false,
      "the fallback profile must not become a Seller by existing");
  });
});

dbTest("an unrecognised status is refused by the database", async () => {
  await withDb(async (client) => {
    await assert.rejects(
      () => client.query(
        `insert into public.business_profiles
           (business_name, business_type, commercial_status)
         values ('Bad status', 'shop', 'active')`,
      ),
      (error) => {
        assert.equal(error.code, "23514");
        return true;
      },
    );
  });
});
