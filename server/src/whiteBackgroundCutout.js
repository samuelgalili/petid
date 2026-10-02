// Cut a near-white studio background out of a product photograph.
//
// The shop card is white in light mode. In dark mode the global rule
// `.dark .bg-white` repaints that card, and a photograph whose background was
// baked to opaque white becomes a white rectangle. Flood-filling from the
// border removes only the white that is connected to the outside of the frame,
// so a white cap, a white label or the white face of a bag stays if a darker
// edge or another colour closes it off from the border.
//
// This step refuses a result that would eat the product. Two cases produce the
// same report line, because both want the same fallback (a light tile behind
// the photograph, not a cutout):
//
//   * white that is reachable from the border is the same colour as white that
//     belongs to the product, and the flood crossed into it
//   * the flood would clear more than the configured share of the picture
//
// Nothing here talks to the database or to object storage. Callers that want
// to keep a result do that themselves, and only after an explicit apply.

import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import sharp from "sharp";

export const SKIP_REASON = "needs separate handling (light tile behind image)";

export const DEFAULT_CUTOUT_OPTIONS = Object.freeze({
  tolerance: 36,
  flatTolerance: 14,
  softBand: 42,
  maxSaturation: 42,
  edgeLimit: 18,
  maxRemovedRatio: 0.975,
  minInsideRatio: 0.02,
  maxInsideEatenRatio: 0.35,
  minComponentPixelsRatio: 0.0015,
  fragmentCount: 8,
  minLargestShare: 0.45,
  bandWidth: 16,
  bandFactor: 3.5,
  minBandRatio: 0.12,
});

const LIGHT_BORDER_LUMINANCE = 190;

const clampByte = (value) => Math.max(0, Math.min(255, Math.round(value)));

const smoothstep = (value) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

const luminanceOf = (r, g, b) => r * 0.2126 + g * 0.7152 + b * 0.0722;

const medianOf = (values) => {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

// `enter(index, fromIndex)` decides whether the flood may step into a pixel.
// fromIndex is -1 for a border seed. A thin darker outline has almost no
// gradient on the outline pixel itself (both sides match), so the barrier is
// the jump from the pixel we are leaving.
const floodFromBorder = (width, height, enter) => {
  const count = width * height;
  const mask = new Uint8Array(count);
  const queue = new Int32Array(count);
  let tail = 0;

  const push = (x, y, fromIndex) => {
    const index = y * width + x;
    if (mask[index] || !enter(index, fromIndex)) return;
    mask[index] = 1;
    queue[tail] = index;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    push(x, 0, -1);
    if (height > 1) push(x, height - 1, -1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    push(0, y, -1);
    if (width > 1) push(width - 1, y, -1);
  }

  for (let head = 0; head < tail; head += 1) {
    const index = queue[head];
    const x = index % width;
    const y = (index - x) / width;
    if (x > 0) push(x - 1, y, index);
    if (x + 1 < width) push(x + 1, y, index);
    if (y > 0) push(x, y - 1, index);
    if (y + 1 < height) push(x, y + 1, index);
  }

  return mask;
};

const countMask = (mask) => {
  let count = 0;
  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index]) count += 1;
  }
  return count;
};

// White that belongs to the product is the white that cannot reach the border
// without crossing the product. A one-pixel gap still counts as closed: a hairline
// breach is how a flood slips into a bag, and the studio margin itself always
// touches the border so it is not counted.
const enclosedEaten = (mask, isInk, width, height) => {
  const count = width * height;
  const sealed = new Uint8Array(isInk);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (!isInk[index]) continue;
      if (x > 0) sealed[index - 1] = 1;
      if (x + 1 < width) sealed[index + 1] = 1;
      if (y > 0) sealed[index - width] = 1;
      if (y + 1 < height) sealed[index + width] = 1;
    }
  }

  const outside = floodFromBorder(width, height, (index) => sealed[index] === 0);
  let inside = 0;
  let eaten = 0;
  for (let index = 0; index < count; index += 1) {
    if (sealed[index] || outside[index]) continue;
    inside += 1;
    if (mask[index]) eaten += 1;
  }
  return { inside, eaten };
};

