// M1 · admin_users.business_id.
//
// When M1 shipped alone the column was capacity, not capability: nothing read
// it and no role could use it, so these tests guarded that adding it changed
// nothing - login still resolves, existing rows are untouched, and the
// constraint the isolation model rests on is really enforced by the database.
//
// M1b has since relaxed admin_users_role_check and added
// admin_users_scope_check, so the column is now in use. What is tested here is
// still M1's own guarantees - the foreign key, ON DELETE RESTRICT, no backfill,
// login unaffected - but they are exercised through a role the scope check
// permits. The four-role model itself is covered in
// productIntakeFoundation.test.js.
//
// Every test runs against a real PostgreSQL, because a constraint that only
// exists in a migration file is not a constraint.

import assert from "node:assert/strict";
import test from "node:test";

const DATABASE_URL = process.env.DATABASE_URL;
const dbTest = (name, fn) => test(name, { skip: DATABASE_URL ? false : "DATABASE_URL not set" }, fn);

const pgPool = async () => {
  const { default: pg } = await import("pg");
  return new pg.Pool({ connectionString: DATABASE_URL, ssl: false });
};

/** Runs inside a transaction that is always rolled back. */
const withDb = async (fn) => {
  const pool = await pgPool();
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

// The role follows the scope, because since M1b the database insists on it:
// admin_users_scope_check makes a platform role carrying a business_id - and a
// Seller role without one - unrepresentable. A helper that always said 'admin'
// would now fail every scoped case for the wrong reason, reporting a check
// violation where the test is asking about a foreign key.
const seedAdmin = (client, email, extra = "") => client.query(
  `insert into public.admin_users (email, password_hash, display_name, role, is_active${extra ? ", business_id" : ""})
   values ($1, 'x', 'Scope Test', ${extra ? "'seller_admin'" : "'admin'"}, true${extra ? ", $2" : ""})
   returning id, business_id, updated_at`,
  extra ? [email, extra] : [email],
).then((r) => r.rows[0]);

const seedBusiness = (client, name = "Scope Test Seller") => client.query(
  `insert into public.business_profiles (business_name, business_type, is_verified)
   values ($1, 'shop', true) returning id`,
  [name],
).then((r) => r.rows[0].id);

// ─── the column ──────────────────────────────────────────────────────────────

dbTest("business_id exists, is uuid, is nullable and has no default", async () => {
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select data_type, is_nullable, column_default
         from information_schema.columns
        where table_schema = 'public' and table_name = 'admin_users' and column_name = 'business_id'`,
    );
    assert.equal(rows.length, 1, "the column must exist");
    assert.equal(rows[0].data_type, "uuid");
    assert.equal(rows[0].is_nullable, "YES", "platform admins are NULL; NOT NULL would need a backfill");
    assert.equal(rows[0].column_default, null, "a default would assign a Seller nobody chose");
  });
});

dbTest("the partial index exists and excludes platform admins", async () => {
  await withDb(async (client) => {
    const { rows } = await client.query(
      "select indexdef from pg_indexes where tablename = 'admin_users' and indexname = 'idx_admin_users_business_id'",
    );
    assert.equal(rows.length, 1, "the index must exist");
    assert.match(rows[0].indexdef, /WHERE \(business_id IS NOT NULL\)/i, "must be partial");
  });
});

// ─── the constraint the isolation model will rest on ─────────────────────────

dbTest("the foreign key targets business_profiles and is ON DELETE RESTRICT", async () => {
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select pg_get_constraintdef(oid) as def
         from pg_constraint
        where conrelid = 'public.admin_users'::regclass
          and conname = 'admin_users_business_id_fkey'`,
    );
    assert.equal(rows.length, 1, "the foreign key must exist");
    assert.match(rows[0].def, /REFERENCES business_profiles\(id\)/i);
    assert.match(rows[0].def, /ON DELETE RESTRICT/i,
      "SET NULL would silently promote a Seller admin to platform scope");
  });
});

dbTest("a business_id that does not exist is refused", async () => {
  await withDb(async (client) => {
    await assert.rejects(
      () => seedAdmin(client, "ghost@example.com", "99999999-9999-4999-8999-999999999999"),
      (error) => {
        assert.equal(error.code, "23503", "foreign key violation");
        assert.match(error.constraint, /business_id/);
        return true;
      },
    );
  });
});

