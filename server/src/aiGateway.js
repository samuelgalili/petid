// The AI Gateway.
//
// Every AI call in Mipo goes through runAiRequest. Features ask for a feature
// slug and a capability; they do not name a provider, hold a key, or touch the
// ledgers. That is the whole point of the seam: adding a provider, changing a
// model, or repricing a call must not require editing a product feature.
//
//   feature -> runAiRequest -> adapter -> provider
//                    |
//                    +-> ai_requests + usage_events + cost_events
//
// Accounting is written after the provider call, in one transaction, and is
// idempotent on the caller's request_id. A provider call cannot be part of a
// database transaction, so the design assumes the crash-after-success case and
// makes the retry safe rather than pretending the whole thing is atomic.

import { randomUUID } from "node:crypto";

import {
  calculateMipoCredits,
  calculateProviderCost,
  classifyProviderError,
  sanitizeProviderError,
  selectPricingVersion,
} from "./aiAccounting.js";

export const newTraceId = () => `trace_${randomUUID()}`;
export const newRequestId = () => `req_${randomUUID()}`;

// Small caches: the catalogue changes when an admin edits it, not per request.
const CATALOGUE_TTL_MS = 60 * 1000;

const createCatalogue = (pool) => {
  let cache = null;
  let loadedAt = 0;

  const load = async () => {
    const [models, features, pricing] = await Promise.all([
      pool.query(`
        select m.*, p.slug as provider_slug, p.id as provider_id, p.is_enabled as provider_enabled
        from public.ai_models m
        join public.ai_providers p on p.id = m.provider_id
      `),
      pool.query("select id, slug from public.ai_features"),
      pool.query("select * from public.ai_pricing_versions"),
    ]);

    const pricingByModel = new Map();
    for (const version of pricing.rows) {
      const list = pricingByModel.get(version.model_id) || [];
      list.push(version);
      pricingByModel.set(version.model_id, list);
    }

    return {
      modelsBySlug: new Map(models.rows.map((row) => [row.slug, row])),
      models: models.rows,
      featureIdBySlug: new Map(features.rows.map((row) => [row.slug, row.id])),
      pricingByModel,
    };
  };

  return {
    async get() {
      if (cache && Date.now() - loadedAt < CATALOGUE_TTL_MS) return cache;
      cache = await load();
      loadedAt = Date.now();
      return cache;
    },
    invalidate() {
      cache = null;
    },
  };
};

/**
 * Pick a model for a capability.
 *
 * With one provider configured this is a filter, not a contest, and that is
 * deliberate: a scoring function that ranks a single candidate is theatre. The
 * selection is isolated here so the later stage can add health, quota, latency
 * and cost terms without any caller noticing.
 */
const selectModel = (catalogue, { capability, model: requestedModel, registry }) => {
  if (requestedModel) {
    const exact = catalogue.modelsBySlug.get(requestedModel);
    if (exact) return exact;
  }

  const candidates = catalogue.models.filter((row) => (
    row.is_enabled
    && row.provider_enabled
    && (!capability || row.capabilities.includes(capability))
    && registry.get(row.provider_slug)?.isConfigured()
  ));

  if (candidates.length === 0) return null;
  // Stable order so the same request keeps hitting the same model.
  return candidates.sort((a, b) => a.slug.localeCompare(b.slug))[0];
};

