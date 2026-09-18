import { test, expect } from "@playwright/test";

import { verdictFromPixels } from "../src/hooks/useImageHasAlpha";

/**
 * A picture that claims to be transparent, and whether we believe it.
 *
 * petCharacter.js asks the generator for "a PNG with a real alpha channel" and
 * checks the answer by looking at its MIME type. A PNG can be entirely opaque,
 * so that check proves the container and nothing about the pixels - and the
 * generator returned an image where the transparency was DRAWN: the grey and
 * white chequerboard, as real pixels, behind an opaque square. It shipped to
 * production as a chequered square with hard corners, tilting with the idle
 * sway, sitting over the orbit's labels.
 *
 * That is the same shape of bug as the cyan checkout button: a guard that
 * checked the label instead of the thing.
 *
 * Two levels here, because each catches something the other cannot:
 *
 *   the decision   fed pixels chosen by hand, so the threshold is tested
 *                  rather than whatever a browser happened to render
 *   the pipeline   a real image, decoded and read back through a real canvas,
 *                  so drawImage/getImageData is proven to work at all
 */

const SIZE = 24;

/** A square of pixels with a given corner alpha and an opaque blob in the middle. */
const squareWith = (cornerAlpha: number) => {
  const pixels = new Uint8ClampedArray(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const middle = Math.abs(x - SIZE / 2) < 5 && Math.abs(y - SIZE / 2) < 5;
      const index = (y * SIZE + x) * 4;
      pixels[index] = 232;
      pixels[index + 1] = 166;
      pixels[index + 2] = 97;
      pixels[index + 3] = middle ? 255 : cornerAlpha;
    }
  }
  return pixels;
};

test.describe("does this image really have a transparent background", () => {
  test("a real cut-out is believed", () => {
    expect(verdictFromPixels(squareWith(0), SIZE)).toBe("alpha");
  });

  test("an opaque square is not", () => {
    // This is the chequerboard case: every pixel opaque, including the corners.
    expect(verdictFromPixels(squareWith(255), SIZE)).toBe("opaque");
  });

  test("a faintly drawn background is not mistaken for transparency", () => {
    // 40/255 is a visible wash. The threshold is 16, and an image that is
    // nearly-but-not-quite see-through still paints a box on the screen.
    expect(verdictFromPixels(squareWith(40), SIZE)).toBe("opaque");
  });

  test("one stray artefact in a corner does not disqualify a cut-out", () => {
    // Generators leave specks. Three of four corners is the rule; requiring
    // all four would send genuinely transparent characters back to the circle.
    const pixels = squareWith(0);
    const corner = ((SIZE - 1) * SIZE + (SIZE - 1)) * 4;
    pixels[corner + 3] = 255;
    expect(verdictFromPixels(pixels, SIZE)).toBe("alpha");
  });

  test("two bad corners are enough to refuse", () => {
    const pixels = squareWith(0);
    pixels[3] = 255;
    pixels[((SIZE - 1) * SIZE) * 4 + 3] = 255;
    expect(verdictFromPixels(pixels, SIZE)).toBe("opaque");
  });

  // ─── the same question, through a real canvas ──────────────────────────────

  const CUT_OUT = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">'
    + '<circle cx="100" cy="110" r="78" fill="#E8A661"/></svg>',
  )}`;

  const DRAWN_CHEQUERBOARD = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">'
    + '<defs><pattern id="c" width="20" height="20" patternUnits="userSpaceOnUse">'
    + '<rect width="20" height="20" fill="#ffffff"/><rect width="10" height="10" fill="#cfcfcf"/>'
    + '<rect x="10" y="10" width="10" height="10" fill="#cfcfcf"/></pattern></defs>'
    + '<rect width="200" height="200" fill="url(#c)"/>'
    + '<circle cx="100" cy="110" r="78" fill="#E8A661"/></svg>',
  )}`;

  const readBack = async (page: import("@playwright/test").Page, src: string) =>
    page.evaluate(async ({ url, size }) => {
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d", { willReadFrequently: true })!;
      context.drawImage(image, 0, 0, size, size);
      return Array.from(context.getImageData(0, 0, size, size).data);
    }, { url: src, size: SIZE });

  test("a browser can actually read the pixels back", async ({ page }) => {
    await page.goto("/");
    expect(verdictFromPixels(await readBack(page, CUT_OUT), SIZE)).toBe("alpha");
  });

  test("the chequerboard the generator returned is refused end to end", async ({ page }) => {
    // The exact defect from production, reproduced: an image that LOOKS
    // transparent to a person and is entirely opaque to a machine.
    await page.goto("/");
    expect(
      verdictFromPixels(await readBack(page, DRAWN_CHEQUERBOARD), SIZE),
      "the drawn chequerboard was accepted as a cut-out, which is what shipped",
    ).toBe("opaque");
  });
});
