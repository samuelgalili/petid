import { useEffect, useState } from "react";

/**
 * Does this image actually have a transparent background?
 *
 * petCharacter.js asks the generator for "a PNG with a real alpha channel" and
 * validates the answer by checking that its MIME type is image/png. A PNG can
 * be entirely opaque, so that check proves the container and nothing about the
 * contents - and the generator has returned images where the transparency was
 * DRAWN: the grey-and-white chequerboard, rendered as real pixels, behind an
 * opaque square.
 *
 * On the home screen that shipped as a chequered square with hard corners,
 * tilting with the idle sway, over the orbit's labels. The layout was right;
 * the picture was a lie about itself.
 *
 * The server-side fix is to verify alpha before storing. This is the client's
 * seam in the meantime, and it is worth keeping afterwards: a stored image can
 * be replaced, and a screen that trusts a flag will show a chequerboard again
 * the first time the flag is wrong.
 *
 * FAILS SAFE. The answer starts as "unknown" and the caller is expected to
 * render the conservative treatment - the circle crop, which makes any image
 * look deliberate - until it becomes "alpha". Nobody sees a chequered square,
 * not even for one frame.
 *
 * Corners, not the whole border: a full-body character stands on the bottom
 * edge of its square, so the bottom row can legitimately be opaque. The four
 * corners of a cut-out animal are transparent in every case. Three of four is
 * the threshold, which tolerates one stray artefact without accepting an
 * opaque square.
 */

export type AlphaVerdict = "unknown" | "alpha" | "opaque";

/** Decided once per URL: the answer cannot change while the bytes do not. */
const cache = new Map<string, AlphaVerdict>();

const SAMPLE = 24;
/** Below this, a pixel is see-through rather than faintly drawn. */
const TRANSPARENT = 16;
const CORNERS_REQUIRED = 3;

/**
 * The decision, separated from the canvas so it can be tested on pixels
 * somebody chose rather than on pixels a browser happened to produce.
 *
 * Exported for e2e/character-alpha.aws.spec.ts, which feeds it the three cases
 * that matter: a real cut-out, a drawn chequerboard, and a photograph.
 */
export const verdictFromPixels = (pixels: Uint8ClampedArray | number[], size = SAMPLE): AlphaVerdict => {
  const alphaAt = (x: number, y: number) => pixels[(y * size + x) * 4 + 3];
  const edge = size - 1;
  const corners = [
    alphaAt(0, 0),
    alphaAt(edge, 0),
    alphaAt(0, edge),
    alphaAt(edge, edge),
  ];

  const transparentCorners = corners.filter((alpha) => alpha < TRANSPARENT).length;
  return transparentCorners >= CORNERS_REQUIRED ? "alpha" : "opaque";
};

const inspect = (image: HTMLImageElement): AlphaVerdict => {
  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE;
  canvas.height = SAMPLE;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return "opaque";

  context.drawImage(image, 0, 0, SAMPLE, SAMPLE);

  try {
    return verdictFromPixels(context.getImageData(0, 0, SAMPLE, SAMPLE).data, SAMPLE);
  } catch {
    // A cross-origin image taints the canvas and readback throws. We cannot
    // know, so we say the safe thing rather than the hopeful one.
    return "opaque";
  }
};

export const useImageHasAlpha = (src: string | null | undefined): AlphaVerdict => {
  const [verdict, setVerdict] = useState<AlphaVerdict>(() =>
    (src && cache.get(src)) || "unknown");

  useEffect(() => {
    if (!src) {
      setVerdict("unknown");
      return;
    }

    const known = cache.get(src);
    if (known) {
      setVerdict(known);
      return;
    }

    setVerdict("unknown");
    let cancelled = false;

    const image = new Image();
    // Same-origin in production (the character assets are served by our own
    // API), but the attribute costs nothing and keeps readback possible if an
    // asset ever moves to a CDN that sends the header.
    image.crossOrigin = "anonymous";

    image.onload = () => {
      if (cancelled) return;
      let answer: AlphaVerdict;
      try {
        answer = inspect(image);
      } catch {
        answer = "opaque";
      }
      cache.set(src, answer);
      setVerdict(answer);
    };

    // An image that will not load is not a transparency question.
    image.onerror = () => { if (!cancelled) setVerdict("opaque"); };

    image.src = src;

    return () => { cancelled = true; };
  }, [src]);

  return verdict;
};

/** For tests: the verdict is memoised per URL and a test needs a clean slate. */
export const __clearAlphaCache = () => cache.clear();

export default useImageHasAlpha;