const connectedSizes = (mask, width, height, minSize) => {
  const count = width * height;
  const seen = new Uint8Array(count);
  const queue = new Int32Array(count);
  const sizes = [];

  for (let start = 0; start < count; start += 1) {
    if (mask[start] || seen[start]) continue;
    let tail = 0;
    let size = 0;
    seen[start] = 1;
    queue[tail] = start;
    tail += 1;
    for (let head = 0; head < tail; head += 1) {
      const index = queue[head];
      size += 1;
      const x = index % width;
      const y = (index - x) / width;
      const visit = (nx, ny) => {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) return;
        const next = ny * width + nx;
        if (mask[next] || seen[next]) return;
        seen[next] = 1;
        queue[tail] = next;
        tail += 1;
      };
      visit(x - 1, y);
      visit(x + 1, y);
      visit(x, y - 1);
      visit(x, y + 1);
    }
    if (size >= minSize) sizes.push(size);
  }

  sizes.sort((a, b) => b - a);
  return sizes;
};

const chamferToInk = (isInk, width, height) => {
  const count = width * height;
  const distance = new Uint16Array(count);
  distance.fill(65535);
  for (let index = 0; index < count; index += 1) {
    if (isInk[index]) distance[index] = 0;
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (x > 0) distance[index] = Math.min(distance[index], distance[index - 1] + 1);
      if (y > 0) distance[index] = Math.min(distance[index], distance[index - width] + 1);
    }
  }
  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = width - 1; x >= 0; x -= 1) {
      const index = y * width + x;
      if (x + 1 < width) distance[index] = Math.min(distance[index], distance[index + 1] + 1);
      if (y + 1 < height) distance[index] = Math.min(distance[index], distance[index + width] + 1);
    }
  }
  return distance;
};

// A clean cut has a thin ring of background next to the product. When the
// product itself is the background colour and the flood reached it, that
// "ring" is much thicker than the outline of whatever ink was left.
const colourBandOverflow = (mask, isInk, width, height, options) => {
  const count = width * height;
  const distance = chamferToInk(isInk, width, height);
  let boundary = 0;
  let band = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (!mask[index]) {
        const touchesFlood = (x > 0 && mask[index - 1])
          || (x + 1 < width && mask[index + 1])
          || (y > 0 && mask[index - width])
          || (y + 1 < height && mask[index + width]);
        if (touchesFlood) boundary += 1;
        continue;
      }
      const away = distance[index];
      if (away > 1 && away <= options.bandWidth) band += 1;
    }
  }
  const expected = boundary * options.bandWidth;
  return {
    band,
    boundary,
    overflow: expected > 0
      && band > expected * options.bandFactor
      && band / count >= options.minBandRatio,
  };
};

const encodeCutout = async (data, width, height) => {
  const raw = { width, height, channels: 4 };
  const png = await sharp(data, { raw }).png().toBuffer();
  const webp = await sharp(data, { raw }).webp({ quality: 90, alphaQuality: 100 }).toBuffer();
  return { png, webp };
};

const applyAlpha = (data, width, height, mask, dist, ref, options) => {
  const count = width * height;
  const alpha = new Uint8Array(count);
  alpha.fill(255);
  const channels = 4;
  const fringe = new Uint8Array(count);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (mask[index]) {
        alpha[index] = 0;
        continue;
      }
      const touches = (x > 0 && mask[index - 1])
        || (x + 1 < width && mask[index + 1])
        || (y > 0 && mask[index - width])
        || (y + 1 < height && mask[index + width]);
      if (touches) fringe[index] = 1;
    }
  }

  const start = options.flatTolerance;
  const end = options.tolerance + options.softBand;
  const span = Math.max(1, end - start);

  for (let index = 0; index < count; index += 1) {
    if (!fringe[index]) continue;
    const distance = dist[index];
    if (distance >= end) continue;
    const coverage = smoothstep((distance - start) / span);
    const next = clampByte(255 * coverage);
    alpha[index] = next;
    if (next === 0 || next === 255) continue;
    const opacity = next / 255;
    const offset = index * channels;
    for (let channel = 0; channel < 3; channel += 1) {
      const source = data[offset + channel];
      const restored = (source - ref[channel] * (1 - opacity)) / opacity;
      data[offset + channel] = clampByte(restored);
    }
  }

  for (let index = 0; index < count; index += 1) {
    const offset = index * channels + 3;
    data[offset] = Math.min(data[offset], alpha[index]);
  }
};

/**
 * Remove a light background that touches the border.
 *
 * @returns {Promise<{
 *   status: "cut" | "skipped" | "failed",
 *   reason: string | null,
 *   cause: string | null,
 *   stats: object,
 *   png: Buffer | null,
 *   webp: Buffer | null,
 *   rejectedPng: Buffer | null,
 * }>}
 */
