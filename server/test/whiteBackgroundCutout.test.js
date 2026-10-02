// The white-background cutout is a measurement on pixels: a studio margin
// connected to the border goes transparent, white that is closed inside the
// product stays, and a flood that would eat the product is refused.

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  SKIP_REASON,
  applyCutoutObjects,
  assertApplyAllowed,
  createFilesystemObjectStore,
  cutoutWhiteBackground,
  parseProductCsv,
  resolvePublicImageUrl,
  selectProducts,
} from "../src/whiteBackgroundCutout.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sharpFor = async () => (await import("sharp")).default;

const paint = async (width, height, draw) => {
  const sharp = await sharpFor();
  const pixels = Buffer.alloc(width * height * 4, 255);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const colour = draw(x, y) || { r: 255, g: 255, b: 255, a: 255 };
      const index = (y * width + x) * 4;
      pixels[index] = colour.r;
      pixels[index + 1] = colour.g;
      pixels[index + 2] = colour.b;
      pixels[index + 3] = colour.a ?? 255;
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
};

const rawOf = async (buffer) => {
  const sharp = await sharpFor();
  return sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
};

const at = ({ data, info }, x, y) => {
  const index = (y * info.width + x) * info.channels;
  return { r: data[index], g: data[index + 1], b: data[index + 2], a: data[index + 3] };
};

test("a coloured product on white loses the border and keeps the product", async () => {
  const png = await paint(48, 48, (x, y) => {
    if (x >= 14 && x < 34 && y >= 14 && y < 34) return { r: 180, g: 40, b: 40 };
    return { r: 255, g: 255, b: 255 };
  });
  const result = await cutoutWhiteBackground(png);
  assert.equal(result.status, "cut");
  assert.equal(result.reason, null);

  const raw = await rawOf(result.png);
  assert.equal(at(raw, 0, 0).a, 0);
  assert.equal(at(raw, 47, 47).a, 0);
  const centre = at(raw, 24, 24);
  assert.equal(centre.a, 255);
  assert.ok(centre.r > 150 && centre.g < 80, `centre stayed the product colour, got ${centre.r},${centre.g},${centre.b}`);
});

test("white packaging closed by a coloured rim stays opaque", async () => {
  const png = await paint(64, 64, (x, y) => {
    const onRim = (x >= 12 && x < 52 && y >= 12 && y < 52)
      && !(x >= 18 && x < 46 && y >= 18 && y < 46);
    if (onRim) return { r: 30, g: 90, b: 160 };
    return { r: 255, g: 255, b: 255 };
  });
  const result = await cutoutWhiteBackground(png);
  assert.equal(result.status, "cut");
  const raw = await rawOf(result.png);
  assert.equal(at(raw, 0, 0).a, 0, "the studio margin is transparent");
  const inside = at(raw, 32, 32);
  assert.equal(inside.a, 255, "white inside the rim was kept");
  assert.ok(inside.r > 240 && inside.g > 240 && inside.b > 240);
});

test("a rim with a gap is skipped because the flood would eat the product", async () => {
  const png = await paint(64, 64, (x, y) => {
    const onRim = (x >= 12 && x < 52 && y >= 12 && y < 52)
      && !(x >= 18 && x < 46 && y >= 18 && y < 46);
    const gap = x === 32 && y >= 12 && y < 18;
    if (onRim && !gap) return { r: 30, g: 90, b: 160 };
    return { r: 255, g: 255, b: 255 };
  });
  const result = await cutoutWhiteBackground(png);
  assert.equal(result.status, "skipped");
  assert.equal(result.reason, SKIP_REASON);
  assert.equal(result.cause, "shared_colour");
  assert.equal(result.png, null);
  assert.ok(result.rejectedPng);
});

test("white held in by a faint edge, not by a different hue, is kept", async () => {
  const png = await paint(64, 64, (x, y) => {
    const onOutline = x >= 16 && x <= 47 && y >= 16 && y <= 47
      && (x === 16 || x === 47 || y === 16 || y === 47);
    if (onOutline) return { r: 230, g: 230, b: 230 };
    return { r: 252, g: 252, b: 252 };
  });
  const result = await cutoutWhiteBackground(png);
  assert.equal(result.status, "cut");
  const raw = await rawOf(result.png);
  assert.equal(at(raw, 1, 1).a, 0);
  assert.equal(at(raw, 32, 32).a, 255);
});

