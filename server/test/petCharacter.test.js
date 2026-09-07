import assert from "node:assert/strict";
import test from "node:test";

import {
  CHARACTER_CANDIDATE_KEYS,
  CHARACTER_STYLES,
  buildCandidatePrompt,
  buildExpressionPrompt,
  buildPackValidationPrompt,
  extractGeneratedImage,
  resolvePetCharacterProvider,
} from "../src/petCharacter.js";

test("pet character provider uses the existing Gemini API key", () => {
  assert.deepEqual(
    resolvePetCharacterProvider({ geminiApiKey: "gemini-key" }),
    { provider: "gemini", clientOptions: { apiKey: "gemini-key" } },
  );
});

test("explicit Vertex configuration takes precedence over Gemini", () => {
  assert.deepEqual(
    resolvePetCharacterProvider({
      geminiApiKey: "gemini-key",
      vertexApiKey: "vertex-key",
      project: "vertex-project",
      location: "global",
    }),
    { provider: "vertex", clientOptions: { vertexai: true, apiKey: "vertex-key" } },
  );
});

test("pet character provider reports missing configuration", () => {
  assert.equal(resolvePetCharacterProvider({}), null);
});

test("character candidate prompt locks pet identity and production composition", () => {
  const prompt = buildCandidatePrompt({
    petName: "Mika",
    petType: "dog",
    visualIdentity: { coat_colors: ["black", "white"], distinctive_markings: ["white chest"] },
    style: "soft dimensional character art",
  });

  assert.match(prompt, /Mika/);
  assert.match(prompt, /white chest/);
  assert.match(prompt, /Square 1:1/);
  assert.match(prompt, /Do not add another animal/);
});

test("expression prompt preserves the canonical character", () => {
  const prompt = buildExpressionPrompt({
    petName: "Mika",
    expression: "happy",
    visualIdentity: { ear_shape: "upright" },
  });

  assert.match(prompt, /canonical character master/);
  assert.match(prompt, /same character/);
  assert.match(prompt, /upright/);
});

test("expression-pack quality prompt checks identity drift and unsafe additions", () => {
  const prompt = buildPackValidationPrompt({
    petName: "Mika",
    expressionKeys: ["happy", "sleepy"],
    visualIdentity: { distinctive_markings: ["white chest"] },
  });

  assert.match(prompt, /coat color placement/);
  assert.match(prompt, /happy, sleepy/);
  assert.match(prompt, /white chest/);
  assert.match(prompt, /extra animal/);
});

test("generated image extraction decodes the first image part", () => {
  const expected = Buffer.from("generated-image");
  const image = extractGeneratedImage({
    candidates: [{
      content: {
        parts: [
          { text: "done" },
          { inlineData: { data: expected.toString("base64"), mimeType: "image/png" } },
        ],
      },
    }],
  });

  assert.equal(image.contentType, "image/png");
  assert.deepEqual(image.buffer, expected);
});

test("generated image extraction rejects responses without an image", () => {
  assert.throws(
    () => extractGeneratedImage({ candidates: [{ content: { parts: [{ text: "blocked" }] } }] }),
    /no generated image/i,
  );
});

test("generated image extraction rejects an unsupported declared image type", () => {
  assert.throws(
    () => extractGeneratedImage({
      candidates: [{
        content: { parts: [{ inlineData: { data: "PHN2Zz48L3N2Zz4=", mimeType: "image/svg+xml" } }] },
      }],
    }),
    /unsupported generated image type/i,
  );
});


test("two candidate styles are offered, one per style", () => {
  assert.deepEqual(CHARACTER_STYLES, ["realistic", "chibi"]);
  assert.deepEqual(CHARACTER_CANDIDATE_KEYS, ["candidate-realistic", "candidate-chibi"]);
});

test("the shared candidate prompt no longer forces a house style", () => {
  const prompt = buildCandidatePrompt({
    petName: "Mika",
    petType: "dog",
    visualIdentity: {},
    style: "photorealistic rendering",
  });

  // The style block decides the look, so the shared text must not smuggle one in.
  assert.doesNotMatch(prompt, /Tamagotchi/i);
  assert.doesNotMatch(prompt, /adorable/i);
  // Full body is a hard requirement of the avatar spec, not a style preference.
  assert.match(prompt, /every visible leg and paw/);
  assert.match(prompt, /Do not crop/);
  // Identity beats flattery.
  assert.match(prompt, /not a nicer one of the same breed/);
});
