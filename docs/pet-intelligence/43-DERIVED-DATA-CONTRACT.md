# 43 — Derived Data Contract

## The rule

> **A value that can be computed is never stored as a hand-maintained fact.**

This is not a style preference. Eleven dead columns on `pets` are what happens
when it is broken: `age`, `size`, `current_mood` and `weight_unit` were all
values something could compute, given a home where a human could also type them,
and neither writer won.

---

## §19 — The register

Every derived value, with its inputs, calculation, refresh trigger, storage and
source.

| Value | Inputs | Refresh | Storage | Cache |
|---|---|---|---|---|
| **`age_years` / `age_months`** | `birth_date` | every read | **not stored** | none — it is arithmetic |
| **`life_stage`** | species, age, size_band, `life_stage_rules` | on weight/birth-date change; **auto at `effective_to`** | `SYSTEM_DERIVED` fact | the fact is the cache |
| **`size_band`** | weight, breed → `breed_information.weight_range_kg` | on weight change | `SYSTEM_DERIVED` fact | the fact is the cache |
| **`weight_trend`** | weight observations over a window | every read | **not stored** | none |
| **`activity_level`** | walk aggregates over a window | weekly | `ACTIVITY_DERIVED` fact | the fact is the cache |
| **`energy_need`** (kcal/day) | weight, life stage, neuter status, activity | every read | **not stored** | none |
| **`reorder_due`** | pack size, quantity, daily amount, last order | on order/food/weight change | **PREDICTION**, with `valid_until` | expires |
| **`purchase_frequency`** | order history | every read | not stored | none |
| **`favorite_product_category`** | order history + `preference.*` | on order | `PURCHASE_DERIVED` preference, with decay | decays |
| **`preventive_care_due`** | `pet_vaccinations.expires_at` + species rules | every read | **not stored** | none |
| **`social_activity`** | Moments + encounters over a window | every read | not stored | none |
| **`insights`** | facts, observations, events | on relevant change | `pet_insights` **projection** | `valid_until` |

### The storage decision, stated once

| Store as a fact when | Do not store when |
|---|---|
| it has a **transition date** worth recording (life stage) | it is arithmetic over current data (age, trend) |
| computing it is expensive (activity over 8 weeks) | it is cheap and always fresh |
| a **gate** in `52` reads it and must be indexable | it changes on every read anyway |
| the history of the derivation is itself interesting | nobody would ask "what was it last March?" |

`age` fails all four. It is arithmetic over one column. That it was ever a column
is the cautionary tale.

---

## Single writer

> **Every derived key has exactly one writer: the rule engine.**

Not the user. Not an admin. Not an import.

A user who disagrees with a life stage is disagreeing with the **birth date**,
and the UI must take them there. Letting them overwrite the output is how a
derived value acquires two writers and dies.

This is the one place this design departs from the brief's source hierarchy:
`SYSTEM_DERIVED` outranks `USER_PROVIDED` **for derived keys only** (`45`).

---

## Rule versioning

Every derived fact carries `rule_version` and `derived_from`.

```
identity.life_stage = ADULT
  source          SYSTEM_DERIVED
  derived_from    [pets.birth_date, pets.species, physical.size_band#fact_id]
  rule_version    life_stage@2026-09-01
  effective_from  2024-04-02
  effective_to    2028-04-02      ← the SENIOR transition, known in advance
```

When rules change:

1. Existing facts are **not rewritten**. They keep their `rule_version`.
2. New computations use the new version.
3. A recommendation made last year can still be explained, because the rule that
   produced it is identifiable.
4. A backfill under a new version is a **deliberate, dated act** — it supersedes,
   it does not overwrite.

That future `effective_to` is worth noticing: life stage transitions on the right
day **without a nightly job**, on a system that has no durable scheduler.

---

## Refresh triggers

```
weight observation written
        │
   physical.weight superseded
        │
   size_band recomputed ──► life_stage recomputed ──► matching gates change
        │                          │
   energy_need (read-time)    timeline: life_stage_changed
        │
   reorder_due invalidated (daily amount changed)
```

Triggers are **event-driven, not scheduled** wherever possible — `42` already
emits `pet_fact.superseded`. The exceptions:

| Needs a clock | Handled by |
|---|---|
| `activity_level` weekly recompute | a job (`37`) |
| `preventive_care_due` | **read-time predicate**, not a job |
| preference decay | **read-time**, from `observed_at` + half-life |
| life stage transition | **future `effective_to`**, no job |

Three of four avoid the scheduler entirely. That is deliberate: there is no
durable job runner, and a read-time computation cannot silently stop working.

---

## Insights and predictions

Both are **projections**. Recomputable, disposable, always carrying their inputs.

```
pet_insights
  id, pet_id, insight_type, severity
  title_key, payload          -- numbers and ids, not prose
  derived_from  jsonb[]       -- fact / observation / event ids
  rule_version                -- or ai_request_id when AI-phrased
  computed_at, valid_until
  status  ACTIVE | STALE | DISMISSED
```

| Insight | Detection |
|---|---|
| "Weight down 1.2 kg over 6 weeks" | **deterministic** |
| "Vaccination expires in 3 weeks" | deterministic |
| "Activity down 30% for 3 weeks" | deterministic |
| "Food likely to run out in ~9 days" | deterministic |
| "This pattern is worth mentioning to your vet" | AI **phrasing** over deterministic detection |

> **Detection is deterministic. AI phrases the result.**

A model asked to "find patterns" in health data will find them whether or not
they exist. A rule that fires on a 15% weight change in 60 days either fires or
does not, and can be tested.

**Severity is `INFO` or `ATTENTION` only.** There is no `URGENT` tier — an urgent
health finding produced by pattern-matching over a phone's data is the most
dangerous thing this system could emit. Genuine urgency routes to the path the
chat prompt already names: contact an emergency veterinarian.

---

## Calories — a worked example of honest derivation

```
calories_burned  ≈ f(distance, duration, weight, species)
```

Every input exists once `37` does. But the error bar is wide, individual
variation is large, and no consumer of Mipo needs the number to be right.

Rules if it is shown at all:
- **Never** in `pet_observations` — that would make an estimate look measured.
- Derived at read time, labelled as an estimate, with no clinical framing.
- **Never** feeds a feeding recommendation. That is the line in `34`: activity is
  a context signal, not a nutritional prescription.

---

## What must never be a stored fact

```
age · age_months · life_stage as a user-entered value · size as a user-entered value
weight_trend · activity_level as a hand-maintained column · reorder prediction
favorite_product_category as a permanent flag · calories · body condition
  inferred from a photo
```

The last one is not derived — it is **forbidden** (`44`): body condition drives
dietary recommendations, so it is clinical, and a model guessing it from a photo
must never become a fact.
