// Adopt the product images the catalogue does not own yet.
//
// Products imported before the pipeline existed still point image_url at the
// supplier's server. Those images can be changed, resized or deleted by someone
// else, they leak our traffic to them, and they are every shape and weight, so
// the shop grid never looks settled. This walks the catalogue, pulls each
// foreign image once, normalizes it and repoints the row at us.
//
// Safe to re-run: a row already pointing at /uploads/ is skipped, so an
// interrupted run resumes rather than starting over.
//
//   DATABASE_URL=... UPLOAD_DIR=/app/uploads node scripts/adoptProductImages.mjs [--dry-run] [--limit=N]

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import pg from "pg";

import { fetchImageBuffer, ImagePipelineError, normalizeProductImage } from "../src/imagePipeline.js";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(2);
}

const uploadDir = process.env.UPLOAD_DIR || "/app/uploads";
const dryRun = process.argv.includes("--dry-run");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Math.max(1, Number(limitArg.split("=")[1]) || 0) : null;

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DB_SSL === "false" ? false : undefined,
});

const isForeign = (url) => {
  const value = String(url || "").trim();
  return value.startsWith("http://") || value.startsWith("https://");
};

const store = async (buffer, extension) => {
  const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), buffer, { flag: "wx", mode: 0o644 });
  return `/uploads/${fileName}`;
};

const adopt = async (url) => {
  const source = await fetchImageBuffer(url);
  const normalized = await normalizeProductImage(source);
  if (dryRun) {
    return { url, saved: source.length - normalized.bytes, size: `${normalized.width}x${normalized.height}` };
  }
  return {
    url: await store(normalized.buffer, normalized.extension),
    saved: source.length - normalized.bytes,
    size: `${normalized.width}x${normalized.height}`,
  };
};

const run = async () => {
  const { rows } = await pool.query(
    `select id, name, image_url, images
     from public.business_products
     where image_url like 'http%'
        or exists (select 1 from unnest(coalesce(images, '{}')) img where img like 'http%')
     order by created_at
     ${limit ? `limit ${limit}` : ""}`,
  );

  console.log(`${rows.length} product(s) still pointing at a foreign image${dryRun ? " (dry run)" : ""}\n`);

  let adopted = 0;
  let failed = 0;
  let bytesSaved = 0;

  for (const row of rows) {
    const updates = {};

    if (isForeign(row.image_url)) {
      try {
        const result = await adopt(row.image_url);
        updates.image_url = result.url;
        bytesSaved += Math.max(0, result.saved);
        adopted += 1;
        console.log(`  ok    ${row.name} -> ${result.size}`);
      } catch (error) {
        failed += 1;
        console.log(`  fail  ${row.name} -> ${error instanceof ImagePipelineError ? error.code : "error"}`);
      }
    }

    const gallery = Array.isArray(row.images) ? row.images : [];
    if (gallery.some(isForeign)) {
      const next = [];
      for (const image of gallery) {
        if (!isForeign(image)) { next.push(image); continue; }
        try {
          const result = await adopt(image);
          next.push(result.url);
          bytesSaved += Math.max(0, result.saved);
          adopted += 1;
        } catch {
          // Keep the original so the gallery does not lose an entry.
          next.push(image);
          failed += 1;
        }
      }
      updates.images = next;
    }

    if (!dryRun && Object.keys(updates).length > 0) {
      const sets = [];
      const values = [row.id];
      for (const [column, value] of Object.entries(updates)) {
        values.push(value);
        sets.push(`${column} = $${values.length}`);
      }
      await pool.query(
        `update public.business_products set ${sets.join(", ")}, updated_at = now() where id = $1`,
        values,
      );
    }
  }

  console.log(`\nadopted=${adopted} failed=${failed} bytes_saved=${(bytesSaved / 1024).toFixed(0)}KB`);
  if (dryRun) console.log("dry run: nothing was written");
  await pool.end();
};

run().catch(async (error) => {
  console.error(error);
  await pool.end().catch(() => {});
  process.exit(1);
});
