// Setting a commercial status - the write that did not exist.
//
// 0049 added business_profiles.commercial_status, isSellerEligible() requires
// it to be 'approved', and the publication gate, provisioning and checkout all
// read it. Nothing wrote it: every occurrence outside sellerEligibility.js is
// a read, except in db-smoke.mjs, which is the test harness. So the gate
// consulted a column no application code could set, and every Seller was
// permanently ineligible by construction.
//
// These tests are mostly about what the new path REFUSES, because the
// refusals are the design. A script that can approve every business at once
// would undo the thing 0049 was careful about, and a script that can approve
// an unverified one inverts the order the two checks exist in.

import assert from "node:assert/strict";
import test from "node:test";

import {
  SETTABLE_STATUSES,
  statusChangeBlockers,
} from "../scripts/setSellerCommercialStatus.mjs";
import { COMMERCIAL_STATUSES, isSellerEligible } from "../src/sellerEligibility.js";

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

const business = (isVerified, current) => ({
  id: "b1", business_name: "X", is_verified: isVerified, commercial_status: current,
});

// ─── the vocabulary is the predicate's vocabulary ────────────────────────────

test("the settable statuses are exactly the ones the predicate knows", () => {
  // Two lists of the same four values is how one of them gains a fifth.
  assert.deepEqual(
    [...SETTABLE_STATUSES].sort(),
    Object.values(COMMERCIAL_STATUSES).sort(),
  );
});

test("an unknown status is refused before anything is read", () => {
  for (const bad of ["Approved", "APPROVED", "active", "", null, undefined, "live"]) {
    assert.ok(
      statusChangeBlockers(business(true, "none"), bad).includes("unknown_status"),
      JSON.stringify(bad),
    );
  }
});

// ─── the refusals are the design ─────────────────────────────────────────────

test("approving an unverified business is refused", () => {
  // is_verified says a human confirmed the business is real. Approving one
  // that nobody confirmed inverts the order the two checks exist in.
  assert.deepEqual(statusChangeBlockers(business(false, "none"), "approved"), ["not_verified"]);
  assert.deepEqual(statusChangeBlockers(business(null, "none"), "approved"), ["not_verified"]);
  assert.deepEqual(statusChangeBlockers(business(undefined, "none"), "approved"), ["not_verified"]);
});

test("but taking approval AWAY from an unverified business is allowed", () => {
  // The mirror, and it matters: a rule that required verification for every
  // change would trap a business in a status somebody needs to remove.
  // suspended and none both make it LESS able to sell.
  assert.deepEqual(statusChangeBlockers(business(false, "approved"), "suspended"), []);
  assert.deepEqual(statusChangeBlockers(business(false, "approved"), "none"), []);
  assert.deepEqual(statusChangeBlockers(business(false, "none"), "pending"), []);
});

test("a business that does not exist is refused", () => {
  const blockers = statusChangeBlockers(null, "approved");
  assert.ok(blockers.includes("business_not_found"));
});

test("setting a status it already has is refused, so a re-run is a no-op", () => {
  assert.deepEqual(statusChangeBlockers(business(true, "approved"), "approved"), ["already_set"]);
  assert.deepEqual(statusChangeBlockers(business(true, "none"), "none"), ["already_set"]);
  assert.deepEqual(statusChangeBlockers(business(true, "none"), "approved"), []);
});

test("a verified business can be approved, and that is the only way to become eligible", () => {
  assert.deepEqual(statusChangeBlockers(business(true, "none"), "approved"), []);
  // The whole point: before the change the business cannot sell, after it can.
  assert.equal(isSellerEligible(business(true, "none")), false);
  assert.equal(isSellerEligible(business(true, "approved")), true);
});

// ─── what the database still enforces underneath ─────────────────────────────

dbTest("the database refuses a status the script would also refuse", async () => {
  // Belt and braces, deliberately: the script is not the only thing that can
  // reach this column, so the CHECK constraint has to hold on its own.
  await withDb(async (client) => {
    await assert.rejects(
      () => client.query(
        `insert into public.business_profiles (business_name, business_type, commercial_status)
         values ('Bad', 'shop', 'live')`,
      ),
      (error) => {
        assert.equal(error.code, "23514");
        return true;
      },
    );
  });
});

dbTest("a new business still starts unable to sell", async () => {
  // 0049's default, and the reason a blanket backfill was avoided: the unowned
  // fallback profile holding the legacy catalogue must not become a Seller by
  // existing (F-1).
  await withDb(async (client) => {
    const { rows } = await client.query(
      `insert into public.business_profiles (business_name, business_type, is_verified)
       values ('Fresh', 'shop', true)
       returning is_verified, commercial_status`,
    );
    assert.equal(rows[0].commercial_status, "none");
    assert.equal(isSellerEligible(rows[0]), false);
  });
});

dbTest("a status change is attributable, or it did not happen", async () => {
  // Letting a business trade is a commercial decision. Every change the script
  // makes writes an audit row naming the administrator; a change with no row
  // is a decision nobody can be asked about later.
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select count(*)::int as changes,
              count(*) filter (where actor_admin_user_id is null)::int as unattributed,
              count(*) filter (where new_values ->> 'commercial_status' is null)::int as no_new_value,
              count(*) filter (where old_values ->> 'commercial_status' is null)::int as no_old_value
         from public.admin_audit_log
        where action_type = 'business.commercial_status_changed'`,
    );
    assert.equal(rows[0].unattributed, 0, "a commercial decision with no actor");
    assert.equal(rows[0].no_new_value, 0);
    assert.equal(rows[0].no_old_value, 0, "the previous status must be recoverable");
  });
});

test("approving a Seller publishes nothing, because the script cannot publish", async () => {
  // The claim the script prints, asserted about the SCRIPT rather than about
  // the table.
  //
  // The first version of this test asked the database whether any approved
  // Seller had a published product with no active variant, and found six -
  // because db-smoke.mjs inserts catalog_products rows with
  // publication_state = 'PUBLISHED' directly in SQL to set up a cross-Seller
  // isolation scenario, bypassing the gate as a fixture is entitled to. The
  // test was asserting that every row in a shared table reached its state
  // through the API, which is not true and was never the claim.
  //
  // That is the fifth whole-table assertion in this migration to be wrong for
  // the same reason. The durable claim is narrow: this script writes to
  // business_profiles and admin_audit_log, and to nothing else.
  const { readFileSync } = await import("node:fs");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)),
      "../scripts/setSellerCommercialStatus.mjs"),
    "utf8",
  );
  // Comments stripped first: the header explains at length what the script
  // does not touch, and matching that prose would fail the very file it
  // describes - a trap that already caught one guard in this migration.
  const code = source.split("\n").filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line)).join("\n");

  for (const table of ["catalog_products", "product_variants", "seller_offers", "inventory", "product_media"]) {
    assert.equal(
      new RegExp(`(insert into|update)\\s+public\\.${table}\\b`, "i").test(code), false,
      `the script must not write to ${table}`,
    );
  }
  // Reading publication_state is fine and the script does it - the dry run
  // counts how many of the business's products are already published. What it
  // must never do is SET it. An assertion that forbade the word outright
  // failed on that read, which is the too-blunt-guard mistake again.
  assert.equal(/set\s+publication_state/i.test(code), false,
    "the script must not set publication_state");
  // And it must write the two it is for.
  assert.ok(/update\s+public\.business_profiles\b/i.test(code));
  assert.ok(/insert into\s+public\.admin_audit_log\b/i.test(code));
});