dbTest("deleting a business that an admin points at is refused, not cascaded", async () => {
  await withDb(async (client) => {
    const business = await seedBusiness(client);
    await seedAdmin(client, "scoped@example.com", business);

    // The violation aborts the transaction, so the assertions after it need a
    // savepoint to roll back to - otherwise every later statement fails with
    // 25P02 and the test reports the wrong reason.
    await client.query("savepoint before_delete");
    await assert.rejects(
      () => client.query("delete from public.business_profiles where id = $1", [business]),
      (error) => {
        assert.equal(error.code, "23503");
        return true;
      },
    );
    await client.query("rollback to savepoint before_delete");

    // And the admin account is still there - CASCADE would have removed it.
    const still = await client.query("select 1 from public.admin_users where email = 'scoped@example.com'");
    assert.equal(still.rowCount, 1, "an admin account must never be deleted by a business deletion");
  });
});

dbTest("returning an admin to platform scope requires changing role and scope together", async () => {
  await withDb(async (client) => {
    const business = await seedBusiness(client);
    await seedAdmin(client, "back-to-platform@example.com", business);

    // Nulling the scope alone would leave a seller_admin with no Seller, which
    // reads as platform-wide access. Since M1b the database refuses it - the
    // detachment has to be deliberate and complete.
    await client.query("savepoint s");
    await assert.rejects(
      () => client.query("update public.admin_users set business_id = null where email = $1",
        ["back-to-platform@example.com"]),
      (error) => {
        assert.equal(error.code, "23514");
        assert.equal(error.constraint, "admin_users_scope_check");
        return true;
      },
      "dropping the Seller without dropping the Seller role is a silent promotion",
    );
    await client.query("rollback to savepoint s");

    await client.query(
      "update public.admin_users set role = 'admin', business_id = null where email = $1",
      ["back-to-platform@example.com"],
    );
    const { rows } = await client.query(
      "select role, business_id from public.admin_users where email = $1", ["back-to-platform@example.com"],
    );
    assert.equal(rows[0].business_id, null);
    assert.equal(rows[0].role, "admin");
  });
});

// ─── nothing changed ─────────────────────────────────────────────────────────

dbTest("a new admin created the existing way gets NULL, not a Seller", async () => {
  await withDb(async (client) => {
    const created = await seedAdmin(client, "platform@example.com");
    assert.equal(created.business_id, null,
      "an admin created without naming a Seller must not acquire one");
  });
});

dbTest("the login and session column list still resolves", async () => {
  await withDb(async (client) => {
    // Exactly the shared adminUserSelect list from server/src/index.js.
    await assert.doesNotReject(() => client.query(
      `select id, email, display_name, role, is_active,
              must_change_password, created_at, updated_at, last_login_at
         from public.admin_users limit 1`,
    ));
  });
});

dbTest("existing admin rows are untouched by the migration", async () => {
  await withDb(async (client) => {
    // Any row that predates this transaction: business_id must be NULL, and the
    // migration must not have bumped updated_at on it.
    const { rows } = await client.query(
      `select count(*) filter (where business_id is not null) as scoped,
              count(*) filter (where updated_at > created_at) as touched,
              count(*) as total
         from public.admin_users`,
    );
    assert.equal(Number(rows[0].scoped), 0, "no existing admin may have been given a Seller");
    assert.equal(Number(rows[0].touched), 0, "the migration must not have modified any row");
  });
});

dbTest("the role check admits exactly the four approved roles and no others", async () => {
  await withDb(async (client) => {
    // M1 deliberately left this as the platform pair; M1b widened it. What must
    // not happen either way is a fifth role appearing without a decision, so the
    // set is asserted exactly rather than by presence.
    const { rows } = await client.query(
      `select pg_get_constraintdef(oid) as def
         from pg_constraint
        where conrelid = 'public.admin_users'::regclass and conname = 'admin_users_role_check'`,
    );
    assert.equal(rows.length, 1);

    const roles = [...rows[0].def.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]).sort();
    assert.deepEqual(roles, ["admin", "product_manager", "readonly_admin", "seller_admin"]);
  });
});

dbTest("the scope check exists and is the one M1b defined", async () => {
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select pg_get_constraintdef(oid) as def
         from pg_constraint
        where conrelid = 'public.admin_users'::regclass and conname = 'admin_users_scope_check'`,
    );
    assert.equal(rows.length, 1, "the scope invariant must live in the database");
    assert.match(rows[0].def, /business_id IS NULL/i);
    assert.match(rows[0].def, /business_id IS NOT NULL/i);
  });
});

dbTest("business_profiles was not changed by M1", async () => {
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'business_profiles'
          and column_name in ('is_seller', 'seller_status', 'seller_approved_at')`,
    );
    assert.equal(rows.length, 0, "OQ-2 is deferred; business_profiles must be untouched");
  });
});
