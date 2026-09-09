import assert from "node:assert/strict";
import test from "node:test";

import {
  CHARACTER_CANDIDATE_KEYS,
  CHARACTER_STYLES,
  assertUsableReferences,
  STYLE_DIRECTION,
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

// The avatar has to be a cut-out of the pet, not the pet standing on a plate.
// Both prompts previously asked for a warm-neutral #F7F7F5 background and a
// grounded shadow, which is exactly what the generated avatars came back with.

test("the candidate prompt demands a real alpha channel and forbids any backdrop", () => {
  const prompt = buildCandidatePrompt({
    petName: "מיצי",
    petType: "cat",
    visualIdentity: { coat_colors: ["seal point"] },
    style: "photorealistic rendering",
  });

  assert.match(prompt, /FULLY TRANSPARENT BACKGROUND/);
  assert.match(prompt, /alpha channel/i);
  assert.match(prompt, /no ground plane/i);
  assert.doesNotMatch(prompt, /F7F7F5/);
  assert.doesNotMatch(prompt, /grounded shadow/i);
});

test("the expression prompt keeps the transparency rather than reintroducing a background", () => {
  const prompt = buildExpressionPrompt({
    petName: "מיצי",
    expression: "happy",
    visualIdentity: {},
  });

  assert.match(prompt, /transparent background/i);
  assert.doesNotMatch(prompt, /F7F7F5/);
});

test("a JPEG is refused, because it cannot carry transparency", () => {
  // Accepting one would store an avatar with the background baked in, and
  // nothing downstream could tell that the transparency had been lost.
  assert.throws(
    () => extractGeneratedImage({
      candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/jpeg", data: "AAAA" } }] } }],
    }),
    (error) => error.code === "NO_GENERATED_IMAGE",
  );
});

test("PNG and WebP are both accepted, since both carry an alpha channel", () => {
  for (const mimeType of ["image/png", "image/webp"]) {
    const result = extractGeneratedImage({
      candidates: [{ content: { parts: [{ inlineData: { mimeType, data: Buffer.from("x").toString("base64") } }] } }],
    });
    assert.equal(result.contentType, mimeType);
  }
});

test("both styles are still offered, so the owner picks between them", () => {
  // Realistic or chibi is the owner's choice, not the system's.
  assert.deepEqual(CHARACTER_STYLES, ["realistic", "chibi"]);
  assert.equal(CHARACTER_CANDIDATE_KEYS.length, 2);
});

// A photo of the face alone passes every other check and then produces a body
// the model made up. These are the cases that decide whether the owner is asked
// for a better photo or quietly given a different animal.

test("a full-body reference passes the photo review", () => {
  const parsed = { valid: true, full_body_visible: true, species: "cat" };
  assert.equal(assertUsableReferences(parsed), parsed);
});

test("a face-only reference is refused with its own code", () => {
  assert.throws(
    () => assertUsableReferences({ valid: true, full_body_visible: false, species: "cat" }),
    (error) => error.code === "REFERENCE_PHOTOS_FACE_ONLY",
  );
});

test("a missing full_body_visible is treated as face-only, not as permission", () => {
  // An older or truncated response must not be read as a yes.
  assert.throws(
    () => assertUsableReferences({ valid: true, species: "cat" }),
    (error) => error.code === "REFERENCE_PHOTOS_FACE_ONLY",
  );
});

test("an unusable photo set still fails as invalid before the body check", () => {
  assert.throws(
    () => assertUsableReferences({ valid: false, reason: "two different animals" }),
    (error) => error.code === "INVALID_REFERENCE_PHOTOS" && /two different animals/.test(error.message),
  );
});

// Both styles are 3D character renders. The first versions of these prompts
// produced flat 2D artwork: one asked for a photograph, the other for
// "character art", and neither said anything about dimensional form.

test("both styles ask for a 3D render, and neither forbids one", () => {
  for (const style of CHARACTER_STYLES) {
    const prompt = buildCandidatePrompt({
      petName: "מיצי",
      petType: "cat",
      visualIdentity: {},
      style: STYLE_DIRECTION[style],
    });
    assert.match(prompt, /3D character render/i, `${style} should ask for a 3D render`);
  }
});

test("the realistic style no longer rules out the dimensional look it now needs", () => {
  // It used to end with "never as an illustration, cartoon, 3D cartoon or anime",
  // which forbade the very thing being asked for.
  assert.doesNotMatch(STYLE_DIRECTION.realistic, /3D cartoon/i);
  assert.match(STYLE_DIRECTION.realistic, /volume and depth/i);
});

test("the expression pack has to match the master's medium, not just its markings", () => {
  const prompt = buildExpressionPrompt({ petName: "מיצי", expression: "happy", visualIdentity: {} });
  assert.match(prompt, /3D rendered medium/i);
  assert.match(prompt, /must not be flatter or more illustrated/i);
});
