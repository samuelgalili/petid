# 41 — Observation Data Contract

## §17 — What qualifies as an observation

An observation is **a measured or witnessed value at an instant, attributed to a
source, that has not yet been interpreted.**

Three tests, all of which must pass:

1. **It has a time.** Not a period — a point.
2. **It has a source that was there.** A scale, a document, a phone, a person.
3. **It asserts nothing beyond itself.** "6.2 km" is an observation. "High
   activity" is a conclusion drawn from many.

### Applied to the brief's examples

| Example | Observation? | Actually is |
|---|---|---|
| "Pet walked 6.2 km" | ✅ | an observation, produced by a walk **event** |
| "Pet interacted with another pet" | ✅ | an encounter observation (`38`) |
| "Pet visited a park" | ⚠️ | the **check-in is an event**; the visit is what the event records |
| "Pet appears to prefer a certain toy" | ❌ | an **inference** — "appears to" is the tell (`44`) |
| "Pet activity increased" | ❌ | an **insight** — it compares two windows (`43`) |

Two of five are not observations. That distinction is the document.

---

## Observation vs Fact

```
pet_observations  (many points)      pet_facts  (one current value + history)
  28.0 kg @ 2026-03-01                 physical.weight = 29.2 kg
  28.7 kg @ 2026-09-08                 from 2026-09-09, effective_to null
  29.2 kg @ 2026-09-09                 superseding the earlier periods
```

| | Observation | Fact |
|---|---|---|
| Time | a point (`measured_at`) | a period (`effective_from`/`_to`) |
| Count | many per key | one current per key |
| Mutability | immutable — a correction is a new row | superseded, never edited |
| Conflicts | **impossible** — two readings are two readings | resolved by rank (`45`) |
| Answers | "what did the scale say on 8 September?" | "how much does Blue weigh?" |

**Observations never conflict.** That is why they are separate: three weights
from three sources are three facts about the world, and only the *derived current
value* needs a resolution rule.

## Why a separate table from `pet_facts`

An observation is dense — many rows per key, none of them ever "current". Putting
them in `pet_facts` would fill it with rows that are permanently historical and
make the current-value partial index useless.

---

## The schema

```
pet_observations
  id
  pet_id                → pets, ON DELETE CASCADE
  observation_type      registry-controlled (46)
  value_number          the measured quantity
  unit                  canonical per type (47)
  value_text            only for enumerated observations
  measured_at           when the world was like this
  recorded_at           when it reached Mipo
  source_type           USER_PROVIDED | VET_DOCUMENT | VET_CONFIRMED |
                        ACTIVITY_DERIVED | SYSTEM
  source_id             pet_documents.id, pet_vet_visits.id, walk_sessions.id
  method                manual | scale | tape | document_extraction | device
  confidence            usually HIGH — it is a reading
  context               json: what else was true (fasted, post-walk)
  note
  created_at
```

`measured_at` vs `recorded_at` matters for the same reason `document_date` does
in `40`: a March weight uploaded in September was measured in March, and `45`'s
recency tie-break must see that.

`method` matters clinically: a bathroom scale and a clinic scale are not
interchangeable for a 400 g bird.

---

## The observation types

| Type | Unit | Species | Time series | Source |
|---|---|---|---|---|
| `weight` | kg / **g for birds and small rodents** | all | ✅ | user, document, vet |
| `temperature` | °C | all | ✅ | document, vet |
| `neck_girth`, `chest_girth`, `back_length`, `height_withers` | cm | dog | rarely | user |
| `body_length` | cm | cat, bird, rodent | rarely | user |
| `wingspan` | cm | bird | rarely | user |
| `enclosure_width/depth/height` | cm | bird, rabbit, rodent | no | user |
| `lab_<analyte>` | analyte-specific | all | ✅ | document |
| `walk_distance` | m | dog | ✅ | activity |
| `walk_duration` | s | dog | ✅ | activity |
| `step_count` | count | dog | ✅ | activity |
| `enrichment_duration` | s | cat, bird, rodent | ✅ | user |
| `encounter` | — | dog, cat | no | user, checkin overlap |

**Calories are not here.** They are derived from distance, duration, weight and
species with a wide error bar. Storing an estimate in the observation table makes
it look measured (`43`).

---

## Sources

| Source | Example | Confidence |
|---|---|---|
| `USER` | owner weighs the pet | HIGH |
| `ACTIVITY` | a walk session's distance | HIGH for the number, MEDIUM if gapped |
| `PURCHASE` | — | **not an observation source.** A purchase is an event; a preference derived from it is an inference |
| `MOMENT` | — | **not an observation source.** A photo is content |
| `AI` | — | **never.** A model that reads "28.2 kg" off a page produces a `VET_DOCUMENT` observation with `method = document_extraction`; the document observed it, the model transcribed it |
| `SYSTEM` | a device reading | per device |

That AI row is the important one. **AI is a transcriber of observations, never an
observer.** An "observation" with no witness is an inference, and it belongs in
`44`.

---

## Observations → facts

```
observation written
        │
  is the type registered as fact-producing?
        │ yes
  compute the current value for its key
        │
  differs from the current fact?
        │ yes                         │ no
  supersede + insert new fact     touch nothing
        │
  emit pet_fact.superseded + pet_fact.created (42)
        │
  recompute anything derived from it (43)
  weight → size_band → life_stage → matching gates
```

Not every observation produces a fact. A single chest measurement produces
`physical.chest_girth`; a single walk distance produces nothing on its own — only
the aggregate over a window does (`37`).

---

## Retention

| Type | Retain | Then |
|---|---|---|
| Weight, temperature, lab | life of the pet + 7 years | archive — the trend **is** the clinical value |
| Body measurements | 3 years | archive — a 2021 chest girth is not useful |
| Walk distance/duration/steps | 3 years | aggregate, then delete detail |
| **Raw GPS points** | **90 days** | **delete** — a route is a map of where someone lives (`37`) |
| Encounters | life of the pet | |

## Privacy

| Type | Class |
|---|---|
| Weight, temperature, lab | `SENSITIVE` — clinical |
| Body measurements | `PRIVATE` |
| Walk distance, duration | `PRIVATE` — location-adjacent |
| GPS points | `SENSITIVE` — never leave the account, never in an event payload |
| Encounters | `PRIVATE` — visible only to the two owners |

## Gaps

| Gap | Status |
|---|---|
| No observation table | `MISSING` — everything here is new |
| `pets.weight` is a single scalar | the only weight the system has |
| No lab result capture | `pet_vet_visits.raw_summary` is their only home |
| No measurement capture | blocks accessory sizing in `52` |
| Activity observations | blocked on `37` |
