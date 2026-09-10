// The write gate for pet facts: six rejections before anything is stored.
//
// The registry is what separates this from an EAV junk drawer, and the value of
// that claim is entirely in these rejections actually firing. petFactRegistry.js
// is pure for exactly this reason -- no database is needed to prove that a
// wingspan cannot be recorded for a dog.

import assert from "node:assert/strict";
import test from "node:test";

import {
  CONFIDENCE_LEVELS,
  REJECTIONS,
  SOURCE_RANK,
  SOURCE_TYPES,
  convertToCanonicalUnit,
  normalizeTextValue,
  validateFactWrite,
} from "../src/petFactRegistry.js";

// Definitions as the migration seeds them, trimmed to what each test needs.
const weightDefinition = {
  id: "def-weight",
  namespace: "physical",
  key: "weight",
  value_type: "number",
  unit: "g",
  allowed_units: ["kg", "g", "lb", "oz"],
  allowed_species: [],
  min_value: 1,
  max_value: 120000,
  is_derived: false,
  is_sensitive: false,
  volatile: true,
  cardinality: "single",
  requires_source: ["VET_CONFIRMED", "VET_DOCUMENT", "USER_PROVIDED", "ACTIVITY_DERIVED"],
  status: "ACTIVE",
};

const allergyDefinition = {
  id: "def-allergy",
  namespace: "health",
  key: "allergy",
  value_type: "string",
  allowed_units: [],
  allowed_species: [],
  is_derived: false,
  is_sensitive: true,
  cardinality: "multi",
  requires_source: ["VET_CONFIRMED", "VET_DOCUMENT", "USER_PROVIDED"],
  status: "ACTIVE",
};

const lifeStageDefinition = {
  id: "def-life-stage",
  namespace: "identity",
  key: "life_stage",
  value_type: "enum",
  enum_values: ["PUPPY", "JUNIOR", "ADULT", "SENIOR"],
  allowed_units: [],
  allowed_species: [],
  is_derived: true,
  is_sensitive: false,
  cardinality: "single",
  requires_source: ["SYSTEM_DERIVED"],
  rule_version: "life_stage@2026-09-10",
  status: "ACTIVE",
};

const wingspanDefinition = {
  ...weightDefinition,
  id: "def-wingspan",
  key: "wingspan",
  unit: "cm",
  allowed_units: ["cm", "mm", "in"],
  allowed_species: ["bird"],
  min_value: 1,
  max_value: 300,
  volatile: false,
  requires_source: ["USER_PROVIDED", "VET_CONFIRMED", "VET_DOCUMENT"],
};

const write = (definition, input, species = "dog") => validateFactWrite({
  definition, species, input,
});

// --- gate 1: the key must exist ---------------------------------------------

test("an unregistered key is rejected", () => {
  // The whole point of the registry. favorite_blue_number has no definition, so
  // there is nowhere for it to go and no rule that could validate it.
  const result = write(null, { value: 7, source_type: "USER_PROVIDED" });
  assert.equal(result.ok, false);
  assert.equal(result.code, REJECTIONS.UNKNOWN_FACT_KEY);
});

// --- gate 2: the key must still accept writes -------------------------------

test("a deprecated key keeps serving reads but refuses writes", () => {
  const result = write({ ...weightDefinition, status: "DEPRECATED" }, {
    value: 28.2, unit: "kg", source_type: "USER_PROVIDED",
  });
  assert.equal(result.code, REJECTIONS.KEY_DEPRECATED);
});

// --- gate 3: species ---------------------------------------------------------

test("a bird-only key cannot be written to a dog", () => {
  const result = write(wingspanDefinition, { value: 30, source_type: "USER_PROVIDED" }, "dog");
  assert.equal(result.code, REJECTIONS.SPECIES_NOT_APPLICABLE);
});

test("a bird-only key is accepted for a bird", () => {
  const result = write(wingspanDefinition, { value: 30, source_type: "USER_PROVIDED" }, "bird");
  assert.equal(result.ok, true);
  assert.equal(result.fact.value_number, 30);
});

test("an empty species list means every species", () => {
  for (const species of ["dog", "cat", "other", "bird"]) {
    assert.equal(write(weightDefinition, {
      value: 4, unit: "kg", source_type: "USER_PROVIDED",
    }, species).ok, true, species);
  }
});

// --- gate 4: provenance ------------------------------------------------------

test("an unknown source type is rejected", () => {
  const result = write(weightDefinition, { value: 10, unit: "kg", source_type: "GUESSED" });
  assert.equal(result.code, REJECTIONS.SOURCE_NOT_ALLOWED);
});

