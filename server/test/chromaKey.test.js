// Cutting the background out ourselves, rather than asking for it to be gone.
//
// Asking failed, and it failed in the way that is hardest to notice: the model
// returned a picture OF transparency - the chequerboard, painted into an opaque
// square - because "a PNG with a real alpha channel" was one line inside a long
// creative prompt and it read as something to depict.
//
// This step has no judgement in it. That is the entire argument for it: every
// outcome is a measurement, and every failure is a number we can print. So the
// tests are about the numbers, on real encoded PNGs, decoded by the same sharp
// that runs in production.

import assert from "node:assert/strict";
import test from "node:test";

import {
  KEY_BACKGROUND_INSTRUCTION,
  KEY_COLOUR,
  chromaKeyToAlpha,
  measureKeyedBorder,
} from "../src/chromaKey.js";
import { inspectTransparency } from "../src/petCharacter.js";

const sharpFor = async () => (await import("sharp")).default;

const SIZE = 64;

/**
 * An image with a magenta background and an opaque blob in the middle.
 * `edge` paints a ring of half-magenta pixels around the blob - a stand-in for
 * the soft edge of fur, which is the case a hard threshold gets wrong.
 */
const keyedPng = async ({ background = KEY_COLOUR, edge = false, subject = { r: 232, g: 166, b: 97 } } = {}) => {
  const sharp = await sharpFor();
  const pixels = Buffer.alloc(SIZE * SIZE * 4);
  const centre = SIZE / 2;

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const index = (y * SIZE + x) * 4;
      const radius = Math.hypot(x - centre, y - centre);
      let colour;

      if (radius < 14) {
        colour = subject;
      } else if (edge && radius < 17) {
        // Halfway between subject and key: what a hair strand looks like.
        colour = {
          r: Math.round((subject.r + background.r) / 2),
          g: Math.round((subject.g + background.g) / 2),
          b: Math.round((subject.b + background.b) / 2),
        };
      } else {
        colour = background;
      }

      pixels[index] = colour.r;
      pixels[index + 1] = colour.g;
      pixels[index + 2] = colour.b;
      pixels[index + 3] = 255;
    }
  }

  return sharp(pixels, { raw: { width: SIZE, height: SIZE, channels: 4 } }).png().toBuffer();
};

const rawOf = async (buffer) => {
  const sharp = await sharpFor();
  return sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
};

const alphaAt = ({ data, info }, x, y) => data[(y * info.width + x) * info.channels + info.channels - 1];
const pixelAt = ({ data, info }, x, y) => {
  const index = (y * info.width + x) * info.channels;
  return { r: data[index], g: data[index + 1], b: data[index + 2], a: data[index + 3] };
};

// ─── the happy path is a measurement, not a hope ─────────────────────────────

test("a magenta background becomes transparency", async () => {
  const result = await chromaKeyToAlpha(await keyedPng());
  assert.equal(result.ok, true);

  const raw = await rawOf(result.buffer);
  assert.equal(alphaAt(raw, 0, 0), 0, "a corner is still opaque");
  assert.equal(alphaAt(raw, SIZE - 1, SIZE - 1), 0);
  assert.equal(alphaAt(raw, SIZE / 2, SIZE / 2), 255, "the animal was keyed out");
});

test("the result passes the same transparency check the generator's output must pass", async () => {
  // The two halves of the pipeline agree or the pack silently never improves:
  // the screen refuses to un-crop anything inspectTransparency would reject.
  const result = await chromaKeyToAlpha(await keyedPng());
  const verdict = await inspectTransparency(result.buffer);
  assert.equal(verdict.transparent, true);
  assert.equal(verdict.transparentCorners, 4);
});

// ─── refusing is the point ───────────────────────────────────────────────────

test("a photographic backdrop is refused, not keyed", async () => {
  // Keying an image whose background is not the key colour punches holes
  // through anything pink in the fur, and produces a confident mess. The
  // number that says so is printed.
  const result = await chromaKeyToAlpha(await keyedPng({ background: { r: 185, g: 199, b: 214 } }));
  assert.equal(result.ok, false);
  assert.equal(result.reason, "background_not_keyable");
  assert.ok(result.keyedBorder < 0.1, `keyedBorder was ${result.keyedBorder}`);
});

