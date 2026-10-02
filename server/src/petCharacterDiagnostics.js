/**
 * Failure diagnostics for pet-character image generation.
 *
 * The log is how we tell a dead model from an unkeyable background from a
 * corrupt file. It must not contain the photograph, the prompt, the pet's
 * name, or a credential. Provider errors quote the request, and the request
 * is exactly those things.
 */

const SECRET_PATTERNS = [
  /\bkey=[^&\s"']+/gi,
  /\b(api[_-]?key|authorization|bearer|token|secret)\b\s*[:=]\s*["']?[^\s"',}]+/gi,
  /\bAIza[0-9A-Za-z_-]{10,}/g,
  /\bsk-[0-9A-Za-z_-]{10,}/g,
  /https?:\/\/[^\s"']+/gi,
  /data:[^;,\s]+;base64,[A-Za-z0-9+/=]+/gi,
];

const BASE64_PATTERN = /[A-Za-z0-9+/]{24,}={0,2}/g;

const SENSITIVE_KEYS = new Set([
  "petname",
  "pet_name",
  "prompt",
  "text",
  "data",
  "buffer",
  "apikey",
  "api_key",
  "authorization",
  "secret",
  "secrets",
  "photos",
  "image",
  "images",
  "parts",
  "contents",
  "raw",
  "body",
  "url",
  "request",
  "headers",
  "config",
  "candidates",
  "visualidentity",
  "visual_identity",
]);

const CUT_REASONS = new Set([
  "background_not_keyable",
  "undecodable",
  "keyed_but_undecodable",
  "keyed_but_opaque_corners",
  "keyed_but_no_alpha_channel",
  "opaque_corners",
  "no_alpha_channel",
]);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const namesFrom = (denylist) => (
  (Array.isArray(denylist) ? denylist : [])
    .map((item) => String(item || "").trim())
    .filter((item) => item.length >= 2 && item.length <= 80)
    .slice(0, 8)
);

const applyPattern = (text, pattern) => text.replace(new RegExp(pattern.source, pattern.flags), "[redacted]");

const redactString = (value, names) => {
  let text = String(value);
  for (const pattern of SECRET_PATTERNS) text = applyPattern(text, pattern);
  for (const name of names) text = text.replace(new RegExp(escapeRegExp(name), "gi"), "[redacted]");
  text = text.replace(new RegExp(BASE64_PATTERN.source, "g"), "[redacted]");
  text = text.replace(/\s+/g, " ").trim();
  return text.length > 500 ? text.slice(0, 500) : text;
};

/**
 * Copy a diagnostic value with secrets, photographs and names removed.
 * Numbers, reasons and token counts stay. Anything that could be the picture
 * or the prompt does not.
 */
export const redactGenerationDiagnostic = (value, options = {}) => {
  const names = namesFrom(options.denylist);
  const seen = new WeakSet();

  const walk = (input, depth) => {
    if (input == null || typeof input === "number" || typeof input === "boolean") return input;
    if (typeof input === "string") return redactString(input, names);
    if (typeof input === "bigint") return Number(input);
    if (typeof input !== "object") return undefined;
    if (Buffer.isBuffer(input)) return { bytes: input.length };
    if (seen.has(input) || depth > 6) return "[truncated]";
    seen.add(input);

    if (Array.isArray(input)) return input.slice(0, 20).map((item) => walk(item, depth + 1));

    const out = {};
    for (const [key, child] of Object.entries(input)) {
      if (SENSITIVE_KEYS.has(String(key).toLowerCase())) continue;
      out[key] = walk(child, depth + 1);
    }
    return out;
  };

  return walk(value, 0);
};

export const logGenerationFailure = (logger, message, payload, options = {}) => {
  const sink = logger || console;
  const level = options.level === "warn" ? "warn" : "error";
  const write = typeof sink[level] === "function" ? sink[level] : sink.error;
  if (typeof write !== "function") return;
  write.call(sink, message, redactGenerationDiagnostic(payload, options));
};

const numericStatus = (value) => {
  if (typeof value === "number" && value >= 400 && value <= 599) return value;
  if (typeof value === "string" && /^[45]\d{2}$/.test(value)) return Number(value);
  return null;
};

const pushText = (bits, value) => {
  if (typeof value === "number") bits.push(String(value));
  else if (typeof value === "string" && value.length > 0 && value.length <= 2000) bits.push(value);
};

/** Status and short messages only. Image bytes must not influence the code. */
const diagnosticBlob = (error) => {
  const bits = [];
  pushText(bits, error?.message);
  pushText(bits, error?.status);
  pushText(bits, error?.code);
  pushText(bits, error?.statusCode);
  pushText(bits, error?.error?.status);
  pushText(bits, error?.error?.message);
  pushText(bits, error?.error?.code);
  pushText(bits, error?.details?.status);
  pushText(bits, error?.details?.message);
  pushText(bits, error?.details?.reason);
  return bits.join(" ").replace(new RegExp(BASE64_PATTERN.source, "g"), " ");
};

export const httpStatusOf = (error) => {
  const candidates = [
    error?.status,
    error?.statusCode,
    error?.code,
    error?.error?.code,
    error?.error?.status,
    error?.details?.code,
    error?.details?.status,
  ];
  for (const value of candidates) {
    const status = numericStatus(value);
    if (status) return status;
  }
  const blob = String(error?.message || "").slice(0, 2000);
  const coded = blob.match(/"code"\s*:\s*(4\d{2}|5\d{2})/);
  if (coded) return Number(coded[1]);
  const loose = blob.match(/\b(403|404|429|500|502|503|504)\b/);
  return loose ? Number(loose[1]) : null;
};

const isModelUnavailable = (httpStatus, blob) => {
  if (httpStatus === 404) return true;
  if (/\bNOT_FOUND\b/.test(blob)) return true;
  if (/no longer available|shut ?down|discontinued|\bdeprecated\b/i.test(blob)) return true;
  if (/model/i.test(blob) && /not found|unavailable|does not exist|is not available|isn't available/i.test(blob)) return true;
  if (httpStatus === 403 && /model|permission|denied|not authorized|not enabled|has not been used/i.test(blob)) return true;
  if (/\bPERMISSION_DENIED\b/.test(blob) && /model/i.test(blob)) return true;
  return false;
};

const isTemporarilyUnavailable = (httpStatus, blob) => {
  if (httpStatus === 429 || (httpStatus >= 500 && httpStatus <= 599)) return true;
  return /\b429\b|resource exhausted|\bquota\b|\b(500|502|503|504)\b|service unavailable|\binternal error\b/i.test(blob);
};

/**
 * What the second attempt failed as.
 *
 * background_not_keyable: the border was not the colour we asked for.
 * undecodable: the bytes were not an image.
 * opaque_corners: keying ran, and the result was still a solid background.
 * Anything else stays on the older transparency code so a new reason is
 * still distinct from a network failure.
 */
export const classifyCutFailure = (reason) => {
  switch (reason) {
    case "background_not_keyable":
      return {
        code: "BACKGROUND_NOT_KEYABLE",
        publicCode: "background_not_keyable",
        message: "The model did not place the character on the requested background colour",
      };
    case "undecodable":
    case "keyed_but_undecodable":
      return {
        code: "UNDECODABLE_IMAGE",
        publicCode: "undecodable",
        message: "The generated image could not be decoded",
      };
    case "keyed_but_opaque_corners":
    case "keyed_but_no_alpha_channel":
    case "opaque_corners":
    case "no_alpha_channel":
      return {
        code: "OPAQUE_CORNERS",
        publicCode: "opaque_corners",
        message: "The keyed image still has an opaque background",
      };
    default:
      return {
        code: "GENERATED_IMAGE_NOT_TRANSPARENT",
        publicCode: "generation_not_transparent",
        message: "The keyed image still has an opaque background",
      };
  }
};

export const characterErrorCode = (error) => {
  if (error?.code === "INVALID_REFERENCE_PHOTOS") return "invalid_reference_photos";
  if (error?.code === "REFERENCE_PHOTOS_FACE_ONLY") return "reference_photos_face_only";

  const reason = typeof error?.details?.reason === "string" ? error.details.reason : "";
  if (CUT_REASONS.has(reason)) return classifyCutFailure(reason).publicCode;

  if (error?.code === "NO_GENERATED_IMAGE") return "generation_blocked";
  if (error?.code === "INCONSISTENT_CHARACTER_PACK") return "generation_inconsistent";
  if (error?.code === "BACKGROUND_NOT_KEYABLE") return "background_not_keyable";
  if (error?.code === "UNDECODABLE_IMAGE") return "undecodable";
  if (error?.code === "OPAQUE_CORNERS") return "opaque_corners";
  if (error?.code === "GENERATED_IMAGE_NOT_TRANSPARENT") return "generation_not_transparent";

  const httpStatus = httpStatusOf(error);
  const blob = diagnosticBlob(error);
  if (isModelUnavailable(httpStatus, blob)) return "model_unavailable";
  if (isTemporarilyUnavailable(httpStatus, blob)) return "temporarily_unavailable";
  return "generation_failed";
};

const usageCount = (usage, ...keys) => {
  for (const key of keys) {
    const value = Number(usage?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return null;
};

const usageMetadataOf = (usage) => {
  if (!usage || typeof usage !== "object") return null;
  const summary = {
    promptTokenCount: usageCount(usage, "promptTokenCount", "prompt_token_count"),
    candidatesTokenCount: usageCount(usage, "candidatesTokenCount", "candidates_token_count"),
    totalTokenCount: usageCount(usage, "totalTokenCount", "total_token_count"),
    thoughtsTokenCount: usageCount(usage, "thoughtsTokenCount", "thoughts_token_count"),
  };
  const present = Object.fromEntries(Object.entries(summary).filter(([, value]) => value != null));
  return Object.keys(present).length > 0 ? present : null;
};

const partKind = (part) => {
  if (part?.inlineData?.data || part?.inline_data?.data) return "image";
  if (part?.thought) return "thought";
  if (typeof part?.text === "string") return "text";
  return "other";
};

const byteLengthOf = (data) => {
  if (typeof data === "string") return Buffer.byteLength(data, "base64");
  if (data && typeof data.length === "number") return data.length;
  return 0;
};

/**
 * The fields worth keeping from a generateContent response.
 * The image bytes and any text the model wrote are counted, not copied.
 */
export const summarizeImageResponse = (response) => {
  const candidates = Array.isArray(response?.candidates) ? response.candidates : [];
  const candidate = candidates[0] || null;
  const parts = candidate?.content?.parts || [];
  const imagePart = parts.find((part) => part?.inlineData?.data || part?.inline_data?.data);
  const inline = imagePart?.inlineData || imagePart?.inline_data || null;
  const feedback = response?.promptFeedback || response?.prompt_feedback || null;
  const textLength = parts.reduce((sum, part) => (
    sum + (typeof part?.text === "string" ? part.text.length : 0)
  ), 0);

  return {
    candidatesLength: candidates.length,
    finishReason: candidate?.finishReason || candidate?.finish_reason || null,
    blockReason: feedback?.blockReason || feedback?.block_reason || null,
    mimeType: inline?.mimeType || inline?.mime_type || null,
    bytes: byteLengthOf(inline?.data),
    partCount: parts.length,
    partKinds: parts.map(partKind),
    textLength,
    usageMetadata: usageMetadataOf(response?.usageMetadata || response?.usage_metadata),
  };
};

export const apiErrorDiagnostic = (error) => ({
  status: httpStatusOf(error),
  providerStatus: typeof error?.status === "string"
    ? error.status
    : (typeof error?.error?.status === "string" ? error.error.status : null),
  code: error?.code ?? error?.error?.code ?? null,
  message: typeof error?.message === "string" ? error.message : null,
  details: error?.details ?? error?.error?.details ?? null,
});
