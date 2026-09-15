// Stage 1A foundation · M1b, raw_import_records, product_drafts.
//
// These tests are about what the DATABASE refuses, not what the application
// intends. Every guarantee below is one that has to survive a route somebody
// writes next year without reading the design document: the scope invariant,
// the immutability of a raw record, the ban on cascades, and the refusal to
// invent an owner.
//
// The legacy catalogue lost its ownership because a fallback assigned a
// business_id without recording that it had. So the single most important
// assertion here is the dull one: an import with no Seller fails.

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

const seedBusiness = (client, name = "Intake Test Seller") => client.query(
  `insert into public.business_profiles (business_name, business_type, is_verified)
   values ($1, 'shop', true) returning id`,
  [name],
).then((r) => r.rows[0].id);

const seedAdmin = (client, email, role = "admin", businessId = null) => client.query(
  `insert into public.admin_users (email, password_hash, display_name, role, is_active, business_id)
   values ($1, 'x', 'Intake Test', $2, true, $3) returning id`,
  [email, role, businessId],
).then((r) => r.rows[0].id);

const seedRawRecord = (client, { businessId, createdBy, sourceRecordId = null, payload = { name: "x" }, hash = "h1", sourceSystem = "csv" }) =>
  client.query(
    `insert into public.raw_import_records
       (business_id, source_system, source_record_id, payload, payload_hash, created_by)
     values ($1, $2, $3, $4, $5, $6) returning id`,
    [businessId, sourceSystem, sourceRecordId, payload, hash, createdBy],
  ).then((r) => r.rows[0].id);

const seedCategory = (client, slug = "intake-test-cat") => client.query(
  `insert into public.product_categories (slug, name_he) values ($1, 'בדיקה') returning id`,
  [slug],
).then((r) => r.rows[0].id);

// ─── M1b · the scope invariant ───────────────────────────────────────────────

dbTest("all four roles are now insertable, each with the scope it requires", async () => {
  await withDb(async (client) => {
    const business = await seedBusiness(client);

    await assert.doesNotReject(() => seedAdmin(client, "platform-admin@example.com", "admin", null));
    await assert.doesNotReject(() => seedAdmin(client, "pm@example.com", "product_manager", null));
    await assert.doesNotReject(() => seedAdmin(client, "seller@example.com", "seller_admin", business));
    await assert.doesNotReject(() => seedAdmin(client, "readonly@example.com", "readonly_admin", business));
  });
});

// The four illegal pairs. Each is checked with its own savepoint, because a
// constraint violation aborts the transaction and every later statement would
// otherwise fail with 25P02 - reporting the wrong reason for the right result.
dbTest("a Seller role without a Seller is refused by the database", async () => {
  await withDb(async (client) => {
    for (const role of ["seller_admin", "readonly_admin"]) {
      await client.query("savepoint s");
      await assert.rejects(
        () => seedAdmin(client, `${role}-unscoped@example.com`, role, null),
        (error) => {
          assert.equal(error.code, "23514", "check violation");
          assert.equal(error.constraint, "admin_users_scope_check");
          return true;
        },
        `${role} must not be creatable without a business_id`,
      );
      await client.query("rollback to savepoint s");
    }
  });
});

dbTest("a platform role carrying a Seller is refused - this is the silent-promotion case", async () => {
  await withDb(async (client) => {
    const business = await seedBusiness(client);
    for (const role of ["admin", "product_manager"]) {
      await client.query("savepoint s");
      await assert.rejects(
        () => seedAdmin(client, `${role}-scoped@example.com`, role, business),
        (error) => {
          assert.equal(error.code, "23514");
          assert.equal(error.constraint, "admin_users_scope_check");
          return true;
        },
        `${role} must not be creatable with a business_id`,
      );
      await client.query("rollback to savepoint s");
    }
  });
});

dbTest("an unknown role is still refused", async () => {
  await withDb(async (client) => {
    await assert.rejects(
      () => seedAdmin(client, "super@example.com", "super_admin", null),
      (error) => {
        assert.equal(error.code, "23514");
        assert.equal(error.constraint, "admin_users_role_check");
        return true;
      },
    );
  });
});

