// M1 · admin_users.business_id.
//
// The column is capacity, not capability: nothing reads it yet, and no role can
// use it until admin_users_role_check is relaxed. So what these tests actually
// guard is that adding it changed nothing - login still resolves, existing rows
// are untouched, and the constraint that protects the isolation model later is
// really enforced by the database rather than only intended.
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

const seedAdmin = (client, email, extra = "") => client.query(
  `insert into public.admin_users (email, password_hash, display_name, role, is_active${extra ? ", business_id" : ""})
   values ($1, 'x', 'Scope Test', 'admin', true${extra ? ", $2" : ""})
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

dbTest("an admin can be returned to platform scope by setting business_id to NULL", async () => {
  await withDb(async (client) => {
    const business = await seedBusiness(client);
    await seedAdmin(client, "back-to-platform@example.com", business);
    await client.query("update public.admin_users set business_id = null where email = $1",
      ["back-to-platform@example.com"]);
    const { rows } = await client.query(
      "select business_id from public.admin_users where email = $1", ["back-to-platform@example.com"],
    );
    assert.equal(rows[0].business_id, null);
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

dbTest("no role gained a Seller: the role check is still the pre-M1 pair", async () => {
  await withDb(async (client) => {
    // M1 deliberately does not relax this. seller_admin cannot exist yet, which
    // is why the column is capacity rather than capability.
    const { rows } = await client.query(
      `select pg_get_constraintdef(oid) as def
         from pg_constraint
        where conrelid = 'public.admin_users'::regclass and conname = 'admin_users_role_check'`,
    );
    assert.equal(rows.length, 1);
    assert.match(rows[0].def, /'admin'/);
    assert.match(rows[0].def, /'product_manager'/);
    assert.doesNotMatch(rows[0].def, /seller_admin/, "M1 must not add Seller Admin");
    assert.doesNotMatch(rows[0].def, /readonly_admin/, "M1 must not add readonly admin");
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
