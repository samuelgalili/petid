import { GoogleGenAI, Modality } from "@google/genai";
import sharp from "sharp";
import { KEY_BACKGROUND_INSTRUCTION, chromaKeyToAlpha } from "./chromaKey.js";

/**
 * Two candidates, one per style, so the owner picks a direction rather than
 * three variations of the same idea. It is also a third fewer generated images
 * on the most expensive thing the product does.
 */
export const CHARACTER_STYLES = ["realistic", "chibi"];

export const CHARACTER_CANDIDATE_KEYS = CHARACTER_STYLES.map((style) => `candidate-${style}`);

export const CHARACTER_EXPRESSIONS = [
  "happy",
  "curious",
  "sleepy",
  "proud",
  "celebrate",
  "attentive",
];

// PNG and WebP only. JPEG has no alpha channel at all, so accepting one would
// mean storing an avatar with a background baked in.
//
// THIS CHECK IS NECESSARY AND IS NOT SUFFICIENT, and the comment that used to
// sit here claimed otherwise: it said a JPEG was refused so there would be no
// "background baked in and no way to tell afterwards". A PNG can be entirely
// opaque. The generator returned one where the transparency was DRAWN - the
// grey-and-white chequerboard, as real pixels - and it reached the home screen,
// because every check between the model and the screen looked at the container
// rather than at the contents.
//
// The prompt no longer asks for transparency at all. It asks for the animal on
// flat magenta - a drawing instruction, which is a thing a model does well -
// and chromaKey.js makes the alpha from those pixels arithmetically.
// inspectTransparency below then holds the result to the same standard the
// screen holds it to.
const allowedGeneratedMimeTypes = new Set(["image/png", "image/webp"]);

// The same rule the browser applies in src/hooks/useImageHasAlpha.ts, and
// server/test/characterTransparency.test.js pins the two to the same numbers.
// A stricter server would refuse images the screen would have shown; a laxer
// one would store images the screen refuses to un-crop, which is a pack that
// silently never improves.
export const CORNER_ALPHA_THRESHOLD = 16;
export const CORNERS_REQUIRED_TRANSPARENT = 3;

/**
 * Both styles are 3D character renders, and the choice between them is about
 * proportion, not about medium.
 *
 * Realistic keeps the animal's real anatomy and its real fur, rendered with
 * volume and depth rather than drawn flat. Chibi keeps the same identity - the
 * same markings, the same colours, the same eyes - on deliberately compact
 * proportions. Neither is an illustration: the earlier versions of these
 * prompts produced flat 2D artwork, because one of them asked for a photograph
 * and both were silent about dimensional form.
 *
 * Both must stay recognisably *this* pet. The uploaded photo is the identity
 * reference, not a breed hint, so neither style may prettify the animal into a
 * generic one.
 */
export const STYLE_DIRECTION = {
  realistic: [
    "a photorealistic 3D character render: true dimensional form with real volume and depth,",
    "realistic anatomy and proportions, volumetric fur with visible strand direction and",
    "light passing through it at the edges, moist realistic eyes with genuine catchlights,",
    "and soft directional studio lighting that models the body. It must read as a",
    "high-end CG render of this exact animal - the way a feature animation studio would",
    "render a real pet - never as a flat drawing, a 2D illustration or line art",
  ].join(" "),
  chibi: [
    "a stylised 3D character render with deliberately compact proportions and a larger head:",
    "smooth rounded dimensional forms with real volume, soft plush fur shading, gentle",
    "subsurface warmth, and soft directional studio lighting that models the shapes. Modern",
    "3D animated feature quality. Keep the real coat colours, markings and eye colour exactly;",
    "stylise the proportions, never the identity. Charming and premium, never childish,",
    "never mascot-like, and never a flat 2D illustration",
  ].join(" "),
};

const expressionDirections = {
  happy: "a joyful open expression, bright eyes, relaxed ears, and a small energetic bounce pose",
  curious: "a curious expression with a gentle head tilt, focused eyes, and one ear subtly raised where anatomically appropriate",
  sleepy: "a peaceful sleepy expression with lowered eyelids, relaxed posture, and a tiny natural yawn",
  proud: "a warm proud expression with an upright posture, gentle smile, and calm confident eyes",
  celebrate: "a delighted celebration pose with an expressive jump, happy eyes, and tasteful small sparkles around the character",
  attentive: "an alert but calm expression, focused eyes, attentive ears, and a slightly forward posture without distress",
};

