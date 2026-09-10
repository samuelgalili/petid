# 31 — Pet Core Contract

## §3 — Every one of the 57 `pets` columns, classified

Verdicts: `KEEP` · `MOVE_TO_FACT` · `MOVE_TO_TIME_SERIES` ·
`MOVE_TO_RELATIONSHIP` · `MOVE_TO_SPECIES_EXTENSION` · `DERIVED` · `DEAD` ·
`DEPRECATED` · `UNKNOWN`.

### Identity — KEEP (13)

| Column | Verdict | Note |
|---|---|---|
| `id` | KEEP | |
| `user_id` | KEEP → **rename in place** to `owner_scope_id` + `owner_scope_type` | prepares §40 multi-tenancy without changing behaviour |
| `name` | KEEP | `NOT NULL` |
| `type` | KEEP → **rename to `species`**, widen the CHECK | `32` |
| `breed` | KEEP | |
| `secondary_breed` | KEEP | |
| `is_mixed` | KEEP | |
| `breed_confidence` | KEEP | **the only provenance in the schema today** |
| `color` | KEEP | identity marker, used on the lost poster |
| `avatar_url` | KEEP | |
| `theme_color` | KEEP | presentation |
| `microchip_number` | KEEP | legal identity |
| `gender` | KEEP | |

### Lifecycle — KEEP (5)

| Column | Verdict |
|---|---|
| `archived`, `archived_at` | KEEP |
| `created_at`, `updated_at` | KEEP |
| `birth_date` | KEEP — **the canonical age source** |

### Israeli regulatory — KEEP (2), DEAD (2)

| Column | Verdict | Note |
|---|---|---|
| `is_dangerous_breed` | KEEP | dangerous-breeds regime |
| `license_conditions` | KEEP | |
| `license_expiry_date` | KEEP | drives a reminder once `16` of the earlier set exists |
| `license_number` | **DEAD** | one hit: a Hebrew search-term map in `CentralBrainContext` |
| `license_renewal_date` | **DEAD** | zero hits |

### Lost poster — KEEP, all 8, unchanged

`is_lost`, `lost_since`, `lost_reward_text`, `lost_temperament`,
`lost_medication_note`, `lost_allergy_note`, `lost_show_phone`,
`lost_contact_phone`.

**Do not move these into facts.** They are read by
`GET /api/public/pets/:id` — an unauthenticated endpoint, on the one path that
must never be slow, with hand-written privacy rules
(`server/src/index.js:2064`). A join buys nothing here and risks the most
sensitive surface in the codebase.

### Move to FACT (9)

| Column | Target key | Why |
|---|---|---|
| `is_neutered` | `health.neuter_status` | has a date and a source |
| `medical_conditions[]` | `health.condition` — **one row per element** | needs dates, sources, resolution |
| `health_notes` | `health.note` | |
| `current_food` | `nutrition.current_food_text` (+ `nutrition.current_food` ref) | changes; previous foods matter |
| `personality_tags[]` | `behavior.*` where a term maps; `behavior.tag` otherwise | needs source + confidence |
| `favorite_activities[]` | `preference.activity` | |
| `activities[]` | **collapses into the above** | verified mirror: the write path sets **both to the same value** |
| `has_insurance`, `insurance_company`, `insurance_expiry_date` | `insurance.*` | effective dates |

### Move to TIME_SERIES (1)

| Column | Target |
|---|---|
| `weight` | `pet_observations` (points) + `physical.weight` (current fact) |

### Move to RELATIONSHIP (4)

| Column | Target |
|---|---|
| `vet_clinic`, `vet_clinic_name`, `vet_clinic_phone`, `vet_clinic_address` | `care_providers` + `pet_care_provider` |

Live today — `serializePet` falls `vet_clinic_name → vet_clinic`. Four loose
strings for one entity that also appears in `pet_vet_visits` and
`insurance_claims`. `OPEN DECISION` on timing (`53`); the classification is not
in doubt.

### DERIVED (2 of 2 already correct)

| Column | Verdict |
|---|---|
| `last_vet_visit`, `next_vet_visit` | **DERIVED** from `pet_vet_visits` — currently duplicated as columns |

### DEAD (11) — confirmed by whole-codebase search

```
age · size · weight_unit · current_mood · mood_score · mood_updated_at
vet_name · vet_phone · license_number · license_renewal_date
insurance_policy_number
```

Never read by `serializePet`, never written by `normalizePetPayload`.
`insurance_policy_number` is also a **latent bug**: `InsuranceSheet.tsx` renders
it through its own local interface, so that block can never appear.

`size` and `weight_unit` return as a derived fact and as a per-observation unit
respectively (`47`) — the column is dead, the concept is not.

### Tally

