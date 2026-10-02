// How a failed character generation is named, and what is allowed into the log.
//
// The screen, the database and the log have to agree on the code, because a
// dead model, a background that was not the requested colour, and a file that
// is not an image are different faults with different sentences. The log is
// the only place the numbers survive, and it must not survive with the
// photograph, the prompt, the pet's name or a credential attached.

import assert from "node:assert/strict";
import test from "node:test";

import { createGeminiBackgroundRemover } from "../src/backgroundRemoval.js";
import {
  apiErrorDiagnostic,
  characterErrorCode,
  logGenerationFailure,
  redactGenerationDiagnostic,
  summarizeImageResponse,
} from "../src/petCharacterDiagnostics.js";

const coded = (code, message, extra = {}) => Object.assign(new Error(message), { code, ...extra });

test("character failures keep distinct public codes", () => {
  assert.equal(
    characterErrorCode(coded("INVALID_REFERENCE_PHOTOS", "two animals")),
    "invalid_reference_photos",
  );
  assert.equal(
    characterErrorCode(coded("REFERENCE_PHOTOS_FACE_ONLY", "face only")),
    "reference_photos_face_only",
  );
  assert.equal(
    characterErrorCode(coded("NO_GENERATED_IMAGE", "The AI provider returned no generated image")),
    "generation_blocked",
  );
  assert.equal(
    characterErrorCode(coded("INCONSISTENT_CHARACTER_PACK", "drift")),
    "generation_inconsistent",
  );
  assert.equal(
    characterErrorCode(coded("BACKGROUND_NOT_KEYABLE", "colour", {
      details: { reason: "background_not_keyable", keyedBorder: 0.12 },
    })),
    "background_not_keyable",
  );
  assert.equal(
    characterErrorCode(coded("GENERATED_IMAGE_NOT_TRANSPARENT", "opaque", {
      details: { reason: "background_not_keyable", keyedBorder: 0.4 },
    })),
    "background_not_keyable",
  );
  assert.equal(
    characterErrorCode(coded("UNDECODABLE_IMAGE", "corrupt")),
    "undecodable",
  );
  assert.equal(
    characterErrorCode(coded("GENERATED_IMAGE_NOT_TRANSPARENT", "corrupt", {
      details: { reason: "undecodable" },
    })),
    "undecodable",
  );
  assert.equal(
    characterErrorCode(coded("OPAQUE_CORNERS", "still solid", {
      details: { reason: "keyed_but_opaque_corners", corners: [255, 255, 255, 255] },
    })),
    "opaque_corners",
  );
  assert.equal(
    characterErrorCode(coded("GENERATED_IMAGE_NOT_TRANSPARENT", "older row")),
    "generation_not_transparent",
  );
  assert.equal(characterErrorCode(new Error("socket hang up")), "generation_failed");
});

test("a missing or retired model is not a generic generation failure", () => {
  assert.equal(characterErrorCode(Object.assign(new Error("not found"), { status: 404 })), "model_unavailable");
  assert.equal(
    characterErrorCode(Object.assign(new Error("publisher model was not found"), { status: "NOT_FOUND" })),
    "model_unavailable",
  );
  assert.equal(
    characterErrorCode(new Error("models/gemini-2.5-flash-image is not found for API version v1beta")),
    "model_unavailable",
  );
  assert.equal(
    characterErrorCode(new Error("gemini-2.5-flash-image has been deprecated and is no longer available")),
    "model_unavailable",
  );
  assert.equal(
    characterErrorCode(Object.assign(new Error('{"error":{"code":404,"status":"NOT_FOUND","message":"model shut down"}}'), {})),
    "model_unavailable",
  );
  assert.equal(
    characterErrorCode(Object.assign(new Error("permission denied for this model"), { status: 403 })),
    "model_unavailable",
  );
  assert.equal(
    characterErrorCode(Object.assign(new Error("invalid api key"), { status: 403 })),
    "generation_failed",
  );
});

