#!/usr/bin/env node
//
// Make a near-white studio background transparent, locally.
//
// Default is a dry run. It downloads each image with a read-only GET, cuts the
// background on this machine, and writes PNG/WebP plus a contact sheet and a
// JSON report into --output. It does not open the database and it does not
// write to the upload store.
//
//   node server/scripts/cutoutProductImages.mjs \
//     --csv=affected.csv --ids=id1,id2 --output=./cutout-output
//
// --apply copies each original object to cutout-backup/<key>, writes the cutout
// as a new object, and records the mapping. It never deletes or overwrites the
// original key. It runs only when both of these are set, and they are not part
// of the app's environment:
//
//   CUTOUT_APPLY_CONFIRM=write-new-object-keep-original
//   CUTOUT_OBJECT_ROOT=/absolute/path/to/the/upload/objects
//
// Upload-time background removal, when someone turns it on, is still
// server/src/backgroundRemoval.js. This script does not call it.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { fetchImageBuffer } from "../src/imagePipeline.js";
import {
  DARK_CARD,
  SKIP_REASON,
  applyCutoutObjects,
  assertApplyAllowed,
  buildContactSheet,
  createFilesystemObjectStore,
  compositeOnBackground,
  cutoutKeyFor,
  cutoutWhiteBackground,
  objectKeyFromImageUrl,
  parseProductCsv,
  resolvePublicImageUrl,
  selectProducts,
} from "../src/whiteBackgroundCutout.js";

const DEFAULT_DELAY_MS = 500;

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const readFlag = (argv, name) => {
  const prefix = `--${name}=`;
  const found = argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
};

const readNumber = (argv, name) => {
  const raw = readFlag(argv, name);
  if (raw == null || raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw Object.assign(new Error(`--${name} must be a number`), { code: "BAD_ARG" });
  }
  return value;
};

export const parseCutoutArgs = (argv) => {
  const apply = argv.includes("--apply");
  const csv = readFlag(argv, "csv");
  const output = readFlag(argv, "output") || "cutout-output";
  const origin = readFlag(argv, "origin") || "https://mipo.pet";
  const ids = (readFlag(argv, "ids") || "").split(",").map((id) => id.trim()).filter(Boolean);
  const limit = readNumber(argv, "limit");
  const delayMs = readNumber(argv, "delay-ms");
  const tolerance = readNumber(argv, "tolerance");
  const maxRemoved = readNumber(argv, "max-removed");
  const cell = readNumber(argv, "sheet-cell");
  return {
    apply,
    csv,
    output,
    origin,
    ids,
    limit,
    delayMs: delayMs == null ? DEFAULT_DELAY_MS : delayMs,
    tolerance,
    maxRemoved,
    cell: cell == null ? 240 : cell,
  };
};

const extensionOf = (url) => {
  try {
    const ext = path.posix.extname(new URL(url).pathname).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) return ext;
  } catch {
    // fall through
  }
  return ".img";
};

const writeBytes = async (file, bytes) => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes);
};