export const resolvePetCharacterProvider = ({
  geminiApiKey,
  vertexApiKey,
  project,
  location = "global",
}) => {
  if (vertexApiKey) {
    return { provider: "vertex", clientOptions: { vertexai: true, apiKey: vertexApiKey } };
  }
  if (project) {
    return { provider: "vertex", clientOptions: { vertexai: true, project, location } };
  }
  if (geminiApiKey) {
    return { provider: "gemini", clientOptions: { apiKey: geminiApiKey } };
  }
  return null;
};

const makeClient = (configuration) => {
  const resolved = resolvePetCharacterProvider(configuration);
  if (!resolved) throw new Error("Pet character generation is not configured");
  return new GoogleGenAI(resolved.clientOptions);
};

const referenceParts = (references) => references.map((reference) => ({
  inlineData: {
    data: reference.buffer.toString("base64"),
    mimeType: reference.contentType,
  },
}));

const parseJsonText = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (!fenced?.[1]) return null;
    try {
      return JSON.parse(fenced[1]);
    } catch {
      return null;
    }
  }
};

export const extractGeneratedImage = (response) => {
  const parts = response?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((part) => part?.inlineData?.data);
  if (!imagePart) {
    const error = new Error("The AI provider returned no generated image");
    error.code = "NO_GENERATED_IMAGE";
    throw error;
  }

  const contentType = imagePart.inlineData.mimeType;
  if (!allowedGeneratedMimeTypes.has(contentType)) {
    const error = new Error("The AI provider returned an unsupported generated image type");
    error.code = "NO_GENERATED_IMAGE";
    throw error;
  }
  const data = imagePart.inlineData.data;
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, "base64");
  if (buffer.length === 0) {
    const error = new Error("The AI provider returned an empty generated image");
    error.code = "NO_GENERATED_IMAGE";
    throw error;
  }
  return { buffer, contentType };
};

/**
 * Does this image actually have a transparent background?
 *
 * Read at FULL SIZE, at the four corners. The browser samples a 24px downscale
 * because it has an <img> and a canvas and no decoder; here there is a decoder,
 * so there is no reason to introduce interpolation between the bytes and the
 * answer.
 *
 * Corners rather than the whole border: the prompt asks for a full-body
 * character, and a standing animal legitimately touches the bottom edge of its
 * square. Three of four, so one stray speck does not reject a good image.
 *
 * `hasAlpha === false` is conclusive on its own and is used that way. The
 * unsound direction - hasAlpha true therefore transparent - is exactly the
 * mistake the MIME check made, and is not relied on here.
 */
export const inspectTransparency = async (buffer) => {
  const image = sharp(buffer, { failOn: "none" });

  let metadata;
  try {
    metadata = await image.metadata();
  } catch {
    return { transparent: false, reason: "undecodable" };
  }

  if (!metadata.width || !metadata.height) return { transparent: false, reason: "undecodable" };
  if (metadata.hasAlpha === false) return { transparent: false, reason: "no_alpha_channel" };

  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alphaAt = (x, y) => data[(y * info.width + x) * info.channels + (info.channels - 1)];
  const right = info.width - 1;
  const bottom = info.height - 1;
  const corners = [alphaAt(0, 0), alphaAt(right, 0), alphaAt(0, bottom), alphaAt(right, bottom)];
  const transparentCorners = corners.filter((alpha) => alpha < CORNER_ALPHA_THRESHOLD).length;

  return {
    transparent: transparentCorners >= CORNERS_REQUIRED_TRANSPARENT,
    reason: transparentCorners >= CORNERS_REQUIRED_TRANSPARENT ? null : "opaque_corners",
    corners,
    transparentCorners,
  };
};

/**
 * What to say on the second attempt.
 *
 * The prompt already says "FULLY TRANSPARENT BACKGROUND ... a real alpha
 * channel", in capitals, and the model answered with a painting of a
 * chequerboard. So the retry does not repeat the instruction louder - it names
 * the specific thing that came back, because the failure is that the model
 * interpreted "transparent background" as something to depict.
 */
export const TRANSPARENCY_RETRY_NOTE = `
The previous attempt was rejected: the background was not the requested colour. It was
some other backdrop - a pattern, a gradient, a scene, or a chequerboard.

This is a DRAWING instruction, not a file-format one. Fill every pixel behind the animal
with one single flat colour: pure magenta, RGB(255, 0, 255). Nothing else. No pattern, no
texture, no gradient, no shading, no chequerboard, no scene. The magenta must reach all
four corners of the image and must not appear anywhere on the animal.
`.trim();