```
KEEP                       28
MOVE_TO_FACT                9
MOVE_TO_TIME_SERIES         1
MOVE_TO_RELATIONSHIP        4
DERIVED                     2
DEAD                       11
                          ───
                           55
```
Two more (`type`, `user_id`) are KEEP-with-rename and counted in KEEP. 57 total.

---

## The canonical Pet Core

```
pets
  id                     uuid pk
  owner_scope_type       enum  'user' | 'organization'      -- 'user' today
  owner_scope_id         uuid                               -- = user_id today
  name                   text  NOT NULL
  species                text  NOT NULL  CHECK (widened — 32)
  breed                  text
  secondary_breed        text
  is_mixed               boolean NOT NULL default false
  breed_confidence       integer
  breed_source           enum  USER_PROVIDED | AI_INFERRED | VET_DOCUMENT   -- NEW
  gender                 text
  birth_date             date
  birth_date_precision   enum  EXACT|MONTH|YEAR|ESTIMATED|UNKNOWN           -- NEW
  estimated_age_months   integer                                            -- NEW
  color                  text
  avatar_url             text
  theme_color            text
  microchip_number       text
  is_dangerous_breed     boolean NOT NULL default false
  license_conditions     text
  license_expiry_date    date
  status                 enum  ACTIVE | ARCHIVED | DECEASED                 -- NEW
  archived, archived_at
  is_lost + 7 lost_* columns
  created_at, updated_at
```

**28 columns, of which 8 are the lost block.** Down from 57.

### The rule that decided membership

> A column stays in Core if it identifies the animal, or if the public lost-pet
> endpoint reads it. Everything else has a source and a period, which makes it
> a fact.

---

## §4 — Age and birth-date precision

**Already correct in the code.** `serializePet` derives `age_years`/`age_months`
from `birth_date` via `calculatePetAge` and never returns `pets.age`.
`normalizePetPayload` never writes it. Age is a `DERIVED_VALUE` today.

What is missing is precision. Shelter and street adoptions rarely come with a
birth date, and the current model forces a false one or a null. Meanwhile
`TopRecommendation.tsx` already infers age from `breed_information.
life_expectancy_years` when there is no birth date (`isAgeFromBreed`) — an
inference with nowhere to record that it *is* one.

```
birth_date_precision   EXACT     a real date
                       MONTH     month and year known
                       YEAR      year only  → treat as 1 July
                       ESTIMATED derived from an estimated age at a known date
                       UNKNOWN   nothing known
estimated_age_months   integer, only meaningful with ESTIMATED and no date
breed_source / birth_date_source
```

Rules:
- `age` is **never stored**. Derived on read.
- `precision = ESTIMATED` ⇒ the UI says *"בערך 4 שנים"*, never *"4 שנים"*.
- An `ESTIMATED` date **may** be replaced by an `EXACT` one from a vet document
  with no conflict — precision is part of the source ranking (`45`).
- `precision = UNKNOWN` ⇒ life stage falls back to size + breed, and everything
  downstream that needs age returns `INSUFFICIENT_DATA` (`52`).
- A breed-inferred age is `AI_INFERRED`/`SYSTEM_DERIVED` with `ESTIMATED`
  precision — never written into `birth_date` as if the owner had said it.

---

## §5 — Life stage

`MISSING` today, and approximated in **two** places that disagree:
`SmartRecommendations.tsx` uses keyword lists (`PUPPY_CATEGORIES`,
`SENIOR_CATEGORIES`); `TopRecommendation.tsx` uses age bands (`<1`, `<2`, `>7`).

Canonical model:

| Property | Decision |
|---|---|
| **Storage** | a `SYSTEM_DERIVED` fact, `identity.life_stage` — not a Core column |
| **Calculation** | `species` + `age` + (dogs) `size_band` → `life_stage_rules` |
| **Rule versioning** | `life_stage_rules` rows carry `version` + `effective_from`; the fact stores `rule_version` |
| **Effective date** | `effective_from` = the transition date; **`effective_to` can be set in advance** — a large dog becomes SENIOR at 6, which is knowable today |
| **Rules change** | existing facts are **not rewritten**. They are superseded on next recompute, and the old row keeps its rule version. A recommendation made last year can still be explained. |
| **Writer** | the rule engine, **and nobody else** — including the user (`45`) |

The future `effective_to` is the useful property: life stage transitions on the
right day without a nightly job touching every pet, on a system that has no
durable scheduler.

Thresholds are in `32`. They are a starting point, not veterinary consensus, and
are marked `OPEN DECISION`.

---

## Core invariants

1. **One writer per Core column** — the owner, through `normalizePetPayload`.
2. **No derived value is stored in Core.** Age, life stage and size band are
   computed or are facts. This is the rule that would have prevented all 11 dead
   columns.
3. **Core carries no provenance** except `breed_source`/`breed_confidence` and
   `birth_date_precision`, because Core is the anchor everything else points at.
4. **Core is never the place a new field goes by default.** New pet information
   is a fact until someone argues it is identity.