test("quota and server errors stay temporarily unavailable", () => {
  assert.equal(characterErrorCode(new Error("429 resource exhausted")), "temporarily_unavailable");
  assert.equal(characterErrorCode(new Error("quota exceeded")), "temporarily_unavailable");
  assert.equal(characterErrorCode(Object.assign(new Error("unavailable"), { status: 503 })), "temporarily_unavailable");
  assert.equal(characterErrorCode(Object.assign(new Error("bad gateway"), { statusCode: 502 })), "temporarily_unavailable");
  assert.equal(characterErrorCode(new Error("503 Service Unavailable")), "temporarily_unavailable");
});

test("image bytes stuffed into an error do not decide the code", () => {
  const error = coded("UNRELATED", "the request failed", {
    details: { data: `${"A".repeat(80)}NOT_FOUND` },
  });
  delete error.code;
  assert.equal(characterErrorCode(error), "generation_failed");
});

test("a response summary counts the image and does not keep it", () => {
  const petName = "Buddy";
  const bytes = Buffer.from("not-a-real-image-but-bytes");
  const summary = summarizeImageResponse({
    candidates: [{
      finishReason: "STOP",
      content: {
        parts: [
          { text: `hello ${petName}, this prompt must not be logged` },
          { inlineData: { mimeType: "image/png", data: bytes.toString("base64") } },
        ],
      },
    }],
    promptFeedback: { blockReason: "SAFETY" },
    usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 4, totalTokenCount: 16 },
  });

  const serialized = JSON.stringify(summary);
  assert.equal(summary.finishReason, "STOP");
  assert.equal(summary.blockReason, "SAFETY");
  assert.equal(summary.mimeType, "image/png");
  assert.equal(summary.bytes, bytes.length);
  assert.deepEqual(summary.usageMetadata, {
    promptTokenCount: 12,
    candidatesTokenCount: 4,
    totalTokenCount: 16,
  });
  assert.equal(summary.textLength > 0, true);
  assert.equal(serialized.includes(petName), false);
  assert.equal(serialized.includes(bytes.toString("base64")), false);
  assert.equal(serialized.includes("this prompt must not be logged"), false);
});

test("failed-attempt logs keep the diagnosis and drop the photograph, the name and the secret", () => {
  const petName = "מיצי";
  const secret = "AIzaSySecretKeyValue123456";
  const photograph = Buffer.from("photograph-bytes-of-the-pet").toString("base64");
  const lines = [];
  const logger = {
    error: (message, payload) => lines.push({ message, payload }),
    warn: (message, payload) => lines.push({ message, payload }),
  };

  logGenerationFailure(logger, "Pet character image request failed", {
    attempt: 2,
    model: "gemini-2.5-flash-image",
    provider: "gemini",
    style: "realistic",
    finishReason: "STOP",
    blockReason: "OTHER",
    mimeType: "image/png",
    bytes: 480,
    usageMetadata: { promptTokenCount: 3, totalTokenCount: 9 },
    reason: "background_not_keyable",
    keyedBorder: 0.18,
    petName,
    prompt: `Create a character of ${petName}`,
    text: `the model wrote ${petName}`,
    inlineData: { data: photograph, mimeType: "image/png" },
    message: `request failed for ${petName} key=${secret} ${photograph}`,
    details: {
      reason: "background_not_keyable",
      keyedBorder: 0.18,
      message: `echoed prompt names ${petName}`,
      apiKey: secret,
      data: photograph,
      url: `https://example.test/generate?key=${secret}`,
    },
  }, { denylist: [petName], level: "warn" });

  assert.equal(lines.length, 1);
  const serialized = JSON.stringify(lines[0]);
  assert.equal(serialized.includes(petName), false);
  assert.equal(serialized.includes(secret), false);
  assert.equal(serialized.includes(photograph), false);
  assert.equal(serialized.includes("Create a character"), false);
  assert.equal(serialized.includes("the model wrote"), false);
  assert.equal(lines[0].payload.finishReason, "STOP");
  assert.equal(lines[0].payload.blockReason, "OTHER");
  assert.equal(lines[0].payload.mimeType, "image/png");
  assert.equal(lines[0].payload.bytes, 480);
  assert.equal(lines[0].payload.usageMetadata.totalTokenCount, 9);
  assert.equal(lines[0].payload.reason, "background_not_keyable");
  assert.equal(lines[0].payload.keyedBorder, 0.18);
  assert.equal(lines[0].payload.details.reason, "background_not_keyable");
  assert.equal(lines[0].payload.details.keyedBorder, 0.18);
  assert.equal(lines[0].payload.attempt, 2);
  assert.equal("data" in lines[0].payload.details, false);
  assert.equal("apiKey" in lines[0].payload.details, false);
  assert.match(lines[0].payload.message, /\[redacted\]/);
  assert.match(lines[0].payload.details.message, /\[redacted\]/);
});

