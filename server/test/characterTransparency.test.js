// The generator is asked for a transparent background. Now it is checked.
//
// petCharacter.js validated a generated image by asserting its MIME type was
// image/png. A PNG can be entirely opaque, so that proved the container and
// nothing about the pixels - and the model returned one where the transparency
// was DRAWN: the grey-and-white chequerboard, as real pixels, behind an opaque
// square. It reached the home screen and the owner photographed it.
//
// The comment above that MIME check claimed it prevented exactly this: "a
// background baked in and no way to tell afterwards". It could not. Reading
// the label is not reading the thing.
//
// Every image below is a REAL encoded PNG, built here and decoded by the same
// sharp that runs in production. A test that hands the checker a hand-made
// array of numbers proves the arithmetic and not the decoding, and the bug was
// in what the bytes actually contained.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CORNERS_REQUIRED_TRANSPARENT,
  CORNER_ALPHA_THRESHOLD,
  inspectTransparency,
} from "../src/petCharacter.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const sharpFor = async () => (await import("sharp")).default;

const SIZE = 64;

/** A square whose background has the given alpha, with an opaque blob centred. */
const squarePng = async (backgroundAlpha) => {
  const sharp = await sharpFor();
  const pixels = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const index = (y * SIZE + x) * 4;
      const inBlob = Math.abs(x - SIZE / 2) < 14 && Math.abs(y - SIZE / 2) < 14;
      pixels[index] = 232;
      pixels[index + 1] = 166;
      pixels[index + 2] = 97;
      pixels[index + 3] = inBlob ? 255 : backgroundAlpha;
    }
  }
  return sharp(pixels, { raw: { width: SIZE, height: SIZE, channels: 4 } }).png().toBuffer();
};

/** The defect itself: an opaque PNG whose background is a PAINTED chequerboard. */
const chequerboardPng = async () => {
  const sharp = await sharpFor();
  const pixels = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const index = (y * SIZE + x) * 4;
      const light = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0;
      const shade = light ? 255 : 207;
      pixels[index] = shade;
      pixels[index + 1] = shade;
      pixels[index + 2] = shade;
      // Opaque everywhere. This is exactly what shipped.
      pixels[index + 3] = 255;
    }
  }
  return sharp(pixels, { raw: { width: SIZE, height: SIZE, channels: 4 } }).png().toBuffer();
};

// ─── the thing that shipped ──────────────────────────────────────────────────

test("the painted chequerboard is refused", async () => {
  const verdict = await inspectTransparency(await chequerboardPng());
  assert.equal(verdict.transparent, false);
  assert.equal(verdict.reason, "opaque_corners");
  assert.equal(verdict.transparentCorners, 0);
});

test("a real cut-out is accepted", async () => {
  const verdict = await inspectTransparency(await squarePng(0));
  assert.equal(verdict.transparent, true);
  assert.equal(verdict.transparentCorners, 4);
});

test("a PNG with no alpha channel is refused on that ground alone", async () => {
  const sharp = await sharpFor();
  const opaque = await sharp({
    create: { width: SIZE, height: SIZE, channels: 3, background: { r: 200, g: 200, b: 200 } },
  }).png().toBuffer();

  const verdict = await inspectTransparency(opaque);
  assert.equal(verdict.transparent, false);
  assert.equal(verdict.reason, "no_alpha_channel");
});

test("a JPEG is refused rather than crashing the pack", async () => {
  // JPEG cannot be reached through extractGeneratedImage's MIME allowlist, but
  // the checker must not throw on one if it ever is.
  const sharp = await sharpFor();
  const jpeg = await sharp({
    create: { width: SIZE, height: SIZE, channels: 3, background: { r: 120, g: 140, b: 160 } },
  }).jpeg().toBuffer();

  const verdict = await inspectTransparency(jpeg);
  assert.equal(verdict.transparent, false);
});

test("bytes that are not an image at all are refused, not thrown", async () => {
  const verdict = await inspectTransparency(Buffer.from("this is not a png"));
  assert.equal(verdict.transparent, false);
  assert.equal(verdict.reason, "undecodable");
});

// ─── the threshold is a decision, so it is tested at its edges ───────────────

test("a faint wash is not transparency", async () => {
  // 40/255 still paints a visible box. Anything under the threshold is
  // see-through; anything at or over it is a background.
  const verdict = await inspectTransparency(await squarePng(40));
  assert.equal(verdict.transparent, false);
});

test("just under the threshold passes, exactly on it does not", async () => {
  assert.equal((await inspectTransparency(await squarePng(CORNER_ALPHA_THRESHOLD - 1))).transparent, true);
  assert.equal((await inspectTransparency(await squarePng(CORNER_ALPHA_THRESHOLD))).transparent, false);
});

// ─── the error the retry path recognises ─────────────────────────────────────