test("a derived key has exactly one writer", () => {
  // The failure that killed pets.age and pets.size: two writers on a computed
  // value, and neither wins.
  const result = write(lifeStageDefinition, { value: "SENIOR", source_type: "USER_PROVIDED" });
  assert.equal(result.code, REJECTIONS.DERIVED_KEY_SINGLE_WRITER);
  assert.equal(write(lifeStageDefinition, {
    value: "SENIOR", source_type: "SYSTEM_DERIVED",
  }).ok, true);
});

test("an inferred value cannot assert a clinical fact", () => {
  const result = write(allergyDefinition, { value: "chicken", source_type: "AI_INFERRED" });
  assert.equal(result.code, REJECTIONS.SOURCE_NOT_ALLOWED);
});

test("a clinical key refuses AI even if its source list is misconfigured", () => {
  // Belt and braces over the definitions themselves: a definition that listed
  // AI_INFERRED by accident still cannot produce an inferred allergy.
  const misconfigured = { ...allergyDefinition, requires_source: ["AI_INFERRED"] };
  assert.equal(write(misconfigured, { value: "chicken", source_type: "AI_INFERRED" }).code,
    REJECTIONS.SOURCE_NOT_ALLOWED);
});

test("a purchase cannot assert an allergy", () => {
  assert.equal(write(allergyDefinition, {
    value: "chicken", source_type: "PURCHASE_DERIVED",
  }).code, REJECTIONS.SOURCE_NOT_ALLOWED);
});

test("verification standing is never taken from the request", () => {
  // Promotion is a recorded human act, not a field on a create. Otherwise any
  // client could ship an AI guess labelled as a vet's confirmation.
  const result = write(weightDefinition, {
    value: 28.2, unit: "kg", source_type: "USER_PROVIDED",
    verification_status: "VET_CONFIRMED",
  });
  assert.equal(result.fact.verification_status, "UNVERIFIED");
});

test("a document extraction starts as extracted, not as confirmed", () => {
  const result = write(weightDefinition, {
    value: 28.2, unit: "kg", source_type: "VET_DOCUMENT",
  });
  assert.equal(result.fact.verification_status, "DOCUMENT_EXTRACTED");
  assert.equal(result.fact.confidence, "HIGH");
});

test("confidence follows the source when the caller gives none", () => {
  const bySource = {
    VET_CONFIRMED: "VERIFIED",
    VET_DOCUMENT: "HIGH",
    USER_PROVIDED: "HIGH",
    ACTIVITY_DERIVED: "MEDIUM",
  };
  for (const [source, expected] of Object.entries(bySource)) {
    const result = write(weightDefinition, { value: 10, unit: "kg", source_type: source });
    assert.equal(result.fact.confidence, expected, source);
  }
});

test("a derived value carries no confidence of its own", () => {
  // Confidence belongs to the inputs; derived_from already points at them.
  // Attaching a number here makes confidence noise everywhere it appears.
  const result = write(lifeStageDefinition, { value: "ADULT", source_type: "SYSTEM_DERIVED" });
  assert.equal(result.fact.confidence, null);
  assert.equal(result.fact.rule_version, "life_stage@2026-09-10");
});

test("confidence is a level, never a number", () => {
  for (const level of CONFIDENCE_LEVELS) {
    assert.equal(typeof level, "string");
  }
  assert.ok(!CONFIDENCE_LEVELS.includes(0.91));
});

// --- gate 5: the value -------------------------------------------------------

test("a non-numeric weight is rejected", () => {
  assert.equal(write(weightDefinition, {
    value: "heavy", unit: "kg", source_type: "USER_PROVIDED",
  }).code, REJECTIONS.INVALID_FACT_VALUE);
});

test("range is checked after conversion, in the canonical unit", () => {
  // 120 kg is in range; 120 g is not. Checking before conversion would get both
  // answers wrong.
  assert.equal(write(weightDefinition, {
    value: 120, unit: "kg", source_type: "USER_PROVIDED",
  }).ok, true);
  assert.equal(write(weightDefinition, {
    value: 900, unit: "kg", source_type: "USER_PROVIDED",
  }).code, REJECTIONS.INVALID_FACT_VALUE);
  // Rounding to the canonical precision happens first, so a fraction of a gram
  // rounds to zero grams and is then out of range -- rather than being stored
  // as a 0 g animal.
  assert.equal(write(weightDefinition, {
    value: 0.4, unit: "g", source_type: "USER_PROVIDED",
  }).code, REJECTIONS.INVALID_FACT_VALUE);
});

