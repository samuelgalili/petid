import { GoogleGenAI, Modality } from "@google/genai";

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

// PNG and WebP only. JPEG has no alpha channel, so accepting one would mean
// storing an avatar with a background baked in and no way to tell afterwards --
// the failure would be invisible until someone looked at the app. A JPEG here
// fails as NO_GENERATED_IMAGE instead, which is the honest outcome.
const allowedGeneratedMimeTypes = new Set(["image/png", "image/webp"]);

/**
 * The realistic style is the pet as it actually looks: real anatomy, real fur,
 * real proportions, photographed rather than drawn. The chibi style keeps the
 * same identity - the same markings, the same colours - on deliberately
 * stylised proportions.
 *
 * Both must stay recognisably *this* pet. The uploaded photo is the identity
 * reference, not a breed hint, so neither style is allowed to prettify the
 * animal into a generic one.
 */
const candidateStyles = {
  realistic: [
    "photorealistic rendering with realistic anatomy, realistic fur detail and direction,",
    "realistic eyes with natural catchlights, natural proportions and soft natural lighting.",
    "It must read as this animal actually looks in its photographs, never as an illustration,",
    "cartoon or anime",
  ].join(" "),
  chibi: [
    "warm chibi character art with deliberately compact proportions and a larger head,",
    "clean rounded forms, soft shading and a restrained palette. Keep the real coat",
    "colours, markings and eye colour exactly; stylise the proportions, never the identity.",
    "Charming and premium, never childish or mascot-like",
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
- FULLY TRANSPARENT BACKGROUND. Return a PNG with a real alpha channel: every
  pixel that is not the animal itself must be transparent. No backdrop, no
  colour fill, no white, no gradient, no ground plane, no cast or contact
  shadow, no vignette. The animal is cut out and floats alone.
- Crisp production-ready finish with clean edges around fur.
- This becomes the pet's permanent visual identity in the app, so it must stay consistent and reusable.
`.trim();

export const buildExpressionPrompt = ({ petName, expression, visualIdentity }) => `
Use the first supplied image as the canonical character master for ${petName}. Render the exact same character in a new reaction pose: ${expressionDirections[expression]}.

Preserve exactly:
- silhouette, body proportions, coat colors and every distinctive marking
- face, muzzle, ears, eyes, tail, rendering style, material treatment, lighting, and camera angle
- identity notes: ${JSON.stringify(visualIdentity)}

Keep the same square composition and the same fully transparent background: a PNG with a real alpha channel, no backdrop, no ground plane and no cast shadow. Show one full-body character only. No text, logo, border, clothing, extra animals, people, or unrelated props. The emotional change must come from pose and expression, not from changing the character design.
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

const generateImage = async ({ client, imageModel, parts }) => {
  const response = await client.models.generateContent({
    model: imageModel,
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
      candidateCount: 1,
      imageConfig: { aspectRatio: "1:1" },
    },
  });
  return extractGeneratedImage(response);
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
        { text: buildCandidatePrompt({ petName, petType, visualIdentity, style: candidateStyles[CHARACTER_STYLES[index]] }) },
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
