// src/petFactRegistry.js — the write gate for pet facts.
//
// Pure: no database, no network, no clock beyond what the caller passes in, in
// the style of aiAccounting.js. Every rejection below is therefore a unit test
// rather than a convention someone has to remember.
//
// The registry itself lives in public.pet_fact_definitions and is filled by
// migration. This module does not know which keys exist; it is handed a
// definition and decides whether a write may proceed. That split is what lets
// the six gates be tested without a database and still be the only path a
// write can take.

// The seven source types. "SOCIAL" and "INTEGRATION" describe how a value
// arrived, not who asserts it, so they are channels below rather than sources.
export const SOURCE_TYPES = Object.freeze([
  "VET_CONFIRMED",
  "VET_DOCUMENT",
  "USER_PROVIDED",
  "SYSTEM_DERIVED",
  "ACTIVITY_DERIVED",
  "PURCHASE_DERIVED",
  "AI_INFERRED",
]);

// Rank for conflict resolution. Lower wins. This is the ordering for clinical
// and general keys; derived keys are not ranked at all because they have
// exactly one writer -- see petFactResolution.js.
export const SOURCE_RANK = Object.freeze({
  VET_CONFIRMED: 1,
  VET_DOCUMENT: 2,
  USER_PROVIDED: 3,
  SYSTEM_DERIVED: 4,
  ACTIVITY_DERIVED: 5,
  PURCHASE_DERIVED: 6,
  AI_INFERRED: 7,
});

export const SOURCE_CHANNELS = Object.freeze([
  "APP", "ADMIN", "DOCUMENT", "INTEGRATION", "SOCIAL", "ACTIVITY", "SYSTEM",
]);

// A level, never a number. A model logprob of 0.91 and an OCR character
// confidence of 0.91 are different quantities; they are never averaged and
// never compared across sources.
export const CONFIDENCE_LEVELS = Object.freeze([
  "VERIFIED", "HIGH", "MEDIUM", "LOW", "UNKNOWN",
]);

// Orthogonal to confidence: confidence is how sure the producer was,
// verification is who has since looked.
export const VERIFICATION_STATUSES = Object.freeze([
  "UNVERIFIED", "USER_CONFIRMED", "VET_CONFIRMED", "DOCUMENT_EXTRACTED",
  "DISPUTED", "REJECTED",
]);

// UNKNOWN is the absence of a row, not a status: never write a fact whose
// value is "we do not know". HISTORICAL is the read-side name for anything
// with effective_to set, not a status either.
export const FACT_STATUSES = Object.freeze([
  "CURRENT", "SUPERSEDED", "RESOLVED", "DISPUTED", "RETRACTED",
]);

export const VALUE_TYPES = Object.freeze([
  "number", "string", "boolean", "date", "datetime", "enum", "ref", "json",
]);

export const REJECTIONS = Object.freeze({
  UNKNOWN_FACT_KEY: "UNKNOWN_FACT_KEY",
  KEY_DEPRECATED: "KEY_DEPRECATED",
  SPECIES_NOT_APPLICABLE: "SPECIES_NOT_APPLICABLE",
  SOURCE_NOT_ALLOWED: "SOURCE_NOT_ALLOWED",
  DERIVED_KEY_SINGLE_WRITER: "DERIVED_KEY_SINGLE_WRITER",
  INVALID_FACT_VALUE: "INVALID_FACT_VALUE",
  INVALID_UNIT: "INVALID_UNIT",
});

// Conversion to the canonical unit, applied once at write time. Imperial units
// are accepted on input and never stored or displayed: Israel is metric, and
// accepting lb costs one line and prevents a mis-entry from a US label.
const UNIT_FACTORS = Object.freeze({
  g: { canonical: "g", factor: 1 },
  kg: { canonical: "g", factor: 1000 },
  lb: { canonical: "g", factor: 453.592 },
  oz: { canonical: "g", factor: 28.3495 },

  m: { canonical: "m", factor: 1 },
  km: { canonical: "m", factor: 1000 },
  mi: { canonical: "m", factor: 1609.34 },

  cm: { canonical: "cm", factor: 1 },
  mm: { canonical: "cm", factor: 0.1 },
  in: { canonical: "cm", factor: 2.54 },

  ml: { canonical: "ml", factor: 1 },
  l: { canonical: "ml", factor: 1000 },
  cup: { canonical: "ml", factor: 240 },

  s: { canonical: "s", factor: 1 },
  min: { canonical: "s", factor: 60 },
  h: { canonical: "s", factor: 3600 },

  kcal: { canonical: "kcal", factor: 1 },
  count: { canonical: "count", factor: 1 },
});

