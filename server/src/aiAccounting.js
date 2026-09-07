// Pure accounting helpers for the AI gateway.
//
// These are deliberately free of database and network access so they can be
// unit tested directly, and so the three quantities the gateway tracks stay
// visibly separate:
//
//   normalizeProviderUsage -> technical tokens, as the provider reported them
//   calculateMipoCredits   -> the product abstraction
//   calculateProviderCost  -> money, from a pinned pricing version
//
// Nothing here rounds tokens into credits into money in one step. Conflating
// them is the mistake this module exists to prevent.

const toNonNegativeInteger = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.round(parsed);
};

const toPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/**
 * Normalize a provider's usage report into Mipo's token shape.
 *
 * Gemini reports promptTokenCount / candidatesTokenCount / totalTokenCount and,
 * when context caching is in play, cachedContentTokenCount. OpenAI and
 * Anthropic use different names; each adapter maps its own into this shape
 * rather than leaking provider vocabulary into the ledger.
 *
 * Cached tokens are reported by Gemini as a subset of the prompt tokens, so
 * they are tracked alongside input rather than added to the total.
 */
export const normalizeProviderUsage = (usage = {}) => {
  const input = toNonNegativeInteger(usage.input_tokens);
  const output = toNonNegativeInteger(usage.output_tokens);
  const cached = toNonNegativeInteger(usage.cached_tokens);
  const reportedTotal = toNonNegativeInteger(usage.total_tokens);

  return {
    input_tokens: input,
    output_tokens: output,
    cached_tokens: cached,
    // Trust the provider's total when it gave one; it accounts for parts we
    // may not model (system instructions, tool schemas).
    total_tokens: reportedTotal || input + output,
  };
};

/**
 * Mipo credits are a product number, not a cost and not a token count. The rate
 * lives on the model row so it can be retuned without a code change.
 */
export const calculateMipoCredits = (usage, creditsPer1kTokens) => {
  const rate = Number(creditsPer1kTokens);
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  const total = toNonNegativeInteger(usage?.total_tokens);
  if (total === 0) return 0;
  // Four decimals matches the ledger column; a single cheap call should not
  // round away to zero.
  return Math.round((total / 1000) * rate * 10000) / 10000;
};

/**
 * Pick the pricing version that was in force at `at`.
 *
 * Rows are half-open windows: effective_from inclusive, effective_to exclusive,
 * and a null effective_to means "still current". Returns null when nothing
 * covers the instant, which the caller must treat as "cost unknown" rather than
 * silently pricing at zero.
 */
export const selectPricingVersion = (versions, at = new Date()) => {
  if (!Array.isArray(versions) || versions.length === 0) return null;
  const instant = at instanceof Date ? at.getTime() : new Date(at).getTime();
  if (!Number.isFinite(instant)) return null;

  const applicable = versions.filter((version) => {
    const from = new Date(version.effective_from).getTime();
    if (!Number.isFinite(from) || from > instant) return false;
    if (!version.effective_to) return true;
    const to = new Date(version.effective_to).getTime();
    return Number.isFinite(to) && to > instant;
  });

  if (applicable.length === 0) return null;

  // Most recently effective wins if windows overlap through bad data.
  return applicable.reduce((latest, version) => (
    new Date(version.effective_from).getTime() > new Date(latest.effective_from).getTime() ? version : latest
  ));
};

/**
 * Real provider cost for one call, in the pricing version's currency.
 *
 * Two shapes are supported: per-token models, and per-unit models such as image
 * generation. A version carrying neither prices to zero with `priced: false` so
 * the caller can tell "free" apart from "we do not know".
 */
export const calculateProviderCost = (usage, pricingVersion, { quantity = 1 } = {}) => {
  if (!pricingVersion) {
    return { provider_cost: 0, currency: "USD", priced: false };
  }

  const currency = pricingVersion.currency || "USD";
  const unitPrice = toPositiveNumber(pricingVersion.unit_price);

  if (unitPrice > 0) {
    const units = toPositiveNumber(quantity);
    return {
      provider_cost: Math.round(unitPrice * units * 1e8) / 1e8,
      currency,
      priced: true,
    };
  }

  const inputPrice = toPositiveNumber(pricingVersion.input_price_per_1m);
  const outputPrice = toPositiveNumber(pricingVersion.output_price_per_1m);
  const cachedPrice = toPositiveNumber(pricingVersion.cached_input_price_per_1m);

  if (inputPrice === 0 && outputPrice === 0 && cachedPrice === 0) {
    return { provider_cost: 0, currency, priced: false };
  }

  const cached = toNonNegativeInteger(usage?.cached_tokens);
  const input = toNonNegativeInteger(usage?.input_tokens);
  const output = toNonNegativeInteger(usage?.output_tokens);
  // Cached tokens are billed at the cached rate, and are a subset of input, so
  // charging both rates on the same tokens would overstate the cost.
  const billableInput = cachedPrice > 0 ? Math.max(0, input - cached) : input;

  const cost = (billableInput / 1e6) * inputPrice
    + (output / 1e6) * outputPrice
    + (cachedPrice > 0 ? (cached / 1e6) * cachedPrice : 0);

  return {
    provider_cost: Math.round(cost * 1e8) / 1e8,
    currency,
    priced: true,
  };
};

export const AI_ERROR_CLASS = Object.freeze({
  RETRYABLE: "retryable",
  FALLBACK: "fallback",
  NON_RETRYABLE: "non_retryable",
});

/**
 * Classify a provider failure.
 *
 * Retrying a malformed request just spends latency, and re-sending content that
 * one provider refused on safety grounds to a different provider is not a
 * resilience strategy - so neither is retryable. With a single provider
 * configured nothing acts on FALLBACK yet; the classification is recorded so
 * the router added in a later stage has the signal it needs.
 */
export const classifyProviderError = ({ status, code } = {}) => {
  const httpStatus = Number(status);

  if (code === "timeout" || code === "network") return AI_ERROR_CLASS.RETRYABLE;
  if (code === "safety" || code === "content_policy") return AI_ERROR_CLASS.NON_RETRYABLE;
  if (code === "invalid_request" || code === "invalid_schema") return AI_ERROR_CLASS.NON_RETRYABLE;

  if (httpStatus === 429) return AI_ERROR_CLASS.FALLBACK;
  if (httpStatus === 401 || httpStatus === 403) return AI_ERROR_CLASS.FALLBACK;
  if (httpStatus === 400 || httpStatus === 404 || httpStatus === 422) return AI_ERROR_CLASS.NON_RETRYABLE;
  if (httpStatus >= 500 && httpStatus <= 599) return AI_ERROR_CLASS.FALLBACK;

  return AI_ERROR_CLASS.NON_RETRYABLE;
};

const SECRET_PATTERNS = [
  /\bkey=[^&\s"']+/gi,
  /\b(api[_-]?key|authorization|bearer|token|secret)\b\s*[:=]\s*["']?[^\s"',}]+/gi,
  /\bAIza[0-9A-Za-z_-]{10,}/g,
  /\bsk-[0-9A-Za-z_-]{10,}/g,
];

/**
 * Make a provider error safe to persist and log.
 *
 * Provider errors quote the failing request, which for Mipo means pet health
 * details and, when the URL is echoed back, the API key in the query string.
 * Neither belongs in a ledger row or a log line.
 */
export const sanitizeProviderError = (message, maxLength = 300) => {
  let text = String(message ?? "").trim();
  if (!text) return null;
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, "[redacted]");
  }
  text = text.replace(/\s+/g, " ").trim();
  return text.slice(0, maxLength) || null;
};
