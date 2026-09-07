// Provider adapters.
//
// An adapter's job is to speak one provider's dialect and hand back a single
// Mipo shape:
//
//   { text, json, usage, provider_model_name, raw_finish_reason }
//
// Only Google Gemini is implemented, because only Gemini is integrated and
// credentialed. The interface below is what an OpenAI or Anthropic adapter has
// to satisfy; adding one is a new file plus a catalogue row, with no change to
// any calling feature.
//
// @typedef {object} AIProviderAdapter
// @property {string} slug                     - matches ai_providers.slug
// @property {(req) => Promise<AIResponse>} generateJson
// @property {() => Promise<ProviderHealth>} healthCheck

import { normalizeProviderUsage, sanitizeProviderError } from "./aiAccounting.js";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export class AIProviderError extends Error {
  constructor(message, { status = null, code = null, cause = null } = {}) {
    // Sanitised at construction so an unsanitised provider string cannot reach
    // a log or a ledger row by way of some later `error.message` read.
    super(sanitizeProviderError(message) || "Provider request failed");
    this.name = "AIProviderError";
    this.status = status;
    this.code = code;
    if (cause) this.cause = cause;
  }
}

const fetchWithTimeout = async (url, init = {}, timeoutMs = 45000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new AIProviderError("Provider request timed out", { code: "timeout" });
    }
    throw new AIProviderError("Provider request could not be completed", { code: "network", cause: error });
  } finally {
    clearTimeout(timer);
  }
};

const parseJsonText = (text) => {
  const raw = String(text || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced?.[1] || raw.match(/\{[\s\S]*\}/)?.[0];
    if (!candidate) return null;
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }
};

// Gemini reports its own token vocabulary; map it once, here.
const readGeminiUsage = (data) => normalizeProviderUsage({
  input_tokens: data?.usageMetadata?.promptTokenCount,
  output_tokens: data?.usageMetadata?.candidatesTokenCount,
  cached_tokens: data?.usageMetadata?.cachedContentTokenCount,
  total_tokens: data?.usageMetadata?.totalTokenCount,
});

export const createGeminiAdapter = ({ apiKey, defaultModel = "gemini-2.5-flash" } = {}) => ({
  slug: "google-gemini",

  isConfigured: () => Boolean(apiKey),

  async generateJson({ parts, temperature = 0.25, model, timeoutMs = 65000 } = {}) {
    if (!apiKey) {
      throw new AIProviderError("Gemini is not configured", { status: 503, code: "not_configured" });
    }

    const providerModel = model || defaultModel;
    const response = await fetchWithTimeout(
      `${GEMINI_ENDPOINT}/${encodeURIComponent(providerModel)}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: { temperature, responseMimeType: "application/json" },
        }),
      },
      timeoutMs,
    );

    if (!response.ok) {
      // The body echoes the request, which for Mipo can include pet health
      // details, and the URL carries the API key. Read the status, not the body.
      throw new AIProviderError(`Gemini request failed (${response.status})`, {
        status: response.status,
        code: response.status === 429 ? "rate_limited" : "provider_error",
      });
    }

    const data = await response.json();
    const blockReason = data?.promptFeedback?.blockReason;
    if (blockReason) {
      throw new AIProviderError(`Gemini blocked the request (${blockReason})`, { code: "safety" });
    }

    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";

    return {
      text,
      json: parseJsonText(text),
      usage: readGeminiUsage(data),
      provider_model_name: providerModel,
      finish_reason: data.candidates?.[0]?.finishReason || null,
    };
  },

  async healthCheck() {
    if (!apiKey) return { status: "disabled", checked_at: new Date().toISOString() };
    try {
      const response = await fetchWithTimeout(`${GEMINI_ENDPOINT}?key=${apiKey}`, { method: "GET" }, 10000);
      if (response.ok) return { status: "healthy", checked_at: new Date().toISOString() };
      return {
        status: response.status === 429 ? "degraded" : "failed",
        // Status only: the body and URL both carry things that must not be stored.
        detail: `HTTP ${response.status}`,
        checked_at: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "failed",
        detail: sanitizeProviderError(error?.message),
        checked_at: new Date().toISOString(),
      };
    }
  },
});

/**
 * Adapters keyed by ai_providers.slug. The gateway resolves through this map,
 * never by importing an adapter directly, so a second provider is a
 * registration rather than an edit to every call site.
 */
export const createProviderRegistry = ({ geminiApiKey, geminiModel } = {}) => {
  const registry = new Map();
  registry.set("google-gemini", createGeminiAdapter({ apiKey: geminiApiKey, defaultModel: geminiModel }));
  return {
    get: (slug) => registry.get(slug) || null,
    list: () => [...registry.values()],
    slugs: () => [...registry.keys()],
  };
};