// Temperature is affine, not a factor, so it does not fit the table above.
const TEMPERATURE_UNITS = Object.freeze(["C", "F"]);

// Where the stored value is rounded. Never round at display and store the
// rounded value back -- that is how a 28.24 kg reading becomes 28.2, then 28.
const DECIMALS_BY_CANONICAL_UNIT = Object.freeze({
  g: 0, m: 0, s: 0, ml: 0, kcal: 0, count: 0, cm: 1, C: 1,
});

const roundTo = (value, decimals) => {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
};

/**
 * Convert a supplied value into the canonical unit for its quantity.
 *
 * Returns null when the units name different quantities or either is unknown —
 * a caller must treat that as INVALID_UNIT rather than as a zero.
 */
export const convertToCanonicalUnit = (value, fromUnit, canonicalUnit) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  const from = String(fromUnit || "").trim();
  const to = String(canonicalUnit || "").trim();
  if (!from || !to) return null;
  if (from === to) return roundTo(amount, DECIMALS_BY_CANONICAL_UNIT[to] ?? 3);

  if (TEMPERATURE_UNITS.includes(from) && TEMPERATURE_UNITS.includes(to)) {
    if (to !== "C") return null;
    return roundTo(from === "F" ? (amount - 32) * (5 / 9) : amount, 1);
  }

  const source = UNIT_FACTORS[from];
  if (!source || source.canonical !== to) return null;
  return roundTo(amount * source.factor, DECIMALS_BY_CANONICAL_UNIT[to] ?? 3);
};

// Confidence follows from the source, and is the producer's own assessment.
const CONFIDENCE_BY_SOURCE = Object.freeze({
  VET_CONFIRMED: "VERIFIED",
  VET_DOCUMENT: "HIGH",
  USER_PROVIDED: "HIGH",
  SYSTEM_DERIVED: "HIGH",
  ACTIVITY_DERIVED: "MEDIUM",
  PURCHASE_DERIVED: "LOW",
  AI_INFERRED: "LOW",
});

const VERIFICATION_BY_SOURCE = Object.freeze({
  VET_CONFIRMED: "VET_CONFIRMED",
  VET_DOCUMENT: "DOCUMENT_EXTRACTED",
});

/**
 * The comparison form of a text value, kept apart from what the source said.
 *
 * Deliberately shallow: case and whitespace only. Mapping "עוף", "chicken" and
 * "Chicken meal" onto one key needs an ingredient vocabulary, and inventing a
 * half-one here would produce confident wrong matches.
 */
export const normalizeTextValue = (value) => {
  const text = String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return text || null;
};

const reject = (code, message) => ({ ok: false, code, message });

const isPlainObject = (value) => (
  typeof value === "object" && value !== null && !Array.isArray(value)
);

// A Date is passed through rather than stringified: String(date) drops the
// milliseconds, and a fact written from a value the database just returned
// would come back a fraction of a second earlier than it was.
const parseTimestamp = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Validate a value against its definition and return the typed columns.
 *
 * Split out from validateFactWrite so the value rules can be tested on their
 * own, and so the observation path can reuse the unit handling.
 */