test("provider error details survive redaction", () => {
  const error = Object.assign(new Error("models/gemini-2.5-flash-image is not found"), {
    status: 404,
    error: {
      code: 404,
      status: "NOT_FOUND",
      details: [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason: "MODEL_NOT_FOUND" }],
    },
  });
  const diagnostic = redactGenerationDiagnostic(apiErrorDiagnostic(error), { denylist: ["Rex"] });
  assert.equal(diagnostic.status, 404);
  assert.equal(diagnostic.providerStatus, "NOT_FOUND");
  assert.equal(diagnostic.details[0].reason, "MODEL_NOT_FOUND");
  assert.equal(JSON.stringify(diagnostic).includes("Rex"), false);
  assert.equal(characterErrorCode(error), "model_unavailable");
});

test("background removal logs the provider failure without the key or the picture", async () => {
  const secret = "super-secret-key";
  const photograph = Buffer.from("product-photo-bytes").toString("base64");
  const lines = [];
  const logger = {
    error: (message, payload) => lines.push(JSON.stringify({ message, payload })),
    warn: (message, payload) => lines.push(JSON.stringify({ message, payload })),
  };
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return new Response(JSON.stringify({
      error: {
        code: 404,
        status: "NOT_FOUND",
        message: `model not found key=${secret}`,
        details: [{ reason: "MODEL_NOT_FOUND", data: photograph }],
      },
      candidates: [{
        finishReason: "SAFETY",
        content: { parts: [{ inlineData: { mimeType: "image/png", data: photograph } }] },
      }],
      promptFeedback: { blockReason: "SAFETY" },
      usageMetadata: { totalTokenCount: 7 },
    }), { status: 404, headers: { "content-type": "application/json" } });
  };

  try {
    const remover = createGeminiBackgroundRemover({ apiKey: secret, logger, timeoutMs: 1000 });
    await assert.rejects(
      () => remover(Buffer.from("image"), { contentType: "image/png" }),
      /responded with 404/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.match(requestedUrl, new RegExp(`key=${secret}`));
  assert.equal(lines.length, 1);
  const serialized = lines[0];
  assert.equal(serialized.includes(secret), false);
  assert.equal(serialized.includes(photograph), false);
  assert.equal(serialized.includes("key="), false);
  assert.match(serialized, /404/);
  assert.match(serialized, /MODEL_NOT_FOUND/);
  assert.match(serialized, /SAFETY/);
  assert.match(serialized, /"bytes":/);
});

test("a background-removal network error does not leak the request URL", async () => {
  const secret = "super-secret-key";
  const lines = [];
  const logger = {
    error: (message, payload) => lines.push({ message, payload: JSON.stringify(payload) }),
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error(`connect failed https://generativelanguage.googleapis.com/v1beta/models/x:generateContent?key=${secret}`);
  };

  try {
    const remover = createGeminiBackgroundRemover({ apiKey: secret, logger, timeoutMs: 1000 });
    await assert.rejects(() => remover(Buffer.from("image")), (error) => {
      assert.equal(error.message, "Background removal request failed");
      assert.equal(String(error.message).includes(secret), false);
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(lines.length, 1);
  assert.equal(lines[0].payload.includes(secret), false);
  assert.equal(lines[0].payload.includes("key="), false);
  assert.match(lines[0].payload, /request_failed/);
});
