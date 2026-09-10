// The domain service: ownership, transactions, and the shape the API returns.
//
// The rules themselves are tested in petFactRegistry.test.js and
// petFactResolution.test.js, which need no database. What is left here is the
// part that talks to one, so the pool is a fake that records every query. That
// is enough to prove the things that matter most and cannot be seen from the
// pure modules: that a pet is resolved by owner rather than by id alone, that a
// bad request never reaches the database at all, and that a failure rolls back.
//
// The end-to-end behaviour against a real PostgreSQL 16 is covered by
// scripts/petFactsIntegrationCheck.mjs.

import assert from "node:assert/strict";
import test from "node:test";

import {
  createPetFactService,
  serializePetEvent,
  serializePetFact,
  serializePetObservation,
} from "../src/petFactService.js";

const OWNER = "11111111-1111-4111-8111-111111111111";
const STRANGER = "22222222-2222-4222-8222-222222222222";
const PET = "33333333-3333-4333-8333-333333333333";

/**
 * A pool that answers from a list of handlers and records what it was asked.
 * Any query with no handler returns no rows, which is the honest default: a
 * caller that depends on rows it never arranged should fail.
 */
const fakePool = (handlers = []) => {
  const queries = [];
  const query = async (text, params = []) => {
    queries.push({ text: String(text).replace(/\s+/g, " ").trim(), params });
    const handler = handlers.find((candidate) => candidate.match.test(text));
    if (handler?.throws) throw handler.throws;
    return { rows: handler ? handler.rows : [] };
  };
  const pool = {
    queries,
    query,
    connect: async () => ({ query, release: () => {} }),
  };
  return pool;
};

const petHandler = (rows = [{ id: PET, type: "dog", name: "Blue" }]) => ({
  match: /from public\.pets/,
  rows,
});

const expectRejection = async (fn, { statusCode, message }) => {
  try {
    await fn();
    assert.fail("expected a rejection");
  } catch (error) {
    if (statusCode !== undefined) assert.equal(error.statusCode, statusCode);
    if (message !== undefined) assert.ok(String(error.message).includes(message), error.message);
    return error;
  }
  return null;
};

// --- ownership ---------------------------------------------------------------

test("a pet is resolved by owner, not by id alone", async () => {
  // The pet id in a request is an assertion by the caller. This is the query
  // that turns it into an authorization, and it must always carry the user.
  const pool = fakePool([petHandler()]);
  const service = createPetFactService({ pool });
  await service.listFacts(OWNER, PET);

  const petQuery = pool.queries.find((entry) => entry.text.includes("from public.pets"));
  assert.ok(petQuery.text.includes("where id = $1 and user_id = $2"), petQuery.text);
  assert.deepEqual(petQuery.params, [PET, OWNER]);
});

test("another owner's pet is 404, not 403", async () => {
  // A 403 would confirm that the pet exists, which is itself a disclosure.
  const pool = fakePool([petHandler([])]);
  const service = createPetFactService({ pool });
  const error = await expectRejection(() => service.listFacts(STRANGER, PET), {
    statusCode: 404, message: "Pet not found",
  });
  assert.equal(error.message.includes("permission"), false);
});

test("every entry point resolves the pet before doing anything else", async () => {
  const service = (pool) => createPetFactService({ pool });
  const calls = [
    (s) => s.listFacts(STRANGER, PET),
    (s) => s.getFactHistory(STRANGER, PET, "physical", "weight"),
    (s) => s.listObservations(STRANGER, PET),
    (s) => s.listEvents(STRANGER, PET),
    (s) => s.writeFact(STRANGER, PET, {
      namespace: "health", key: "note", value: "x", source_type: "USER_PROVIDED",
    }),
    (s) => s.recordObservation(STRANGER, PET, {
      observation_type: "weight", value: 10, unit: "kg",
    }),
    (s) => s.updateFactLifecycle(STRANGER, PET, OWNER, { action: "retract" }),
  ];

  for (const call of calls) {
    const pool = fakePool([petHandler([])]);
    await expectRejection(() => call(service(pool)), { statusCode: 404 });
  }
});

test("a malformed pet id never reaches the database", async () => {
  const pool = fakePool([petHandler()]);
  const service = createPetFactService({ pool });
  await expectRejection(() => service.listFacts(OWNER, "not-a-uuid"), { statusCode: 404 });
  assert.deepEqual(pool.queries, []);
});

// --- rejections happen before any write --------------------------------------

test("an unknown observation type is refused without opening a transaction", async () => {
  const pool = fakePool([petHandler()]);
  const service = createPetFactService({ pool });
  await expectRejection(() => service.recordObservation(OWNER, PET, {
    observation_type: "mood", value: 3,
  }), { statusCode: 400, message: "Unknown observation type" });
  assert.deepEqual(pool.queries, []);
});