export const buildCandidatePrompt = ({ petName, petType, visualIdentity, style }) => `
Create a single premium full-body pet avatar based only on the supplied reference photos.

Identity requirements:
- The character is ${petName}, a ${petType || "pet"}.
- Preserve the real pet's coat color distribution, distinctive markings, face proportions, muzzle, ear shape, eye color, and tail characteristics.
- Identity notes from the photo review: ${JSON.stringify(visualIdentity)}
- Do not invent clothing or accessories unless clearly present in every reference photo.
- Do not add another animal, person, text, logo, border, UI, or props.

Art direction:
- ${style}.
- Full body in a natural three-quarter-front pose, centered, looking toward the viewer.
- Recognisability matters more than charm: this must read as this specific animal, not a nicer one of the same breed.
- Show the whole animal - head, neck, torso, every visible leg and paw, and the tail. Do not crop them.
- Square 1:1 composition with generous breathing room around the body.
- ${KEY_BACKGROUND_INSTRUCTION}
- No ground plane, no cast or contact shadow, no vignette: the animal stands
  clear of the background and touches nothing.
- The shading stays ON the animal: light and shade across the body are what give
  it dimensional form, since there is no ground beneath it to catch a shadow.
- Crisp production-ready finish with clean edges around fur.
- This becomes the pet's permanent visual identity in the app, so it must stay consistent and reusable.
`.trim();

export const buildExpressionPrompt = ({ petName, expression, visualIdentity }) => `
Use the first supplied image as the canonical character master for ${petName}. Render the exact same character in a new reaction pose: ${expressionDirections[expression]}.

Preserve exactly:
- the 3D rendered medium: the same dimensional form, volume, material treatment and lighting as the master. The reaction must not be flatter or more illustrated than the character it copies.
- silhouette, body proportions, coat colors and every distinctive marking
- face, muzzle, ears, eyes, tail, rendering style, material treatment, lighting, and camera angle
- identity notes: ${JSON.stringify(visualIdentity)}

Keep the same square composition, and the same background as the master: ${KEY_BACKGROUND_INSTRUCTION} No ground plane and no cast shadow. Show one full-body character only. No text, logo, border, clothing, extra animals, people, or unrelated props. The emotional change must come from pose and expression, not from changing the character design.
`.trim();

export const buildPackValidationPrompt = ({ petName, expressionKeys, visualIdentity }) => `
Compare a canonical virtual companion master for ${petName} with the labeled reaction images that follow.
Return JSON only in this shape: {"valid":boolean,"inconsistent_keys":[string],"reason":string}.

Mark a reaction inconsistent if any identity-defining feature changes: silhouette, body proportions, coat color placement, distinctive markings, face or muzzle shape, ears, eyes, tail, rendering style, materials, lighting, or camera angle. Also mark it inconsistent if it contains text, a logo, a border, an extra animal, a person, new clothing, or a cropped body. Natural pose and facial-expression changes are expected and should not be marked inconsistent.

Expected reaction keys: ${expressionKeys.join(", ")}.
Identity notes: ${JSON.stringify(visualIdentity)}.
`.trim();

