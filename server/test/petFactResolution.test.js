// What happens when a fact already has a value.
//
// The first question is not "who wins" but "is this a conflict at all": two
// weights are two truths about a changing quantity, while two answers about a
// neuter status are a disagreement. pet_fact_definitions.volatile decides, and
// every worked case in docs/pet-intelligence/45-PROVENANCE-CONTRACT.md is
// below.

import assert from "node:assert/strict";
import test from "node:test";

import { OUTCOMES, currentValueOf, planFactWrite } from "../src/petFactResolution.js";

const volatileNumber = { cardinality: "single", volatile: true };
const stableBoolean = { cardinality: "single", volatile: false };
const multiString = { cardinality: "multi", volatile: false };

const factRow = ({
  id, value, at, source = "USER_PROVIDED", status = "CURRENT",
  effectiveTo = null, verification = "UNVERIFIED", text = null,
}) => ({
  id,
  value_number: value ?? null,
  value_text: text,
  value_boolean: null,
  value_date: null,
  value_timestamp: null,
  value_json: null,
  value_ref_id: null,
  source_type: source,
  observed_at: at,
  effective_from: at,
  effective_to: effectiveTo,
  status,
  verification_status: verification,
});

const incomingFact = ({
  value, at, source = "USER_PROVIDED", verification = "UNVERIFIED", text = null, bool = null,
}) => ({
  value_number: value ?? null,
  value_text: text,
  value_boolean: bool,
  value_date: null,
  value_timestamp: null,
  value_json: null,
  value_ref_id: null,
  source_type: source,
  observed_at: at,
  effective_from: at,
  verification_status: verification,
});

const plan = (definition, incoming, currentFacts) => planFactWrite({
  definition, incoming, currentFacts, newFactId: "new-fact",
});

// --- nothing there yet -------------------------------------------------------

test("the first value for a key is simply created", () => {
  const result = plan(volatileNumber, incomingFact({ value: 28200, at: "2026-09-01T00:00:00Z" }), []);
  assert.equal(result.outcome, OUTCOMES.CREATED);
  assert.equal(result.operations.length, 1);
  assert.equal(result.operations[0].fact.status, "CURRENT");
  assert.equal(result.operations[0].fact.effective_to, null);
});

test("an unchanged value writes nothing at all", () => {
  // Recomputation is not news, and neither is an owner re-saving a form. A
  // supersession chain full of identical values is unreadable history.
  const current = [factRow({ id: "a", value: 28200, at: "2026-09-01T00:00:00Z" })];
  const result = plan(volatileNumber, incomingFact({ value: 28200, at: "2026-09-08T00:00:00Z" }), current);
  assert.equal(result.outcome, OUTCOMES.UNCHANGED);
  assert.deepEqual(result.operations, []);
});

// --- volatile keys -----------------------------------------------------------

test("a later weight supersedes, and the periods abut", () => {
  const current = [factRow({ id: "a", value: 28000, at: "2026-09-01T00:00:00Z" })];
  const result = plan(volatileNumber, incomingFact({
    value: 29200, at: "2026-09-09T00:00:00Z", source: "VET_DOCUMENT",
  }), current);

  assert.equal(result.outcome, OUTCOMES.SUPERSEDED);
  const close = result.operations.find((operation) => operation.op === "close");
  const insert = result.operations.find((operation) => operation.op === "insert");
  assert.equal(close.factId, "a");
  assert.equal(close.status, "SUPERSEDED");
  assert.equal(close.supersededByFactId, "new-fact");
  assert.equal(
    new Date(close.effectiveTo).getTime(),
    new Date(insert.fact.effective_from).getTime(),
  );
});

test("three weights from three sources are three readings, never a conflict", () => {
  // The worked case: user 28.0 on 09-01, activity 28.7 on 09-08, vet 29.2 on
  // 09-09. Nothing is overwritten and nothing is disputed.
  let current = [];
  const outcomes = [];
  for (const [value, at, source] of [
    [28000, "2026-09-01T00:00:00Z", "USER_PROVIDED"],
    [28700, "2026-09-08T00:00:00Z", "ACTIVITY_DERIVED"],
    [29200, "2026-09-09T00:00:00Z", "VET_DOCUMENT"],
  ]) {
    const result = plan(volatileNumber, incomingFact({ value, at, source }), current);
    outcomes.push(result.outcome);
    const insert = result.operations.find((operation) => operation.op === "insert");
    current = [factRow({ id: value.toString(), value, at, source })];
    assert.equal(insert.fact.status, "CURRENT");
  }
  assert.deepEqual(outcomes, [OUTCOMES.CREATED, OUTCOMES.SUPERSEDED, OUTCOMES.SUPERSEDED]);
  assert.equal(outcomes.includes(OUTCOMES.DISPUTED), false);
});

