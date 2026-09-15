// 0053 · the 38% of the catalogue that is "other".
//
// public.pet_type is an enum of four values, and MIPO sells to parrots,
// rodents, poultry, horses, cattle and laying hens. All six are 'other'. C-0
// measured 141 products - 38% of the catalogue - in that bucket, and a product
// page cannot vary on a distinction the data does not carry.
//
// C-14 then crossed pet_type against the 'animal' attribute the importer
// writes, and the bucket decomposed almost completely. The fixture below IS
// that cross-tab, at its measured counts:
//
//     dog   192   (94 also carry animal='כלב')
//     cat    37   (32 also carry animal='חתול')
//     other 141   (תוכים 63 · מכרסם 41 · עופות 17 · צאן ובקר 10 · סוסים 6
//                  · מטילות 2 · no animal attribute 2)
//     all     5
//     ─────────
//           375
//
// So "368 products get a species, 7 stay NULL" is not a target these tests were
// written to hit. It is a prediction derived from the measurement, and the
// point of running the migration's own backfill text against the measured
// shape is to find out whether the prediction is true before production does.
//
// WHY THE MIGRATION'S OWN TEXT. The backfill runs once, at migration time,
// against rows that already exist. A fresh database has none, so a test that
// only inspected the result after `applyMigrations` would be asserting about
// zero rows and passing for it. These tests extract the statements from
// 0053_pet_species.sql between its BACKFILL-STEP markers and run them against
// the fixture. A copy of the SQL pasted here would pass forever after the
// migration was edited; extracted text cannot.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const DATABASE_URL = process.env.DATABASE_URL;
const dbTest = (name, fn) => test(name, { skip: DATABASE_URL ? false : "DATABASE_URL not set" }, fn);

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION = "0053_pet_species.sql";
const migrationSql = readFileSync(path.resolve(currentDir, "../sql", MIGRATION), "utf8");

/**
 * The text between `-- BACKFILL-STEP-<n>-BEGIN` and its matching END, as the
 * migration actually ships it. Anchored on both ends and on the exact step
 * number so a renamed or deleted marker fails loudly here rather than silently
 * reducing the test to running nothing.
 */
const backfillStep = (n) => {
  const pattern = new RegExp(
    `^-- BACKFILL-STEP-${n}-BEGIN$\\n([\\s\\S]*?)^-- BACKFILL-STEP-${n}-END$`,
    "m",
  );
  const match = migrationSql.match(pattern);
  assert.ok(match, `${MIGRATION} is missing its BACKFILL-STEP-${n} markers`);
  const sql = match[1].trim();
  assert.ok(sql.length > 0, `BACKFILL-STEP-${n} is empty`);
  return sql;
};

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
    await fn(client);
  } finally {
    await client.query("rollback").catch(() => {});
    client.release();
    await pool.end();
  }
};

// ─── the measured cross-tab ──────────────────────────────────────────────────
// [pet_type, animal attribute or null, how many products, expected species slug]
const CROSS_TAB = [
  ["dog", "כלב", 94, "dog"],
  ["dog", null, 98, "dog"],
  ["cat", "חתול", 32, "cat"],
  ["cat", null, 5, "cat"],
  ["other", "תוכים", 63, "parrot"],
  ["other", "מכרסם", 41, "rodent"],
  ["other", "עופות", 17, "poultry"],
  ["other", "צאן ובקר", 10, "cattle"],
  ["other", "סוסים", 6, "horse"],
  ["other", "מטילות", 2, "layer-hen"],
  // The two products C-14 found in 'other' with no animal attribute. Nothing
  // in the data names their species, so the honest answer is that it is not
  // recorded - see the NULL test below for why that matters.
  ["other", null, 2, null],
  // 'all' is not a species. A product for every pet has none, and giving it
  // one would be inventing a fact.
  ["all", null, 5, null],
];