const validateValue = (definition, input) => {
  const { value_type: valueType } = definition;

  if (valueType === "number") {
    const canonicalUnit = definition.unit || null;
    let amount = Number(input.value);
    if (!Number.isFinite(amount)) {
      return reject(REJECTIONS.INVALID_FACT_VALUE, "A numeric value is required");
    }

    if (canonicalUnit) {
      const suppliedUnit = String(input.unit || canonicalUnit).trim();
      const allowed = definition.allowed_units || [];
      // An empty allowed_units means the canonical unit only. Accepting an
      // unlisted unit would make the stored number's meaning a guess.
      if (suppliedUnit !== canonicalUnit && !allowed.includes(suppliedUnit)) {
        return reject(REJECTIONS.INVALID_UNIT, `Unit ${suppliedUnit} is not accepted for this fact`);
      }
      const converted = convertToCanonicalUnit(amount, suppliedUnit, canonicalUnit);
      if (converted === null) {
        return reject(REJECTIONS.INVALID_UNIT, `Cannot convert ${suppliedUnit} to ${canonicalUnit}`);
      }
      amount = converted;
    } else if (input.unit) {
      return reject(REJECTIONS.INVALID_UNIT, "This fact has no unit");
    }

    // Range is checked after conversion, because the range is expressed in the
    // canonical unit: 120 kg is in range and 120 g is not.
    if (definition.min_value !== null && definition.min_value !== undefined
      && amount < Number(definition.min_value)) {
      return reject(REJECTIONS.INVALID_FACT_VALUE, "Value is below the allowed range");
    }
    if (definition.max_value !== null && definition.max_value !== undefined
      && amount > Number(definition.max_value)) {
      return reject(REJECTIONS.INVALID_FACT_VALUE, "Value is above the allowed range");
    }

    return { ok: true, columns: { value_number: amount, unit: canonicalUnit } };
  }

  if (valueType === "enum") {
    const text = String(input.value ?? "").trim();
    const allowed = definition.enum_values || [];
    if (!allowed.includes(text)) {
      return reject(REJECTIONS.INVALID_FACT_VALUE, "Value is not one of the allowed values");
    }
    return { ok: true, columns: { value_text: text, normalized_value: normalizeTextValue(text) } };
  }

  if (valueType === "string") {
    const text = String(input.value ?? "").trim();
    if (!text) return reject(REJECTIONS.INVALID_FACT_VALUE, "A value is required");
    if (definition.regex) {
      let pattern;
      try {
        pattern = new RegExp(definition.regex);
      } catch {
        return reject(REJECTIONS.INVALID_FACT_VALUE, "The definition's pattern is invalid");
      }
      if (!pattern.test(text)) {
        return reject(REJECTIONS.INVALID_FACT_VALUE, "Value does not match the required format");
      }
    }
    return { ok: true, columns: { value_text: text, normalized_value: normalizeTextValue(text) } };
  }

  if (valueType === "boolean") {
    if (typeof input.value !== "boolean") {
      return reject(REJECTIONS.INVALID_FACT_VALUE, "A boolean value is required");
    }
    return { ok: true, columns: { value_boolean: input.value } };
  }

  if (valueType === "date") {
    const text = String(input.value ?? "").trim();
    if (!DATE_ONLY.test(text) || Number.isNaN(new Date(`${text}T00:00:00Z`).getTime())) {
      return reject(REJECTIONS.INVALID_FACT_VALUE, "A YYYY-MM-DD date is required");
    }
    return { ok: true, columns: { value_date: text } };
  }

  if (valueType === "datetime") {
    const parsed = parseTimestamp(input.value);
    if (!parsed) return reject(REJECTIONS.INVALID_FACT_VALUE, "A valid timestamp is required");
    return { ok: true, columns: { value_timestamp: parsed.toISOString() } };
  }

  if (valueType === "ref") {
    const refId = String(input.value ?? "").trim();
    if (!UUID.test(refId)) {
      return reject(REJECTIONS.INVALID_FACT_VALUE, "A reference id is required");
    }
    return {
      ok: true,
      columns: { value_ref_type: definition.ref_entity, value_ref_id: refId },
    };
  }

  if (valueType === "json") {
    if (!isPlainObject(input.value) && !Array.isArray(input.value)) {
      return reject(REJECTIONS.INVALID_FACT_VALUE, "A JSON object or array is required");
    }
    return { ok: true, columns: { value_json: input.value } };
  }

  return reject(REJECTIONS.INVALID_FACT_VALUE, `Unsupported value type ${valueType}`);
};

/**
 * The six gates, in order. Nothing is written until all of them pass.
 *
 *   definition exists        -> UNKNOWN_FACT_KEY
 *   status ACTIVE            -> KEY_DEPRECATED
 *   species applicable       -> SPECIES_NOT_APPLICABLE
 *   source allowed           -> SOURCE_NOT_ALLOWED / DERIVED_KEY_SINGLE_WRITER
 *   value valid for its type -> INVALID_FACT_VALUE
 *   unit convertible         -> INVALID_UNIT
 *
 * @param {object|null} definition a row from pet_fact_definitions
 * @param {string} species pets.type for the pet being written to
 * @param {object} input { value, unit, source_type, source_channel, source_id,
 *                         observed_at, effective_from, confidence, note }
 * @returns {{ok: true, fact: object} | {ok: false, code: string, message: string}}
 */