test("a soft fringe is neither fully clear nor fully opaque", async () => {
  const png = await paint(40, 40, (x, y) => {
    const inside = x >= 16 && x < 28 && y >= 16 && y < 28;
    const fringe = x >= 14 && x < 30 && y >= 14 && y < 30;
    if (inside) return { r: 200, g: 30, b: 30 };
    if (fringe) return { r: 241, g: 199, b: 199 };
    return { r: 255, g: 255, b: 255 };
  });
  const result = await cutoutWhiteBackground(png);
  assert.equal(result.status, "cut");
  const raw = await rawOf(result.png);
  const fringe = at(raw, 14, 20);
  assert.ok(fringe.a > 0 && fringe.a < 255, `fringe alpha should be soft, got ${fringe.a}`);
  assert.equal(at(raw, 0, 0).a, 0);
  assert.equal(at(raw, 22, 22).a, 255);
});

test("removing more than the configured share is refused", async () => {
  const png = await paint(32, 32, (x, y) => {
    if (x === 16 && y === 16) return { r: 20, g: 20, b: 20 };
    return { r: 255, g: 255, b: 255 };
  });
  const result = await cutoutWhiteBackground(png, { maxRemovedRatio: 0.5 });
  assert.equal(result.status, "skipped");
  assert.equal(result.reason, SKIP_REASON);
  assert.equal(result.cause, "removed_share");
});

test("scattered ink on an open white field can be refused as shared colour", async () => {
  const marks = [
    [8, 8], [28, 8], [48, 8],
    [8, 28], [36, 36],
  ];
  const png = await paint(64, 64, (x, y) => {
    const hit = marks.some(([mx, my]) => x >= mx && x < mx + 5 && y >= my && y < my + 5);
    if (hit) return { r: 190, g: 40, b: 40 };
    return { r: 255, g: 255, b: 255 };
  });
  const result = await cutoutWhiteBackground(png, {
    bandFactor: 1.15,
    minBandRatio: 0.04,
    bandWidth: 24,
    maxRemovedRatio: 0.999,
    fragmentCount: 20,
  });
  assert.equal(result.status, "skipped");
  assert.equal(result.reason, SKIP_REASON);
  assert.equal(result.cause, "shared_colour");
});

test("a dark border is not treated as a white studio background", async () => {
  const png = await paint(24, 24, () => ({ r: 20, g: 24, b: 28 }));
  const result = await cutoutWhiteBackground(png);
  assert.equal(result.status, "skipped");
  assert.equal(result.cause, "not_light_border");
  assert.notEqual(result.reason, SKIP_REASON);
});

test("bytes that are not an image fail closed", async () => {
  const result = await cutoutWhiteBackground(Buffer.from("not an image"));
  assert.equal(result.status, "failed");
  assert.equal(result.cause, "undecodable");
  assert.equal(result.png, null);
});

test("csv fields keep commas that were quoted, and ids select rows", () => {
  const rows = parseProductCsv('id,name,image_url\n1,"bag, large",/uploads/a.png\n2,leash,/uploads/b.webp\n');
  assert.equal(rows[0].name, "bag, large");
  assert.equal(rows[0].image_url, "/uploads/a.png");
  const chosen = selectProducts(rows, { ids: ["2"] });
  assert.deepEqual(chosen.map((row) => row.id), ["2"]);
});

test("a public image url is joined to the site and cannot carry credentials", () => {
  assert.equal(resolvePublicImageUrl("/uploads/a.png"), "https://mipo.pet/uploads/a.png");
  assert.equal(
    resolvePublicImageUrl("https://cdn.example.com/a.jpg", "https://mipo.pet"),
    "https://cdn.example.com/a.jpg",
  );
  assert.throws(() => resolvePublicImageUrl("https://user:secret@mipo.pet/a.png"), /credentials/);
});

test("--apply is refused without the confirm phrase and an absolute object root", () => {
  assert.equal(assertApplyAllowed({}).ok, false);
  assert.equal(assertApplyAllowed({
    CUTOUT_APPLY_CONFIRM: "write-new-object-keep-original",
    CUTOUT_OBJECT_ROOT: "relative/uploads",
  }).ok, false);
  const allowed = assertApplyAllowed({
    CUTOUT_APPLY_CONFIRM: "write-new-object-keep-original",
    CUTOUT_OBJECT_ROOT: "/var/lib/mipo-uploads",
  });
  assert.equal(allowed.ok, true);
  assert.equal(allowed.root, "/var/lib/mipo-uploads");
});

