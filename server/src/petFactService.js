// src/petFactService.js — the only way a pet fact is written.
//
// Route handlers do not touch pet_facts. They call this, and this enforces the
// registry, the type, the unit, the species, the provenance, the lifecycle, the
// temporal rules, the conflict rules and ownership — in that order, in one
// transaction, with the event written inside it.
//
// The decisions themselves live in two pure modules (petFactRegistry.js,
// petFactResolution.js) so they are unit-tested without a database. What is
// here is the part that needs one: locking the open rows for a key, applying
// the planned writes, and recording the audit trail.

import { randomUUID } from "node:crypto";

import { EVENT_TYPES, emitEvent } from "./events.js";
import {
  REJECTIONS,
  convertToCanonicalUnit,
  normalizeTextValue,
  validateFactWrite,
} from "./petFactRegistry.js";
import { OUTCOMES, planFactWrite } from "./petFactResolution.js";

const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const fail = (message, statusCode = 400, code = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  throw error;
};

// A rejection from the registry is the caller's fault, not the server's, and
// the code is part of the contract: a client showing "unit not accepted" needs
// to tell it apart from "this key does not exist".
const REJECTION_STATUS = Object.freeze({
  [REJECTIONS.UNKNOWN_FACT_KEY]: 404,
  [REJECTIONS.KEY_DEPRECATED]: 409,
  [REJECTIONS.SPECIES_NOT_APPLICABLE]: 422,
  [REJECTIONS.SOURCE_NOT_ALLOWED]: 403,
  [REJECTIONS.DERIVED_KEY_SINGLE_WRITER]: 403,
  [REJECTIONS.INVALID_FACT_VALUE]: 400,
  [REJECTIONS.INVALID_UNIT]: 400,
});

// Which observations produce a fact, and which key. Deliberately short: a
// single chest measurement is a fact about the animal, a single walk distance
// is not — only an aggregate over a window says anything, and that window does
// not exist yet.
const FACT_PRODUCING_OBSERVATIONS = Object.freeze({
  weight: { namespace: "physical", key: "weight" },
  wingspan: { namespace: "physical", key: "wingspan" },
});

// The canonical unit each observation type is stored in.
const OBSERVATION_UNITS = Object.freeze({
  weight: "g",
  temperature: "C",
  neck_girth: "cm",
  chest_girth: "cm",
  back_length: "cm",
  height_withers: "cm",
  body_length: "cm",
  wingspan: "cm",
  enclosure_width: "cm",
  enclosure_depth: "cm",
  enclosure_height: "cm",
  walk_distance: "m",
  walk_duration: "s",
  step_count: "count",
  enrichment_duration: "s",
  encounter: null,
});

const OBSERVATION_METHODS = new Set([
  "manual", "scale", "tape", "document_extraction", "device",
]);

const OBSERVATION_SOURCES = new Set([
  "USER_PROVIDED", "VET_DOCUMENT", "VET_CONFIRMED", "ACTIVITY_DERIVED", "SYSTEM_DERIVED",
]);

const FACT_COLUMNS = `
  id, pet_id, definition_id, namespace, key, value_type,
  value_text, value_number, value_boolean, value_date, value_timestamp,
  value_json, value_ref_type, value_ref_id, unit, normalized_value,
  source_type, source_id, source_channel, source_timestamp,
  confidence, verification_status,
  observed_at, effective_from, effective_to, status, superseded_by_fact_id,
  derived_from, rule_version, ai_request_id, created_at, updated_at
`;

const typedValueOf = (row) => {
  switch (row.value_type) {
    case "number": return row.value_number === null ? null : Number(row.value_number);
    case "boolean": return row.value_boolean;
    case "date": return row.value_date;
    case "datetime": return row.value_timestamp;
    case "json": return row.value_json;
    case "ref": return row.value_ref_id;
    default: return row.value_text;
  }
};

/**
 * The API shape of a fact.
 *
 * Canonical value plus an explicit unit, never a formatted string: a formatted
 * number cannot be recomputed, compared or converted, and it breaks the moment
 * a second locale appears — the app is Hebrew-first with an English fallback,
 * so there already is one.
 */
