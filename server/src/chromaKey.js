import sharp from "sharp";

/**
 * Cut the background out ourselves instead of asking for it to be absent.
 *
 * Asking the model for "a PNG with a real alpha channel" failed, and it failed
 * in the way that is hardest to notice: it returned a picture OF transparency,
 * the grey-and-white chequerboard, painted into an opaque square. The
 * instruction was one line inside a long creative prompt, and the model treated
 * it as something to depict.
 *
 * So the prompt stops asking. It asks for the animal on a flat, uniform colour
 * - which is a thing a model draws reliably, because it is a drawing
 * instruction rather than a file-format instruction - and the alpha is made
 * here, arithmetically, from pixels.
 *
 * THE POINT IS THAT THIS STEP CANNOT BE WRONG IN AN INTERESTING WAY. It has no
 * judgement in it. Every failure is a measurement: either enough of the border
 * is the key colour or it is not, and if it is not we say so and stop rather
 * than producing a confident mess.
 *
 * MAGENTA, NOT GREEN. Chroma green is the film convention and it is the wrong
 * choice for animals: green appears in eyes, in reflections, in the cast light
 * off grass, and green spill on pale fur is the classic artefact. Full magenta
 * is essentially absent from mammals and birds, which makes both the key and
 * the despill safer on exactly the subject this pipeline has.
 */

/** Pure magenta. Stated once, used by the prompt and by the key. */
export const KEY_COLOUR = Object.freeze({ r: 255, g: 0, b: 255 });

/** How far a pixel may sit from the key and still be background. */
const KEY_TOLERANCE = 90;
/** Beyond this it is definitely subject; between the two it is an edge. */
const KEY_SOFT_EDGE = 160;
/** The share of border pixels that must be the key colour for this to be a keyable image. */
const MIN_KEYED_BORDER = 0.75;

const distanceToKey = (r, g, b) => Math.sqrt(
  (r - KEY_COLOUR.r) ** 2 + (g - KEY_COLOUR.g) ** 2 + (b - KEY_COLOUR.b) ** 2,
);

/**
 * How much of the image's border is the key colour.
 *
 * Measured BEFORE keying, because it is the question "did the model do what it
 * was asked". A model that drew a photographic backdrop produces a low number,
 * and keying that image would eat holes out of the animal wherever it happened
 * to be pinkish. Refusing is the only honest outcome.
 */
export const measureKeyedBorder = (data, info) => {
  const { width, height, channels } = info;
  let total = 0;
  let keyed = 0;
  const sample = (x, y) => {
    const index = (y * width + x) * channels;
    total += 1;
    if (distanceToKey(data[index], data[index + 1], data[index + 2]) <= KEY_TOLERANCE) keyed += 1;
  };

  for (let x = 0; x < width; x += 1) {
    sample(x, 0);
    sample(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    sample(0, y);
    sample(width - 1, y);
  }

  return total === 0 ? 0 : keyed / total;
};

/**
 * Replace the key colour with transparency.
 *
 * Three bands rather than a hard threshold, because a hard threshold on fur
 * produces a cut-out with a jagged halo - every strand is either fully in or
 * fully out, and hair is neither:
 *
 *   under KEY_TOLERANCE    background      alpha 0
 *   over KEY_SOFT_EDGE     subject         alpha untouched
 *   between                a hair's edge   alpha ramps
 *
 * DESPILL in the middle band. A semi-transparent edge pixel still carries the
 * key's colour, and composited over the app's pale background that reads as a
 * magenta fringe around the animal. Pulling the red and blue down towards green
 * where they exceed it removes the cast without touching a pixel that was
 * genuinely pink.
 */
export const chromaKeyToAlpha = async (buffer) => {
  const image = sharp(buffer, { failOn: "none" });

  let metadata;
  try {
    metadata = await image.metadata();
  } catch {
    return { ok: false, reason: "undecodable" };
  }
  if (!metadata.width || !metadata.height) return { ok: false, reason: "undecodable" };

  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const keyedBorder = measureKeyedBorder(data, info);
  if (keyedBorder < MIN_KEYED_BORDER) {
    // The model did not put the animal on the colour it was asked for. Keying
    // now would punch holes through anything pink in the fur.
    return { ok: false, reason: "background_not_keyable", keyedBorder };
  }

  const { width, height, channels } = info;
  for (let index = 0; index < width * height * channels; index += channels) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const distance = distanceToKey(r, g, b);

    if (distance <= KEY_TOLERANCE) {
      data[index + channels - 1] = 0;
      continue;
    }

    if (distance < KEY_SOFT_EDGE) {
      const ramp = (distance - KEY_TOLERANCE) / (KEY_SOFT_EDGE - KEY_TOLERANCE);
      data[index + channels - 1] = Math.round(data[index + channels - 1] * ramp);

      // Despill: the key is magenta, so its signature is red and blue both
      // sitting above green. Bring them down to green's level.
      if (r > g && b > g) {
        data[index] = Math.round(g + (r - g) * 0.25);
        data[index + 2] = Math.round(g + (b - g) * 0.25);
      }
    }
  }

  const png = await sharp(data, { raw: { width, height, channels } }).png().toBuffer();
  return { ok: true, buffer: png, keyedBorder };
};

/**
 * What the prompt must say. Exported so the prompt and the key cannot drift:
 * a test asserts the character prompt contains this exact sentence.
 */
export const KEY_BACKGROUND_INSTRUCTION = [
  "BACKGROUND: place the character on a perfectly flat, uniform, solid background of",
  "pure magenta, RGB(255, 0, 255), filling the entire canvas behind the animal.",
  "The background must be one single unbroken colour - no gradient, no texture, no",
  "pattern, no chequerboard, no shadow, no ground plane, no vignette, no lighting",
  "variation. Do not use magenta anywhere on the animal itself.",
].join(" ");
