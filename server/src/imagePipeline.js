// Product image normalization.
//
// Before this, an uploaded image was written to disk exactly as it arrived and
// an imported product simply pointed image_url at the supplier's own server. A
// catalogue built that way has no consistent size, aspect ratio, format or
// weight, and half of it can change or disappear without warning because the
// bytes belong to somebody else.
//
// Everything a product shows now passes through normalizeProductImage: one
// canvas, one format, one quality, stored by us.
//
// Background removal is a separate, optional stage. It is genuinely useful for
// a catalogue and genuinely capable of ruining a photograph - fur, whiskers,
// mesh and glass are exactly what cutout models get wrong - so it is opt-in,
// it never replaces the normalized image, and the original is always kept.

import { createHash } from "node:crypto";
import sharp from "sharp";
import { fetchValidatedRemoteUrl } from "./urlSafety.js";

// One canvas for the whole catalogue. Square because the shop grid, the cart
// row and the product page all reserve square space; a mixed catalogue is what
// makes a grid look broken.
export const IMAGE_PRESETS = Object.freeze({
  product: { width: 1200, height: 1200, quality: 82 },
  thumbnail: { width: 400, height: 400, quality: 78 },
});

const MAX_SOURCE_BYTES = Number(process.env.MAX_IMAGE_SOURCE_BYTES || 15 * 1024 * 1024);
const FETCH_TIMEOUT_MS = Number(process.env.IMAGE_FETCH_TIMEOUT_MS || 20000);

// The whole download, headers and body together. FETCH_TIMEOUT_MS bounds each
// individual request; without a second ceiling a server that answers promptly
// and then drips the body one byte at a time holds the connection open forever.
const TOTAL_DOWNLOAD_TIMEOUT_MS = Number(
  process.env.IMAGE_DOWNLOAD_TIMEOUT_MS || FETCH_TIMEOUT_MS * 3,
);

// A redirect chain longer than this is a loop or a redirector, not a CDN.
const MAX_IMAGE_REDIRECTS = 3;

// What a response may claim to be. image/* is the expected answer; the two
// octet-stream spellings are here because several CDNs serve images with them
// and rejecting those would break working imports.
//
// A response carrying no Content-Type at all is allowed through: some origins
// omit it, and sharp decodes the bytes immediately afterwards, so a non-image
// still fails — just one step later. What this check is really for is the
// response that is confidently something else: an HTML error page, a JSON body,
// a login redirect landing page.
const ALLOWED_CONTENT_TYPES = /^(image\/|application\/octet-stream|binary\/octet-stream)/i;

// sharp decodes many formats; this is what we accept as a source.
const DECODABLE = new Set(["jpeg", "jpg", "png", "webp", "gif", "avif", "tiff", "svg"]);

export class ImagePipelineError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "ImagePipelineError";
    this.code = code;
    this.statusCode = 400;
  }
}

/**
 * Fetch a remote image so we can host it ourselves.
 *
 * The URL is attacker-influenced: it is collected from a supplier's HTML by the
 * scraper, so the page that names it is not ours and neither is the server it
 * points at. An admin triggering the import does not make the URL trustworthy.
 *
 * Every request therefore goes through fetchValidatedRemoteUrl, which is the
 * same guard the scraper already uses rather than a second one written here:
 * the initial URL is resolved and refused if it lands on a loopback, private,
 * link-local or otherwise reserved address; redirects are handled manually and
 * each hop is re-validated; and the connection itself resolves through a lookup
 * that blocks non-public addresses, so a name that passes validation and then
 * changes answer cannot be reached either.
 *
 * On top of that: a hard byte ceiling enforced while streaming, so a hostile
 * server cannot exhaust memory by advertising a small Content-Length and
 * sending more; a deadline covering the body as well as the headers; and a
 * check that the response does not claim to be something other than an image.
 */
