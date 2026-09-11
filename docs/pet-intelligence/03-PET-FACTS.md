# 03 — Pet Facts

## Why one table and not thirty

Every fact needs the same nine provenance columns and the same temporal shape.
Thirty typed tables repeat them thirty times and drift. But an untyped EAV blob
is unqueryable, and §10 of the brief is explicit that we need queryable data.

The design that satisfies both: **one fact table with typed value columns, plus a
registry that declares what each key means.**

```
┌──────────────────────────────┐        ┌───────────────────────────────────┐
│      pet_fact_definitions    │◄───────│           pet_facts               │
│  (the schema, as data)       │  key   │  (the values, with provenance)    │
├──────────────────────────────┤        ├───────────────────────────────────┤
│ namespace                    │        │ id                                │
│ key                          │        │ pet_id            → pets          │
│ value_type                   │        │ namespace, key    → definition    │
│ unit / allowed_units         │        │ value_text                        │
│ enum_values[]                │        │ value_number                      │
│ species_applicability[]      │        │ value_boolean                     │
│ cardinality  single|multi    │        │ value_date                        │
│ is_clinical  bool            │        │ value_timestamp                   │
│ privacy_class                │        │ value_json                        │
│ min_source_rank              │        │ value_ref_type / value_ref_id     │
│ decays / half_life_days      │        │ unit                              │
│ label_he / label_en          │        │ normalized_value                  │
│ rule_version                 │        │ ── provenance (04) ──             │
└──────────────────────────────┘        │ source_type, source_id            │
                                        │ source_timestamp                  │
                                        │ confidence                        │
                                        │ verification_status               │
                                        │ ── time (05) ──                   │
                                        │ observed_at                       │
                                        │ effective_from, effective_to      │
                                        │ status                            │
                                        │ superseded_by_fact_id             │
                                        │ derived_from  jsonb[]             │
                                        │ created_at, updated_at            │
                                        └───────────────────────────────────┘
```

### What the registry buys

- **Species applicability without four schemas.** `activity.walks_per_day`
  applies to dogs; `nutrition.grit_provided` applies to birds. One row each.
- **It stops the junk drawer.** A fact whose `(namespace, key)` has no definition
  is **rejected at write time**. That single rule is the difference between this
  and an EAV free-for-all.
- **`is_clinical` is enforceable.** The list in `04` of what may never be
  `AI_INFERRED` becomes a column, checked in code, not a convention in a
  document.
- **Rules are data.** Life-stage thresholds, decay half-lives and source ranks
  are versioned rows, so a change is dated and attributable and a recommendation
  can cite the version that produced it.

---

## §10 — Value types

Typed columns, one populated per row, chosen by `value_type`:

| `value_type` | Column | Example |
|---|---|---|
| `number` | `value_number` + `unit` | `physical.weight` = 28.2 kg |
| `string` | `value_text` | `nutrition.current_food_text` |
| `boolean` | `value_boolean` | `health.neuter_status` |
| `date` | `value_date` | `health.condition_onset` |
| `datetime` | `value_timestamp` | |
| `enum` | `value_text`, validated against `enum_values[]` | `physical.body_condition` = `IDEAL` |
| `ref` | `value_ref_type` + `value_ref_id` | `nutrition.current_food` → `business_products.id` |
| `json` | `value_json` | `nutrition.feeding_schedule` |

**Multi-valued keys are multiple rows**, not arrays. `health.allergy` with
`cardinality = multi` means one row per allergen — each with its own onset, its
own source and its own resolution date. That is exactly what
`pets.medical_conditions text[]` cannot express, and it is the reason the array
has to go.

### What must be relational, not JSON

| Attribute | Shape | Why |
|---|---|---|
| Weight, temperature, measurements | `number` + unit | queried, trended, compared |
| Allergies, conditions, medications | one `enum`/`ref` row each | filtered by the matching engine |
| Life stage, size band | `enum` | gates in `18` |
| Current food | **`ref` → product** | the whole point of `15` |
| Body condition | `enum` | four states, no more |
| Feeding schedule | `json` | genuinely irregular shape, never filtered on |
| Free-text notes | `string` | not queried |

Rule: **anything the Product Matching Engine reads must be typed and
constrained.** JSON is for things people read, not things rules evaluate.

### `normalized_value`
The canonical form for comparison, separate from what the source said.
`"עוף"`, `"chicken"` and `"Chicken meal"` all normalize to `chicken`. The
original stays in `value_text` for display and audit; the normalized form is what
`18` matches against `business_products.ingredients`.

---

## Namespaces

```
physical    weight, target_weight, body_condition, size_band, measurements
health      condition, allergy, sensitivity, medication, neuter_status, procedure
nutrition   current_food, diet_type, feeding_schedule, feeding_amount,
            treats, supplement, ingredient_avoidance
behavior    energy, sociability, playfulness, anxiety, chewing, reactivity,
            food_motivation, curiosity, affection, training_level
preference  food, treat, toy_type, activity, brand, disliked_product
activity    activity_level, walks_per_day, avg_distance_m, enrichment_minutes
commerce    repeat_product, brand_affinity, reorder_interval_days
identity    life_stage, birth_date_precision
```

Namespaces are a flat, closed set. A new namespace is a deliberate decision, not
a side effect of adding a key.

---

## Write rules

1. **A fact is never updated in place.** Correcting a value means closing the old
   row (`effective_to`, `status = SUPERSEDED`, `superseded_by_fact_id`) and
   inserting a new one. `updated_at` moves only for provenance changes such as a
   user confirming an extracted value.
2. **Unknown key ⇒ reject.** No definition, no write.
3. **Wrong species ⇒ reject.** `species_applicability` is checked against
   `pets.species`.
4. **Clinical key + `AI_INFERRED` ⇒ reject.** Enforced by `is_clinical`, not by
   reviewers remembering.
5. **`min_source_rank`.** Some keys refuse weak sources entirely — a
   `PURCHASE_DERIVED` allergy is not a thing.
6. **Every write emits an event** into `outbox_events` (`07`), inside the same
   transaction, using the existing `emitEvent(client, …)` pattern.

## Indexes

```
(pet_id, namespace, key) where effective_to is null    -- current value, one scan
(pet_id, observed_at desc)                             -- timeline
(pet_id, namespace, key, effective_from desc)          -- history of one key
(source_type, source_id)                               -- "what did DOC-123 assert?"
(status) where status = 'DISPUTED'                     -- the review queue
```

The last one matters more than it looks: it is how `06` surfaces conflicts
without a scan, and how `16` finds documents needing a human.

## What `pet_facts` is not

- **Not an event log.** Events are in `outbox_events`; observations are in
  `pet_observations`. A fact is a *state*, not a *happening*.
- **Not the timeline.** The timeline is a projection over facts and events (`08`).
- **Not a place for insights.** An insight is recomputed; a fact is asserted.
  Writing an insight as a fact makes it un-recomputable and permanently stale.