test("a lower-ranked but later weight still supersedes", () => {
  // Volatility is the whole point: an owner's Tuesday reading is later than the
  // vet's Monday one, and later is what a changing quantity means.
  const current = [factRow({
    id: "a", value: 29200, at: "2026-09-09T00:00:00Z", source: "VET_DOCUMENT",
  })];
  const result = plan(volatileNumber, incomingFact({
    value: 29400, at: "2026-09-10T00:00:00Z", source: "USER_PROVIDED",
  }), current);
  assert.equal(result.outcome, OUTCOMES.SUPERSEDED);
});

test("a document about August does not become today's weight", () => {
  // It takes the period before the current fact instead. The 4 kg gap is then
  // an insight about a trend, not a conflict -- which falls straight out of
  // modelling weight as periods rather than a scalar.
  const current = [factRow({
    id: "sept", value: 28000, at: "2026-09-01T00:00:00Z", source: "USER_PROVIDED",
  })];
  const result = plan(volatileNumber, incomingFact({
    value: 24000, at: "2026-08-15T00:00:00Z", source: "VET_DOCUMENT",
  }), current);

  assert.equal(result.outcome, OUTCOMES.BACKDATED);
  assert.equal(result.operations.length, 1);
  const insert = result.operations[0].fact;
  assert.equal(insert.status, "SUPERSEDED");
  assert.equal(insert.superseded_by_fact_id, "sept");
  assert.equal(insert.effective_to, "2026-09-01T00:00:00.000Z");
  assert.equal(new Date(insert.effective_to) >= new Date(insert.effective_from), true);
});

// --- stable keys -------------------------------------------------------------

test("a stronger source wins on a stable key", () => {
  const current = [factRow({
    id: "owner", value: null, at: "2026-09-01T00:00:00Z", source: "USER_PROVIDED",
  })];
  current[0].value_boolean = true;
  const result = plan(stableBoolean, incomingFact({
    bool: false, at: "2026-09-01T00:00:00Z", source: "VET_DOCUMENT",
  }), current);
  assert.equal(result.outcome, OUTCOMES.SUPERSEDED);
});

test("a weaker source is recorded but does not take over", () => {
  // Discarding it would lose the evidence that two sources disagreed, which is
  // exactly the question a vet asks a year later.
  const current = [factRow({
    id: "vet", at: "2026-09-01T00:00:00Z", source: "VET_DOCUMENT",
  })];
  current[0].value_boolean = false;
  const result = plan(stableBoolean, incomingFact({
    bool: true, at: "2026-09-01T00:00:00Z", source: "USER_PROVIDED",
  }), current);

  assert.equal(result.outcome, OUTCOMES.OUTRANKED);
  assert.equal(result.operations.length, 1);
  assert.equal(result.operations[0].fact.status, "SUPERSEDED");
  assert.equal(result.operations[0].fact.superseded_by_fact_id, "vet");
  assert.notEqual(result.operations[0].fact.effective_to, null);
});

test("observed_at breaks a tie at equal rank, not created_at", () => {
  const current = [factRow({
    id: "old", at: "2026-03-01T00:00:00Z", source: "VET_DOCUMENT",
  })];
  current[0].value_boolean = false;
  const result = plan(stableBoolean, incomingFact({
    bool: true, at: "2026-09-01T00:00:00Z", source: "VET_DOCUMENT",
  }), current);
  assert.equal(result.outcome, OUTCOMES.SUPERSEDED);
});

test("standing breaks a tie when rank and time are equal", () => {
  const current = [factRow({
    id: "unverified", at: "2026-09-01T00:00:00Z", source: "USER_PROVIDED",
  })];
  current[0].value_boolean = false;
  const result = plan(stableBoolean, incomingFact({
    bool: true, at: "2026-09-01T00:00:00Z", source: "USER_PROVIDED",
    verification: "USER_CONFIRMED",
  }), current);
  assert.equal(result.outcome, OUTCOMES.SUPERSEDED);
});

test("a genuine tie is disputed, never coin-flipped", () => {
  const current = [factRow({
    id: "a", at: "2026-09-01T00:00:00Z", source: "USER_PROVIDED",
  })];
  current[0].value_boolean = false;
  const result = plan(stableBoolean, incomingFact({
    bool: true, at: "2026-09-01T00:00:00Z", source: "USER_PROVIDED",
  }), current);

  assert.equal(result.outcome, OUTCOMES.DISPUTED);
  const dispute = result.operations.find((operation) => operation.op === "dispute");
  const insert = result.operations.find((operation) => operation.op === "insert");
  assert.equal(dispute.factId, "a");
  assert.equal(insert.fact.status, "DISPUTED");
  // A disputed fact stays open: it is a current question, not history.
  assert.equal(insert.fact.effective_to, null);
});

