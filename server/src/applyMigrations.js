import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = process.env.SQL_DIR || path.resolve(currentDir, "../sql");
const baselineThrough = String(process.env.MIGRATION_BASELINE_THROUGH || "").trim();
const baselineConfirmation = process.env.MIGRATION_BASELINE_CONFIRM;

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DB_SSL === "false"
    ? false
    : { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" },
  max: 1,
});

const migrationLockName = "mipo-schema-migrations-v1";
const checksumSql = (sql) => createHash("sha256").update(sql).digest("hex");

const main = async () => {
  const files = (await readdir(sqlDir))
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();

  if (files.length === 0) {
    throw new Error(`No migration files found in ${sqlDir}`);
  }

  const client = await pool.connect();
  let appliedCount = 0;
  let baselinedCount = 0;
  let skippedCount = 0;
  try {
    await client.query("select pg_advisory_lock(hashtext($1))", [migrationLockName]);
    const schemaState = await client.query(`
      select
        to_regclass('public.business_profiles') is not null
          or to_regclass('public.app_users') is not null
          or to_regclass('public.orders') is not null as app_schema_exists
    `);
    const appSchemaExists = schemaState.rows[0]?.app_schema_exists === true;
    await client.query(`
      create table if not exists public.schema_migrations (
        filename text primary key,
        checksum_sha256 text not null,
        applied_at timestamptz not null default now()
      )
    `);

    const applied = await client.query(
      "select filename, checksum_sha256 from public.schema_migrations",
    );
    const appliedByFile = new Map(applied.rows.map((row) => [row.filename, row.checksum_sha256]));

    if (baselineThrough) {
      if (!appSchemaExists) {
        throw new Error("MIGRATION_BASELINE_THROUGH is only valid for an existing application schema");
      }
      if (appliedByFile.size > 0) {
        throw new Error("Cannot baseline a database that already has migration ledger entries");
      }
      if (baselineConfirmation !== "existing-schema-reviewed") {
        throw new Error("Set MIGRATION_BASELINE_CONFIRM=existing-schema-reviewed to confirm the existing schema was audited");
      }

      const baselineIndex = files.indexOf(baselineThrough);
      if (baselineIndex < 0) {
        throw new Error(`Baseline migration ${baselineThrough} was not found in ${sqlDir}`);
      }

      try {
        await client.query("begin");
        for (const file of files.slice(0, baselineIndex + 1)) {
          const sql = await readFile(path.join(sqlDir, file), "utf8");
          if (!sql.trim()) continue;
          const checksum = checksumSql(sql);
          await client.query(
            "insert into public.schema_migrations (filename, checksum_sha256) values ($1, $2)",
            [file, checksum],
          );
          appliedByFile.set(file, checksum);
          baselinedCount += 1;
          console.log(`baselined ${file}`);
        }
        await client.query("commit");
      } catch (error) {
        await client.query("rollback").catch(() => {});
        throw error;
      }
    } else if (appSchemaExists && appliedByFile.size === 0) {
      throw new Error(
        "Existing application schema has no migration ledger; audit it, then set MIGRATION_BASELINE_THROUGH and MIGRATION_BASELINE_CONFIRM",
      );
    }

    for (const file of files) {
      const sql = await readFile(path.join(sqlDir, file), "utf8");
      if (!sql.trim()) continue;
      const checksum = checksumSql(sql);
      const previousChecksum = appliedByFile.get(file);
      if (previousChecksum) {
        if (previousChecksum !== checksum) {
          throw new Error(`Applied migration ${file} has changed; create a new migration instead`);
        }
        skippedCount += 1;
        console.log(`skipped ${file}`);
        continue;
      }

      try {
        await client.query("begin");
        await client.query(sql);
        await client.query(
          "insert into public.schema_migrations (filename, checksum_sha256) values ($1, $2)",
          [file, checksum],
        );
        await client.query("commit");
        appliedCount += 1;
        console.log(`applied ${file}`);
      } catch (error) {
        await client.query("rollback").catch(() => {});
        throw error;
      }
    }

    console.log(`applied_migrations=${appliedCount} baselined_migrations=${baselinedCount} skipped_migrations=${skippedCount}`);
  } finally {
    await client.query("select pg_advisory_unlock(hashtext($1))", [migrationLockName]).catch(() => {});
    client.release();
  }
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
