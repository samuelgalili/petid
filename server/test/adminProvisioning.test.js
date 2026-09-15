// Provisioning: role and scope, together or not at all.
//
// The negative cases matter more than the positive ones here. Every one of them
// is a way an account could end up with authority nobody granted it:
//
//   a Seller role with no Seller          reads as platform-wide
//   a platform role carrying a Seller     survives a dropped CHECK as full access
//   a Seller attached to an unverified business
//   a Seller invented on the way past
//   a role changed without its scope
//
// The pure rules are tested without a database; the ones that need one run
// against a real PostgreSQL.

import assert from "node:assert/strict";
import test from "node:test";
import {
  assertBusinessMayHaveSellerAdmins,
  resolveProvisioningScope,
} from "../src/provisionAdmin.js";
import { ADMIN_ROLES, ADMIN_SCOPES } from "../src/adminPermissions.js";

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

const SELLER = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";

// ─── the rules, without a database ───────────────────────────────────────────

test("a Seller role requires a Seller", () => {
  for (const role of [ADMIN_ROLES.SELLER_ADMIN, ADMIN_ROLES.READONLY_ADMIN]) {
    for (const missing of [undefined, null, "", "   "]) {
      const result = resolveProvisioningScope(role, missing);
      assert.equal(result.ok, false, `${role} with ${JSON.stringify(missing)} must be refused`);
      assert.match(result.error, /--business-id is required/);
    }
  }
});

test("a platform role must not be given a Seller - refused, never ignored", () => {
  for (const role of [ADMIN_ROLES.ADMIN, ADMIN_ROLES.PRODUCT_MANAGER]) {
    const result = resolveProvisioningScope(role, SELLER);
    assert.equal(result.ok, false, role);
    assert.match(result.error, /platform-scoped and must not be given/);
  }
  // Silently dropping it would let somebody believe the account was scoped.
});

test("a malformed business id is refused before any query runs", () => {
  for (const bad of ["not-a-uuid", "12345", "'; drop table admin_users; --", SELLER.slice(0, -1)]) {
    const result = resolveProvisioningScope(ADMIN_ROLES.SELLER_ADMIN, bad);
    assert.equal(result.ok, false, bad);
    assert.match(result.error, /must be a uuid/);
  }
});

test("an unsupported role is refused", () => {
  for (const role of ["super_admin", "owner", "", null, undefined]) {
    const result = resolveProvisioningScope(role, null);
    assert.equal(result.ok, false, String(role));
    assert.match(result.error, /Unsupported admin role/);
  }
});

test("the legal pairs are accepted, and report their scope", () => {
  const platformAdmin = resolveProvisioningScope(ADMIN_ROLES.ADMIN, null);
  assert.deepEqual(platformAdmin, { ok: true, businessId: null, scope: ADMIN_SCOPES.PLATFORM });

  const pm = resolveProvisioningScope(ADMIN_ROLES.PRODUCT_MANAGER, "");
  assert.deepEqual(pm, { ok: true, businessId: null, scope: ADMIN_SCOPES.PLATFORM });

  const seller = resolveProvisioningScope(ADMIN_ROLES.SELLER_ADMIN, ` ${SELLER} `);
  assert.deepEqual(seller, { ok: true, businessId: SELLER, scope: ADMIN_SCOPES.SELLER });

  const readonly = resolveProvisioningScope(ADMIN_ROLES.READONLY_ADMIN, SELLER);
  assert.deepEqual(readonly, { ok: true, businessId: SELLER, scope: ADMIN_SCOPES.SELLER });
});

test("there is no environment fallback for the Seller", () => {
  // DEFAULT_BUSINESS_ID is what made legacy ownership unreconstructible. Even
  // with it set, an unscoped Seller role must fail.
  const previous = process.env.DEFAULT_BUSINESS_ID;
  process.env.DEFAULT_BUSINESS_ID = SELLER;
  try {
    const result = resolveProvisioningScope(ADMIN_ROLES.SELLER_ADMIN, undefined);
    assert.equal(result.ok, false, "an environment variable is not a decision");
  } finally {
    if (previous === undefined) delete process.env.DEFAULT_BUSINESS_ID;
    else process.env.DEFAULT_BUSINESS_ID = previous;
  }
});

// ─── the Seller check, against a real database ───────────────────────────────

dbTest("a business that does not exist is refused, and none is created", async () => {
  await withDb(async (client) => {
    const before = await client.query("select count(*)::int as n from public.business_profiles");
    await assert.rejects(
      () => assertBusinessMayHaveSellerAdmins(client, "99999999-9999-4999-8999-999999999999"),
      (error) => {
        assert.match(error.message, /never creates one/);
        return true;
      },
    );
    const after = await client.query("select count(*)::int as n from public.business_profiles");
    assert.equal(after.rows[0].n, before.rows[0].n, "provisioning must not bring a Seller into existence");
  });
});

