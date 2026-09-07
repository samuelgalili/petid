// Background removal for product photos.
//
// Mipo already runs gemini-2.5-flash-image for pet character art, so the image
// model, the credential and the billing relationship all exist. Adding a
// dedicated cutout vendor would mean a second contract and a second secret for
// a job the existing one can do.
//
// The pipeline treats this as an optional improvement, never a requirement: it
// checks the result and falls back to the plain normalized image when the model
// returns nothing usable. See normalizeWithBackgroundRemoval.
//
// NOT VERIFIED END TO END. It is written against the documented image-response
// shape, but no request has been made against the live API, so the response
// parsing below is the part to watch on first run. Enable it on a handful of
// products before turning it on for an import.

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

const PROMPT = [
  "Remove the background from this product photograph completely.",
  "Keep the product itself pixel-accurate: do not redraw, restyle, relight or crop it,",
  "and do not add any shadow, reflection or backdrop.",
  "Return the product isolated on a fully transparent background as a PNG.",
].join(" ");

/**
 * @param {object} options
 * @param {string} options.apiKey
 * @param {string} [options.model] image-capable Gemini model
 * @param {number} [options.timeoutMs]
 * @returns {(buffer: Buffer, meta: { contentType: string }) => Promise<Buffer|null>}
 */
export const createGeminiBackgroundRemover = ({
  apiKey,
  model = process.env.PRODUCT_IMAGE_BACKGROUND_MODEL || "gemini-2.5-flash-image",
  timeoutMs = Number(process.env.PRODUCT_IMAGE_BACKGROUND_TIMEOUT_MS || 45000),
} = {}) => {
  if (!apiKey) return null;

  return async (buffer, { contentType = "image/webp" } = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: contentType, data: buffer.toString("base64") } },
            ],
          }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
      });
    } catch (error) {
      // Read the status, never the body: a provider error echoes the request,
      // and the URL carries the API key.
      throw new Error(error?.name === "AbortError"
        ? "Background removal timed out"
        : "Background removal request failed");
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new Error(`Background removal provider responded with ${response.status}`);
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const image = parts.find((part) => part?.inline_data?.data || part?.inlineData?.data);
    const base64 = image?.inline_data?.data || image?.inlineData?.data;

    // No image in the response is a normal outcome, not an error: the model can
    // decline. The caller keeps the plain image.
    return base64 ? Buffer.from(base64, "base64") : null;
  };
};