export const cutoutWhiteBackground = async (buffer, options = {}) => {
  const settings = { ...DEFAULT_CUTOUT_OPTIONS, ...options };
  const failed = (cause, reason = cause) => ({
    status: cause === "undecodable" ? "failed" : "skipped",
    reason,
    cause,
    stats: {},
    png: null,
    webp: null,
    rejectedPng: null,
  });

  let decoded;
  try {
    decoded = await sharp(buffer, { failOn: "none" })
      .rotate()
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
  } catch {
    return failed("undecodable");
  }

  const { data, info } = decoded;
  const { width, height, channels } = info;
  if (!width || !height || channels < 4) return failed("undecodable");
  if (width * height > 12_000_000) return failed("too_large", "image is too large to cut out locally");

  const count = width * height;
  const borderR = [];
  const borderG = [];
  const borderB = [];
  const sampleBorder = (x, y) => {
    const offset = (y * width + x) * channels;
    borderR.push(data[offset]);
    borderG.push(data[offset + 1]);
    borderB.push(data[offset + 2]);
  };
  for (let x = 0; x < width; x += 1) {
    sampleBorder(x, 0);
    if (height > 1) sampleBorder(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    sampleBorder(0, y);
    if (width > 1) sampleBorder(width - 1, y);
  }

  const ref = [medianOf(borderR), medianOf(borderG), medianOf(borderB)];
  const borderLuminance = luminanceOf(ref[0], ref[1], ref[2]);
  if (borderLuminance < LIGHT_BORDER_LUMINANCE) {
    return failed("not_light_border", "border is not a light background");
  }

  const dist = new Uint16Array(count);
  const sat = new Uint16Array(count);
  const grad = new Uint16Array(count);
  const lum = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    const offset = index * channels;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    dist[index] = Math.max(Math.abs(r - ref[0]), Math.abs(g - ref[1]), Math.abs(b - ref[2]));
    sat[index] = Math.max(r, g, b) - Math.min(r, g, b);
    lum[index] = luminanceOf(r, g, b);
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const x0 = x > 0 ? x - 1 : x;
      const x1 = x + 1 < width ? x + 1 : x;
      const y0 = y > 0 ? y - 1 : y;
      const y1 = y + 1 < height ? y + 1 : y;
      const gx = lum[y * width + x1] - lum[y * width + x0];
      const gy = lum[y1 * width + x] - lum[y0 * width + x];
      grad[index] = Math.min(65535, Math.round(Math.hypot(gx, gy)));
    }
  }

  const transparentEnough = (index) => data[index * channels + 3] < 16;
  const colourMatch = (index) => dist[index] <= settings.tolerance && sat[index] <= settings.maxSaturation;
  const canEnter = (index, fromIndex) => {
    if (transparentEnough(index)) return true;
    if (!colourMatch(index)) return false;
    if (dist[index] <= settings.flatTolerance) return true;
    if (fromIndex < 0) return grad[index] <= settings.edgeLimit;
    return Math.abs(lum[index] - lum[fromIndex]) <= settings.edgeLimit;
  };
  const looseEnter = (index) => transparentEnough(index) || colourMatch(index);

  const mask = floodFromBorder(width, height, canEnter);
  const loose = floodFromBorder(width, height, looseEnter);
  const removed = countMask(mask);
  const removedRatio = removed / count;
  const looseRemovedRatio = countMask(loose) / count;

  const isInk = new Uint8Array(count);
  let enclosedWhite = 0;
  for (let index = 0; index < count; index += 1) {
    const keptNearWhite = !mask[index] && dist[index] <= settings.tolerance;
    if (keptNearWhite) enclosedWhite += 1;
    if (!mask[index] && dist[index] > settings.flatTolerance && !transparentEnough(index)) {
      isInk[index] = 1;
    }
  }

  const enclosure = enclosedEaten(mask, isInk, width, height);
  const minComponent = Math.max(8, Math.round(count * settings.minComponentPixelsRatio));
  const sizes = connectedSizes(mask, width, height, minComponent);
  const largest = sizes[0] || 0;
  const remaining = count - removed;
  const largestShare = remaining > 0 ? largest / remaining : 0;
  const band = colourBandOverflow(mask, isInk, width, height, settings);

  const stats = {
    width,
    height,
    removedRatio,
    looseRemovedRatio,
    protectedByEdge: looseRemovedRatio - removedRatio > 0.04,
    enclosedWhiteRatio: enclosedWhite / count,
    inside: enclosure.inside,
    eatenInside: enclosure.eaten,
    componentCount: sizes.length,
    largestComponentShare: largestShare,
    colourBand: band.band,
    borderLuminance,
    maxRemovedRatio: settings.maxRemovedRatio,
  };

  let cause = null;
  if (removedRatio > settings.maxRemovedRatio) cause = "removed_share";
  else if (enclosure.inside / count >= settings.minInsideRatio
    && enclosure.eaten / Math.max(1, enclosure.inside) > settings.maxInsideEatenRatio) {
    cause = "shared_colour";
  } else if (sizes.length >= settings.fragmentCount && largestShare < settings.minLargestShare) {
    cause = "shared_colour";
  } else if (band.overflow) cause = "shared_colour";

  applyAlpha(data, width, height, mask, dist, ref, settings);
  const encoded = await encodeCutout(data, width, height);

  if (cause) {
    return {
      status: "skipped",
      reason: SKIP_REASON,
      cause,
      stats,
      png: null,
      webp: null,
      rejectedPng: encoded.png,
    };
  }

  return {
    status: "cut",
    reason: null,
    cause: null,
    stats,
    png: encoded.png,
    webp: encoded.webp,
    rejectedPng: null,
  };
};