test("nothing is deleted in any outcome", () => {
  // Every branch either leaves the existing row in place or closes it with a
  // reason. There is no path that removes one.
  const current = [factRow({ id: "a", value: 28000, at: "2026-09-01T00:00:00Z" })];
  for (const definition of [volatileNumber, stableBoolean]) {
    const result = plan(definition, incomingFact({
      value: 29000, at: "2026-09-02T00:00:00Z", source: "VET_DOCUMENT",
    }), current);
    assert.equal(result.operations.some((operation) => operation.op === "delete"), false);
  }
});

// --- cardinality -------------------------------------------------------------

test("a second allergen is a second row, not a replacement", () => {
  // Precisely what pets.medical_conditions text[] cannot express: each allergen
  // with its own onset, source and resolution.
  const current = [factRow({ id: "a", text: "chicken", at: "2026-01-01T00:00:00Z" })];
  const result = plan(multiString, incomingFact({ text: "beef", at: "2026-09-01T00:00:00Z" }), current);
  assert.equal(result.outcome, OUTCOMES.CREATED);
  assert.equal(result.operations.length, 1);
  assert.equal(result.operations.some((operation) => operation.op === "close"), false);
});

test("the same allergen twice changes nothing", () => {
  const current = [factRow({ id: "a", text: "chicken", at: "2026-01-01T00:00:00Z" })];
  const result = plan(multiString, incomingFact({ text: "chicken", at: "2026-09-01T00:00:00Z" }), current);
  assert.equal(result.outcome, OUTCOMES.UNCHANGED);
});

// --- closed rows are not in play ---------------------------------------------

test("a closed fact does not participate in resolution", () => {
  const current = [factRow({
    id: "old", value: 28000, at: "2026-01-01T00:00:00Z",
    status: "SUPERSEDED", effectiveTo: "2026-02-01T00:00:00Z",
  })];
  const result = plan(volatileNumber, incomingFact({ value: 29000, at: "2026-09-01T00:00:00Z" }), current);
  assert.equal(result.outcome, OUTCOMES.CREATED);
});

test("a retracted fact never comes back", () => {
  const current = [factRow({
    id: "wrong-pet", value: 90000, at: "2026-01-01T00:00:00Z", status: "RETRACTED",
  })];
  const result = plan(volatileNumber, incomingFact({ value: 29000, at: "2026-09-01T00:00:00Z" }), current);
  assert.equal(result.outcome, OUTCOMES.CREATED);
});

// --- reading -----------------------------------------------------------------

test("the current value is the most recently observed open row", () => {
  const open = [
    factRow({ id: "a", value: 28000, at: "2026-09-01T00:00:00Z" }),
    factRow({ id: "b", value: 29200, at: "2026-09-09T00:00:00Z" }),
  ];
  assert.equal(currentValueOf(open, { definition: volatileNumber }).fact.id, "b");
});

test("a disputed key has no single answer, and does not invent one", () => {
  // Returning either side is how a restrictive clinical rule gets bypassed.
  const open = [
    factRow({ id: "a", value: 1, at: "2026-09-01T00:00:00Z", status: "DISPUTED" }),
    factRow({ id: "b", value: 2, at: "2026-09-01T00:00:00Z", status: "DISPUTED" }),
  ];
  const reading = currentValueOf(open, { definition: stableBoolean });
  assert.equal(reading.disputed, true);
  assert.equal(reading.fact, null);
  assert.equal(reading.facts.length, 2);
});

test("no open rows means unknown, which is the absence of a value", () => {
  assert.equal(currentValueOf([], { definition: volatileNumber }), null);
  assert.equal(currentValueOf([factRow({
    id: "a", value: 1, at: "2026-01-01T00:00:00Z",
    status: "SUPERSEDED", effectiveTo: "2026-02-01T00:00:00Z",
  })], { definition: volatileNumber }), null);
});

test("a multi key reads as a set, not as one winner", () => {
  const open = [
    factRow({ id: "a", text: "chicken", at: "2026-01-01T00:00:00Z" }),
    factRow({ id: "b", text: "beef", at: "2026-02-01T00:00:00Z" }),
  ];
  const reading = currentValueOf(open, { definition: multiString });
  assert.equal(reading.fact, null);
  assert.equal(reading.facts.length, 2);
});

// --- sub-second precision ----------------------------------------------------

test("timestamps keep their milliseconds through a plan", () => {
  // pg returns Date objects, and String(date) drops the milliseconds -- which
  // was enough to close a fact before its own effective_from when two writes
  // landed in the same second.
  const current = [{
    ...factRow({ id: "a", value: 28000, at: "2026-09-01T00:00:00Z" }),
    effective_from: new Date("2026-09-10T13:36:17.839Z"),
    observed_at: new Date("2026-09-10T13:36:17.839Z"),
  }];
  const result = plan(volatileNumber, incomingFact({
    value: 29000, at: "2026-09-10T13:36:17.900Z",
  }), current);
  const close = result.operations.find((operation) => operation.op === "close");
  assert.equal(new Date(close.effectiveTo).getTime() >= new Date("2026-09-10T13:36:17.839Z").getTime(), true);
});
