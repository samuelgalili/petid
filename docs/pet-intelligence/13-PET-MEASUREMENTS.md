# 13 — Pet Measurements

## Today: `MISSING`

No measurement columns exist beyond `pets.weight` (scalar) and the dead
`pets.weight_unit` and `pets.size`. Nothing sizes a harness, a collar, a cage or
a carrier.

Meanwhile `business_products` carries `dog_size` and `weight` / `weight_unit`
(the pack weight, not the animal's), so the product side has a coarse sizing
concept and no measurement to match it against.

---

## Observations, not facts

A measurement is an **observation**: a value taken at a time with an instrument.
It produces a fact (the current value), and the observation is what supports the
trend.

```
pet_observations
  id
  pet_id
  observation_type      weight | neck | chest | back_length | height |
                        wingspan | body_length | temperature | lab_*
  value_number
  unit                  kg | g | cm | mm | °C
  measured_at
  source_type           USER_PROVIDED | VET_DOCUMENT | VET_CONFIRMED |
                        ACTIVITY_DERIVED
  source_id             pet_documents.id, pet_vet_visits.id, …
  method                manual | tape | scale | document_extraction
  confidence
  note
  created_at
```

Why a separate table from `pet_facts`: an observation is dense (many per key,
each a point) and never has an effective *period*. Forcing it into `pet_facts`
would fill the fact table with rows that are never "current" and make the
current-value index useless.

The relationship:

```
pet_observations  (many points)  ──►  pet_facts  (one current value + history)
   28.0 kg @ 2026-03-01                physical.weight = 29.2 kg
   28.7 kg @ 2026-09-08                from 2026-09-09, effective_to null
   29.2 kg @ 2026-09-09                superseding the earlier periods
```

---

## Species-aware measurement sets

Applicability lives in `pet_fact_definitions` / an observation-type registry —
**not** four schemas. A `wingspan` on a dog is rejected at write time.

### Dog
| Measurement | Unit | Buys you |
|---|---|---|
| weight | kg | life stage, feeding, nearly every gate |
| neck girth | cm | collar sizing |
| chest girth | cm | harness sizing — the one people get wrong |
| back length | cm | coats, carriers |
| height at withers | cm | crates, gates, car barriers |

### Cat
| Measurement | Unit | Buys you |
|---|---|---|
| weight | kg | the primary health signal for cats |
| neck girth | cm | collars |
| body length | cm | carriers, beds |

Cats do not need harness chest measurements in the way dogs do, and pushing dog
measurements onto cat owners is exactly the dog-centrism the brief warns about.

### Bird
| Measurement | Unit | Buys you |
|---|---|---|
| weight | **g** | the single most important bird health metric — grams matter |
| wingspan | cm | cage width, flight space |
| body length | cm | perch and carrier sizing |

Note the unit. A bird weighed in kilograms loses all resolution; the model must
carry the unit per observation and never normalise everything to kg.

### Rodent / rabbit
| Measurement | Unit |
|---|---|
| weight | g (rabbits: kg) |
| body length | cm |
| **enclosure dimensions** | cm |

Enclosure size is a *habitat* measurement, not an animal one, and it is the
main determinant of what enclosure products fit. It belongs in the species
extension (`17`), keyed to the pet because that is what the owner is shopping
for.

---

## Weight — the special case, in full

Covered by §20 of the brief and detailed here because everything downstream
depends on it.

```
pet_observations (weight)
        │
   ┌────┴────┬──────────────┬─────────────┬────────────────┐
   │         │              │             │                │
current   history        trend        target          body condition
 fact     (the points)  (derived)   (user/vet fact)   (enum fact, 21)
   │                        │             │                │
   └────────────┬───────────┴─────────────┴────────────────┘
                │
        life_stage · size_band · feeding amount · matching gates
```

| Element | Model | Source |
|---|---|---|
| Current weight | `physical.weight` fact | supersedes by `observed_at` |
| History | `pet_observations` | never deleted |
| Trend | **derived at read time** | slope over a trailing window |
| Target weight | `physical.target_weight` fact | USER_PROVIDED or VET_* only |
| Weight goal | derived: target − current | |
| Body condition | `physical.body_condition` fact | see `21` of the brief, below |

**Trend is never stored.** It is a function of the observations and the window;
storing it creates a value that goes stale silently. Same argument as `age`,
which this codebase already gets right.

Minimum data before a trend is shown: **three observations spanning ≥ 30 days**.
Two points on a bathroom scale are noise, and presenting noise as a trend on a
health screen is worse than showing nothing.

---

## §21 — Body condition

| Value | Meaning |
|---|---|
| `UNDERWEIGHT` | |
| `IDEAL` | |
| `OVERWEIGHT` | |
| `UNKNOWN` | the default, and an honest one |

Sources, in rank order:

1. **`VET_CONFIRMED` / `VET_DOCUMENT`** — a Body Condition Score from a clinic.
   The real thing.
2. **`USER_PROVIDED`** — the owner answering a simple guided question ("can you
   feel the ribs easily?"). This is how BCS is assessed in practice and it is a
   reasonable thing to ask.
3. **`SYSTEM_DERIVED`** — weight vs `breed_information.weight_range_kg`.
   **`LOW` confidence, and only when breed is known and not mixed.** A breed
   range is a population statistic; this animal may sit outside it legitimately.
4. **`AI_INFERRED` from a photo** — **not permitted.** Body condition drives
   dietary recommendations, so it is a clinical key under `04`, and a model
   guessing it from a photo is exactly the inference that must never become a
   fact.

Effect on the Store, stated carefully:

- `OVERWEIGHT` (vet or user sourced) → weight-management products **rank higher**
  and calorie-dense treats carry a caution. It does **not** exclude anything.
- `SYSTEM_DERIVED` body condition affects **nothing** in the Store. A LOW-confidence
  statistical inference must not change what an owner is shown to buy for their
  animal's health.
- Mipo never says "Blue is overweight". It says what the source said, and who
  said it: *"במסמך מהמרפאה, 9 בספטמבר"*.

---

## Capture, without a form

Measurements have terrible completion rates when asked for as a form. Where they
should actually come from:

| Path | Effort | Note |
|---|---|---|
| Vet document extraction (`16`) | zero | weight and temperature are on almost every visit summary |
| A one-tap weight prompt after a vet-visit record | low | the number is in front of them |
| Guided harness sizing **at the point of need** | low | on a harness product page, not in onboarding |
| Manual entry in the pet profile | high | keep it, do not rely on it |

The principle from §38 of the brief applies exactly here: **never ask in
onboarding for a number that a document will supply for free.** Chest girth is
asked once, on the product page where it decides a size — and then it is
remembered.