test("the refusal carries the code characterErrorCode maps", () => {
  // generateImage constructs this error inline now that the keying step owns
  // the decision. The code is the contract between the generator and the
  // screen's error message, so it is asserted where it is written.
  const source = readFileSync(path.join(repoRoot, "server/src/petCharacter.js"), "utf8");
  assert.match(source, /error\.code = "GENERATED_IMAGE_NOT_TRANSPARENT"/);
  assert.match(
    source,
    /did not place the character on the requested background colour/,
    "the message no longer distinguishes an unkeyable background from a keyed\n" +
      "image that came out opaque anyway - two different faults.",
  );
});

// ─── the two implementations must agree ──────────────────────────────────────

test("the server and the browser use the same numbers", () => {
  // Two checkers that disagree are worse than one that is wrong. A stricter
  // server refuses images the screen would have shown; a laxer one stores
  // images the screen refuses to un-crop, which is a pack that silently never
  // improves and nobody can explain.
  const hook = readFileSync(path.join(repoRoot, "src/hooks/useImageHasAlpha.ts"), "utf8");

  const browserThreshold = Number(/const TRANSPARENT = (\d+);/.exec(hook)?.[1]);
  const browserCorners = Number(/const CORNERS_REQUIRED = (\d+);/.exec(hook)?.[1]);

  assert.ok(Number.isFinite(browserThreshold), "could not read the browser's threshold");
  assert.equal(browserThreshold, CORNER_ALPHA_THRESHOLD);
  assert.equal(browserCorners, CORNERS_REQUIRED_TRANSPARENT);
});

// ─── the check is wired where every image passes ─────────────────────────────

test("every generated image goes through the check, at the one chokepoint", () => {
  const source = readFileSync(path.join(repoRoot, "server/src/petCharacter.js"), "utf8");

  // generateImage is called by both generateCharacterCandidates and
  // generateCharacterExpressions. A check at one call site is a check at
  // neither, eventually.
  assert.match(
    source,
    /const generateImage = async[\s\S]{0,2600}chromaKeyToAlpha/,
    "generateImage no longer cuts the background out",
  );
  assert.match(
    source,
    /const generateImage = async[\s\S]{0,2600}inspectTransparency/,
    "generateImage keys the image and then trusts the result without checking it",
  );
  assert.match(
    source,
    /TRANSPARENCY_RETRY_NOTE \}, \.\.\.parts/,
    "the retry no longer re-sends the original instruction alongside the correction",
  );
  assert.doesNotMatch(
    source,
    /while\s*\(|for\s*\([^)]*attempt/,
    "the retry became a loop. Each attempt is the most expensive call the\n" +
      "product makes, and a model that paints a chequerboard twice will not\n" +
      "stop on the fifth.",
  );
});

// ─── a failed regeneration must say WHY ──────────────────────────────────────

test("a transparency failure has its own error code, not the generic bucket", () => {
  // Whether the correction note persuades the model is the one thing about
  // this mechanism that no test can answer - it depends on the model. The only
  // way to find out is a real regeneration, and that experiment is worthless
  // if its failure is recorded as "generation_failed", which is also what a
  // network error, a parse failure and an empty response look like.
  const index = readFileSync(path.join(repoRoot, "server/src/index.js"), "utf8");
  const mapper = index.slice(index.indexOf("const characterErrorCode"), index.indexOf("const markPetCharacterFailed"));

  assert.ok(mapper.length > 0, "characterErrorCode is gone");
  assert.match(
    mapper,
    /GENERATED_IMAGE_NOT_TRANSPARENT"\) return "generation_not_transparent"/,
    "a transparency refusal falls through to generation_failed, so a\n" +
      "regeneration cannot tell us whether the retry note worked.",
  );
});

test("the owner is told what actually happened, in their own words", () => {
  // An owner shown "something went wrong, try again" will try again and get
  // the same answer, because nothing about their photographs is wrong.
  const studio = readFileSync(path.join(repoRoot, "src/components/home/PetCharacterStudio.tsx"), "utf8");
  assert.match(
    studio,
    /generation_not_transparent: "/,
    "the new error code has no message, so it renders as no message at all",
  );
});

test("the retry says out loud whether it worked", () => {
  // A silent retry makes a success invisible and a failure look like every
  // other failure. Both branches log, because the interesting outcome is the
  // one where the correction DID land.
  const source = readFileSync(path.join(repoRoot, "server/src/petCharacter.js"), "utf8");
  assert.match(source, /retrying with a correction/, "the first refusal is silent");
  assert.match(source, /not keyable on the retry either/, "a second refusal is silent");
  assert.match(source, /background correction worked on the retry/, "a successful retry is silent");
});

test("the MIME allowlist no longer claims to prevent a baked-in background", () => {
  // The old comment asserted that refusing JPEG meant there was "no way" to end
  // up with a background baked in. That sentence is why nobody looked further.
  const source = readFileSync(path.join(repoRoot, "server/src/petCharacter.js"), "utf8");
  const allowlistComment = source.slice(0, source.indexOf("const allowedGeneratedMimeTypes"));
  assert.match(
    allowlistComment.slice(-900),
    /NECESSARY AND IS NOT SUFFICIENT/,
    "the comment above the MIME allowlist should say what it does not prove",
  );
});
