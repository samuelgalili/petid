# 46 — Fact Registry

## §22 — The purpose

`pet_fact_definitions` is what separates this design from an EAV junk drawer.

> **An unregistered `(namespace, key)` is rejected at write time.**

No definition, no write. No exceptions, no "unknown" bucket, no dynamic key
creation from user input.

**The registry is controlled by code and migrations, never by the application at
runtime.** No API creates a definition. No admin screen adds a key. A new fact
key is a reviewed migration, exactly like a new column — because that is what it
is.

---

## The definition

```
pet_fact_definitions
  namespace              physical | health | nutrition | behavior |
                         preference | activity | identity | commerce |
                         environment | insurance
  key                    snake_case, unique within namespace
  ── shape ──
  value_type             number | string | boolean | date | datetime |
                         enum | ref | json
  unit                   canonical unit, or null                      (47)
  allowed_units          text[]  accepted on input, converted on write
  enum_values            text[]  required when value_type = 'enum'
  ref_entity             'business_products' | 'dog_parks' | 'pets' | …
  cardinality            single | multi
  ── applicability ──
  allowed_species        text[]  empty = all species
  ── validation ──
  min_value, max_value   for numbers
  regex                  for strings
  ── governance ──
  is_sensitive           boolean   clinical / health-class          (50)
  is_derived             boolean   sole writer = the rule engine    (43)
  is_time_series         boolean   the sequence carries meaning     (41)
  volatile               boolean   supersede by recency, never dispute (45)
  requires_source        text[]    allowed source_types
  requires_confirmation  boolean   clinical extraction must be confirmed
  decays                 boolean
  half_life_days         integer
  ── presentation ──
  label_he, label_en
  display_unit           per locale                                 (47)
  ── lifecycle ──
  status                 ACTIVE | DEPRECATED
  introduced_in, deprecated_in    migration identifiers
  rule_version           for derived keys
```

### What each governance flag actually prevents

| Flag | Prevents |
|---|---|
| `allowed_species` | `physical.wingspan` on a dog |
| `is_sensitive` + `requires_source` | an `AI_INFERRED` allergy — the rule in `44` becomes a check, not a convention |
| `is_derived` | a user overwriting `identity.life_stage` — the failure that killed `pets.age` |
| `volatile` | two weights being treated as a conflict |
| `requires_confirmation` | an extracted medication dose landing silently |
| `decays` + `half_life_days` | a preference from 2024 still ranking products |
| `enum_values` | free text entering a field a matching gate reads |
| `min_value` / `max_value` | a 280 kg dog from a misplaced decimal |

---

## §10 — Value types, and what must be relational

| `value_type` | Column | Example |
|---|---|---|
| `number` | `value_number` + `unit` | `physical.weight` = 28.2 kg |
| `string` | `value_text` | `health.note` |
| `boolean` | `value_boolean` | `health.neuter_status` |
| `date` | `value_date` | `health.condition_onset` |
| `datetime` | `value_timestamp` | |
| `enum` | `value_text`, validated | `physical.body_condition` = `IDEAL` |
| `ref` | `value_ref_type` + `value_ref_id` | `nutrition.current_food` → product |
| `json` | `value_json` | `nutrition.feeding_schedule` |

### The JSON rule

> **Anything the Product Matching Engine reads must be typed and constrained.
> JSON is for things people read, never for things rules evaluate.**

| Must be relational | May be JSON |
|---|---|
| weight, measurements, temperature | feeding schedule (irregular shape, never filtered) |
| allergies, conditions, medications — **one row each** | observed reaction detail |
| life stage, size band, body condition | enclosure dimensions (a fixed triple, but never a gate) |
| current food (a **ref**, not a name) | free-text notes |

**Multi-valued keys are multiple rows, not arrays.** `health.allergy` with
`cardinality = multi` means one row per allergen, each with its own onset, source
and resolution. That is precisely what `pets.medical_conditions text[]` cannot
express, and why the array has to go.

### `normalized_value`
The canonical form for comparison, kept separate from what the source said.
`"עוף"`, `"chicken"` and `"Chicken meal"` all normalize to `chicken` (`34`). The
original stays in `value_text` for display and audit; the normalized form is what
`52` matches against `business_products.ingredients`.

---

## Namespaces — a closed set