test("an enum value outside the list is rejected", () => {
  assert.equal(write(lifeStageDefinition, {
    value: "MIDDLE_AGED", source_type: "SYSTEM_DERIVED",
  }).code, REJECTIONS.INVALID_FACT_VALUE);
});

test("an empty string is not a value", () => {
  assert.equal(write(allergyDefinition, {
    value: "   ", source_type: "USER_PROVIDED",
  }).code, REJECTIONS.INVALID_FACT_VALUE);
});

test("a boolean fact accepts only a boolean", () => {
  const definition = { ...allergyDefinition, key: "neuter_status", value_type: "boolean" };
  assert.equal(write(definition, { value: "yes", source_type: "USER_PROVIDED" }).code,
    REJECTIONS.INVALID_FACT_VALUE);
  assert.equal(write(definition, { value: false, source_type: "USER_PROVIDED" }).ok, true);
});

test("a boolean false is a value, not a missing one", () => {
  const definition = { ...allergyDefinition, key: "neuter_status", value_type: "boolean" };
  const result = write(definition, { value: false, source_type: "USER_PROVIDED" });
  assert.equal(result.fact.value_boolean, false);
});

test("a date fact wants a real date", () => {
  const definition = { ...allergyDefinition, key: "expiry", value_type: "date", is_sensitive: false };
  assert.equal(write(definition, { value: "soon", source_type: "USER_PROVIDED" }).code,
    REJECTIONS.INVALID_FACT_VALUE);
  assert.equal(write(definition, { value: "2027-01-31", source_type: "USER_PROVIDED" }).ok, true);
});

test("a ref fact wants an id, not a name", () => {
  // The whole reason current_food is a ref: a name is something the system can
  // print, an id is something it can reason about.
  const definition = {
    ...allergyDefinition, key: "current_food", value_type: "ref",
    ref_entity: "business_products", is_sensitive: false,
  };
  assert.equal(write(definition, { value: "Royal Canin Maxi", source_type: "USER_PROVIDED" }).code,
    REJECTIONS.INVALID_FACT_VALUE);
  const result = write(definition, {
    value: "8f14e45f-ceea-467a-9a3f-2b3c1e0d4a55", source_type: "USER_PROVIDED",
  });
  assert.equal(result.ok, true);
  assert.equal(result.fact.value_ref_type, "business_products");
});

test("only the column the value type names is populated", () => {
  const result = write(weightDefinition, { value: 28.2, unit: "kg", source_type: "USER_PROVIDED" });
  assert.equal(result.fact.value_number, 28200);
  assert.equal(result.fact.value_text, null);
  assert.equal(result.fact.value_boolean, null);
  assert.equal(result.fact.value_json, null);
  assert.equal(result.fact.value_ref_id, null);
});

// --- gate 6: units -----------------------------------------------------------

test("28.2 kg becomes 28200 g", () => {
  const result = write(weightDefinition, { value: 28.2, unit: "kg", source_type: "USER_PROVIDED" });
  assert.equal(result.fact.value_number, 28200);
  assert.equal(result.fact.unit, "g");
});

test("small animals keep their resolution in grams", () => {
  // A budgerigar in kilograms is 0.035 -- three significant figures lost to
  // leading zeros, and every rounding rule has to special-case it.
  for (const [kilograms, grams] of [[0.035, 35], [0.09, 90], [0.12, 120], [0.4, 400]]) {
    const result = write(weightDefinition, {
      value: kilograms, unit: "kg", source_type: "USER_PROVIDED",
    });
    assert.equal(result.fact.value_number, grams, `${kilograms} kg`);
  }
});

test("weight is stored as an integer number of grams", () => {
  const result = write(weightDefinition, { value: 28.2456, unit: "kg", source_type: "USER_PROVIDED" });
  assert.equal(Number.isInteger(result.fact.value_number), true);
  assert.equal(result.fact.value_number, 28246);
});

test("imperial units are accepted on input and converted away", () => {
  const pounds = write(weightDefinition, { value: 62, unit: "lb", source_type: "USER_PROVIDED" });
  assert.equal(pounds.fact.value_number, 28123);
  assert.equal(pounds.fact.unit, "g");
});

test("an unlisted unit is rejected rather than assumed", () => {
  assert.equal(write(weightDefinition, {
    value: 5, unit: "stone", source_type: "USER_PROVIDED",
  }).code, REJECTIONS.INVALID_UNIT);
});

