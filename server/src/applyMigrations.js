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

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
  max: 1,
});

const main = async () => {
  const files = (await readdir(sqlDir))
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();

  if (files.length === 0) {
    throw new Error(`No migration files found in ${sqlDir}`);
  }

  for (const file of files) {
    const sql = await readFile(path.join(sqlDir, file), "utf8");
    if (!sql.trim()) continue;
    await pool.query(sql);
    console.log(`applied ${file}`);
  }

  console.log(`applied_migrations=${files.length}`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