const TOTAL = CROSS_TAB.reduce((sum, [, , count]) => sum + count, 0);
const PREDICTED_WITH_SPECIES = CROSS_TAB
  .filter(([, , , slug]) => slug !== null)
  .reduce((sum, [, , count]) => sum + count, 0);
const PREDICTED_NULL = TOTAL - PREDICTED_WITH_SPECIES;

test("the fixture is the measurement, not a convenient sample", () => {
  // If these three numbers drift from C-0/C-14, the tests below stop being a
  // prediction about production and become a self-fulfilling arrangement.
  assert.equal(TOTAL, 375, "C-0 measured 375 products");
  assert.equal(PREDICTED_WITH_SPECIES, 368);
  assert.equal(PREDICTED_NULL, 7);
});

/**
 * Inserts the cross-tab as business_products with species_id already NULL -
 * exactly the state the migration found - and returns the owning business.
 */
const seedCrossTab = async (client) => {
  const { rows: [business] } = await client.query(
    `insert into public.business_profiles (business_name, business_type)
     values ('Species fixture', 'shop') returning id`,
  );
  for (const [petType, animal, count, expected] of CROSS_TAB) {
    await client.query(
      `insert into public.business_products
         (business_id, name, price, pet_type, product_attributes, sku)
       select $1,
              $2 || ' #' || g,
              9.90,
              $3::public.pet_type,
              case when $4::text is null then '{}'::jsonb
                   else jsonb_build_object('animal', $4::text) end,
              $5 || '-' || g
         from generate_series(1, $6::int) g`,
      [
        business.id,
        `${petType}/${animal ?? "none"}`,
        petType,
        animal,
        `${petType}-${expected ?? "null"}`,
        count,
      ],
    );
  }
  const { rows } = await client.query(
    `select count(*) as n from public.business_products where business_id = $1`,
    [business.id],
  );
  assert.equal(Number(rows[0].n), TOTAL, "the fixture must be the full cross-tab");
  // The migration already ran on this database, so its backfill has been and
  // gone. These rows were inserted afterwards and must start unclassified,
  // otherwise the tests below would be measuring the insert, not the backfill.
  const { rows: pre } = await client.query(
    `select count(*) as n from public.business_products
      where business_id = $1 and species_id is not null`,
    [business.id],
  );
  assert.equal(Number(pre[0].n), 0, "fixture rows must start with no species");
  return business.id;
};

const speciesHistogram = async (client, businessId) => {
  const { rows } = await client.query(
    `select coalesce(s.slug, '(null)') as slug, count(*)::int as n
       from public.business_products p
       left join public.pet_species s on s.id = p.species_id
      where p.business_id = $1
      group by 1 order by 1`,
    [businessId],
  );
  return Object.fromEntries(rows.map((row) => [row.slug, row.n]));
};

// ─── the prediction ──────────────────────────────────────────────────────────

dbTest("the backfill classifies the measured catalogue exactly as predicted", async () => {
  await withDb(async (client) => {
    const businessId = await seedCrossTab(client);
    await client.query(backfillStep(1));
    await client.query(backfillStep(2));

    const expected = {};
    for (const [, , count, slug] of CROSS_TAB) {
      const key = slug ?? "(null)";
      expected[key] = (expected[key] ?? 0) + count;
    }

    assert.deepEqual(await speciesHistogram(client, businessId), {
      "(null)": 7,
      cat: 37,
      cattle: 10,
      dog: 192,
      "layer-hen": 2,
      parrot: 63,
      poultry: 17,
      rodent: 41,
      horse: 6,
    }, "the C-14 cross-tab must come out the other side intact");
    // Stated twice on purpose: once as the literal numbers a human can check
    // against the measurement, once derived from the table so the two cannot
    // disagree without one of them failing.
    assert.deepEqual(await speciesHistogram(client, businessId), expected);
  });
});