export const serializePetFact = (row) => ({
  id: row.id,
  pet_id: row.pet_id,
  namespace: row.namespace,
  key: row.key,
  value_type: row.value_type,
  value: typedValueOf(row),
  unit: row.unit || null,
  ref_type: row.value_ref_type || null,
  source: {
    type: row.source_type,
    channel: row.source_channel,
    id: row.source_id || null,
    at: row.source_timestamp || null,
  },
  confidence: row.confidence || null,
  verification_status: row.verification_status,
  status: row.status,
  // The read-side name for anything closed: SUPERSEDED, RESOLVED or RETRACTED.
  // Not a status, because it says nothing about why it closed.
  historical: row.effective_to !== null,
  observed_at: row.observed_at || null,
  effective_from: row.effective_from,
  effective_to: row.effective_to,
  superseded_by_fact_id: row.superseded_by_fact_id || null,
  rule_version: row.rule_version || null,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export const serializePetObservation = (row) => ({
  id: row.id,
  pet_id: row.pet_id,
  observation_type: row.observation_type,
  value: row.value_number === null || row.value_number === undefined
    ? row.value_text
    : Number(row.value_number),
  unit: row.unit || null,
  // What the source actually said, so an extraction review can render "28.2 kg"
  // as it was written rather than as "28200 g".
  source_value: row.source_value === null || row.source_value === undefined
    ? null
    : Number(row.source_value),
  source_unit: row.source_unit || null,
  measured_at: row.measured_at,
  recorded_at: row.recorded_at,
  source: { type: row.source_type, id: row.source_id || null },
  method: row.method,
  confidence: row.confidence || null,
  context: row.context || {},
  note: row.note || null,
});

export const serializePetEvent = (row) => ({
  id: row.id,
  type: row.event_type,
  entity: { type: row.entity_type, id: row.entity_id },
  pet_id: row.pet_id,
  payload_version: row.payload_version,
  occurred_at: row.occurred_at,
  // The payload of a fact event carries the namespace and key, never the value.
  payload: row.payload || {},
});

/**
 * Build the service. The pool is injected rather than imported so the whole
 * thing can be driven by a fake client in a test, and so index.js keeps owning
 * the one pool the process has.
 */
export const createPetFactService = ({ pool }) => {
  // Definitions change only by migration, so caching them for the life of the
  // process is safe — and it keeps the registry check off the query path.
  const definitionCache = new Map();

  const loadDefinition = async (db, namespace, key) => {
    const cacheKey = `${namespace}/${key}`;
    if (definitionCache.has(cacheKey)) return definitionCache.get(cacheKey);
    const result = await db.query(
      "select * from public.pet_fact_definitions where namespace = $1 and key = $2 limit 1",
      [namespace, key],
    );
    const definition = result.rows[0] || null;
    definitionCache.set(cacheKey, definition);
    return definition;
  };

  /**
   * Resolve a pet the caller is allowed to touch.
   *
   * Every read and every write goes through this. A pet_id from a request is
   * an assertion, not an authorization — this is the line that turns it into
   * one, and it is why no route handler is given the pet id directly.
   */
  const requireOwnedPet = async (db, userId, petId) => {
    if (!uuidPattern.test(String(petId || ""))) fail("Pet not found", 404);
    const result = await db.query(
      "select id, type, name from public.pets where id = $1 and user_id = $2 limit 1",
      [petId, userId],
    );
    // 404 rather than 403: a pet belonging to someone else is not a pet this
    // caller may learn the existence of.
    if (!result.rows[0]) fail("Pet not found", 404);
    return result.rows[0];
  };

  const insertFact = async (client, petId, fact) => {
    const result = await client.query(
      `
        insert into public.pet_facts (
          id, pet_id, definition_id, namespace, key, value_type,
          value_text, value_number, value_boolean, value_date, value_timestamp,
          value_json, value_ref_type, value_ref_id, unit, normalized_value,
          source_type, source_id, source_channel, source_timestamp,
          confidence, verification_status,
          observed_at, effective_from, effective_to, status, superseded_by_fact_id,
          derived_from, rule_version, ai_request_id
        )
        values (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12::jsonb, $13, $14, $15, $16,
          $17, $18, $19, $20,
          $21, $22,
          $23, $24, $25, $26, $27,
          $28::jsonb, $29, $30
        )
        returning ${FACT_COLUMNS}
      `,
      [
        fact.id, petId, fact.definition_id, fact.namespace, fact.key, fact.value_type,
        fact.value_text, fact.value_number, fact.value_boolean, fact.value_date, fact.value_timestamp,
        fact.value_json === null || fact.value_json === undefined ? null : JSON.stringify(fact.value_json),
        fact.value_ref_type, fact.value_ref_id, fact.unit, fact.normalized_value,
        fact.source_type, fact.source_id, fact.source_channel, fact.source_timestamp,
        fact.confidence, fact.verification_status,
        fact.observed_at, fact.effective_from, fact.effective_to, fact.status, fact.superseded_by_fact_id,
        JSON.stringify(fact.derived_from || []), fact.rule_version, fact.ai_request_id,
      ],
    );
    return result.rows[0];
  };

  const recordTransition = async (client, factId, fromStatus, toStatus, { reason, actorType, actorId }) => {
    await client.query(
      `
        insert into public.pet_fact_transitions (fact_id, from_status, to_status, reason, actor_type, actor_id)
        values ($1, $2, $3, $4, $5, $6)
      `,
      [factId, fromStatus, toStatus, reason || null, actorType || "system", actorId || null],
    );
  };

  const applyOperations = async (client, petId, operations, { actorType, actorId }) => {
    const inserted = [];
    const closed = [];
    const disputed = [];

    // Inserts first: a close operation points its superseded_by_fact_id at the
    // new row, and that is a foreign key.
    for (const operation of operations.filter((op) => op.op === "insert")) {
      inserted.push(await insertFact(client, petId, operation.fact));
    }

    for (const operation of operations.filter((op) => op.op !== "insert")) {
      if (operation.op === "close") {
        const result = await client.query(
          `
            update public.pet_facts
            set status = $2,
                effective_to = $3,
                superseded_by_fact_id = $4,
                updated_at = now()
            where id = $1 and pet_id = $5
            returning ${FACT_COLUMNS}
          `,
          [operation.factId, operation.status, operation.effectiveTo, operation.supersededByFactId, petId],
        );
        if (result.rows[0]) {
          closed.push(result.rows[0]);
          await recordTransition(client, operation.factId, "CURRENT", operation.status, {
            reason: operation.reason, actorType, actorId,
          });
        }
        continue;
      }

      if (operation.op === "dispute") {
        const result = await client.query(
          `
            update public.pet_facts
            set status = 'DISPUTED', verification_status = 'DISPUTED', updated_at = now()
            where id = $1 and pet_id = $2 and effective_to is null
            returning ${FACT_COLUMNS}
          `,
          [operation.factId, petId],
        );
        if (result.rows[0]) {
          disputed.push(result.rows[0]);
          await recordTransition(client, operation.factId, "CURRENT", "DISPUTED", {
            reason: operation.reason, actorType, actorId,
          });
        }
      }
    }

    return { inserted, closed, disputed };
  };

  // Fact events name the key and never the value. See EVENT_TYPES.
  const emitFactEvents = async (client, petId, definition, { inserted, closed, disputed, outcome }) => {
    for (const fact of closed) {
      await emitEvent(client, {
        type: EVENT_TYPES.PET_FACT_SUPERSEDED,
        entityType: "pet_fact",
        entityId: fact.id,
        petId,
        payload: {
          namespace: fact.namespace,
          key: fact.key,
          superseded_by: fact.superseded_by_fact_id,
          reason: outcome,
        },
      });
    }

    for (const fact of inserted) {
      await emitEvent(client, {
        type: EVENT_TYPES.PET_FACT_CREATED,
        entityType: "pet_fact",
        entityId: fact.id,
        petId,
        payload: {
          namespace: fact.namespace,
          key: fact.key,
          source_type: fact.source_type,
          confidence: fact.confidence,
          is_sensitive: definition.is_sensitive === true,
          status: fact.status,
          outcome,
        },
      });
    }

    if (disputed.length > 0 || outcome === OUTCOMES.DISPUTED) {
      await emitEvent(client, {
        type: EVENT_TYPES.PET_FACT_DISPUTED,
        entityType: "pet_fact",
        entityId: inserted[0]?.id || disputed[0]?.id || null,
        petId,
        payload: {
          namespace: definition.namespace,
          key: definition.key,
          fact_ids: [...disputed.map((fact) => fact.id), ...inserted.map((fact) => fact.id)],
        },
      });
    }
  };

  /**
   * Write one fact, inside one transaction, with its event.
   *
   * The open rows for the key are locked before the plan is computed, so two
   * concurrent writes cannot both decide they are superseding the same value.
   */
  const writeFactWithClient = async (client, { pet, definition, input, actorType, actorId }) => {
    const validation = validateFactWrite({
      definition,
      species: pet.type,
      input,
    });
    if (!validation.ok) {
      fail(validation.message, REJECTION_STATUS[validation.code] || 400, validation.code);
    }

    const currentFacts = await client.query(
      `
        select ${FACT_COLUMNS}
        from public.pet_facts
        where pet_id = $1 and namespace = $2 and key = $3 and effective_to is null
        for update
      `,
      [pet.id, definition.namespace, definition.key],
    );

    const plan = planFactWrite({
      definition,
      incoming: validation.fact,
      currentFacts: currentFacts.rows,
      newFactId: randomUUID(),
    });

    if (plan.operations.length === 0) {
      // Nothing changed, so nothing is written and nothing is announced.
      // Recomputation is not news.
      const existing = currentFacts.rows[0] || null;
      return { outcome: plan.outcome, fact: existing ? serializePetFact(existing) : null };
    }

    const applied = await applyOperations(client, pet.id, plan.operations, { actorType, actorId });
    await emitFactEvents(client, pet.id, definition, { ...applied, outcome: plan.outcome });

    const primary = applied.inserted[0] || null;
    return { outcome: plan.outcome, fact: primary ? serializePetFact(primary) : null };
  };

  const writeFact = async (userId, petId, body = {}, { actorType = "user", actorId = null } = {}) => {
    const namespace = String(body.namespace || "").trim();
    const key = String(body.key || "").trim();
    if (!namespace || !key) fail("A namespace and key are required");

    const client = await pool.connect();
    try {
      await client.query("begin");
      const pet = await requireOwnedPet(client, userId, petId);
      const definition = await loadDefinition(client, namespace, key);
      const result = await writeFactWithClient(client, {
        pet,
        definition,
        input: body,
        actorType,
        actorId: actorId || userId,
      });
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  };

  const listFacts = async (userId, petId, { namespace = null, key = null, history = false } = {}) => {
    const pet = await requireOwnedPet(pool, userId, petId);
    const conditions = ["pet_id = $1"];
    const params = [pet.id];
    // The default read is the current value: effective_to is null, which is
    // exactly what the partial index covers.
    if (!history) conditions.push("effective_to is null");
    if (namespace) {
      params.push(namespace);
      conditions.push(`namespace = $${params.length}`);
    }
    if (key) {
      params.push(key);
      conditions.push(`key = $${params.length}`);
    }
    const result = await pool.query(
      `
        select ${FACT_COLUMNS}
        from public.pet_facts
        where ${conditions.join(" and ")}
        order by namespace, key, effective_from desc
      `,
      params,
    );
    return result.rows.map(serializePetFact);
  };

  const getFactHistory = async (userId, petId, namespace, key) => {
    const pet = await requireOwnedPet(pool, userId, petId);
    const result = await pool.query(
      `
        select ${FACT_COLUMNS}
        from public.pet_facts
        where pet_id = $1 and namespace = $2 and key = $3
        order by effective_from desc, created_at desc
      `,
      [pet.id, namespace, key],
    );
    return result.rows.map(serializePetFact);
  };

  /**
   * Move one fact through the lifecycle.
   *
   * confirm  a human has looked. This is the only way an extracted or inferred
   *          value gains standing — it is never a field on a create request.
   * resolve  the world changed and the record was right; the row keeps its
   *          effective period because it was true then.
   * retract  this should never have been recorded. Kept for audit, never
   *          re-proposed.
   */
  const updateFactLifecycle = async (userId, petId, factId, body = {}) => {
    const action = String(body.action || "").trim().toLowerCase();
    if (!["confirm", "resolve", "retract"].includes(action)) {
      fail("action must be confirm, resolve or retract");
    }
    if (!uuidPattern.test(String(factId || ""))) fail("Fact not found", 404);

    const client = await pool.connect();
    try {
      await client.query("begin");
      const pet = await requireOwnedPet(client, userId, petId);
      const existing = await client.query(
        `select ${FACT_COLUMNS} from public.pet_facts where id = $1 and pet_id = $2 for update`,
        [factId, pet.id],
      );
      const fact = existing.rows[0];
      if (!fact) fail("Fact not found", 404);
      if (fact.status === "RETRACTED") fail("This fact has been retracted", 409);

      const reason = body.reason ? String(body.reason).slice(0, 500) : null;
      let updated;

      if (action === "confirm") {
        if (fact.effective_to !== null) fail("Only an open fact can be confirmed", 409);
        // Confirming one side of a dispute settles it: the confirmed row
        // becomes current and the others are superseded by it. A human decided,
        // which is the only thing that can resolve a tie.
        const siblings = await client.query(
          `
            select ${FACT_COLUMNS}
            from public.pet_facts
            where pet_id = $1 and namespace = $2 and key = $3
              and effective_to is null and id <> $4
            for update
          `,
          [pet.id, fact.namespace, fact.key, fact.id],
        );

        updated = (await client.query(
          `
            update public.pet_facts
            set status = 'CURRENT',
                verification_status = $2,
                updated_at = now()
            where id = $1
            returning ${FACT_COLUMNS}
          `,
          [fact.id, body.by_vet === true ? "VET_CONFIRMED" : "USER_CONFIRMED"],
        )).rows[0];
        await recordTransition(client, fact.id, fact.status, "CURRENT", {
          reason: reason || "confirmed by the owner", actorType: "user", actorId: userId,
        });

        for (const sibling of siblings.rows) {
          if (sibling.status !== "DISPUTED") continue;
          await client.query(
            `
              update public.pet_facts
              set status = 'SUPERSEDED', effective_to = now(),
                  superseded_by_fact_id = $2, updated_at = now()
              where id = $1
            `,
            [sibling.id, fact.id],
          );
          await recordTransition(client, sibling.id, sibling.status, "SUPERSEDED", {
            reason: "a competing value was confirmed", actorType: "user", actorId: userId,
          });
        }

        await emitEvent(client, {
          type: EVENT_TYPES.PET_FACT_CONFIRMED,
          entityType: "pet_fact",
          entityId: fact.id,
          petId: pet.id,
          payload: { namespace: fact.namespace, key: fact.key, by: "owner" },
        });
      } else {
        if (fact.effective_to !== null) fail("This fact is already closed", 409);
        const status = action === "resolve" ? "RESOLVED" : "RETRACTED";
        updated = (await client.query(
          `
            update public.pet_facts
            set status = $2,
                effective_to = coalesce($3::timestamptz, now()),
                verification_status = case when $2 = 'RETRACTED' then 'REJECTED' else verification_status end,
                updated_at = now()
            where id = $1
            returning ${FACT_COLUMNS}
          `,
          [fact.id, status, body.effective_to || null],
        )).rows[0];
        await recordTransition(client, fact.id, fact.status, status, {
          reason, actorType: "user", actorId: userId,
        });
        await emitEvent(client, {
          type: status === "RESOLVED" ? EVENT_TYPES.PET_FACT_RESOLVED : EVENT_TYPES.PET_FACT_RETRACTED,
          entityType: "pet_fact",
          entityId: fact.id,
          petId: pet.id,
          payload: { namespace: fact.namespace, key: fact.key, effective_to: updated.effective_to },
        });
      }

      await client.query("commit");
      return serializePetFact(updated);
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  };

  /**
   * Record a measurement, and let it produce a fact where the contract says it
   * does — both in the same transaction, because an observation that silently
   * failed to update the current value is worse than one that was rejected.
   */
  const recordObservation = async (userId, petId, body = {}) => {
    const observationType = String(body.observation_type || body.type || "").trim();
    const canonicalUnit = OBSERVATION_UNITS[observationType];
    if (canonicalUnit === undefined) fail("Unknown observation type");

    const sourceType = String(body.source_type || "USER_PROVIDED").trim();
    // A purchase is an event and a photo is content; neither witnessed
    // anything. A model that reads a number off a page produces a VET_DOCUMENT
    // observation with method document_extraction — the document observed it,
    // the model transcribed it.
    if (!OBSERVATION_SOURCES.has(sourceType)) fail("This source cannot make an observation", 403);

    const method = String(body.method || "manual").trim();
    if (!OBSERVATION_METHODS.has(method)) fail("Unknown measurement method");

    const measuredAt = body.measured_at ? new Date(String(body.measured_at)) : new Date();
    if (Number.isNaN(measuredAt.getTime())) fail("A valid measured_at is required");
    // measured_at is when the world was like this. A reading from the future is
    // a typo, and accepting it would make it win every recency tie-break.
    if (measuredAt.getTime() > Date.now() + 60_000) fail("measured_at cannot be in the future");

    let valueNumber = null;
    let sourceValue = null;
    let sourceUnit = null;
    const valueText = body.value_text ? String(body.value_text).trim() : null;

    if (canonicalUnit) {
      sourceValue = Number(body.value);
      if (!Number.isFinite(sourceValue)) fail("A numeric value is required");
      sourceUnit = String(body.unit || canonicalUnit).trim();
      valueNumber = convertToCanonicalUnit(sourceValue, sourceUnit, canonicalUnit);
      if (valueNumber === null) fail(`Cannot convert ${sourceUnit} to ${canonicalUnit}`);
      if (valueNumber <= 0) fail("A measurement must be greater than zero");
    } else if (!valueText) {
      fail("A value is required");
    }

    const client = await pool.connect();
    try {
      await client.query("begin");
      const pet = await requireOwnedPet(client, userId, petId);

      const inserted = await client.query(
        `
          insert into public.pet_observations (
            pet_id, observation_type, value_number, unit, value_text,
            source_value, source_unit, measured_at, source_type, source_id,
            method, confidence, context, note
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14)
          returning *
        `,
        [
          pet.id, observationType, valueNumber, canonicalUnit, valueText,
          sourceValue, sourceUnit, measuredAt.toISOString(), sourceType,
          body.source_id ? String(body.source_id) : null,
          method,
          body.confidence || (method === "document_extraction" ? "MEDIUM" : "HIGH"),
          JSON.stringify(body.context && typeof body.context === "object" ? body.context : {}),
          body.note ? String(body.note).slice(0, 1000) : null,
        ],
      );
      const observation = inserted.rows[0];

      await emitEvent(client, {
        type: EVENT_TYPES.PET_OBSERVATION_RECORDED,
        entityType: "pet_observation",
        entityId: observation.id,
        petId: pet.id,
        payload: {
          observation_type: observation.observation_type,
          unit: observation.unit,
          method: observation.method,
          source_type: observation.source_type,
          measured_at: observation.measured_at,
        },
      });

      let fact = null;
      let outcome = null;
      const producesFact = FACT_PRODUCING_OBSERVATIONS[observationType];
      if (producesFact && valueNumber !== null) {
        const definition = await loadDefinition(client, producesFact.namespace, producesFact.key);
        const written = await writeFactWithClient(client, {
          pet,
          definition,
          input: {
            value: valueNumber,
            unit: canonicalUnit,
            source_type: sourceType,
            source_channel: sourceType === "VET_DOCUMENT" ? "DOCUMENT" : "APP",
            source_id: `observation:${observation.id}`,
            observed_at: observation.measured_at,
            effective_from: observation.measured_at,
            derived_from: [`pet_observations:${observation.id}`],
          },
          actorType: "user",
          actorId: userId,
        });
        fact = written.fact;
        outcome = written.outcome;
      }

      await client.query("commit");
      return { observation: serializePetObservation(observation), fact, outcome };
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  };

  const listObservations = async (userId, petId, { type = null, limit = 100 } = {}) => {
    const pet = await requireOwnedPet(pool, userId, petId);
    const params = [pet.id];
    let typeCondition = "";
    if (type) {
      params.push(type);
      typeCondition = `and observation_type = $${params.length}`;
    }
    params.push(Math.min(Math.max(Number(limit) || 100, 1), 500));
    const result = await pool.query(
      `
        select *
        from public.pet_observations
        where pet_id = $1 ${typeCondition}
        order by measured_at desc
        limit $${params.length}
      `,
      params,
    );
    return result.rows.map(serializePetObservation);
  };

  /**
   * The events recorded for one pet.
   *
   * Read straight from the outbox rather than from a second table: there is one
   * event mechanism, and pet_id is a column on it precisely so this query does
   * not need to know which entity types imply a pet.
   */
  const listEvents = async (userId, petId, { limit = 100 } = {}) => {
    const pet = await requireOwnedPet(pool, userId, petId);
    const result = await pool.query(
      `
        select id, event_type, entity_type, entity_id, pet_id, payload, payload_version, occurred_at
        from public.outbox_events
        where pet_id = $1
        order by occurred_at desc
        limit $2
      `,
      [pet.id, Math.min(Math.max(Number(limit) || 100, 1), 500)],
    );
    return result.rows.map(serializePetEvent);
  };

  return {
    requireOwnedPet,
    writeFact,
    listFacts,
    getFactHistory,
    updateFactLifecycle,
    recordObservation,
    listObservations,
    listEvents,
    // Exposed for the backfill, which needs the same gates as any other writer.
    writeFactWithClient,
    loadDefinition,
    normalizeTextValue,
  };
};