test("a model cannot make an observation", async () => {
  // AI is a transcriber of observations, never an observer. An observation with
  // no witness is an inference.
  const pool = fakePool([petHandler()]);
  const service = createPetFactService({ pool });
  await expectRejection(() => service.recordObservation(OWNER, PET, {
    observation_type: "weight", value: 10, unit: "kg", source_type: "AI_INFERRED",
  }), { statusCode: 403 });
  assert.deepEqual(pool.queries, []);
});

test("a purchase cannot make an observation either", async () => {
  const pool = fakePool([petHandler()]);
  const service = createPetFactService({ pool });
  await expectRejection(() => service.recordObservation(OWNER, PET, {
    observation_type: "weight", value: 10, unit: "kg", source_type: "PURCHASE_DERIVED",
  }), { statusCode: 403 });
});

test("a measurement from the future is refused", async () => {
  // Accepting one would make it win every recency tie-break for as long as it
  // stayed in the future.
  const pool = fakePool([petHandler()]);
  const service = createPetFactService({ pool });
  await expectRejection(() => service.recordObservation(OWNER, PET, {
    observation_type: "weight", value: 10, unit: "kg",
    measured_at: new Date(Date.now() + 86_400_000).toISOString(),
  }), { statusCode: 400, message: "future" });
});

test("an unconvertible unit is refused before the insert", async () => {
  const pool = fakePool([petHandler()]);
  const service = createPetFactService({ pool });
  await expectRejection(() => service.recordObservation(OWNER, PET, {
    observation_type: "weight", value: 10, unit: "stone",
  }), { statusCode: 400, message: "Cannot convert" });
  assert.deepEqual(pool.queries, []);
});

test("a write with no namespace or key is refused", async () => {
  const pool = fakePool([petHandler()]);
  const service = createPetFactService({ pool });
  await expectRejection(() => service.writeFact(OWNER, PET, { value: 1 }), {
    statusCode: 400, message: "namespace and key",
  });
  assert.deepEqual(pool.queries, []);
});

test("an unknown lifecycle action is refused", async () => {
  const pool = fakePool([petHandler()]);
  const service = createPetFactService({ pool });
  await expectRejection(() => service.updateFactLifecycle(OWNER, PET, OWNER, {
    action: "delete",
  }), { statusCode: 400, message: "confirm, resolve or retract" });
  assert.deepEqual(pool.queries, []);
});

// --- transactions ------------------------------------------------------------

test("a failed write rolls back rather than leaving half of it behind", async () => {
  // An observation without its fact, or a fact without its event, is worse than
  // a rejected request: nothing downstream can tell that it happened.
  const pool = fakePool([
    petHandler(),
    { match: /insert into public\.pet_observations/, throws: new Error("boom") },
  ]);
  const service = createPetFactService({ pool });
  await expectRejection(() => service.recordObservation(OWNER, PET, {
    observation_type: "weight", value: 10, unit: "kg",
  }), { message: "boom" });

  const statements = pool.queries.map((entry) => entry.text);
  assert.ok(statements.includes("begin"));
  assert.ok(statements.includes("rollback"));
  assert.equal(statements.includes("commit"), false);
});

test("a write opens exactly one transaction", async () => {
  const pool = fakePool([
    petHandler(),
    { match: /from public\.pet_fact_definitions/, rows: [] },
  ]);
  const service = createPetFactService({ pool });
  await expectRejection(() => service.writeFact(OWNER, PET, {
    namespace: "physical", key: "nonexistent", value: 1, source_type: "USER_PROVIDED",
  }), { statusCode: 404 });

  const begins = pool.queries.filter((entry) => entry.text === "begin");
  assert.equal(begins.length, 1);
});

test("an unregistered key is a 404 from the service, with its code", async () => {
  const pool = fakePool([petHandler(), { match: /pet_fact_definitions/, rows: [] }]);
  const service = createPetFactService({ pool });
  const error = await expectRejection(() => service.writeFact(OWNER, PET, {
    namespace: "preference", key: "favorite_blue_number", value: 7, source_type: "USER_PROVIDED",
  }), { statusCode: 404 });
  assert.equal(error.code, "UNKNOWN_FACT_KEY");
});

// --- reads -------------------------------------------------------------------

test("the default read is the current value, not the history", async () => {
  const pool = fakePool([petHandler()]);
  const service = createPetFactService({ pool });
  await service.listFacts(OWNER, PET);
  const read = pool.queries.find((entry) => entry.text.includes("from public.pet_facts"));
  assert.ok(read.text.includes("effective_to is null"), read.text);
});

test("history is opt-in and returns closed rows too", async () => {
  const pool = fakePool([petHandler()]);
  const service = createPetFactService({ pool });
  await service.listFacts(OWNER, PET, { history: true });
  const read = pool.queries.find((entry) => entry.text.includes("from public.pet_facts"));
  assert.equal(read.text.includes("effective_to is null"), false);
});

test("a namespace and key filter are parameters, never interpolated", async () => {
  const pool = fakePool([petHandler()]);
  const service = createPetFactService({ pool });
  await service.listFacts(OWNER, PET, { namespace: "physical", key: "weight" });
  const read = pool.queries.find((entry) => entry.text.includes("from public.pet_facts"));
  assert.ok(read.text.includes("namespace = $2"));
  assert.ok(read.text.includes("key = $3"));
  assert.deepEqual(read.params, [PET, "physical", "weight"]);
});