dbTest("368 classified, 7 honestly unknown", async () => {
  await withDb(async (client) => {
    const businessId = await seedCrossTab(client);
    await client.query(backfillStep(1));
    await client.query(backfillStep(2));

    const { rows } = await client.query(
      `select count(*) filter (where species_id is not null)::int as classified,
              count(*) filter (where species_id is null)::int as unknown
         from public.business_products where business_id = $1`,
      [businessId],
    );
    assert.equal(rows[0].classified, PREDICTED_WITH_SPECIES);
    assert.equal(rows[0].unknown, PREDICTED_NULL);
  });
});

// ─── falsification: each step must be doing work the other cannot ────────────

dbTest("without the animal attribute, 139 'other' products have no species", async () => {
  // Deleting step 1 and finding the result unchanged would mean pet_type alone
  // was enough and the alias table is decoration. It is not: pet_type cannot
  // tell a parrot from a hamster, and this is the number that proves it.
  await withDb(async (client) => {
    const businessId = await seedCrossTab(client);
    await client.query(backfillStep(2));

    const histogram = await speciesHistogram(client, businessId);
    assert.deepEqual(histogram, { "(null)": 146, cat: 37, dog: 192 },
      "pet_type on its own collapses six species into nothing");
    assert.equal(histogram["(null)"], 141 + 5,
      "every 'other' product plus every 'all' product is left unclassified");
  });
});

dbTest("without pet_type, the 103 products carrying no attribute have no species", async () => {
  // The mirror image: step 2 exists for the dog and cat rows the importer
  // never labelled. 98 dogs and 5 cats.
  await withDb(async (client) => {
    const businessId = await seedCrossTab(client);
    await client.query(backfillStep(1));

    const histogram = await speciesHistogram(client, businessId);
    assert.equal(histogram.dog, 94, "only the explicitly labelled dogs");
    assert.equal(histogram.cat, 32, "only the explicitly labelled cats");
    assert.equal(histogram["(null)"], 98 + 5 + 2 + 5);
  });
});

dbTest("the two sources agree wherever both speak", async () => {
  // C-14's load-bearing finding. If animal and pet_type had disagreed on the
  // 126 rows carrying both, "attribute first" would be a coin toss rather than
  // a precedence rule. Running step 2 first and step 1 second must produce the
  // identical result on those rows.
  await withDb(async (client) => {
    const businessId = await seedCrossTab(client);
    await client.query(backfillStep(2));
    await client.query(backfillStep(1));
    const reversed = await speciesHistogram(client, businessId);

    await client.query(
      `update public.business_products set species_id = null where business_id = $1`,
      [businessId],
    );
    await client.query(backfillStep(1));
    await client.query(backfillStep(2));

    assert.deepEqual(reversed, await speciesHistogram(client, businessId),
      "the order of the two sources must not change a single row");
  });
});

dbTest("an admin's choice is never overwritten", async () => {
  // Both steps are guarded by `species_id is null`. Without that guard a
  // re-run - or a later migration reusing this text - would silently replace a
  // species a human picked with one inferred from an import attribute.
  await withDb(async (client) => {
    const businessId = await seedCrossTab(client);
    const { rows: [{ id: rodentId }] } = await client.query(
      `select id from public.pet_species where slug = 'rodent'`,
    );
    // A dog product an admin has re-classified by hand.
    const { rows: [product] } = await client.query(
      `update public.business_products set species_id = $2
        where business_id = $1 and pet_type = 'dog'
          and product_attributes ->> 'animal' = 'כלב'
        returning id`,
      [businessId, rodentId],
    );

    await client.query(backfillStep(1));
    await client.query(backfillStep(2));

    const { rows } = await client.query(
      `select s.slug from public.business_products p
         join public.pet_species s on s.id = p.species_id where p.id = $1`,
      [product.id],
    );
    assert.equal(rows[0].slug, "rodent",
      "the backfill must not argue with a human, even when the attribute says otherwise");
  });
});