export const compositeOnBackground = async (buffer, background) => {
  const meta = await sharp(buffer).metadata();
  return sharp({
    create: {
      width: meta.width,
      height: meta.height,
      channels: 3,
      background,
    },
  }).composite([{ input: buffer, gravity: "centre" }]).png().toBuffer();
};

const fitOnBackground = async (buffer, cell, background) => {
  const fitted = await sharp(buffer)
    .resize(cell, cell, { fit: "contain", background: { ...background, alpha: 1 } })
    .png()
    .toBuffer();
  return fitted;
};

const renderLabel = async (text, width, height) => {
  const plain = String(text || "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (!plain) return null;
  try {
    return await sharp({
      text: {
        text: plain,
        font: "Noto Serif Hebrew",
        fontfile: "/usr/share/fonts/truetype/noto/NotoSerifHebrew-Regular.ttf",
        width,
        height,
        align: "right",
        rgba: true,
      },
    }).png().toBuffer();
  } catch {
    return null;
  }
};

export const DARK_CARD = Object.freeze({ r: 22, g: 26, b: 29 });

/**
 * Before | after contact sheet. `after` is drawn on the dark card colour so a
 * transparent background is visible. A skipped row still shows the rejected
 * cut when one was produced, and the label says so.
 */
export const buildContactSheet = async (items, { cell = 240 } = {}) => {
  const pad = 10;
  const labelH = 32;
  const rowH = cell + labelH + pad;
  const width = cell * 2 + pad * 3;
  const height = Math.max(1, items.length) * rowH + pad;
  const composites = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const top = pad + index * rowH;
    const before = await fitOnBackground(item.before, cell, { r: 255, g: 255, b: 255 });
    const afterSource = item.after || item.before;
    const after = await fitOnBackground(afterSource, cell, DARK_CARD);
    composites.push({ input: before, left: pad, top: top + labelH });
    composites.push({ input: after, left: pad * 2 + cell, top: top + labelH });
    const label = await renderLabel(item.label || "", width - pad * 2, labelH);
    if (label) composites.push({ input: label, left: pad, top });
  }

  return sharp({
    create: { width, height, channels: 3, background: { r: 244, g: 244, b: 246 } },
  }).composite(composites).png().toBuffer();
};

export const parseProductCsv = (text) => {
  const source = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    if (row.length === 1 && row[0] === "") {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      pushField();
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      pushField();
      pushRow();
      continue;
    }
    field += char;
  }
  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }

  if (rows.length === 0) return [];
  const header = rows[0].map((name) => name.trim());
  return rows.slice(1).filter((cells) => cells.some((cell) => cell.trim() !== "")).map((cells) => {
    const record = {};
    header.forEach((name, index) => {
      record[name] = cells[index] ?? "";
    });
    return record;
  });
};

export const selectProducts = (rows, { ids, limit } = {}) => {
  let chosen = rows;
  if (ids && ids.length > 0) {
    const wanted = new Set(ids.map((id) => String(id).toLowerCase()));
    chosen = rows.filter((row) => wanted.has(String(row.id || "").toLowerCase()));
  }
  if (Number.isFinite(limit) && limit > 0) chosen = chosen.slice(0, limit);
  return chosen;
};

export const resolvePublicImageUrl = (imageUrl, origin = "https://mipo.pet") => {
  const value = String(imageUrl || "").trim();
  if (!value) {
    throw Object.assign(new Error("missing image url"), { code: "BAD_URL" });
  }
  let url;
  try {
    url = value.startsWith("/") ? new URL(value, origin) : new URL(value);
  } catch {
    throw Object.assign(new Error("invalid image url"), { code: "BAD_URL" });
  }
  if (url.username || url.password) {
    throw Object.assign(new Error("image url must not carry credentials"), { code: "BAD_URL" });
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw Object.assign(new Error("image url must be http or https"), { code: "BAD_URL" });
  }
  return url.toString();
};