test("the chequerboard is refused too", async () => {
  // The defect that started this. It is not magenta, so it is not keyable, and
  // it is named rather than silently passed through.
  const sharp = await sharpFor();
  const pixels = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const index = (y * SIZE + x) * 4;
      const shade = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0 ? 255 : 207;
      pixels[index] = shade;
      pixels[index + 1] = shade;
      pixels[index + 2] = shade;
      pixels[index + 3] = 255;
    }
  }
  const chequerboard = await sharp(pixels, { raw: { width: SIZE, height: SIZE, channels: 4 } }).png().toBuffer();

  const result = await chromaKeyToAlpha(chequerboard);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "background_not_keyable");
});

test("bytes that are not an image are refused, not thrown", async () => {
  const result = await chromaKeyToAlpha(Buffer.from("not a png"));
  assert.equal(result.ok, false);
  assert.equal(result.reason, "undecodable");
});

// ─── the edge is where a naive key shows ─────────────────────────────────────

test("a soft edge ramps rather than snapping to in or out", async () => {
  // A hard threshold makes every hair strand fully present or fully absent,
  // which is the jagged halo that gives a cut-out away. The half-magenta ring
  // must come out partially transparent - neither 0 nor 255.
  const result = await chromaKeyToAlpha(await keyedPng({ edge: true }));
  assert.equal(result.ok, true);

  const raw = await rawOf(result.buffer);
  const onTheEdge = pixelAt(raw, Math.round(SIZE / 2 + 15.5), SIZE / 2);

  assert.ok(
    onTheEdge.a > 0 && onTheEdge.a < 255,
    `the edge pixel came out at alpha ${onTheEdge.a}; a soft edge must be partial`,
  );
});

test("the magenta cast is pulled out of the edge, not left as a fringe", async () => {
  // A semi-transparent edge pixel still carries the key's colour. Composited
  // over the app's pale surface that is a magenta halo around the animal - the
  // single most recognisable sign of a bad cut-out.
  const result = await chromaKeyToAlpha(await keyedPng({ edge: true }));
  const raw = await rawOf(result.buffer);
  const onTheEdge = pixelAt(raw, Math.round(SIZE / 2 + 15.5), SIZE / 2);

  // Before despill this pixel is (243, 83, 176): red and blue far above green.
  assert.ok(
    onTheEdge.r - onTheEdge.g < 60 && onTheEdge.b - onTheEdge.g < 60,
    `edge pixel is still magenta-cast: rgb(${onTheEdge.r}, ${onTheEdge.g}, ${onTheEdge.b})`,
  );
});

test("a genuinely pink animal is not despilled into a grey one", async () => {
  // Despill only touches the soft band. A solidly pink subject sits far from
  // the key and must come through untouched, or every ginger cat loses its
  // colour to a background correction.
  const pink = { r: 240, g: 150, b: 190 };
  const result = await chromaKeyToAlpha(await keyedPng({ subject: pink }));
  assert.equal(result.ok, true);

  const raw = await rawOf(result.buffer);
  const middle = pixelAt(raw, SIZE / 2, SIZE / 2);
  assert.deepEqual(
    { r: middle.r, g: middle.g, b: middle.b, a: middle.a },
    { ...pink, a: 255 },
  );
});

// ─── the prompt and the key cannot drift ─────────────────────────────────────

test("the instruction names the same colour the key looks for", async () => {
  // Two numbers in two files is how the model gets asked for green while the
  // key hunts for magenta, and every image comes back unkeyable with no
  // explanation.
  assert.match(KEY_BACKGROUND_INSTRUCTION, /RGB\(255, 0, 255\)/);
  assert.deepEqual({ ...KEY_COLOUR }, { r: 255, g: 0, b: 255 });
});

test("the border measurement is a share, and an all-key image is all of it", async () => {
  const sharp = await sharpFor();
  const solid = await sharp({
    create: { width: 8, height: 8, channels: 4, background: { ...KEY_COLOUR, alpha: 1 } },
  }).png().toBuffer();
  const raw = await rawOf(solid);
  assert.equal(measureKeyedBorder(raw.data, raw.info), 1);
});