dbTest("'other' and 'all' stay unclassified even if a species is named after them", async () => {
  // Found by falsification. Replacing step 2's `pet_type in ('dog','cat')`
  // with `pet_type is not null` left the whole suite green, because the join
  // also requires `s.slug = p.pet_type::text` and no species is slugged
  // 'other' or 'all'. The restriction is therefore invisible today and
  // load-bearing tomorrow: the moment somebody seeds a catch-all species it is
  // the only thing standing between 146 products and a species none of them
  // has. Seeding one here is what makes that guard testable.
  await withDb(async (client) => {
    const businessId = await seedCrossTab(client);
    await client.query(
      `insert into public.pet_species (slug, name_he, legacy_pet_type, position)
       values ('other', 'אחר', 'other', 900), ('all', 'כל החיות', 'all', 910)`,
    );
    await client.query(backfillStep(1));
    await client.query(backfillStep(2));

    const histogram = await speciesHistogram(client, businessId);
    assert.equal(histogram["(null)"], PREDICTED_NULL,
      "a species named 'other' must not absorb the products that have none");
    assert.equal(histogram.other, undefined);
    assert.equal(histogram.all, undefined);
  });
});

dbTest("an unrecognised animal leaves the product unclassified, not mislabelled", async () => {
  // The failure mode that matters. Guessing - falling back to 'other', or to
  // the nearest species - would put a product on the wrong shelf and give a
  // shopper a confident wrong answer. NULL is a worse-looking result and a
  // truer one.
  await withDb(async (client) => {
    const businessId = await seedCrossTab(client);
    await client.query(
      `insert into public.business_products
         (business_id, name, price, pet_type, product_attributes)
       values ($1, 'Axolotl food', 9.90, 'other', '{"animal":"אקסולוטל"}'::jsonb)`,
      [businessId],
    );
    await client.query(backfillStep(1));
    await client.query(backfillStep(2));

    const { rows } = await client.query(
      `select species_id from public.business_products
        where business_id = $1 and name = 'Axolotl food'`,
      [businessId],
    );
    assert.equal(rows[0].species_id, null);
    const { rows: aliases } = await client.query(
      `select count(*)::int as n from public.pet_species_aliases where alias = 'אקסולוטל'`,
    );
    assert.equal(aliases[0].n, 0, "an unknown spelling must not invent an alias row");
  });
});

dbTest("the attribute is matched case- and whitespace-insensitively", async () => {
  await withDb(async (client) => {
    const businessId = await seedCrossTab(client);
    await client.query(
      `insert into public.business_products
         (business_id, name, price, pet_type, product_attributes)
       values ($1, 'Padded', 9.90, 'other', '{"animal":"  Parrot  "}'::jsonb)`,
      [businessId],
    );
    await client.query(backfillStep(1));
    await client.query(backfillStep(2));

    const { rows } = await client.query(
      `select s.slug from public.business_products p
         join public.pet_species s on s.id = p.species_id
        where p.business_id = $1 and p.name = 'Padded'`,
      [businessId],
    );
    assert.equal(rows[0]?.slug, "parrot");
  });
});

// ─── the schema the migration leaves behind ──────────────────────────────────