export const fetchImageBuffer = async (imageUrl, {
  maxBytes = MAX_SOURCE_BYTES,
  timeoutMs = FETCH_TIMEOUT_MS,
  totalTimeoutMs = TOTAL_DOWNLOAD_TIMEOUT_MS,
  maxRedirects = MAX_IMAGE_REDIRECTS,
  fetchRemote = fetchValidatedRemoteUrl,
} = {}) => {
  const deadline = Date.now() + totalTimeoutMs;

  let response;
  try {
    ({ response } = await fetchRemote(String(imageUrl ?? ""), {
      timeoutMs,
      maxRedirects,
    }));
  } catch (error) {
    // The guard's own refusals carry statusCode 400 and a human-readable
    // message that names the rule, not the host it resolved to. Mapping them
    // onto ImagePipelineError keeps the contract callers already depend on:
    // adoptProductImage reads error.code and logs it.
    if (error?.name === "AbortError") {
      throw new ImagePipelineError("Timed out fetching the image", "fetch_timeout");
    }
    if (error?.statusCode === 400) {
      throw new ImagePipelineError(error.message || "Image URL is not allowed", "url_rejected");
    }
    throw new ImagePipelineError("Could not fetch the image", "fetch_failed");
  }

  if (!response.ok) {
    await response.body?.cancel?.().catch(() => {});
    throw new ImagePipelineError(`Image source responded with ${response.status}`, "fetch_status");
  }

  const contentType = response.headers.get("content-type");
  if (contentType && !ALLOWED_CONTENT_TYPES.test(contentType.trim())) {
    await response.body?.cancel?.().catch(() => {});
    throw new ImagePipelineError("Image source did not return an image", "unsupported_content_type");
  }

  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes) {
    await response.body?.cancel?.().catch(() => {});
    throw new ImagePipelineError("Image is larger than the allowed size", "too_large");
  }

  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    if (Date.now() > deadline) {
      await response.body?.cancel?.().catch(() => {});
      throw new ImagePipelineError("Timed out fetching the image", "fetch_timeout");
    }
    total += chunk.length;
    // Content-Length is a claim, not a guarantee. Count what actually arrives.
    if (total > maxBytes) {
      await response.body?.cancel?.().catch(() => {});
      throw new ImagePipelineError("Image is larger than the allowed size", "too_large");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

/**
 * Resize onto the shared canvas and re-encode.
 *
 * `fit: contain` rather than `cover`: cropping a product photo to fill a square
 * is how you end up with a catalogue of headless dog beds. The image is padded
 * instead, on white by default so it sits on the shop's card without a visible
 * box, or transparent when the background has been removed.
 */
export const normalizeProductImage = async (input, {
  preset = "product",
  transparent = false,
  withoutEnlargement = true,
} = {}) => {
  const { width, height, quality } = IMAGE_PRESETS[preset] || IMAGE_PRESETS.product;

  let source;
  try {
    source = sharp(input, { failOn: "error" });
  } catch {
    throw new ImagePipelineError("The file is not a readable image", "undecodable");
  }

  let metadata;
  try {
    metadata = await source.metadata();
  } catch {
    throw new ImagePipelineError("The file is not a readable image", "undecodable");
  }

  if (!metadata.format || !DECODABLE.has(metadata.format)) {
    throw new ImagePipelineError(`Unsupported image format: ${metadata.format || "unknown"}`, "unsupported_format");
  }

  const pipeline = sharp(input, { failOn: "error", animated: false })
    // Phone photos carry orientation in EXIF; without this they arrive rotated.
    .rotate()
    .resize(width, height, {
      fit: "contain",
      withoutEnlargement,
      background: transparent ? { r: 0, g: 0, b: 0, alpha: 0 } : { r: 255, g: 255, b: 255, alpha: 1 },
    });

  // WebP everywhere: one format means one decoder path and one quality dial.
  // Lossless only when we are keeping real transparency, which lossy WebP
  // handles badly at the edges of a cutout.
  const output = transparent
    ? await pipeline.webp({ quality, alphaQuality: 100, nearLossless: true }).toBuffer()
    : await pipeline.flatten({ background: { r: 255, g: 255, b: 255 } }).webp({ quality }).toBuffer();

  const outMeta = await sharp(output).metadata();

  return {
    buffer: output,
    content_type: "image/webp",
    extension: ".webp",
    width: outMeta.width,
    height: outMeta.height,
    bytes: output.length,
    transparent,
    checksum: createHash("sha256").update(output).digest("hex"),
    source: {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      bytes: metadata.size ?? (Buffer.isBuffer(input) ? input.length : null),
    },
  };
};

/**
 * Remove the product's background, then normalize.
 *
 * `remover` is injected rather than imported so this module never holds a
 * provider credential and never decides which provider to use: today Gemini,
 * tomorrow whatever the AI gateway routes to. It takes a buffer and returns a
 * buffer with transparency, or null when it cannot.
 *
 * A failure here is not a failure of the upload. The normalized image is
 * already good; the cutout is an improvement on top, and a product with a
 * background beats a product with no image at all.
 */
export const normalizeWithBackgroundRemoval = async (input, {
  remover,
  preset = "product",
  onWarning,
} = {}) => {
  const normalized = await normalizeProductImage(input, { preset });

  if (typeof remover !== "function") {
    return { ...normalized, background_removed: false, background_removal_skipped: "not_configured" };
  }

  let cutout = null;
  try {
    cutout = await remover(normalized.buffer, { contentType: normalized.content_type });
  } catch (error) {
    onWarning?.({ stage: "background_removal", message: error?.message || "background removal failed" });
    return { ...normalized, background_removed: false, background_removal_skipped: "provider_error" };
  }

  if (!cutout || !Buffer.isBuffer(cutout) || cutout.length === 0) {
    return { ...normalized, background_removed: false, background_removal_skipped: "no_result" };
  }

  let finished;
  try {
    finished = await normalizeProductImage(cutout, { preset, transparent: true });
  } catch (error) {
    onWarning?.({ stage: "background_removal_encode", message: error?.message || "cutout was not decodable" });
    return { ...normalized, background_removed: false, background_removal_skipped: "undecodable_result" };
  }

  // A cutout that removed nearly everything is a failure that looks like a
  // success. Keeping the plain image is the safer answer.
  const coverage = await opaqueCoverage(finished.buffer);
  if (coverage < 0.02) {
    onWarning?.({ stage: "background_removal", message: `cutout kept only ${(coverage * 100).toFixed(1)}% of the frame` });
    return { ...normalized, background_removed: false, background_removal_skipped: "empty_result" };
  }

  return { ...finished, background_removed: true, opaque_coverage: coverage };
};

/**
 * Share of the frame that is not transparent. Used to catch a cutout that
 * erased the product along with its background.
 */
export const opaqueCoverage = async (buffer) => {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .resize(64, 64, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let opaque = 0;
  const pixels = info.width * info.height;
  for (let i = 0; i < pixels; i += 1) {
    if (data[i * info.channels + (info.channels - 1)] > 16) opaque += 1;
  }
  return pixels === 0 ? 0 : opaque / pixels;
};
