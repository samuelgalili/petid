import assert from "node:assert/strict";
import test from "node:test";
import {
  FixedWindowRateLimiter,
  contentTypeForSafeExtension,
  createOpaqueToken,
  decodeAndValidateDataUrl,
  hashOpaqueToken,
  verifyOpaqueToken,
} from "../src/security.js";

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

test("opaque access tokens verify only against their own hash", () => {
  const token = createOpaqueToken();
  assert.equal(verifyOpaqueToken(token, hashOpaqueToken(token)), true);
  assert.equal(verifyOpaqueToken(`${token}x`, hashOpaqueToken(token)), false);
});

test("upload validation derives a safe extension from verified bytes", () => {
  const result = decodeAndValidateDataUrl(`data:image/png;base64,${png.toString("base64")}`, {
    allowedContentTypes: new Set(["image/png"]),
    maxBytes: 1024,
  });
  assert.equal(result.contentType, "image/png");
  assert.equal(result.extension, ".png");
});

test("upload validation rejects HTML disguised as an image", () => {
  const html = Buffer.from("<script>location='https://example.invalid'</script>");
  assert.throws(
    () => decodeAndValidateDataUrl(`data:image/jpeg;base64,${html.toString("base64")}`, {
      allowedContentTypes: new Set(["image/jpeg"]),
      maxBytes: 1024,
    }),
    /does not match/,
  );
});

test("safe serving recognizes canonical and legacy image extensions", () => {
  assert.equal(contentTypeForSafeExtension(".jpg"), "image/jpeg");
  assert.equal(contentTypeForSafeExtension(".jpeg"), "image/jpeg");
  assert.equal(contentTypeForSafeExtension(".html"), null);
});

test("document validation rejects macro-bearing DOCX packages", () => {
  const macroDocx = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    Buffer.from("[Content_Types].xml word/document.xml word/vbaProject.bin"),
  ]);
  assert.throws(
    () => decodeAndValidateDataUrl(
      `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${macroDocx.toString("base64")}`,
      {
        allowedContentTypes: new Set(["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
        maxBytes: 1024,
      },
    ),
    /does not match/,
  );
});

test("fixed-window limiter rejects requests after the limit and resets", () => {
  const limiter = new FixedWindowRateLimiter();
  assert.equal(limiter.check("login:ip", { limit: 2, windowMs: 1000 }, 100).allowed, true);
  assert.equal(limiter.check("login:ip", { limit: 2, windowMs: 1000 }, 200).allowed, true);
  assert.equal(limiter.check("login:ip", { limit: 2, windowMs: 1000 }, 300).allowed, false);
  assert.equal(limiter.check("login:ip", { limit: 2, windowMs: 1000 }, 1200).allowed, true);
});