dbTest("every species C-13 measured exists, and nothing aspirational does", async () => {
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select slug, name_he, legacy_pet_type, is_farm
         from public.pet_species order by position`,
    );
    assert.deepEqual(rows.map((r) => r.slug), [
      "dog", "cat", "parrot", "rodent", "poultry", "horse", "cattle", "layer-hen",
    ]);
    // D-4: the farm animals were decided out of scope for phase 1. Flagged
    // rather than omitted, so the 35 products keep a real species and adding
    // them later is a filter change rather than a second migration.
    assert.deepEqual(
      rows.filter((r) => r.is_farm).map((r) => r.slug).sort(),
      ["cattle", "horse", "layer-hen", "poultry"],
    );
    // The bridge back to the old vocabulary, so a query can still answer in
    // pet_type terms while 65 frontend files migrate.
    for (const row of rows) {
      assert.ok(["dog", "cat", "other"].includes(row.legacy_pet_type),
        `${row.slug} must map back to a pet_type value`);
    }
  });
});

dbTest("pet_type is left exactly as it was", async () => {
  // The whole design rests on this: additive, not a conversion. If the enum or
  // any of its values had changed, 65 frontend files would be reading a column
  // that no longer says what they think.
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select enumlabel from pg_enum e
         join pg_type t on t.oid = e.enumtypid
        where t.typname = 'pet_type' order by e.enumsortorder`,
    );
    assert.deepEqual(rows.map((r) => r.enumlabel), ["dog", "cat", "other", "all"]);

    for (const table of ["business_products", "product_drafts", "catalog_products"]) {
      const { rows: cols } = await client.query(
        `select column_name, is_nullable, data_type from information_schema.columns
          where table_schema = 'public' and table_name = $1
            and column_name in ('pet_type', 'species_id') order by column_name`,
        [table],
      );
      assert.deepEqual(cols.map((c) => c.column_name), ["pet_type", "species_id"],
        `${table} must carry both columns`);
      assert.equal(cols[0].is_nullable, "YES");
      // Nullable and with no default: NULL means "no species recorded", which
      // is a true statement about seven products and is not the same as
      // 'other'.
      assert.equal(cols[1].is_nullable, "YES", `${table}.species_id must be nullable`);
    }
  });
});

dbTest("a species in use cannot be deleted out from under its products", async () => {
  await withDb(async (client) => {
    await seedCrossTab(client);
    await client.query(backfillStep(1));
    await client.query(backfillStep(2));
    await assert.rejects(
      () => client.query(`delete from public.pet_species where slug = 'parrot'`),
      (error) => {
        assert.equal(error.code, "23503", "on delete restrict, not cascade");
        return true;
      },
    );
  });
});

dbTest("an alias cannot be stored in a spelling the lookup will never match", async () => {
  // The lookup is `a.alias = lower(btrim(...))`. An alias row stored with a
  // capital or a stray space would sit in the table looking correct and match
  // nothing - which is exactly how 241 products spent months unfiled over a
  // hyphen. The check constraint makes that unstorable rather than merely
  // unlikely.
  await withDb(async (client) => {
    const { rows: [{ id }] } = await client.query(
      `select id from public.pet_species where slug = 'dog'`,
    );
    for (const bad of ["Dog", " dog", "dog "]) {
      // Each attempt gets its own savepoint. Without one, the first rejection
      // aborts the transaction and every later insert fails with 25P02 -
      // "transaction is aborted" - which is assert.rejects being satisfied by
      // the wrong error. Only the first spelling would actually have been
      // tested, and the loop would have looked like it covered three.
      await client.query("savepoint alias_shape");
      await assert.rejects(
        () => client.query(
          `insert into public.pet_species_aliases (alias, species_id) values ($1, $2)`,
          [bad, id],
        ),
        (error) => {
          assert.equal(error.code, "23514", `${JSON.stringify(bad)} must be refused`);
          return true;
        },
      );
      await client.query("rollback to savepoint alias_shape");
    }
  });
});

dbTest("no product that existed when the migration ran was left in a state it did not choose", async () => {
  // Scoped to the rows the migration saw, deliberately. A product created
  // afterwards with no species is the intake flow working - a human has not
  // classified it yet - and must not read as the migration having failed.
  // Asked of the whole table, this test would go red the first time a Seller
  // saved a draft.
  await withDb(async (client) => {
    const { rows } = await client.query(
      `select count(*)::int as still_other_with_animal
         from public.business_products p
         join public.schema_migrations m on m.filename = $1
         join public.pet_species_aliases a
           on a.alias = lower(btrim(p.product_attributes ->> 'animal'))
        where p.created_at < m.applied_at and p.species_id is null`,
      [MIGRATION],
    );
    assert.equal(rows[0].still_other_with_animal, 0,
      "a product the migration could have classified and did not is a bug in the backfill");
  });
});