export const runCutout = async ({
  args,
  env = process.env,
  fetchImage = fetchImageBuffer,
  log = console.log,
}) => {
  if (args.apply) {
    const allowed = assertApplyAllowed(env);
    if (!allowed.ok) {
      const error = new Error(allowed.message);
      error.code = "APPLY_REFUSED";
      throw error;
    }
  }
  if (!args.csv) {
    throw Object.assign(new Error("Pass --csv=path. Dry-run is the default and nothing was written."), { code: "BAD_ARG" });
  }

  const table = parseProductCsv(await readFile(args.csv, "utf8"));
  const products = selectProducts(table, { ids: args.ids, limit: args.limit });
  const mode = args.apply ? "apply" : "dry-run";
  log(`${products.length} image(s), ${mode}. Delay ${args.delayMs}ms between GETs.`);

  const options = {};
  if (args.tolerance != null) options.tolerance = args.tolerance;
  if (args.maxRemoved != null) options.maxRemovedRatio = args.maxRemoved;

  const items = [];
  for (let index = 0; index < products.length; index += 1) {
    const product = products[index];
    if (index > 0 && args.delayMs > 0) await sleep(args.delayMs);
    const id = product.id || `row-${index + 1}`;
    const name = product.name || id;
    const record = {
      id,
      name,
      imageUrl: product.image_url || "",
      sourceUrl: null,
      status: "failed",
      reason: null,
      cause: null,
      stats: {},
      files: {},
    };

    try {
      record.sourceUrl = resolvePublicImageUrl(record.imageUrl, args.origin);
      const downloaded = await fetchImage(record.sourceUrl);
      const result = await cutoutWhiteBackground(downloaded, options);
      record.status = result.status;
      record.reason = result.reason;
      record.cause = result.cause;
      record.stats = result.stats;

      const dir = path.join(args.output, "items", id);
      const beforeName = `before${extensionOf(record.sourceUrl)}`;
      await writeBytes(path.join(dir, beforeName), downloaded);
      record.files.before = path.join("items", id, beforeName);

      const preview = result.png || result.rejectedPng;
      if (result.rejectedPng) {
        await writeBytes(path.join(dir, "rejected.png"), result.rejectedPng);
        record.files.rejectedPng = path.join("items", id, "rejected.png");
      }
      if (preview) {
        const onDark = await compositeOnBackground(preview, DARK_CARD);
        const previewName = result.status === "cut" ? "after-on-dark.png" : "rejected-on-dark.png";
        await writeBytes(path.join(dir, previewName), onDark);
        record.files[result.status === "cut" ? "afterOnDark" : "rejectedOnDark"] = path.join("items", id, previewName);
      }
      if (result.status === "cut") {
        await writeBytes(path.join(dir, "after.png"), result.png);
        await writeBytes(path.join(dir, "after.webp"), result.webp);
        record.files.afterPng = path.join("items", id, "after.png");
        record.files.afterWebp = path.join("items", id, "after.webp");
        record.bytes = result.webp;
        record.originalKey = objectKeyFromImageUrl(record.imageUrl);
      }

      const kept = result.stats.removedRatio == null ? "" : ` removed ${(result.stats.removedRatio * 100).toFixed(1)}%`;
      const note = result.reason ? ` — ${result.reason}` : "";
      log(`  ${result.status.padEnd(7)} ${name}${kept}${note}`);
    } catch (error) {
      record.status = "failed";
      record.cause = error.code || "error";
      record.reason = error.message || "error";
      log(`  failed  ${name} — ${record.reason}`);
    }
    items.push(record);
  }

  const sheetItems = [];
  for (const item of items) {
    const beforePath = item.files.before ? path.join(args.output, item.files.before) : null;
    const afterPath = item.files.afterPng
      ? path.join(args.output, item.files.afterPng)
      : (item.files.rejectedOnDark ? null : null);
    if (!beforePath) continue;
    let after = null;
    if (item.files.afterPng) after = await readFile(path.join(args.output, item.files.afterPng));
    else if (item.files.rejectedPng) after = await readFile(path.join(args.output, item.files.rejectedPng));
    const tag = item.status === "cut" ? "חיתוך" : (item.status === "skipped" ? "דילוג" : "כשל");
    sheetItems.push({
      before: await readFile(beforePath),
      after: after || await readFile(beforePath),
      label: `${tag} ${item.name}`,
    });
  }

  await mkdir(args.output, { recursive: true });
  if (sheetItems.length > 0) {
    const sheet = await buildContactSheet(sheetItems, { cell: args.cell });
    await writeBytes(path.join(args.output, "contact-sheet.png"), sheet);
  }

  const counts = {
    cut: items.filter((item) => item.status === "cut").length,
    skipped: items.filter((item) => item.status === "skipped").length,
    failed: items.filter((item) => item.status === "failed").length,
  };

  let manifest = null;
  if (args.apply) {
    const allowed = assertApplyAllowed(env);
    const hosted = items.filter((item) => item.status === "cut" && item.originalKey && item.bytes);
    const store = createFilesystemObjectStore(allowed.root);
    manifest = await applyCutoutObjects({
      store,
      items: hosted.map((item) => ({
        status: "cut",
        originalKey: item.originalKey,
        bytes: item.bytes,
        id: item.id,
        newKey: cutoutKeyFor(item.originalKey, item.id),
      })),
    });
    const manifestKey = `cutout-backup/manifest-${Date.now()}.json`;
    await store.putNew(manifestKey, Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`));
    manifest.manifestKey = manifestKey;
    log(`apply wrote ${manifest.entries.length} new object(s). Original keys were not changed.`);
  }

  const report = {
    mode: args.apply ? "apply" : "dry-run",
    origin: args.origin,
    skipReason: SKIP_REASON,
    counts,
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      imageUrl: item.imageUrl,
      sourceUrl: item.sourceUrl,
      status: item.status,
      reason: item.reason,
      cause: item.cause,
      stats: item.stats,
      files: item.files,
    })),
    manifest,
  };
  await writeBytes(path.join(args.output, "report.json"), Buffer.from(`${JSON.stringify(report, null, 2)}\n`));
  log(`\n${counts.cut} cut, ${counts.skipped} skipped, ${counts.failed} failed. Report: ${path.join(args.output, "report.json")}`);
  return report;
};

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  let args;
  try {
    args = parseCutoutArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
  runCutout({ args })
    .catch((error) => {
      console.error(error.message || error);
      process.exit(error.code === "APPLY_REFUSED" || error.code === "BAD_ARG" ? 2 : 1);
    });
}