test("a caller cannot ask for an unbounded number of rows", async () => {
  const pool = fakePool([petHandler()]);
  const service = createPetFactService({ pool });
  await service.listObservations(OWNER, PET, { limit: 100000 });
  const read = pool.queries.find((entry) => entry.text.includes("from public.pet_observations"));
  assert.equal(read.params[read.params.length - 1], 500);
});

test("events are read from the outbox, not from a second event table", async () => {
  // There is one event mechanism. pet_id is a column on it precisely so this
  // query does not need a list of which entity types imply a pet.
  const pool = fakePool([petHandler()]);
  const service = createPetFactService({ pool });
  await service.listEvents(OWNER, PET);
  const read = pool.queries.find((entry) => entry.text.includes("outbox_events"));
  assert.ok(read.text.includes("where pet_id = $1"), read.text);
});

// --- serialization -----------------------------------------------------------

const factRow = (overrides = {}) => ({
  id: "fact-1",
  pet_id: PET,
  namespace: "physical",
  key: "weight",
  value_type: "number",
  value_number: "28200",
  value_text: null,
  value_boolean: null,
  value_date: null,
  value_timestamp: null,
  value_json: null,
  value_ref_type: null,
  value_ref_id: null,
  unit: "g",
  source_type: "USER_PROVIDED",
  source_channel: "APP",
  source_id: null,
  source_timestamp: null,
  confidence: "HIGH",
  verification_status: "UNVERIFIED",
  status: "CURRENT",
  observed_at: "2026-09-09T00:00:00.000Z",
  effective_from: "2026-09-09T00:00:00.000Z",
  effective_to: null,
  superseded_by_fact_id: null,
  rule_version: null,
  created_at: "2026-09-09T00:00:00.000Z",
  updated_at: "2026-09-09T00:00:00.000Z",
  ...overrides,
});

test("a number comes back as a number, with its unit stated", () => {
  // The API returns canonical values with an explicit unit, never a formatted
  // string: a formatted number cannot be recomputed, compared or converted.
  const fact = serializePetFact(factRow());
  assert.equal(fact.value, 28200);
  assert.equal(typeof fact.value, "number");
  assert.equal(fact.unit, "g");
  assert.equal(String(fact.value).includes("ק"), false);
});

test("the value column follows the value type", () => {
  assert.equal(serializePetFact(factRow({
    value_type: "boolean", value_number: null, value_boolean: false,
  })).value, false);
  assert.equal(serializePetFact(factRow({
    value_type: "enum", value_number: null, value_text: "IDEAL",
  })).value, "IDEAL");
  assert.equal(serializePetFact(factRow({
    value_type: "date", value_number: null, value_date: "2027-01-31",
  })).value, "2027-01-31");
  assert.deepEqual(serializePetFact(factRow({
    value_type: "json", value_number: null, value_json: { meals: 2 },
  })).value, { meals: 2 });
});

test("historical is derived from the period, not stored as a status", () => {
  assert.equal(serializePetFact(factRow()).historical, false);
  assert.equal(serializePetFact(factRow({
    status: "SUPERSEDED", effective_to: "2026-09-10T00:00:00.000Z",
  })).historical, true);
  assert.equal(serializePetFact(factRow({ status: "DISPUTED" })).historical, false);
});

test("an observation keeps both the canonical value and what the source said", () => {
  const observation = serializePetObservation({
    id: "obs-1", pet_id: PET, observation_type: "weight",
    value_number: "28200", unit: "g", value_text: null,
    source_value: "28.2", source_unit: "kg",
    measured_at: "2026-03-11T00:00:00.000Z", recorded_at: "2026-09-10T00:00:00.000Z",
    source_type: "VET_DOCUMENT", source_id: "doc-1", method: "document_extraction",
    confidence: "MEDIUM", context: {}, note: null,
  });
  assert.equal(observation.value, 28200);
  assert.equal(observation.unit, "g");
  assert.equal(observation.source_value, 28.2);
  assert.equal(observation.source_unit, "kg");
  // measured_at and recorded_at are different clocks and must not collapse.
  assert.notEqual(observation.measured_at, observation.recorded_at);
});

test("an event names the pet it belongs to and declares its payload version", () => {
  const event = serializePetEvent({
    id: "evt-1", event_type: "pet_fact.created", entity_type: "pet_fact",
    entity_id: "fact-1", pet_id: PET, payload_version: 1,
    occurred_at: "2026-09-10T00:00:00.000Z",
    payload: { namespace: "health", key: "allergy" },
  });
  assert.equal(event.pet_id, PET);
  assert.equal(event.payload_version, 1);
  assert.equal(event.id, "evt-1");
  // The key, never the value: the outbox delivers to an external endpoint.
  assert.equal(JSON.stringify(event.payload).includes("chicken"), false);
});
