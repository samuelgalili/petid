// Pet facts integration check.
//
// Verifies against a real database the things a unit test cannot: that the
// CHECK constraints actually hold the invariants the pure modules assume, that
// the backfill is idempotent and reversible, that a supersession chain is
// consistent after the writes have been through PostgreSQL, that ownership is
// a query predicate rather than a convention, and that no fact event carries a
// clinical value out to a subscriber.
//
// Every fixture it creates stays behind, so it can be run repeatedly against a
// scratch database. Do not point it at production.
import pg from "pg";
const { Pool } = pg;
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPetFactService } from "../src/petFactService.js";

// Requires a migrated database. Not part of `npm test` (which is unit-only):
//   DATABASE_URL=postgres://... node scripts/petFactsIntegrationCheck.mjs
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required for the pet facts integration check");
  process.exit(2);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DB_SSL === "false" ? false : undefined,
});

const sqlDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../sql");

let failures = 0;
const assert = (label, condition, detail = "") => {
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}${detail ? ` -- ${detail}` : ""}`);
};

// Every gate below is expected to reject. A rejection that does not happen is
// the failure, so a silent success here would be the worst outcome.
const assertRejected = async (label, fn, expected) => {
  try {
    await fn();
    assert(label, false, "no error was thrown");
  } catch (error) {
    const matched = String(error.code || "") === expected || String(error.message).includes(expected);
    assert(label, matched, `${error.code || ""} ${error.message}`);
  }
};

const run = async () => {
  const facts = createPetFactService({ pool });
  const stamp = Date.now();

  const owner = (await pool.query(
    "insert into public.app_users (email, password_hash, full_name) values ($1, 'x', 'Owner') returning id",
    [`petfacts-owner-${stamp}@example.test`],
  )).rows[0].id;
  const stranger = (await pool.query(
    "insert into public.app_users (email, password_hash, full_name) values ($1, 'x', 'Stranger') returning id",
    [`petfacts-stranger-${stamp}@example.test`],
  )).rows[0].id;

  const dog = (await pool.query(
    "insert into public.pets (user_id, name, type, weight) values ($1, 'Blue', 'dog', 28.2) returning id",
    [owner],
  )).rows[0].id;
  const smallPet = (await pool.query(
    "insert into public.pets (user_id, name, type, weight) values ($1, 'Kiwi', 'other', 0.09) returning id",
    [owner],
  )).rows[0].id;
  const strangersPet = (await pool.query(
    "insert into public.pets (user_id, name, type) values ($1, 'NotYours', 'cat') returning id",
    [stranger],
  )).rows[0].id;

  // --- backfill ------------------------------------------------------------
  const backfill = await readFile(path.join(sqlDir, "0039_backfill_pet_weight.sql"), "utf8");
  await pool.query(backfill);
  await pool.query(backfill);

  const weight = (await pool.query(
    `select value_number, unit, confidence, source_type, source_id, status
     from public.pet_facts where pet_id = $1 and key = 'weight'`,
    [dog],
  )).rows;
  assert("the backfill is idempotent: one weight fact after two runs", weight.length === 1,
    `${weight.length} rows`);
  assert("28.2 kg is stored as 28200 g", Number(weight[0]?.value_number) === 28200);
  assert("an unknown measurement date means MEDIUM, not HIGH", weight[0]?.confidence === "MEDIUM");
  assert("nothing infers a source: pets data is USER_PROVIDED",
    weight[0]?.source_type === "USER_PROVIDED");
  assert("the whole backfill is one delete away", weight[0]?.source_id === "backfill@0039");

  const small = (await pool.query(
    "select value_number from public.pet_facts where pet_id = $1 and key = 'weight'", [smallPet],
  )).rows;
  assert("a 90 g animal keeps full resolution in grams", Number(small[0]?.value_number) === 90);

  // --- the six gates -------------------------------------------------------
  await assertRejected("an unregistered key cannot be written", () => facts.writeFact(owner, dog, {
    namespace: "preference", key: "favorite_blue_number", value: "7", source_type: "USER_PROVIDED",
  }), "UNKNOWN_FACT_KEY");

  await assertRejected("a dog-only key is refused for another species", () => facts.writeFact(owner, smallPet, {
    namespace: "physical", key: "size_band", value: "LARGE", source_type: "SYSTEM_DERIVED",
  }), "SPECIES_NOT_APPLICABLE");

  await assertRejected("a bird-only key is refused for a dog", () => facts.writeFact(owner, dog, {
    namespace: "physical", key: "wingspan", value: 30, source_type: "USER_PROVIDED",
  }), "SPECIES_NOT_APPLICABLE");

  await assertRejected("a user cannot write a derived key", () => facts.writeFact(owner, dog, {
    namespace: "identity", key: "life_stage", value: "SENIOR", source_type: "USER_PROVIDED",
  }), "DERIVED_KEY_SINGLE_WRITER");

  await assertRejected("an inferred value cannot assert an allergy", () => facts.writeFact(owner, dog, {
    namespace: "health", key: "allergy", value: "chicken", source_type: "AI_INFERRED",
  }), "SOURCE_NOT_ALLOWED");

  await assertRejected("a value outside the enum is refused", () => facts.writeFact(owner, dog, {
    namespace: "physical", key: "body_condition", value: "CHUNKY", source_type: "VET_DOCUMENT",
  }), "INVALID_FACT_VALUE");

  await assertRejected("an unlisted unit is refused", () => facts.writeFact(owner, dog, {
    namespace: "physical", key: "weight", value: 5, unit: "stone", source_type: "USER_PROVIDED",
  }), "INVALID_UNIT");

  await assertRejected("a 900 kg dog is refused", () => facts.writeFact(owner, dog, {
    namespace: "physical", key: "weight", value: 900, unit: "kg", source_type: "USER_PROVIDED",
  }), "INVALID_FACT_VALUE");

  // --- ownership -----------------------------------------------------------
  await assertRejected("a stranger cannot read another owner's facts",
    () => facts.listFacts(stranger, dog), "Pet not found");
  await assertRejected("a stranger cannot write to another owner's pet",
    () => facts.writeFact(stranger, dog, {
      namespace: "health", key: "note", value: "hello", source_type: "USER_PROVIDED",
    }), "Pet not found");
  await assertRejected("an owner cannot reach a pet they do not own",
    () => facts.listObservations(owner, strangersPet), "Pet not found");
  await assertRejected("a stranger cannot change a fact's lifecycle",
    () => facts.updateFactLifecycle(stranger, dog, "00000000-0000-4000-8000-000000000000", {
      action: "retract",
    }), "Pet not found");

  // --- volatile supersession ----------------------------------------------
  const later = await facts.writeFact(owner, dog, {
    namespace: "physical", key: "weight", value: 29.1, unit: "kg",
    source_type: "VET_DOCUMENT", observed_at: new Date().toISOString(),
  });
  assert("a later weight supersedes rather than disputing", later.outcome === "SUPERSEDED", later.outcome);

  const history = await facts.getFactHistory(owner, dog, "physical", "weight");
  assert("both values survive", history.length === 2,
    JSON.stringify(history.map((f) => [f.value, f.status])));
  assert("the newest is the current one",
    history[0].status === "CURRENT" && history[0].value === 29100);
  assert("the superseded row is chained to its successor",
    history[1].status === "SUPERSEDED" && history[1].superseded_by_fact_id === history[0].id);
  assert("the periods abut rather than overlapping",
    new Date(history[1].effective_to).getTime() === new Date(history[0].effective_from).getTime(),
    `${history[1].effective_to} vs ${history[0].effective_from}`);

  const backdated = await facts.writeFact(owner, dog, {
    namespace: "physical", key: "weight", value: 24, unit: "kg",
    source_type: "VET_DOCUMENT", observed_at: "2026-08-15T09:00:00.000Z",
  });
  assert("a document about August does not become today's weight",
    backdated.outcome === "BACKDATED", backdated.outcome);
  const current = await facts.listFacts(owner, dog, { namespace: "physical", key: "weight" });
  assert("exactly one current weight, still 29100 g",
    current.length === 1 && current[0].value === 29100,
    JSON.stringify(current.map((f) => f.value)));

  // --- stable-key conflict -------------------------------------------------
  await facts.writeFact(owner, dog, {
    namespace: "health", key: "neuter_status", value: true, source_type: "USER_PROVIDED",
    observed_at: "2026-09-01T00:00:00.000Z",
  });
  const vet = await facts.writeFact(owner, dog, {
    namespace: "health", key: "neuter_status", value: false, source_type: "VET_DOCUMENT",
    observed_at: "2026-09-01T00:00:00.000Z",
  });
  assert("a vet document outranks the owner on a clinical key", vet.outcome === "SUPERSEDED", vet.outcome);

  const weaker = await facts.writeFact(owner, dog, {
    namespace: "health", key: "neuter_status", value: true, source_type: "USER_PROVIDED",
    observed_at: "2026-09-01T00:00:00.000Z",
  });
  assert("the weaker assertion is recorded, not applied", weaker.outcome === "OUTRANKED", weaker.outcome);
  const neuter = await facts.listFacts(owner, dog, { namespace: "health", key: "neuter_status" });
  assert("one current value remains, and it is the vet's",
    neuter.length === 1 && neuter[0].value === false,
    JSON.stringify(neuter.map((f) => f.value)));

  // --- cardinality ---------------------------------------------------------
  await facts.writeFact(owner, dog, {
    namespace: "health", key: "condition", value: "arthritis", source_type: "USER_PROVIDED",
  });
  await facts.writeFact(owner, dog, {
    namespace: "health", key: "condition", value: "hip dysplasia", source_type: "USER_PROVIDED",
  });
  const conditions = await facts.listFacts(owner, dog, { namespace: "health", key: "condition" });
  assert("a multi key holds two conditions as two rows", conditions.length === 2,
    JSON.stringify(conditions.map((f) => f.value)));

  // --- lifecycle -----------------------------------------------------------
  const confirmed = await facts.updateFactLifecycle(owner, dog, conditions[0].id, { action: "confirm" });
  assert("confirming is recorded as a human act", confirmed.verification_status === "USER_CONFIRMED");
  const resolved = await facts.updateFactLifecycle(owner, dog, conditions[0].id, { action: "resolve" });
  assert("a resolved condition keeps its period and closes",
    resolved.status === "RESOLVED" && resolved.effective_to !== null);
  await assertRejected("a closed fact cannot be closed again",
    () => facts.updateFactLifecycle(owner, dog, conditions[0].id, { action: "resolve" }),
    "already closed");

  const retracted = await facts.updateFactLifecycle(owner, dog, conditions[1].id, {
    action: "retract", reason: "recorded against the wrong pet",
  });
  assert("a retracted fact is kept for audit",
    retracted.status === "RETRACTED" && retracted.verification_status === "REJECTED");

  const transitions = await pool.query(
    "select count(*)::int as n from public.pet_fact_transitions t join public.pet_facts f on f.id = t.fact_id where f.pet_id = $1",
    [dog],
  );
  assert("every status change is audited with its actor", transitions.rows[0].n >= 4,
    `${transitions.rows[0].n} transitions`);

  // --- observations --------------------------------------------------------
  const observed = await facts.recordObservation(owner, dog, {
    observation_type: "weight", value: 29.4, unit: "kg", method: "scale",
    measured_at: new Date().toISOString(),
  });
  assert("an observation is stored canonically", observed.observation.value === 29400);
  assert("and keeps what the source said",
    observed.observation.source_value === 29.4 && observed.observation.source_unit === "kg");
  assert("a weight observation produces the fact", observed.fact?.value === 29400, observed.outcome);

  const measurement = await facts.recordObservation(owner, dog, {
    observation_type: "chest_girth", value: 74, unit: "cm", method: "tape",
    measured_at: new Date().toISOString(),
  });
  assert("an observation with no registered fact key produces no fact", measurement.fact === null);

  await assertRejected("a model cannot be an observer", () => facts.recordObservation(owner, dog, {
    observation_type: "weight", value: 30, unit: "kg", source_type: "AI_INFERRED",
  }), "cannot make an observation");

  await assertRejected("a measurement from the future is refused",
    () => facts.recordObservation(owner, dog, {
      observation_type: "weight", value: 30, unit: "kg",
      measured_at: new Date(Date.now() + 86_400_000).toISOString(),
    }), "future");

  // --- events --------------------------------------------------------------
  const events = await facts.listEvents(owner, dog);
  assert("events were recorded for this pet", events.length > 0, `${events.length} events`);
  assert("every event has a stable id and names the right pet",
    events.every((event) => event.id && event.pet_id === dog));
  assert("observation events are distinct from fact events",
    events.some((event) => event.type === "pet_observation.recorded")
    && events.some((event) => event.type.startsWith("pet_fact.")));
  const leaked = events
    .filter((event) => event.type.startsWith("pet_fact."))
    .filter((event) => /29100|28200|arthritis|hip dysplasia/.test(JSON.stringify(event.payload)));
  assert("no fact event carries the value out to a subscriber", leaked.length === 0,
    JSON.stringify(leaked));
  assert("every event declares its payload version",
    events.every((event) => event.payload_version === 1));

  // --- the existing seam ---------------------------------------------------
  const petRow = await pool.query("select weight from public.pets where id = $1", [dog]);
  assert("pets.weight is untouched by everything above",
    Number(petRow.rows[0].weight) === 28.2, String(petRow.rows[0].weight));

  await pool.end();
  if (failures > 0) {
    console.error(`${failures} check(s) failed`);
    process.exit(1);
  }
};

run().catch((error) => { console.error(error); process.exit(1); });