const analyzeReferences = async ({ client, visionModel, references, petName, petType }) => {
  const response = await client.models.generateContent({
    model: visionModel,
    contents: [{
      role: "user",
      parts: [
        {
          text: `Review these reference photos for creating a digital character of ${petName}, a ${petType || "pet"}. Return JSON only with this shape: {"valid":boolean,"full_body_visible":boolean,"reason":string,"species":string,"coat_colors":[string],"distinctive_markings":[string],"ear_shape":string,"eye_color":string,"face_shape":string,"body_shape":string,"tail":string}. valid is true only if every image clearly shows the same single animal, the visible species is compatible with ${petType || "the registered pet type"}, at least one image clearly shows the face, and the pet is not heavily occluded. Set full_body_visible to true only if at least one image shows the animal's whole body - torso, legs and tail - and not only the head, face or an upper-body crop. Keep every description factual and concise.`,
        },
        ...referenceParts(references),
      ],
    }],
    config: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  return assertUsableReferences(parseJsonText(response.text));
};

/**
 * What the photo review has to establish before anything is generated.
 *
 * The second check is the quiet failure behind "it doesn't look like my pet".
 * The prompt asks for a full-body avatar, so given nothing but a head the model
 * invents the torso, legs and tail — and the expression pack then reproduces
 * that invented body six more times, consistently and wrongly. Stopping to ask
 * for a photo of the whole animal costs the owner one upload and is the
 * difference between their pet and a plausible animal of the same breed.
 */
export const assertUsableReferences = (parsed) => {
  if (!parsed || parsed.valid !== true) {
    const error = new Error(parsed?.reason || "The reference photos could not be validated");
    error.code = "INVALID_REFERENCE_PHOTOS";
    throw error;
  }

  if (parsed.full_body_visible !== true) {
    const error = new Error("The reference photos show only the pet's face");
    error.code = "REFERENCE_PHOTOS_FACE_ONLY";
    throw error;
  }

  return parsed;
};

/**
 * One image, and a second attempt if the first one is not actually cut out.
 *
 * This is the single chokepoint every generated image passes through, which is
 * why the transparency check lives here rather than at each of the two call
 * sites. A check at one of them is a check at neither, eventually.
 *
 * ONE retry, not a loop. If the model paints a chequerboard twice it is not
 * going to stop on the fifth attempt, and each attempt is the most expensive
 * call the product makes. Failing after two is honest and bounded; the pack is
 * then marked failed rather than filled with squares.
 */
/**
 * One image, cut out here rather than asked for cut out.
 *
 * The model is asked for the animal on flat magenta - a drawing instruction it
 * follows reliably - and the alpha is made from those pixels by chromaKey.js.
 * Asking for "a PNG with a real alpha channel" is what produced a painted
 * chequerboard: a file-format instruction inside a creative prompt reads as
 * something to depict.
 *
 * The keying step has no judgement in it, so the only thing that can go wrong
 * is the model ignoring the colour - which is measured, named, and retried
 * once with a note about the COLOUR rather than about transparency.
 *
 * The result is always a PNG, because that is what the key emits.
 */
const generateImage = async ({ client, imageModel, parts, requireTransparency = true, logger = console }) => {
  const ask = async (withParts) => {
    const response = await client.models.generateContent({
      model: imageModel,
      contents: [{ role: "user", parts: withParts }],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
        candidateCount: 1,
        imageConfig: { aspectRatio: "1:1" },
      },
    });
    return extractGeneratedImage(response);
  };

  /** Key it, then hold the result to the same standard the screen holds it to. */
  const cutOut = async (generated) => {
    const keyed = await chromaKeyToAlpha(generated.buffer);
    if (!keyed.ok) return { ok: false, reason: keyed.reason, keyedBorder: keyed.keyedBorder };

    const verdict = await inspectTransparency(keyed.buffer);
    if (!verdict.transparent) return { ok: false, reason: `keyed_but_${verdict.reason}` };

    return { ok: true, image: { buffer: keyed.buffer, contentType: "image/png" } };
  };

  const first = await ask(parts);
  if (!requireTransparency) return first;

  const firstCut = await cutOut(first);
  if (firstCut.ok) return firstCut.image;

  // SAY IT OUT LOUD, BOTH WAYS. Whether the correction lands depends on the
  // model, which no test can establish. A silent retry makes a success
  // invisible and a failure look like every other failure.
  logger.warn("Pet character background was not keyable; retrying with a correction", {
    reason: firstCut.reason,
    keyedBorder: firstCut.keyedBorder,
  });

  // The correction goes FIRST, with the original instruction intact after it:
  // the retry is the same request plus a note about what came back, not a
  // different request that might also change the animal.
  const retried = await ask([{ text: TRANSPARENCY_RETRY_NOTE }, ...parts]);
  const retriedCut = await cutOut(retried);

  if (!retriedCut.ok) {
    logger.error("Pet character background was not keyable on the retry either", {
      reason: retriedCut.reason,
      keyedBorder: retriedCut.keyedBorder,
    });
    const error = new Error(
      retriedCut.reason === "background_not_keyable"
        ? "The model did not place the character on the requested background colour"
        : "The keyed image still has an opaque background",
    );
    error.code = "GENERATED_IMAGE_NOT_TRANSPARENT";
    error.details = retriedCut;
    throw error;
  }

  logger.warn("The background correction worked on the retry");
  return retriedCut.image;
};

const validateExpressionPack = async ({
  client,
  visionModel,
  canonical,
  expressions,
  visualIdentity,
  petName,
}) => {
  const response = await client.models.generateContent({
    model: visionModel,
    contents: [{
      role: "user",
      parts: [
        { text: buildPackValidationPrompt({
          petName,
          expressionKeys: expressions.map((expression) => expression.key),
          visualIdentity,
        }) },
        { text: "CANONICAL MASTER:" },
        { inlineData: { data: canonical.buffer.toString("base64"), mimeType: canonical.contentType } },
        ...expressions.flatMap((expression) => [
          { text: `REACTION KEY: ${expression.key}` },
          { inlineData: { data: expression.buffer.toString("base64"), mimeType: expression.contentType } },
        ]),
      ],
    }],
    config: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });
  const parsed = parseJsonText(response.text);
  if (!parsed || typeof parsed.valid !== "boolean") {
    const error = new Error("The expression quality check returned an invalid response");
    error.code = "INCONSISTENT_CHARACTER_PACK";
    throw error;
  }
  const allowedKeys = new Set(expressions.map((expression) => expression.key));
  const inconsistentKeys = Array.isArray(parsed.inconsistent_keys)
    ? parsed.inconsistent_keys.map(String).filter((key) => allowedKeys.has(key))
    : [];
  return { valid: parsed.valid === true && inconsistentKeys.length === 0, inconsistentKeys };
};

export const generateCharacterCandidates = async ({
  geminiApiKey,
  vertexApiKey,
  project,
  location = "global",
  imageModel = "gemini-2.5-flash-image",
  visionModel = "gemini-2.5-flash",
  references,
  petName,
  petType,
}) => {
  const client = makeClient({ geminiApiKey, vertexApiKey, project, location });
  const visualIdentity = await analyzeReferences({ client, visionModel, references, petName, petType });
  const candidates = [];

  for (let index = 0; index < CHARACTER_STYLES.length; index += 1) {
    const image = await generateImage({
      client,
      imageModel,
      parts: [
        { text: buildCandidatePrompt({ petName, petType, visualIdentity, style: STYLE_DIRECTION[CHARACTER_STYLES[index]] }) },
        ...referenceParts(references),
      ],
    });
    candidates.push({ key: CHARACTER_CANDIDATE_KEYS[index], ...image });
  }

  return { visualIdentity, candidates };
};

export const generateCharacterExpressions = async ({
  geminiApiKey,
  vertexApiKey,
  project,
  location = "global",
  imageModel = "gemini-2.5-flash-image",
  visionModel = "gemini-2.5-flash",
  canonical,
  visualIdentity,
  petName,
}) => {
  const client = makeClient({ geminiApiKey, vertexApiKey, project, location });
  const expressions = [];

  for (const expression of CHARACTER_EXPRESSIONS) {
    const image = await generateImage({
      client,
      imageModel,
      parts: [
        { text: buildExpressionPrompt({ petName, expression, visualIdentity }) },
        {
          inlineData: {
            data: canonical.buffer.toString("base64"),
            mimeType: canonical.contentType,
          },
        },
      ],
    });
    expressions.push({ key: expression, ...image });
  }

  let validation = await validateExpressionPack({
    client,
    visionModel,
    canonical,
    expressions,
    visualIdentity,
    petName,
  });
  if (!validation.valid) {
    const retryKeys = validation.inconsistentKeys.length > 0
      ? validation.inconsistentKeys
      : [...CHARACTER_EXPRESSIONS];
    for (const expression of retryKeys) {
      const image = await generateImage({
        client,
        imageModel,
        parts: [
          {
            text: `${buildExpressionPrompt({ petName, expression, visualIdentity })}\n\nQUALITY CORRECTION: The previous version drifted from the canonical master. Match every identity and rendering detail with exceptional precision; change only the requested pose and expression.`,
          },
          {
            inlineData: {
              data: canonical.buffer.toString("base64"),
              mimeType: canonical.contentType,
            },
          },
        ],
      });
      const index = expressions.findIndex((item) => item.key === expression);
      expressions[index] = { key: expression, ...image };
    }
    validation = await validateExpressionPack({
      client,
      visionModel,
      canonical,
      expressions,
      visualIdentity,
      petName,
    });
  }
  if (!validation.valid) {
    const error = new Error("The generated reactions did not preserve the selected character identity");
    error.code = "INCONSISTENT_CHARACTER_PACK";
    throw error;
  }

  return expressions;
};