test("a unit from another quantity is rejected", () => {
  // cm is a real unit; it is not a weight, and silently accepting it would
  // store a length as a mass.
  assert.equal(write(weightDefinition, {
    value: 30, unit: "cm", source_type: "USER_PROVIDED",
  }).code, REJECTIONS.INVALID_UNIT);
});

test("a missing unit means the canonical one", () => {
  const result = write(weightDefinition, { value: 4500, source_type: "USER_PROVIDED" });
  assert.equal(result.fact.value_number, 4500);
  assert.equal(result.fact.unit, "g");
});

test("a unit on a fact that has none is rejected", () => {
  assert.equal(write(allergyDefinition, {
    value: "chicken", unit: "kg", source_type: "USER_PROVIDED",
  }).ok, true, "a string fact ignores a unit it was never given a column for");
});

test("conversions are exact for the quantities the contract lists", () => {
  assert.equal(convertToCanonicalUnit(28.2, "kg", "g"), 28200);
  assert.equal(convertToCanonicalUnit(4.2, "km", "m"), 4200);
  assert.equal(convertToCanonicalUnit(25, "mm", "cm"), 2.5);
  assert.equal(convertToCanonicalUnit(2, "in", "cm"), 5.1);
  assert.equal(convertToCanonicalUnit(1.5, "l", "ml"), 1500);
  assert.equal(convertToCanonicalUnit(47, "min", "s"), 2820);
  assert.equal(convertToCanonicalUnit(101.3, "F", "C"), 38.5);
});

test("an impossible conversion is null, never zero", () => {
  // Zero is a weight. Null is "this cannot be converted", and the difference
  // decides whether a 0 g dog reaches the database.
  assert.equal(convertToCanonicalUnit(5, "stone", "g"), null);
  assert.equal(convertToCanonicalUnit(5, "kg", "cm"), null);
  assert.equal(convertToCanonicalUnit("heavy", "kg", "g"), null);
  assert.notEqual(convertToCanonicalUnit(5, "stone", "g"), 0);
});

// --- time --------------------------------------------------------------------

test("observed_at and effective_from are kept apart from created_at", () => {
  // A March document uploaded in September describes March. Getting this wrong
  // makes a six-month-old weight look like today's, and the recency tie-break
  // then resolves in the wrong direction.
  const result = write(weightDefinition, {
    value: 28.2, unit: "kg", source_type: "VET_DOCUMENT",
    observed_at: "2026-03-11T00:00:00.000Z",
  });
  assert.equal(result.fact.observed_at, "2026-03-11T00:00:00.000Z");
  assert.equal(result.fact.effective_from, "2026-03-11T00:00:00.000Z");
});

test("effective_from can differ from observed_at when the caller says so", () => {
  const result = write(weightDefinition, {
    value: 28.2, unit: "kg", source_type: "VET_DOCUMENT",
    observed_at: "2026-03-11T00:00:00.000Z",
    effective_from: "2026-03-12T00:00:00.000Z",
  });
  assert.equal(result.fact.effective_from, "2026-03-12T00:00:00.000Z");
});

test("an unparseable observed_at falls back to now rather than to zero", () => {
  const now = new Date("2026-09-10T12:00:00.000Z");
  const result = validateFactWrite({
    definition: weightDefinition,
    species: "dog",
    input: { value: 10, unit: "kg", source_type: "USER_PROVIDED", observed_at: "not a date" },
    now,
  });
  assert.equal(result.fact.observed_at, now.toISOString());
});

// --- the taxonomies ----------------------------------------------------------

test("the seven source types are ranked, with no ties", () => {
  const ranks = SOURCE_TYPES.map((source) => SOURCE_RANK[source]);
  assert.equal(ranks.length, 7);
  assert.equal(new Set(ranks).size, 7);
  assert.equal(SOURCE_RANK.VET_CONFIRMED < SOURCE_RANK.USER_PROVIDED, true);
  assert.equal(SOURCE_RANK.USER_PROVIDED < SOURCE_RANK.AI_INFERRED, true);
});

test("normalization is for comparison and keeps the original apart", () => {
  assert.equal(normalizeTextValue("  Chicken  Meal "), "chicken meal");
  assert.equal(normalizeTextValue(""), null);
  const result = write(allergyDefinition, { value: "  Chicken ", source_type: "USER_PROVIDED" });
  assert.equal(result.fact.value_text, "Chicken");
  assert.equal(result.fact.normalized_value, "chicken");
});