dbTest("an unverified business cannot have Seller admins - including is_verified NULL", async () => {
  await withDb(async (client) => {
    // is_verified is nullable, so it is three-valued. A truthiness test would
    // read NULL as verified.
    for (const value of [false, null]) {
      const { rows } = await client.query(
        `insert into public.business_profiles (business_name, business_type, is_verified)
         values ($1, 'shop', $2) returning id`,
        [`Unverified ${value}`, value],
      );
      await assert.rejects(
        () => assertBusinessMayHaveSellerAdmins(client, rows[0].id),
        (error) => {
          assert.match(error.message, /not verified/);
          return true;
        },
        `is_verified = ${JSON.stringify(value)} must not count as verified`,
      );
    }
  });
});

dbTest("a verified AND approved business is accepted", async () => {
  await withDb(async (client) => {
    const { rows } = await client.query(
      `insert into public.business_profiles
         (business_name, business_type, is_verified, commercial_status)
       values ('Verified Seller', 'shop', true, 'approved') returning id`,
    );
    const id = await assertBusinessMayHaveSellerAdmins(client, rows[0].id);
    assert.equal(id, rows[0].id);
  });
});

dbTest("a verified business that is not approved cannot have Seller admins", async () => {
  await withDb(async (client) => {
    // Verification alone used to be enough here, because commercial_status did
    // not exist. It does now, and both halves are required.
    for (const status of ["none", "pending", "suspended"]) {
      const { rows } = await client.query(
        `insert into public.business_profiles
           (business_name, business_type, is_verified, commercial_status)
         values ($1, 'shop', true, $2) returning id`,
        [`Verified but ${status}`, status],
      );
      await assert.rejects(
        () => assertBusinessMayHaveSellerAdmins(client, rows[0].id),
        (error) => {
          assert.match(error.message, new RegExp(status === "none" ? "never been approved" : status));
          return true;
        },
        `commercial_status = ${status} must not permit a Seller admin`,
      );
    }
  });
});

dbTest("business_type is not evidence either way", async () => {
  await withDb(async (client) => {
    // An approved vet may have Seller admins; an unapproved shop may not. Both
    // halves matter: the type does not block, and the type does not grant.
    const approvedVet = await client.query(
      `insert into public.business_profiles
         (business_name, business_type, is_verified, commercial_status)
       values ('Approved Vet', 'vet', true, 'approved') returning id`,
    ).then((r) => r.rows[0].id);
    await assert.doesNotReject(() => assertBusinessMayHaveSellerAdmins(client, approvedVet));

    const unapprovedShop = await client.query(
      `insert into public.business_profiles
         (business_name, business_type, is_verified, commercial_status)
       values ('Unapproved Shop', 'shop', true, 'none') returning id`,
    ).then((r) => r.rows[0].id);
    await assert.rejects(
      () => assertBusinessMayHaveSellerAdmins(client, unapprovedShop),
      /never been approved/,
      "business_type = 'shop' must never stand in for commercial_status",
    );
  });
});

// ─── role and scope move together ────────────────────────────────────────────

dbTest("the database refuses a role change that leaves the old scope behind", async () => {
  await withDb(async (client) => {
    const business = await client.query(
      `insert into public.business_profiles (business_name, business_type, is_verified)
       values ('Seller', 'shop', true) returning id`,
    ).then((r) => r.rows[0].id);

    const admin = await client.query(
      `insert into public.admin_users (email, password_hash, display_name, role, business_id, is_active)
       values ('scoped@example.com', 'x', 'S', 'seller_admin', $1, true) returning id`,
      [business],
    ).then((r) => r.rows[0].id);

    // The escalation: promote to a platform role and leave business_id in
    // place. Refused, because the two columns are constrained together.
    await client.query("savepoint s");
    await assert.rejects(
      () => client.query("update public.admin_users set role = 'admin' where id = $1", [admin]),
      (error) => {
        assert.equal(error.code, "23514");
        assert.equal(error.constraint, "admin_users_scope_check");
        return true;
      },
      "this is why provisionAdmin writes role and business_id in the same statement",
    );
    await client.query("rollback to savepoint s");

    // Both together is fine.
    await assert.doesNotReject(() => client.query(
      "update public.admin_users set role = 'admin', business_id = null where id = $1", [admin],
    ));
  });
});