dbTest("M1b modified no existing admin row", async () => {
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select count(*) filter (where updated_at > created_at) as touched,
              count(*) filter (where role not in ('admin','product_manager')) as non_platform
         from public.admin_users`,
    );
    assert.equal(Number(rows[0].touched), 0, "the migration must not have modified any row");
    assert.equal(Number(rows[0].non_platform), 0, "no pre-existing row may have gained a Seller role");
  });
});

// ─── M2 · the raw record refuses to invent an owner ──────────────────────────

dbTest("an import with no Seller fails rather than falling back to a default", async () => {
  await withDb(async (client) => {
    const admin = await seedAdmin(client, "importer@example.com");
    await assert.rejects(
      () => client.query(
        `insert into public.raw_import_records
           (source_system, payload, payload_hash, created_by)
         values ('csv', '{}'::jsonb, 'h', $1)`,
        [admin],
      ),
      (error) => {
        assert.equal(error.code, "23502", "not-null violation");
        assert.match(error.column, /business_id/);
        return true;
      },
      "this is the legacy defaultBusinessId failure; it must be impossible here",
    );
  });
});

dbTest("payload cannot be edited after insert", async () => {
  await withDb(async (client) => {
    const business = await seedBusiness(client);
    const admin = await seedAdmin(client, "importer2@example.com");
    const raw = await seedRawRecord(client, { businessId: business, createdBy: admin });

    await assert.rejects(
      () => client.query(
        "update public.raw_import_records set payload = '{\"name\":\"tampered\"}'::jsonb where id = $1",
        [raw],
      ),
      (error) => {
        assert.match(error.message, /payload is immutable/);
        return true;
      },
    );
  });
});

dbTest("business_id and source fields cannot be edited after insert", async () => {
  await withDb(async (client) => {
    const businessA = await seedBusiness(client, "Seller A");
    const businessB = await seedBusiness(client, "Seller B");
    const admin = await seedAdmin(client, "importer3@example.com");
    const raw = await seedRawRecord(client, { businessId: businessA, createdBy: admin });

    for (const [column, value] of [
      ["business_id", businessB],
      ["source_system", "scrape"],
      ["source_url", "https://example.com/other"],
    ]) {
      await client.query("savepoint s");
      await assert.rejects(
        () => client.query(`update public.raw_import_records set ${column} = $1 where id = $2`, [value, raw]),
        (error) => {
          assert.match(error.message, new RegExp(`${column} is immutable`));
          return true;
        },
        `${column} must be frozen`,
      );
      await client.query("rollback to savepoint s");
    }
  });
});

dbTest("archiving is permitted - it is the only mutation there is", async () => {
  await withDb(async (client) => {
    const business = await seedBusiness(client);
    const admin = await seedAdmin(client, "importer4@example.com");
    const raw = await seedRawRecord(client, { businessId: business, createdBy: admin });

    await assert.doesNotReject(() => client.query(
      "update public.raw_import_records set archived_at = now(), archived_by = $1 where id = $2",
      [admin, raw],
    ));
  });
});

dbTest("one Seller cannot import the same external record twice", async () => {
  await withDb(async (client) => {
    const business = await seedBusiness(client);
    const admin = await seedAdmin(client, "importer5@example.com");
    await seedRawRecord(client, { businessId: business, createdBy: admin, sourceRecordId: "SUP-12345" });

    await assert.rejects(
      () => seedRawRecord(client, { businessId: business, createdBy: admin, sourceRecordId: "SUP-12345" }),
      (error) => {
        assert.equal(error.code, "23505", "unique violation");
        return true;
      },
    );
  });
});

// The counterpart, and the reason no global unique may ever be added: two shops
// legitimately sell the supplier's item 12345.
dbTest("a DIFFERENT Seller can import the same external record", async () => {
  await withDb(async (client) => {
    const businessA = await seedBusiness(client, "Seller A");
    const businessB = await seedBusiness(client, "Seller B");
    const admin = await seedAdmin(client, "importer6@example.com");

    await seedRawRecord(client, { businessId: businessA, createdBy: admin, sourceRecordId: "SUP-12345" });
    await assert.doesNotReject(
      () => seedRawRecord(client, { businessId: businessB, createdBy: admin, sourceRecordId: "SUP-12345" }),
      "a global unique on source_record_id would break this, which is why there is none",
    );
  });
});

dbTest("there is no global unique index on source_record_id", async () => {
  await withDb(async (client) => {
    // The primary key is a unique index too, so counting them proves nothing.
    // The guarantee is narrower and worth stating exactly: every unique index
    // that mentions source_record_id must also be scoped by business_id.
    const { rows } = await client.query(
      `select indexname, indexdef from pg_indexes
        where schemaname = 'public' and tablename = 'raw_import_records'
          and indexdef ilike '%unique%'
          and indexdef ilike '%source_record_id%'`,
    );
    assert.ok(rows.length > 0, "the per-Seller unique index must exist");
    for (const row of rows) {
      assert.match(row.indexdef, /\(business_id,/,
        `${row.indexname} must be scoped to the Seller: a global unique would stop a second Seller importing the same supplier record`);
    }
  });
});

dbTest("deleting a business that has imports is refused, not cascaded", async () => {
  await withDb(async (client) => {
    const business = await seedBusiness(client);
    const admin = await seedAdmin(client, "importer7@example.com");
    await seedRawRecord(client, { businessId: business, createdBy: admin });

    await client.query("savepoint s");
    await assert.rejects(
      () => client.query("delete from public.business_profiles where id = $1", [business]),
      (error) => {
        assert.equal(error.code, "23503");
        return true;
      },
    );
    await client.query("rollback to savepoint s");

    const still = await client.query("select 1 from public.raw_import_records where business_id = $1", [business]);
    assert.equal(still.rowCount, 1, "a cascade here would destroy the audit trail");
  });
});

// ─── M3 · drafts ─────────────────────────────────────────────────────────────

dbTest("a hand-authored draft needs no raw record", async () => {
  await withDb(async (client) => {
    const business = await seedBusiness(client);
    const admin = await seedAdmin(client, "author@example.com");
    await assert.doesNotReject(() => client.query(
      `insert into public.product_drafts (business_id, created_by, name) values ($1, $2, 'ידני')`,
      [business, admin],
    ));
  });
});

dbTest("only one live draft may exist per raw record, and archiving frees it", async () => {
  await withDb(async (client) => {
    const business = await seedBusiness(client);
    const admin = await seedAdmin(client, "author2@example.com");
    const raw = await seedRawRecord(client, { businessId: business, createdBy: admin });

    const first = await client.query(
      `insert into public.product_drafts (business_id, raw_import_record_id, created_by)
       values ($1, $2, $3) returning id`,
      [business, raw, admin],
    );

    await client.query("savepoint s");
    await assert.rejects(
      () => client.query(
        `insert into public.product_drafts (business_id, raw_import_record_id, created_by) values ($1, $2, $3)`,
        [business, raw, admin],
      ),
      (error) => {
        assert.equal(error.code, "23505");
        return true;
      },
    );
    await client.query("rollback to savepoint s");

    // Archive the first, and a replacement becomes possible: the raw record is
    // never consumed.
    await client.query("update public.product_drafts set archived_at = now() where id = $1", [first.rows[0].id]);
    await assert.doesNotReject(() => client.query(
      `insert into public.product_drafts (business_id, raw_import_record_id, created_by) values ($1, $2, $3)`,
      [business, raw, admin],
    ));
  });
});

dbTest("a draft cannot delete the raw record it came from", async () => {
  await withDb(async (client) => {
    const business = await seedBusiness(client);
    const admin = await seedAdmin(client, "author3@example.com");
    const raw = await seedRawRecord(client, { businessId: business, createdBy: admin });
    await client.query(
      `insert into public.product_drafts (business_id, raw_import_record_id, created_by) values ($1, $2, $3)`,
      [business, raw, admin],
    );

    await assert.rejects(
      () => client.query("delete from public.raw_import_records where id = $1", [raw]),
      (error) => {
        assert.equal(error.code, "23503");
        return true;
      },
    );
  });
});

dbTest("a rejection without a reason is refused", async () => {
  await withDb(async (client) => {
    const business = await seedBusiness(client);
    const admin = await seedAdmin(client, "reviewer@example.com");

    for (const note of [null, "", "   "]) {
      await client.query("savepoint s");
      await assert.rejects(
        () => client.query(
          `insert into public.product_drafts (business_id, created_by, state, review_note)
           values ($1, $2, 'REJECTED', $3)`,
          [business, admin, note],
        ),
        (error) => {
          assert.equal(error.code, "23514");
          assert.equal(error.constraint, "product_drafts_rejection_needs_reason");
          return true;
        },
        `review_note ${JSON.stringify(note)} must not count as a reason`,
      );
      await client.query("rollback to savepoint s");
    }

    await assert.doesNotReject(() => client.query(
      `insert into public.product_drafts (business_id, created_by, state, review_note)
       values ($1, $2, 'REJECTED', 'תמונה שגויה')`,
      [business, admin],
    ));
  });
});

dbTest("a draft cannot enter review without a name and a category", async () => {
  await withDb(async (client) => {
    const business = await seedBusiness(client);
    const admin = await seedAdmin(client, "reviewer2@example.com");
    const category = await seedCategory(client);

    await client.query("savepoint s");
    await assert.rejects(
      () => client.query(
        `insert into public.product_drafts (business_id, created_by, state, name) values ($1, $2, 'IN_REVIEW', 'שם')`,
        [business, admin],
      ),
      (error) => {
        assert.equal(error.constraint, "product_drafts_review_needs_content");
        return true;
      },
      "no category",
    );
    await client.query("rollback to savepoint s");

    await client.query("savepoint s");
    await assert.rejects(
      () => client.query(
        `insert into public.product_drafts (business_id, created_by, state, category_id) values ($1, $2, 'IN_REVIEW', $3)`,
        [business, admin, category],
      ),
      (error) => {
        assert.equal(error.constraint, "product_drafts_review_needs_content");
        return true;
      },
      "no name",
    );
    await client.query("rollback to savepoint s");

    await assert.doesNotReject(() => client.query(
      `insert into public.product_drafts (business_id, created_by, state, name, category_id)
       values ($1, $2, 'IN_REVIEW', 'קולר לכלב', $3)`,
      [business, admin, category],
    ));
  });
});

dbTest("APPROVED must name the product it created", async () => {
  await withDb(async (client) => {
    const business = await seedBusiness(client);
    const admin = await seedAdmin(client, "reviewer3@example.com");
    await assert.rejects(
      () => client.query(
        `insert into public.product_drafts (business_id, created_by, state, name) values ($1, $2, 'APPROVED', 'שם')`,
        [business, admin],
      ),
      (error) => {
        assert.equal(error.constraint, "product_drafts_approved_has_product");
        return true;
      },
    );
  });
});

dbTest("an approved draft cannot be re-owned", async () => {
  await withDb(async (client) => {
    const businessA = await seedBusiness(client, "Seller A");
    const businessB = await seedBusiness(client, "Seller B");
    const admin = await seedAdmin(client, "reviewer4@example.com");

    // A real product, not a placeholder uuid: since M4 the forward pointer is a
    // foreign key, so an invented id is rejected before this test can ask its
    // actual question.
    const draft = await client.query(
      `insert into public.product_drafts (business_id, created_by, name) values ($1, $2, 'שם') returning id`,
      [businessA, admin],
    ).then((r) => r.rows[0].id);

    const product = await client.query(
      `insert into public.catalog_products (owning_business_id, origin_draft_id, name, created_by)
       values ($1, $2, 'שם', $3) returning id`,
      [businessA, draft, admin],
    ).then((r) => r.rows[0].id);

    await client.query(
      `update public.product_drafts
          set state = 'APPROVED', approved_catalog_product_id = $1 where id = $2`,
      [product, draft],
    );

    await assert.rejects(
      () => client.query("update public.product_drafts set business_id = $1 where id = $2",
        [businessB, draft]),
      (error) => {
        assert.match(error.message, /business_id cannot change once the draft is APPROVED/);
        return true;
      },
      "re-owning an approved draft would silently re-own the live product it produced",
    );
  });
});

dbTest("an unknown draft state is refused", async () => {
  await withDb(async (client) => {
    const business = await seedBusiness(client);
    const admin = await seedAdmin(client, "reviewer5@example.com");
    await assert.rejects(
      () => client.query(
        `insert into public.product_drafts (business_id, created_by, state) values ($1, $2, 'READY_TO_PUBLISH')`,
        [business, admin],
      ),
      (error) => {
        assert.equal(error.code, "23514");
        return true;
      },
      "READY_TO_PUBLISH is computed by the gate, never stored (OD-2)",
    );
  });
});

// ─── cascade policy, stated once and then verified ───────────────────────────

dbTest("nothing in the intake chain cascades on delete", async () => {
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select c.conrelid::regclass::text as table_name, c.conname, pg_get_constraintdef(c.oid) as def
         from pg_constraint c
        where c.contype = 'f'
          and c.conrelid in ('public.raw_import_records'::regclass, 'public.product_drafts'::regclass)`,
    );
    assert.ok(rows.length > 0, "there must be foreign keys to check");
    for (const row of rows) {
      assert.doesNotMatch(row.def, /ON DELETE CASCADE/i,
        `${row.table_name}.${row.conname} must not cascade`);
      assert.doesNotMatch(row.def, /ON DELETE SET NULL/i,
        `${row.table_name}.${row.conname} must not null out an owner`);
    }
  });
});