```
identity     life_stage, birth_date_precision, species_variant
physical     weight, target_weight, body_condition, size_band, measurements
health       condition, allergy, sensitivity, medication, neuter_status,
             procedure, injury, vaccination_status, vet_recommendation, note
nutrition    current_food, current_food_text, diet_type, feeding_schedule,
             feeding_amount, treat, supplement, ingredient_avoidance,
             observed_reaction, wet_dry_ratio, diet_base, hay_access
behavior     energy, sociability_people, sociability_animals, playfulness,
             anxiety, separation_anxiety, reactivity, chewing,
             destructive_chewing, scratching, food_motivation, curiosity,
             affection, vocalisation, training_level, tag
preference   food, treat, toy_type, activity, brand, disliked_product,
             texture, flavor, product_characteristic, favorite_park
activity     activity_level, walks_per_week, avg_distance_m, enrichment_minutes
commerce     current_product, brand_affinity, reorder_interval_days
environment  indoor_outdoor, cage_dimensions, enclosure_dimensions,
             bedding_type, litter_type, flighted, wheel_diameter
insurance    provider, policy_active, expiry
```

Adding a namespace is a deliberate decision, not a side effect of adding a key.

---

## Worked definitions

```yaml
- namespace: physical
  key: weight
  value_type: number
  unit: kg                    # grams for birds — see 47 §species
  allowed_units: [kg, g, lb]
  allowed_species: []         # all
  min_value: 0.01  max_value: 120
  is_time_series: true
  volatile: true              # never disputed — supersede by recency
  requires_source: [VET_CONFIRMED, VET_DOCUMENT, USER_PROVIDED, ACTIVITY_DERIVED]
  label_he: "משקל"

- namespace: health
  key: allergy
  value_type: enum            # from ingredient_terms.canonical_key
  cardinality: multi
  is_sensitive: true
  volatile: false
  requires_source: [VET_CONFIRMED, VET_DOCUMENT, USER_PROVIDED]   # ✗ AI, purchase
  requires_confirmation: true
  decays: false               # an allergy does not fade because nobody mentioned it
  label_he: "אלרגיה"

- namespace: identity
  key: life_stage
  value_type: enum
  enum_values: [PUPPY, JUNIOR, ADULT, SENIOR, KITTEN, MATURE, JUVENILE]
  is_derived: true            # sole writer: the rule engine
  requires_source: [SYSTEM_DERIVED]
  rule_version: "life_stage@2026-09-01"
  label_he: "שלב חיים"

- namespace: preference
  key: toy_type
  value_type: enum
  enum_values: [chew, plush, fetch, puzzle, rope, interactive]
  cardinality: multi
  decays: true  half_life_days: 180
  requires_source: [USER_PROVIDED, PURCHASE_DERIVED, BEHAVIOR_DERIVED, AI_INFERRED]
  label_he: "סוג צעצוע מועדף"

- namespace: physical
  key: wingspan
  value_type: number
  unit: cm
  allowed_species: [bird]     # rejected for every other species
  label_he: "מוטת כנפיים"
```

---

## Lifecycle of a definition

```
proposed (a migration)  →  ACTIVE  →  DEPRECATED
```

- A `DEPRECATED` key **stops accepting writes** and keeps serving reads. Existing
  facts are untouched.
- A key is never deleted while facts reference it.
- Changing `value_type`, `unit` or `enum_values` on an ACTIVE key requires a
  migration that converts existing facts — the same discipline as an
  `ALTER COLUMN TYPE`.
- Changing `rule_version` on a derived key does **not** rewrite existing facts.
  They keep the version that produced them (`43`).

---

## Enforcement

```
write path
   │
 definition exists?              ── no ──► REJECT  UNKNOWN_FACT_KEY
   │
 status = ACTIVE?                ── no ──► REJECT  KEY_DEPRECATED
   │
 species applicable?             ── no ──► REJECT  SPECIES_NOT_APPLICABLE
   │
 source_type ∈ requires_source?  ── no ──► REJECT  CLINICAL_SOURCE_REQUIRED
   │
 value valid for type / enum / range / regex?
                                 ── no ──► REJECT  INVALID_FACT_VALUE
   │
 unit convertible to canonical?  ── no ──► REJECT  INVALID_UNIT
   │
 conflict resolution (45) ──► write + emit event (42)
```

Six rejections before anything is written. That chain is the registry's entire
value — and it belongs in a pure module so every rejection is a unit test.