export const validateFactWrite = ({ definition, species, input = {}, now = new Date() }) => {
  if (!definition) {
    return reject(REJECTIONS.UNKNOWN_FACT_KEY, "This fact key is not in the registry");
  }
  if (definition.status !== "ACTIVE") {
    return reject(REJECTIONS.KEY_DEPRECATED, "This fact key no longer accepts writes");
  }

  const allowedSpecies = definition.allowed_species || [];
  if (allowedSpecies.length > 0 && !allowedSpecies.includes(String(species || "").toLowerCase())) {
    return reject(
      REJECTIONS.SPECIES_NOT_APPLICABLE,
      "This fact does not apply to this species",
    );
  }

  const sourceType = String(input.source_type || "").trim();
  if (!SOURCE_TYPES.includes(sourceType)) {
    return reject(REJECTIONS.SOURCE_NOT_ALLOWED, "A known source type is required");
  }
  // A derived key has exactly one writer. A user who disagrees with a life
  // stage is disagreeing with the birth date, and the UI routes them there;
  // letting them overwrite the output is how pets.age died.
  if (definition.is_derived && sourceType !== "SYSTEM_DERIVED") {
    return reject(
      REJECTIONS.DERIVED_KEY_SINGLE_WRITER,
      "This value is derived and can only be written by the rule engine",
    );
  }
  const requiresSource = definition.requires_source || [];
  if (requiresSource.length > 0 && !requiresSource.includes(sourceType)) {
    return reject(REJECTIONS.SOURCE_NOT_ALLOWED, "This source may not assert this fact");
  }
  // Belt and braces over the definitions: no clinical key lists AI_INFERRED,
  // and if one ever did by accident this still refuses it.
  if (definition.is_sensitive && sourceType === "AI_INFERRED") {
    return reject(
      REJECTIONS.SOURCE_NOT_ALLOWED,
      "An inferred value cannot assert a clinical fact",
    );
  }

  const validated = validateValue(definition, input);
  if (!validated.ok) return validated;

  const sourceChannel = SOURCE_CHANNELS.includes(input.source_channel)
    ? input.source_channel
    : "APP";

  // observed_at is when the world was like this; effective_from is when it
  // started being true; created_at is when Mipo learned it. A March document
  // uploaded in September describes March, and the resolution tie-break has to
  // be able to see that.
  const observedAt = parseTimestamp(input.observed_at) || now;
  const effectiveFrom = parseTimestamp(input.effective_from) || observedAt;

  // Confidence belongs to the inputs of a derived value, not to the value:
  // derived_from already points at them, and a confidence here would be noise
  // on the one screen where confidence matters.
  const confidence = definition.is_derived
    ? null
    : (CONFIDENCE_LEVELS.includes(input.confidence)
      ? input.confidence
      : CONFIDENCE_BY_SOURCE[sourceType] || "UNKNOWN");

  return {
    ok: true,
    fact: {
      definition_id: definition.id,
      namespace: definition.namespace,
      key: definition.key,
      value_type: definition.value_type,
      value_text: null,
      value_number: null,
      value_boolean: null,
      value_date: null,
      value_timestamp: null,
      value_json: null,
      value_ref_type: null,
      value_ref_id: null,
      unit: null,
      normalized_value: null,
      ...validated.columns,
      source_type: sourceType,
      source_id: input.source_id ? String(input.source_id) : null,
      source_channel: sourceChannel,
      source_timestamp: parseTimestamp(input.source_timestamp)?.toISOString() || null,
      confidence,
      // Never taken from the caller: promoting an inference to "confirmed" is a
      // recorded human act, not a field on a create request.
      verification_status: VERIFICATION_BY_SOURCE[sourceType] || "UNVERIFIED",
      observed_at: observedAt.toISOString(),
      effective_from: effectiveFrom.toISOString(),
      derived_from: Array.isArray(input.derived_from) ? input.derived_from : [],
      rule_version: definition.is_derived ? (definition.rule_version || null) : null,
      ai_request_id: input.ai_request_id || null,
    },
  };
};