test("apply copies the original aside and writes a new object without changing the original", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "mipo-cutout-"));
  try {
    const store = createFilesystemObjectStore(root);
    const original = Buffer.from("original-bytes");
    const cutout = Buffer.from("cutout-bytes");
    await store.putNew("catalog/bag.png", original);

    const manifest = await applyCutoutObjects({
      store,
      items: [{
        status: "cut",
        originalKey: "catalog/bag.png",
        newKey: "cutout-new/bag-1.webp",
        bytes: cutout,
        id: "1",
      }, {
        status: "skipped",
        originalKey: "catalog/other.png",
        bytes: cutout,
      }],
    });

    assert.equal(manifest.entries.length, 1);
    assert.deepEqual(manifest.entries[0], {
      originalKey: "catalog/bag.png",
      backupKey: "cutout-backup/catalog/bag.png",
      newKey: "cutout-new/bag-1.webp",
      originalBytes: original.length,
      newBytes: cutout.length,
    });
    assert.deepEqual(await store.read("catalog/bag.png"), original);
    assert.deepEqual(await store.read("cutout-backup/catalog/bag.png"), original);
    assert.deepEqual(await store.read("cutout-new/bag-1.webp"), cutout);

    await assert.rejects(
      () => store.putNew("cutout-new/bag-1.webp", Buffer.from("nope")),
      /EEXIST|exists/i,
    );
    await assert.rejects(
      () => store.copy("catalog/bag.png", "cutout-backup/catalog/bag.png"),
      /EEXIST|exists/i,
    );
    assert.deepEqual(await store.read("catalog/bag.png"), original);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the script does not open the database and --apply exits before any download", async () => {
  const script = await readFile(path.join(repoRoot, "server/scripts/cutoutProductImages.mjs"), "utf8");
  const library = await readFile(path.join(repoRoot, "server/src/whiteBackgroundCutout.js"), "utf8");
  assert.doesNotMatch(script, /from ["']pg["']/);
  assert.doesNotMatch(script, /new Pool/);
  assert.doesNotMatch(library, /unlink|rmSync|DeleteObject|PutObject/);
  assert.match(script, /dry run/i);
  assert.match(script, /CUTOUT_APPLY_CONFIRM/);

  const child = spawn(process.execPath, [
    path.join(repoRoot, "server/scripts/cutoutProductImages.mjs"),
    "--apply",
  ], { cwd: repoRoot, env: {} });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const code = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });
  assert.equal(code, 2);
  assert.match(stderr, /Refusing --apply/);
  assert.match(stderr, /Nothing was written/);
});

test("jpeg and webp sources with a white margin cut the same way", async () => {
  const sharp = await sharpFor();
  const raw = await paint(36, 36, (x, y) => {
    if (x >= 10 && x < 26 && y >= 8 && y < 28) return { r: 40, g: 120, b: 70 };
    return { r: 250, g: 250, b: 250 };
  });
  const jpeg = await sharp(raw).jpeg({ quality: 95 }).toBuffer();
  const webp = await sharp(raw).webp({ quality: 95 }).toBuffer();
  for (const source of [jpeg, webp]) {
    const result = await cutoutWhiteBackground(source);
    assert.equal(result.status, "cut");
    const decoded = await rawOf(result.png);
    assert.equal(at(decoded, 0, 0).a, 0);
    assert.equal(at(decoded, 18, 18).a, 255);
  }
});

test("a dry run writes a report and does not require apply credentials", async () => {
  const { runCutout, parseCutoutArgs } = await import("../scripts/cutoutProductImages.mjs");
  const root = await mkdtemp(path.join(tmpdir(), "mipo-cutout-dry-"));
  const csv = path.join(root, "products.csv");
  await writeFile(csv, "id,name,image_url\n1,bag,/uploads/bag.png\n");
  const png = await paint(20, 20, (x, y) => (
    x >= 6 && x < 14 && y >= 6 && y < 14 ? { r: 10, g: 80, b: 180 } : { r: 255, g: 255, b: 255 }
  ));
  try {
    const report = await runCutout({
      args: parseCutoutArgs(["--csv", `--csv=${csv}`, `--output=${path.join(root, "out")}`, "--delay-ms=0"]),
      env: {},
      fetchImage: async () => png,
      log: () => {},
    });
    assert.equal(report.mode, "dry-run");
    assert.equal(report.counts.cut, 1);
    assert.equal(report.manifest, null);
    const saved = JSON.parse(await readFile(path.join(root, "out", "report.json"), "utf8"));
    assert.equal(saved.items[0].status, "cut");
    assert.equal(await readFile(path.join(root, "out", "contact-sheet.png")).then((buf) => buf.length > 100), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
