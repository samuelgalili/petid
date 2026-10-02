import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

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

  // Look only. Login uses this so a request that has not failed yet does not
  // consume a slot, and a blocked window still reports when it ends.
  isBlocked(key, { limit }, now = Date.now()) {
    if (now - this.lastCleanupAt > 5 * 60 * 1000) this.cleanup(now);
    const existing = this.entries.get(key);
    if (!existing || existing.resetAt <= now) return { blocked: false, resetAt: now };
    if (existing.count >= limit) return { blocked: true, resetAt: existing.resetAt };
    return { blocked: false, resetAt: existing.resetAt };
  }

  reset(key) {
    this.entries.delete(key);
  }

  cleanup(now = Date.now()) {
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key);
    }
    this.lastCleanupAt = now;
  }
}

// The rightmost forwarded hop, otherwise the socket. Callers that append to
// X-Forwarded-For can set the left side to anything; the proxy in front of
// this process (Caddy replaces the header with the address it accepted) is
// the hop that is kept. Session rows store that address unchanged.
export const trustedClientHop = (forwardedFor, remoteAddress) => {
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    const hops = forwardedFor.split(",").map((hop) => hop.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }
  if (typeof remoteAddress === "string" && remoteAddress.trim()) return remoteAddress.trim();
  return null;
};

// Rate-limit key for an address. IPv4 is itself. IPv4-mapped IPv6 (::ffff:a.b.c.d)
// is the same IPv4, not a /64 — masking those would put every IPv4 client in
// one bucket. A real IPv6 address is its /64: a household prefix is 2^64
// addresses, and each one would otherwise be its own limit.
export const normalizeClientIp = (value) => {
  const parsed = parseClientIp(value);
  if (!parsed) return null;
  if (parsed.kind === "ipv4") return parsed.address;
  return `${parsed.prefix.map((part) => part.toString(16).padStart(4, "0")).join(":")}/64`;
};

export const clientAddressForRateLimit = (forwardedFor, remoteAddress) => (
  normalizeClientIp(trustedClientHop(forwardedFor, remoteAddress)) || "unknown"
);

// Email keys are attacker-controlled and used to live for the whole window
// at whatever length the body allowed. 254 is the longest address a mail
// system will carry, and it caps the map entry.
export const RATE_LIMIT_IDENTITY_MAX = 254;

export const rateLimitIdentity = (value) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return "unknown";
  return normalized.slice(0, RATE_LIMIT_IDENTITY_MAX);
};

// Count a login only when it fails. A success clears the account bucket so
// the owner's own sign-ins never add up to a lockout. The address bucket is
// shared, so a success leaves it alone.
export const beginLoginAttempt = (limiter, { ipKey, emailKey }, options, now = Date.now()) => {
  const ip = limiter.isBlocked(ipKey, options, now);
  if (ip.blocked) return { allowed: false, resetAt: ip.resetAt };
  const email = limiter.isBlocked(emailKey, options, now);
  if (email.blocked) return { allowed: false, resetAt: email.resetAt };
  return {
    allowed: true,
    succeed() {
      limiter.reset(emailKey);
    },
    fail(at = now) {
      limiter.check(ipKey, options, at);
      limiter.check(emailKey, options, at);
    },
  };
};

const IPV4_TAIL = /^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/;

const parseClientIp = (value) => {
  if (value == null) return null;
  let text = String(value).trim().toLowerCase();
  if (!text) return null;
  if (text.startsWith("[")) {
    const end = text.indexOf("]");
    if (end <= 1) return null;
    text = text.slice(1, end);
  }
  const zone = text.indexOf("%");
  if (zone !== -1) text = text.slice(0, zone);
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(text)) {
    text = text.slice(0, text.lastIndexOf(":"));
  }
  if (isIP(text) === 4) return { kind: "ipv4", address: text };
  if (isIP(text) !== 6) return null;

  let expanded = text;
  const embedded = expanded.match(IPV4_TAIL);
  if (embedded && isIP(embedded[2]) === 4) {
    const [a, b, c, d] = embedded[2].split(".").map((octet) => Number(octet));
    expanded = `${embedded[1]}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }

  const halves = expanded.split("::");
  if (halves.length > 2) return null;
  const toGroups = (side) => {
    if (side === "") return [];
    const groups = [];
    for (const part of side.split(":")) {
      if (!/^[0-9a-f]{1,4}$/.test(part)) return null;
      groups.push(Number.parseInt(part, 16));
    }
    return groups;
  };

  let groups;
  if (halves.length === 1) {
    groups = toGroups(halves[0]);
    if (!groups || groups.length !== 8) return null;
  } else {
    const left = toGroups(halves[0]);
    const right = toGroups(halves[1]);
    if (!left || !right) return null;
    const missing = 8 - left.length - right.length;
    if (missing < 1) return null;
    groups = [...left, ...Array(missing).fill(0), ...right];
  }

  const mapped = groups[0] === 0 && groups[1] === 0 && groups[2] === 0
    && groups[3] === 0 && groups[4] === 0 && groups[5] === 0xffff;
  if (mapped) {
    return {
      kind: "ipv4",
      address: `${groups[6] >> 8}.${groups[6] & 0xff}.${groups[7] >> 8}.${groups[7] & 0xff}`,
    };
  }
  return { kind: "ipv6", prefix: groups.slice(0, 4) };
};
