import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const typeInfo = new Map([
  ["image/jpeg", { extension: ".jpg", validate: (buffer) => startsWith(buffer, [0xff, 0xd8, 0xff]) }],
  ["image/png", { extension: ".png", validate: (buffer) => startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) }],
  ["image/webp", { extension: ".webp", validate: (buffer) => asciiAt(buffer, 0, "RIFF") && asciiAt(buffer, 8, "WEBP") }],
  ["image/gif", { extension: ".gif", validate: (buffer) => asciiAt(buffer, 0, "GIF87a") || asciiAt(buffer, 0, "GIF89a") }],
  ["image/heic", { extension: ".heic", validate: (buffer) => hasIsoBrand(buffer, new Set(["heic", "heix", "hevc", "hevx"])) }],
  ["image/heif", { extension: ".heif", validate: (buffer) => hasIsoBrand(buffer, new Set(["mif1", "msf1", "heic", "heix"])) }],
  ["video/mp4", { extension: ".mp4", validate: (buffer) => asciiAt(buffer, 4, "ftyp") && !asciiAt(buffer, 8, "qt  ") }],
  ["video/quicktime", { extension: ".mov", validate: (buffer) => asciiAt(buffer, 4, "ftyp") && asciiAt(buffer, 8, "qt  ") }],
  ["video/webm", { extension: ".webm", validate: (buffer) => startsWith(buffer, [0x1a, 0x45, 0xdf, 0xa3]) }],
  ["application/pdf", { extension: ".pdf", validate: (buffer) => asciiAt(buffer, 0, "%PDF-") }],
  ["text/plain", { extension: ".txt", validate: isPlainText }],
  ["application/msword", { extension: ".doc", validate: (buffer) => startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) }],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", {
    extension: ".docx",
    validate: isSafeDocx,
  }],
]);

function startsWith(buffer, bytes) {
  if (buffer.length < bytes.length) return false;
  return bytes.every((byte, index) => buffer[index] === byte);
}

function asciiAt(buffer, offset, value) {
  return buffer.length >= offset + value.length && buffer.subarray(offset, offset + value.length).toString("ascii") === value;
}

function hasIsoBrand(buffer, acceptedBrands) {
  if (!asciiAt(buffer, 4, "ftyp") || buffer.length < 12) return false;
  for (let offset = 8; offset + 4 <= Math.min(buffer.length, 32); offset += 4) {
    if (acceptedBrands.has(buffer.subarray(offset, offset + 4).toString("ascii"))) return true;
  }
  return false;
}

function isPlainText(buffer) {
  if (buffer.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return true;
  } catch {
    return false;
  }
}

function isSafeDocx(buffer) {
  if (!startsWith(buffer, [0x50, 0x4b, 0x03, 0x04])) return false;
  const packageText = buffer.toString("latin1");
  return packageText.includes("[Content_Types].xml")
    && packageText.includes("word/document.xml")
    && !packageText.toLowerCase().includes("vbaproject.bin");
}

export const createOpaqueToken = () => randomBytes(32).toString("base64url");

export const hashOpaqueToken = (token) => createHash("sha256").update(String(token || "")).digest("hex");

export const verifyOpaqueToken = (token, expectedHash) => {
  if (!token || !expectedHash || String(token).length > 256) return false;
  const actual = Buffer.from(hashOpaqueToken(token));
  const expected = Buffer.from(String(expectedHash));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

export const extensionForContentType = (contentType) => typeInfo.get(String(contentType || "").toLowerCase())?.extension || null;

export const contentTypeForSafeExtension = (extension) => {
  const normalized = String(extension || "").toLowerCase();
  if (normalized === ".jpeg") return "image/jpeg";
  if (normalized === ".qt") return "video/quicktime";
  for (const [contentType, info] of typeInfo) {
    if (info.extension === normalized) return contentType;
  }
  return null;
};

export const decodeAndValidateDataUrl = (dataUrl, { allowedContentTypes, maxBytes, requireImage = false } = {}) => {
  const match = typeof dataUrl === "string" ? dataUrl.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/) : null;
  if (!match) throw Object.assign(new Error("A valid base64 data URL is required"), { statusCode: 400 });

  const contentType = match[1].trim().toLowerCase();
  const info = typeInfo.get(contentType);
  if (!info || (requireImage && !contentType.startsWith("image/")) || (allowedContentTypes && !allowedContentTypes.has(contentType))) {
    throw Object.assign(new Error("Unsupported file type"), { statusCode: 415 });
  }

  const encoded = match[2].replace(/\s/g, "");
  if (!encoded || encoded.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
    throw Object.assign(new Error("Invalid base64 file data"), { statusCode: 400 });
  }

  const buffer = Buffer.from(encoded, "base64");
  if (buffer.length === 0) throw Object.assign(new Error("Uploaded file is empty"), { statusCode: 400 });
  if (Number.isFinite(maxBytes) && buffer.length > maxBytes) {
    throw Object.assign(new Error("File is too large"), { statusCode: 413 });
  }
  if (!info.validate(buffer)) {
    throw Object.assign(new Error("File content does not match its declared type"), { statusCode: 415 });
  }

  return { buffer, contentType, extension: info.extension };
};

export class FixedWindowRateLimiter {
  constructor() {
    this.entries = new Map();
    this.lastCleanupAt = 0;
  }

  check(key, { limit, windowMs }, now = Date.now()) {
    if (now - this.lastCleanupAt > 5 * 60 * 1000) this.cleanup(now);
    const existing = this.entries.get(key);
    if (!existing || existing.resetAt <= now) {
      const result = { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
      this.entries.set(key, { count: 1, resetAt: result.resetAt });
      return result;
    }

    if (existing.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: existing.resetAt };
    }

    existing.count += 1;
    return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
  }

  cleanup(now = Date.now()) {
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key);
    }
    this.lastCleanupAt = now;
  }
}
