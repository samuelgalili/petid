// Q4 Gate2 — source is write-once and independent of Master (avatar_url).
// resolveQrSrc is TypeScript; this suite ports the same URL contract so
// `npm test --prefix server` covers it without a frontend test runner.

import assert from "node:assert/strict";
import test from "node:test";
import { applySourceImageOnCreate, applySourceImageOnUpdate } from "../src/petSourceImage.js";

const isValidHttpUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const isUsablePetImageSrc = (url) => {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (isValidHttpUrl(trimmed)) return true;
  if (trimmed.startsWith("/") && trimmed.length > 1) return true;
  if (trimmed.startsWith("data:image/")) return true;
  return false;
};

const resolveQrSrc = (sourceImageUrl, fallbackSrc) => (
  isUsablePetImageSrc(sourceImageUrl) ? sourceImageUrl.trim() : fallbackSrc
);

const DOG_ICON = "/assets/dog-official.svg";
const CAT_ICON = "/assets/cat-official.png";
const SOURCE = "https://cdn.example.com/source.jpg";
const MASTER = "https://cdn.example.com/master.jpg";
const DATA_SOURCE = "data:image/png;base64,aaa";

test("create with a photo and no source copies avatar_url into source (first photo)", () => {
  const payload = applySourceImageOnCreate({ name: "לוקה", avatar_url: SOURCE });
  assert.equal(payload.avatar_url, SOURCE);
  assert.equal(payload.source_image_url, SOURCE);
});

test("create with an explicit source keeps it and does not overwrite from avatar", () => {
  const payload = applySourceImageOnCreate({
    avatar_url: MASTER,
    source_image_url: SOURCE,
  });
  assert.equal(payload.avatar_url, MASTER);
  assert.equal(payload.source_image_url, SOURCE);
});

test("create without a photo leaves source null (no invented backfill)", () => {
  const payload = applySourceImageOnCreate({ name: "לוקה", avatar_url: null });
  assert.equal(payload.source_image_url, undefined);
});

test("updating Master must not overwrite an existing source", () => {
  const payload = applySourceImageOnUpdate(
    { avatar_url: MASTER, source_image_url: "https://evil.example/new.jpg" },
    SOURCE,
  );
  assert.equal(payload.avatar_url, MASTER);
  assert.equal(Object.prototype.hasOwnProperty.call(payload, "source_image_url"), false);
});

test("update may set source only when the current source is empty (first write)", () => {
  const payload = applySourceImageOnUpdate({ source_image_url: SOURCE }, null);
  assert.equal(payload.source_image_url, SOURCE);
});

test("update of avatar_url alone does not invent a source", () => {
  const payload = applySourceImageOnUpdate({ avatar_url: MASTER }, null);
  assert.equal(payload.avatar_url, MASTER);
  assert.equal(Object.prototype.hasOwnProperty.call(payload, "source_image_url"), false);
});

test("QA: source+Master → QR uses source, never Master", () => {
  assert.equal(resolveQrSrc(SOURCE, DOG_ICON), SOURCE);
  assert.notEqual(resolveQrSrc(SOURCE, DOG_ICON), MASTER);
});

test("QA: Master only → QR uses the type icon, never avatar_url", () => {
  assert.equal(resolveQrSrc(null, DOG_ICON), DOG_ICON);
  assert.equal(resolveQrSrc("", CAT_ICON), CAT_ICON);
  assert.notEqual(resolveQrSrc(null, DOG_ICON), MASTER);
});

test("QA: neither source nor Master → QR uses the type icon", () => {
  assert.equal(resolveQrSrc(undefined, DOG_ICON), DOG_ICON);
});

test("QA: data:image source is accepted in QR", () => {
  assert.equal(resolveQrSrc(DATA_SOURCE, DOG_ICON), DATA_SOURCE);
});

test("QA: invalid source falls back to the icon (garbage, empty, non-image data)", () => {
  assert.equal(resolveQrSrc("   ", DOG_ICON), DOG_ICON);
  assert.equal(resolveQrSrc("not-a-url", DOG_ICON), DOG_ICON);
  assert.equal(resolveQrSrc("data:text/plain;base64,aaa", DOG_ICON), DOG_ICON);
  assert.equal(resolveQrSrc("/", DOG_ICON), DOG_ICON);
});

test("site-relative source paths are accepted", () => {
  assert.equal(resolveQrSrc("/uploads/source.jpg", DOG_ICON), "/uploads/source.jpg");
});
