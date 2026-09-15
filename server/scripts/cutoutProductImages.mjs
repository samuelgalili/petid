#!/usr/bin/env node
//
// Put the product on a clean, consistent background.
//
// adoptProductImages.mjs pulled foreign images onto our own storage and gave
// them one canvas, one format and one quality. What it did not do is remove the
// backgrounds, so the catalogue is still every studio, every backdrop and every
// shade of not-quite-white that each supplier happened to shoot against. A grid
// of those never looks settled no matter how square the frames are.
//
// This runs the cutout over images we already host, and writes the result as a
// TRANSPARENT WebP rather than one flattened onto white. That is deliberate:
//
//   * The app has a dark mode (tailwind darkMode: ["class"], ThemeContext, a
//     toggle in Settings). A white-baked image is a glaring white rectangle on
//     a dark page - the same "catalogue looks broken" problem, moved.
//   * Transparency is reversible and baked white is not. A transparent cutout
//     can be flattened onto any colour at any time, including white; a flattened
//     one cannot be un-flattened.
//
// So the page supplies the background - white in light mode, the card colour in
// dark - and the image supplies only the product.
//
// WHAT THIS DOES NOT DO: it does not change who owns the photograph. A cutout
// of a supplier's product shot is a derivative work of that shot; the angle,
// the lighting and the reflections are exactly the part that is kept. Nothing
// here should be read as establishing a right to use an image. That is recorded
// separately or it is not recorded at all.
//
// NEVER DESTRUCTIVE. The normalized image is left in place and a new file is
// written alongside it. A product is only repointed after its cutout has been
// written and checked, and the previous path is printed so a revert is a
// one-line UPDATE rather than an archaeology exercise.
//
// READ THIS BEFORE THE FIRST RUN. backgroundRemoval.js says of itself: "NOT
// VERIFIED END TO END ... no request has been made against the live API, so the
// response parsing below is the part to watch on first run. Enable it on a
// handful of products before turning it on for an import." That is why --limit
// defaults to 5 here instead of everything, and why --dry-run exists.
//
//   DATABASE_URL=... UPLOAD_DIR=/app/uploads GEMINI_API_KEY=... \
//     node scripts/cutoutProductImages.mjs [--dry-run] [--limit=N] [--all]

import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import pg from "pg";

import sharp from "sharp";

import { normalizeWithBackgroundRemoval, ImagePipelineError } from "../src/imagePipeline.js";
import { createGeminiBackgroundRemover } from "../src/backgroundRemoval.js";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(2);
}

const uploadDir = process.env.UPLOAD_DIR || "/app/uploads";
const dryRun = process.argv.includes("--dry-run");
const all = process.argv.includes("--all");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
// Small on purpose. See the note above about the first run.
const limit = all ? null : Math.max(1, Number(limitArg?.split("=")[1]) || 5);

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const remover = createGeminiBackgroundRemover({ apiKey });
if (!remover) {
  console.error("No image credential found (GEMINI_API_KEY / GOOGLE_API_KEY).");
  console.error("Nothing was read and nothing was changed.");
  process.exit(2);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DB_SSL === "false" ? false : undefined,
});

// Only images we already host. A foreign URL belongs to adoptProductImages.mjs
// first: cutting out an image we do not hold would mean fetching somebody
// else's bytes on every run.
const isLocal = (url) => String(url || "").trim().startsWith("/uploads/");

// Whether a file has already been cut out is read from the FILE, not from its
// name: a cutout has an alpha channel and a flat photograph does not. A naming
// convention would have put a processing detail into a public URL and would
// have been wrong the moment somebody renamed a file by hand.
//
// The name itself carries nothing - no timestamp, no source filename, no stage
// marker. A URL is the most public thing we store and there is no reason for it
// to describe our pipeline.
const alreadyCutOut = async (url) => {
  try {
    const meta = await sharp(await readFile(localPath(url))).metadata();
    return Boolean(meta.hasAlpha);
  } catch {
    return false;
  }
};

const store = async (buffer, extension) => {
  const fileName = `${randomUUID()}${extension}`;
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), buffer, { flag: "wx", mode: 0o644 });
  return `/uploads/${fileName}`;
};

const localPath = (url) => path.join(uploadDir, path.basename(String(url)));

const cutout = async (url) => {
  const source = await readFile(localPath(url));
  const result = await normalizeWithBackgroundRemoval(source, { remover });

  // The pipeline reports why it declined rather than throwing, because a
  // product with a background beats a product with no image. Those reasons are
  // surfaced here rather than swallowed: "skipped 40 of 164" with no reason is
  // not a result anybody can act on.
  if (!result.background_removed) {
    return { skipped: result.background_removal_skipped || "unknown" };
  }
  if (dryRun) {
    return { coverage: result.opaque_coverage, size: `${result.width}x${result.height}` };
  }
  return {
    url: await store(result.buffer, result.extension),
    coverage: result.opaque_coverage,
    size: `${result.width}x${result.height}`,
  };
};

const run = async () => {
  const { rows } = await pool.query(
    `select id, name, image_url
       from public.business_products
      where image_url like '/uploads/%'
      order by created_at
      ${limit ? `limit ${limit}` : ""}`,
  );

  console.log(
    `${rows.length} product image(s) to cut out${dryRun ? " (dry run)" : ""}` +
    `${limit ? ` — limited to ${limit}; pass --all for the whole catalogue` : ""}\n`,
  );

  let done = 0;
  let skipped = 0;
  let failed = 0;
  const reasons = new Map();

  for (const row of rows) {
    if (!isLocal(row.image_url)) continue;
    if (await alreadyCutOut(row.image_url)) continue;
    try {
      const result = await cutout(row.image_url);

      if (result.skipped) {
        skipped += 1;
        reasons.set(result.skipped, (reasons.get(result.skipped) || 0) + 1);
        console.log(`  skip  ${row.name} — ${result.skipped}`);
        continue;
      }

      if (!dryRun) {
        await pool.query(
          "update public.business_products set image_url = $2, updated_at = now() where id = $1",
          [row.id, result.url],
        );
        // Printed so a revert does not need to reconstruct anything.
        console.log(`  ok    ${row.name} — ${(result.coverage * 100).toFixed(0)}% kept — was ${row.image_url}`);
      } else {
        console.log(`  ok    ${row.name} — ${(result.coverage * 100).toFixed(0)}% kept — ${result.size}`);
      }
      done += 1;
    } catch (error) {
      failed += 1;
      const code = error instanceof ImagePipelineError ? error.code : (error?.message || "error");
      console.log(`  fail  ${row.name} — ${code}`);
    }
  }

  console.log(`\n${done} cut out, ${skipped} skipped, ${failed} failed${dryRun ? " (nothing written)" : ""}`);
  if (reasons.size > 0) {
    console.log("skip reasons:");
    for (const [reason, count] of [...reasons].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${count.toString().padStart(4)}  ${reason}`);
    }
  }
  if (!dryRun && done > 0) {
    console.log("\nEach ok line above prints the path the product used to point at.");
    console.log("The previous file is still on disk; nothing was deleted.");
  }
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