export const createAiGateway = ({ pool, registry, logger = console }) => {
  const catalogue = createCatalogue(pool);

  const resolveFeatureId = async (featureSlug) => {
    if (!featureSlug) return null;
    const loaded = await catalogue.get();
    return loaded.featureIdBySlug.get(featureSlug) || null;
  };

  /**
   * Write ai_request + usage_event + cost_event as one unit.
   *
   * The unique constraints on ai_requests.request_id, usage_events.ai_request_id
   * and cost_events.usage_event_id are what make a replay safe: a retry of the
   * same request_id updates the request row and leaves exactly one usage event
   * and one cost event behind.
   */
  const recordAccounting = async ({
    requestId,
    traceId,
    userId,
    organizationId,
    petId,
    featureId,
    providerId,
    modelId,
    status,
    startedAt,
    completedAt,
    latencyMs,
    usage,
    credits,
    cost,
    pricingVersionId,
    quantity,
    unit,
    category,
    errorCode,
    safeErrorMessage,
    metadata,
  }) => {
    const client = await pool.connect();
    try {
      await client.query("begin");

      const requestRow = await client.query(
        `
          insert into public.ai_requests (
            request_id, trace_id, user_id, organization_id, pet_id, feature_id,
            provider_id, model_id, status, started_at, completed_at, latency_ms,
            input_tokens, output_tokens, cached_tokens, total_tokens,
            error_code, safe_error_message, metadata
          )
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb)
          on conflict (request_id) do update set
            status = excluded.status,
            completed_at = excluded.completed_at,
            latency_ms = excluded.latency_ms,
            input_tokens = excluded.input_tokens,
            output_tokens = excluded.output_tokens,
            cached_tokens = excluded.cached_tokens,
            total_tokens = excluded.total_tokens,
            error_code = excluded.error_code,
            safe_error_message = excluded.safe_error_message,
            attempt = public.ai_requests.attempt + 1,
            updated_at = now()
          returning id
        `,
        [
          requestId, traceId, userId, organizationId, petId, featureId,
          providerId, modelId, status, startedAt, completedAt, latencyMs,
          usage.input_tokens, usage.output_tokens, usage.cached_tokens, usage.total_tokens,
          errorCode, safeErrorMessage, JSON.stringify(metadata || {}),
        ],
      );
      const aiRequestId = requestRow.rows[0].id;

      // A failed call consumed no billable usage, so it gets a request row for
      // the trace and nothing in the ledgers.
      if (status !== "succeeded") {
        await client.query("commit");
        return { aiRequestId, usageEventId: null, costEventId: null };
      }

      const usageRow = await client.query(
        `
          insert into public.usage_events (
            ai_request_id, trace_id, user_id, organization_id, pet_id, feature_id,
            category, provider_id, model_id, quantity, unit,
            input_tokens, output_tokens, cached_tokens, total_tokens,
            mipo_credits_consumed, occurred_at
          )
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
          on conflict (ai_request_id) do nothing
          returning id
        `,
        [
          aiRequestId, traceId, userId, organizationId, petId, featureId,
          category, providerId, modelId, quantity, unit,
          usage.input_tokens, usage.output_tokens, usage.cached_tokens, usage.total_tokens,
          credits, completedAt,
        ],
      );

      // No row returned means this request_id already produced a usage event.
      // The replay stops here rather than writing a second cost event.
      if (usageRow.rowCount === 0) {
        await client.query("commit");
        return { aiRequestId, usageEventId: null, costEventId: null, duplicate: true };
      }
      const usageEventId = usageRow.rows[0].id;

      const costRow = await client.query(
        `
          insert into public.cost_events (
            usage_event_id, user_id, organization_id, pet_id, feature_id,
            provider_id, model_id, service, pricing_version_id,
            quantity, unit, provider_cost, currency, occurred_at
          )
          values ($1,$2,$3,$4,$5,$6,$7,'ai',$8,$9,$10,$11,$12,$13)
          on conflict (usage_event_id) do nothing
          returning id
        `,
        [
          usageEventId, userId, organizationId, petId, featureId,
          providerId, modelId, pricingVersionId,
          quantity, unit, cost.provider_cost, cost.currency, completedAt,
        ],
      );

      await client.query("commit");
      return { aiRequestId, usageEventId, costEventId: costRow.rows[0]?.id || null };
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  };

  /**
   * Execute one AI call and account for it.
   *
   * `parts` is the provider-neutral content payload. Prompts and responses are
   * never written to the ledger tables - only how much was consumed.
   */
  const runAiRequest = async ({
    feature,
    capability = "chat",
    model: requestedModel,
    parts,
    temperature,
    timeoutMs,
    userId = null,
    organizationId = null,
    petId = null,
    requestId = newRequestId(),
    traceId = newTraceId(),
    metadata = {},
  }) => {
    const loaded = await catalogue.get();
    const featureId = await resolveFeatureId(feature);
    const modelRow = selectModel(loaded, { capability, model: requestedModel, registry });

    if (!modelRow) {
      const error = new Error("No AI model is available for this capability");
      error.statusCode = 503;
      error.code = "no_model_available";
      throw error;
    }

    const adapter = registry.get(modelRow.provider_slug);
    const startedAt = new Date();
    let result;
    let failure = null;

    try {
      result = await adapter.generateJson({
        parts,
        temperature,
        timeoutMs,
        model: modelRow.provider_model_name,
      });
    } catch (error) {
      failure = error;
    }

    const completedAt = new Date();
    const latencyMs = completedAt.getTime() - startedAt.getTime();

    if (failure) {
      const errorClass = classifyProviderError({ status: failure.status, code: failure.code });
      const safeMessage = sanitizeProviderError(failure.message);

      // Accounting must never be the reason a user-facing call fails, so a
      // ledger write failure is logged and swallowed - the provider error is
      // what the caller needs to see.
      await recordAccounting({
        requestId,
        traceId,
        userId,
        organizationId,
        petId,
        featureId,
        providerId: modelRow.provider_id,
        modelId: modelRow.id,
        status: failure.code === "timeout" ? "timed_out" : "failed",
        startedAt,
        completedAt,
        latencyMs,
        usage: { input_tokens: 0, output_tokens: 0, cached_tokens: 0, total_tokens: 0 },
        credits: 0,
        cost: { provider_cost: 0, currency: "USD" },
        pricingVersionId: null,
        quantity: 0,
        unit: "tokens",
        category: "ai",
        errorCode: failure.code || "provider_error",
        safeErrorMessage: safeMessage,
        metadata: { ...metadata, error_class: errorClass, capability },
      }).catch((ledgerError) => {
        logger.error("ai_request_ledger_write_failed", { request_id: requestId, message: ledgerError.message });
      });

      const outward = new Error(safeMessage || "AI request failed");
      outward.statusCode = failure.status && failure.status < 500 ? 502 : 502;
      outward.code = failure.code || "provider_error";
      throw outward;
    }

    const usage = result.usage;
    const credits = calculateMipoCredits(usage, modelRow.credits_per_1k_tokens);
    const pricingVersion = selectPricingVersion(
      loaded.pricingByModel.get(modelRow.id) || [],
      completedAt,
    );
    const cost = calculateProviderCost(usage, pricingVersion);

    if (!cost.priced) {
      // Silence here would show up as a suspiciously cheap month.
      logger.warn("ai_request_unpriced", {
        request_id: requestId,
        model: modelRow.slug,
        reason: pricingVersion ? "pricing_version_has_no_rates" : "no_pricing_version_in_effect",
      });
    }

    const accounting = await recordAccounting({
      requestId,
      traceId,
      userId,
      organizationId,
      petId,
      featureId,
      providerId: modelRow.provider_id,
      modelId: modelRow.id,
      status: "succeeded",
      startedAt,
      completedAt,
      latencyMs,
      usage,
      credits,
      cost,
      pricingVersionId: pricingVersion?.id || null,
      quantity: usage.total_tokens,
      unit: "tokens",
      category: "ai",
      errorCode: null,
      safeErrorMessage: null,
      metadata: { ...metadata, capability },
    }).catch((ledgerError) => {
      logger.error("ai_request_ledger_write_failed", { request_id: requestId, message: ledgerError.message });
      return null;
    });

    // Structured, and carrying no prompt content or credentials.
    logger.info("ai_request", {
      request_id: requestId,
      trace_id: traceId,
      feature,
      capability,
      provider: modelRow.provider_slug,
      model: modelRow.slug,
      latency_ms: latencyMs,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cached_tokens: usage.cached_tokens,
      total_tokens: usage.total_tokens,
      mipo_credits: credits,
      provider_cost: cost.provider_cost,
      currency: cost.currency,
    });

    return {
      text: result.text,
      json: result.json,
      usage,
      credits,
      cost,
      model: modelRow.slug,
      provider: modelRow.provider_slug,
      request_id: requestId,
      trace_id: traceId,
      ai_request_id: accounting?.aiRequestId || null,
    };
  };

  /**
   * Record consumption that did not go through an adapter.
   *
   * Pet character art is generated through the Google SDK with its own Vertex
   * credential resolution, and non-AI services (WhatsApp, OCR, storage) have no
   * adapter at all. Those still belong in one ledger, so they are metered here
   * without pretending the gateway executed them.
   */
  const recordExternalUsage = async ({
    feature,
    category = "other",
    modelSlug = null,
    quantity = 1,
    unit = "unit",
    usage = { input_tokens: 0, output_tokens: 0, cached_tokens: 0, total_tokens: 0 },
    userId = null,
    organizationId = null,
    petId = null,
    requestId = newRequestId(),
    traceId = newTraceId(),
    metadata = {},
  }) => {
    const loaded = await catalogue.get();
    const featureId = await resolveFeatureId(feature);
    const modelRow = modelSlug ? loaded.modelsBySlug.get(modelSlug) || null : null;
    const now = new Date();

    const pricingVersion = modelRow
      ? selectPricingVersion(loaded.pricingByModel.get(modelRow.id) || [], now)
      : null;
    const cost = calculateProviderCost(usage, pricingVersion, { quantity });
    const credits = modelRow ? calculateMipoCredits(usage, modelRow.credits_per_1k_tokens) : 0;

    return recordAccounting({
      requestId,
      traceId,
      userId,
      organizationId,
      petId,
      featureId,
      providerId: modelRow?.provider_id || null,
      modelId: modelRow?.id || null,
      status: "succeeded",
      startedAt: now,
      completedAt: now,
      latencyMs: null,
      usage,
      credits,
      cost,
      pricingVersionId: pricingVersion?.id || null,
      quantity,
      unit,
      category,
      errorCode: null,
      safeErrorMessage: null,
      metadata,
    });
  };

  return {
    runAiRequest,
    recordExternalUsage,
    invalidateCatalogue: () => catalogue.invalidate(),
    selectModelForTest: (options) => catalogue.get().then((loaded) => selectModel(loaded, { ...options, registry })),
  };
};