export const safeObjectKey = (key) => {
  const normalized = String(key || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.split("/").some((part) => part === "" || part === "." || part === "..")) {
    return null;
  }
  if (!/^[a-zA-Z0-9._/-]+$/.test(normalized)) return null;
  return normalized;
};

export const objectKeyFromImageUrl = (imageUrl) => {
  const value = String(imageUrl || "").trim();
  if (!value.startsWith("/uploads/")) return null;
  return safeObjectKey(value.slice("/uploads/".length));
};

export const backupKeyFor = (originalKey) => `cutout-backup/${originalKey}`;

export const cutoutKeyFor = (originalKey, id = randomUUID()) => {
  const parsed = path.posix.parse(originalKey);
  const safeId = String(id).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 80) || randomUUID();
  return `cutout-new/${parsed.name}-${safeId}.webp`;
};

const APPLY_CONFIRM = "write-new-object-keep-original";

/**
 * --apply is refused unless the operator set both of these. They are not app
 * configuration and they are not read on a dry run.
 */
export const assertApplyAllowed = (env = process.env) => {
  const confirm = env.CUTOUT_APPLY_CONFIRM;
  const root = env.CUTOUT_OBJECT_ROOT;
  if (confirm !== APPLY_CONFIRM || !root || !path.isAbsolute(root)) {
    return {
      ok: false,
      message: "Refusing --apply. Set CUTOUT_APPLY_CONFIRM=write-new-object-keep-original and an absolute CUTOUT_OBJECT_ROOT. Nothing was written.",
    };
  }
  return { ok: true, root };
};

export const createFilesystemObjectStore = (root) => {
  const base = path.resolve(root);
  const fullPath = (key) => {
    const safe = safeObjectKey(key);
    if (!safe) throw Object.assign(new Error(`refusing key ${key}`), { code: "BAD_KEY" });
    const full = path.resolve(base, safe);
    if (full !== base && !full.startsWith(`${base}${path.sep}`)) {
      throw Object.assign(new Error(`refusing key ${key}`), { code: "BAD_KEY" });
    }
    return full;
  };

  return {
    async read(key) {
      return readFile(fullPath(key));
    },
    async copy(fromKey, toKey) {
      const from = fullPath(fromKey);
      const to = fullPath(toKey);
      await mkdir(path.dirname(to), { recursive: true });
      await copyFile(from, to, fsConstants.COPYFILE_EXCL);
    },
    async putNew(key, bytes) {
      const to = fullPath(key);
      await mkdir(path.dirname(to), { recursive: true });
      await writeFile(to, bytes, { flag: "wx" });
    },
  };
};

/**
 * Copy each original object to a backup key, then write the cutout under a new
 * key. The original key is never overwritten and nothing is deleted.
 */
export const applyCutoutObjects = async ({ store, items }) => {
  const entries = [];
  for (const item of items) {
    if (item.status !== "cut") continue;
    const originalKey = safeObjectKey(item.originalKey);
    if (!originalKey) throw Object.assign(new Error("original key is not safe"), { code: "BAD_KEY" });
    if (!item.bytes || item.bytes.length === 0) {
      throw Object.assign(new Error("refusing to write an empty object"), { code: "EMPTY" });
    }
    const backupKey = backupKeyFor(originalKey);
    const newKey = safeObjectKey(item.newKey) || cutoutKeyFor(originalKey, item.id);
    const before = await store.read(originalKey);
    await store.copy(originalKey, backupKey);
    const afterCopy = await store.read(originalKey);
    if (!before.equals(afterCopy)) {
      throw Object.assign(new Error("original object changed during backup"), { code: "ORIGINAL_CHANGED" });
    }
    await store.putNew(newKey, item.bytes);
    const afterWrite = await store.read(originalKey);
    if (!before.equals(afterWrite)) {
      throw Object.assign(new Error("original object changed during write"), { code: "ORIGINAL_CHANGED" });
    }
    entries.push({
      originalKey,
      backupKey,
      newKey,
      originalBytes: before.length,
      newBytes: item.bytes.length,
    });
  }
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    note: "originalKey was copied to backupKey and left in place. newKey is an additional object. Revert by ignoring newKey; the bytes at originalKey were not changed. backupKey is a second copy of those bytes.",
    entries,
  };
};
