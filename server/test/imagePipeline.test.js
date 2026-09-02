import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";

import {
  IMAGE_PRESETS,
  ImagePipelineError,
  normalizeProductImage,
  normalizeWithBackgroundRemoval,
  opaqueCoverage,
} from "../src/imagePipeline.js";

// Real encoded bytes, not fixtures on disk, so the suite stays self-contained.
const makeImage = async ({ width, height, format = "jpeg", background = { r: 200, g: 40, b: 40 } }) => {
  const image = sharp({ create: { width, height, channels: 3, background } });
  return format === "png" ? image.png().toBuffer() : image.jpeg({ quality: 95 }).toBuffer();
};

// A red square on a transparent field - what a cutout should look like.
const makeCutout = async (size = 600, productFraction = 0.5) => {
  const inner = Math.round(size * productFraction);
  const product = await sharp({
    create: { width: inner, height: inner, channels: 4, background: { r: 10, g: 120, b: 200, alpha: 1 } },
  }).png().toBuffer();

  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: product, gravity: "centre" }])
    .png()
    .toBuffer();
};

test("every image lands on the same canvas regardless of its shape", async () => {
  const wide = await normalizeProductImage(await makeImage({ width: 3000, height: 1000 }));
  const tall = await normalizeProductImage(await makeImage({ width: 800, height: 2400 }));
  const square = await normalizeProductImage(await makeImage({ width: 1500, height: 1500 }));

  for (const result of [wide, tall, square]) {
    assert.equal(result.width, IMAGE_PRESETS.product.width);
    assert.equal(result.height, IMAGE_PRESETS.product.height);
  }
});

test("everything comes out as webp whatever went in", async () => {
  const fromJpeg = await normalizeProductImage(await makeImage({ width: 900, height: 900, format: "jpeg" }));
  const fromPng = await normalizeProductImage(await makeImage({ width: 900, height: 900, format: "png" }));

  assert.equal(fromJpeg.content_type, "image/webp");
  assert.equal(fromPng.content_type, "image/webp");
  assert.equal(fromJpeg.extension, ".webp");
});

test("a wide product is padded, not cropped", async () => {
  // fit:contain must letterbox. Cropping a 3:1 photo to a square loses the product.
  const result = await normalizeProductImage(await makeImage({ width: 3000, height: 1000 }));
  const { data, info } = await sharp(result.buffer).raw().toBuffer({ resolveWithObject: true });

  // Top-left corner is padding; the middle is the product.
  const corner = [data[0], data[1], data[2]];
  const midIndex = ((info.height / 2) * info.width + info.width / 2) * info.channels;
  const middle = [data[midIndex], data[midIndex + 1], data[midIndex + 2]];

  assert.ok(corner[0] > 240 && corner[1] > 240 && corner[2] > 240, `corner should be white padding, got ${corner}`);
  assert.ok(middle[0] > 150 && middle[1] < 100, `middle should keep the product colour, got ${middle}`);
});

test("a small image is not blown up past its real resolution", async () => {
  const result = await normalizeProductImage(await makeImage({ width: 300, height: 300 }));
  // Canvas is still uniform, but the product itself was not upscaled into mush.
  assert.equal(result.width, IMAGE_PRESETS.product.width);
  assert.equal(result.source.width, 300);
});

test("a large source is made dramatically smaller", async () => {
  const source = await makeImage({ width: 4000, height: 4000 });
  const result = await normalizeProductImage(source);
  assert.ok(result.bytes < source.length, `${result.bytes} should be under ${source.length}`);
});

test("the thumbnail preset is a different, also uniform, size", async () => {
  const result = await normalizeProductImage(await makeImage({ width: 2000, height: 900 }), { preset: "thumbnail" });
  assert.equal(result.width, IMAGE_PRESETS.thumbnail.width);
  assert.equal(result.height, IMAGE_PRESETS.thumbnail.height);
});

test("a file that is not an image is rejected, not written", async () => {
  await assert.rejects(
    () => normalizeProductImage(Buffer.from("this is not an image at all")),
    (error) => error instanceof ImagePipelineError && error.code === "undecodable",
  );
});

test("normalizing is deterministic, so re-running does not churn storage", async () => {
  const source = await makeImage({ width: 1500, height: 1200 });
  const first = await normalizeProductImage(source);
  const second = await normalizeProductImage(source);
  assert.equal(first.checksum, second.checksum);
});

test("without a remover configured the image is still normalized", async () => {
  const result = await normalizeWithBackgroundRemoval(await makeImage({ width: 1000, height: 700 }), {});
  assert.equal(result.background_removed, false);
  assert.equal(result.background_removal_skipped, "not_configured");
  assert.equal(result.width, IMAGE_PRESETS.product.width);
});

test("a working remover produces a transparent image", async () => {
  const result = await normalizeWithBackgroundRemoval(await makeImage({ width: 1000, height: 1000 }), {
    remover: async () => makeCutout(800, 0.5),
  });
  assert.equal(result.background_removed, true);
  assert.equal(result.transparent, true);

  const meta = await sharp(result.buffer).metadata();
  assert.equal(meta.hasAlpha, true);
});

test("a remover that throws does not fail the upload", async () => {
  const warnings = [];
  const result = await normalizeWithBackgroundRemoval(await makeImage({ width: 1000, height: 1000 }), {
    remover: async () => { throw new Error("provider exploded"); },
    onWarning: (w) => warnings.push(w),
  });
  // The product still gets a good image; only the cutout was lost.
  assert.equal(result.background_removed, false);
  assert.equal(result.background_removal_skipped, "provider_error");
  assert.equal(result.width, IMAGE_PRESETS.product.width);
  assert.equal(warnings.length, 1);
});

test("a cutout that erased the product is rejected", async () => {
  const warnings = [];
  // 1% of the frame left: the model ate the product, not the background.
  const result = await normalizeWithBackgroundRemoval(await makeImage({ width: 1000, height: 1000 }), {
    remover: async () => makeCutout(800, 0.08),
    onWarning: (w) => warnings.push(w),
  });
  assert.equal(result.background_removed, false);
  assert.equal(result.background_removal_skipped, "empty_result");
  assert.ok(warnings.some((w) => w.stage === "background_removal"));
});

test("a remover returning junk falls back instead of storing junk", async () => {
  const result = await normalizeWithBackgroundRemoval(await makeImage({ width: 900, height: 900 }), {
    remover: async () => Buffer.from("not an image"),
  });
  assert.equal(result.background_removed, false);
  assert.equal(result.background_removal_skipped, "undecodable_result");
});

test("a remover returning nothing falls back", async () => {
  const result = await normalizeWithBackgroundRemoval(await makeImage({ width: 900, height: 900 }), {
    remover: async () => null,
  });
  assert.equal(result.background_removed, false);
  assert.equal(result.background_removal_skipped, "no_result");
});

test("opaqueCoverage separates a real cutout from an empty one", async () => {
  const real = await opaqueCoverage(await makeCutout(400, 0.6));
  const empty = await opaqueCoverage(await makeCutout(400, 0.05));
  assert.ok(real > 0.3, `expected a real cutout to cover the frame, got ${real}`);
  assert.ok(empty < 0.02, `expected an empty cutout to be near zero, got ${empty}`);
});
