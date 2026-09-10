# 11 — Pet Behavior

## Today

`pets.personality_tags text[]` — free text, no source, no time. That is all.

But there is an unused asset. `breed_information` (40 columns) already carries a
**behavioural baseline per breed**, served to the Breeds page and used for
nothing else:

```
energy_level · playfulness · trainability · barking_level · mental_needs
affection_family · kids_friendly · dog_friendly · stranger_openness
watchdog_nature · shedding_level · grooming_freq · drooling_level
size_category · weight_range_kg · life_expectancy_years · temperament[]
```

This is the cheapest source of `SYSTEM_DERIVED` priors in the system, and it is
sitting idle.

---

## The model

Ten characteristics, each a fact with a value, a source, a confidence and a last
observation. Ordinal scales, not free text — because `18` reads them.

| Key | Scale | Species |
|---|---|---|
| `behavior.energy` | VERY_LOW…VERY_HIGH | all |
| `behavior.sociability_people` | ordinal | all |
| `behavior.sociability_animals` | ordinal | dog, cat |
| `behavior.playfulness` | ordinal | all |
| `behavior.anxiety` | ordinal | all |
| `behavior.chewing` | ordinal | dog, rodent |
| `behavior.scratching` | ordinal | cat |
| `behavior.reactivity` | ordinal | dog |
| `behavior.food_motivation` | ordinal | dog, cat |
| `behavior.curiosity` | ordinal | all |
| `behavior.affection` | ordinal | all |
| `behavior.vocalisation` | ordinal | dog, cat, bird |
| `behavior.training_level` | NONE…ADVANCED | dog |

Species applicability lives in the registry (`03`), not in four schemas.
`behavior.reactivity` on a hamster is rejected at write time.

### Three tiers of source, ranked

```
1. USER_PROVIDED      the owner said so                    HIGH
2. ACTIVITY_DERIVED   measured (14) — energy, only         MEDIUM
3. SYSTEM_DERIVED     breed baseline from breed_information LOW
```

The breed baseline is a **prior, not a fact about this animal**. A Labrador is
*typically* high-energy; this Labrador may be a couch potato. So:

- It is written with `confidence = LOW` and a clear `derived_from`.
- **Any owner-provided or activity-derived value supersedes it immediately.**
- The customer UI never presents it as a statement about their pet. At most:
  *"לברדורים בדרך כלל אנרגטיים"* — about the breed, in the breed's words.
- It is excluded from any hard gate in `18`. Priors rank; they never exclude.

That last rule is the important one. A prior that can exclude a product is a
stereotype with consequences.

---

## Behaviour is never medical

`behavior.anxiety = HIGH` is not "has separation anxiety disorder".
`behavior.reactivity = HIGH` is not "is aggressive". The registry marks none of
the behaviour keys `is_clinical`, and the boundary is enforced in three places:

1. **No behaviour fact may be `AI_INFERRED` into a clinical namespace.** A model
   reading a document may write `health.condition = separation_anxiety` only from
   `VET_DOCUMENT`; it may never write it from behaviour signals.
2. **No behaviour fact gates a health-relevant product.** Behaviour affects
   ranking and warnings — a strong chewer sees durable toys first, and sees a
   caution on a soft one — never eligibility.
3. **Language.** Mipo describes; it does not diagnose. The chat's system prompt
   already sets this posture ("You are not a veterinarian… Do not diagnose with
   certainty") and it applies here unchanged.

---

## Activity-derived energy

The one behaviour characteristic that can be measured rather than asked. Once
`14` exists:

```
walk_sessions over a trailing window
        │
   aggregate: sessions/week, mean distance, mean duration
        │
   vs species + size + life-stage expectation
        │
   behavior.energy = VERY_LOW … VERY_HIGH
   source ACTIVITY_DERIVED · confidence by window length
```

| Window | Confidence |
|---|---|
| < 2 weeks | do not write at all |
| 2–4 weeks | MEDIUM |
| > 8 weeks with regular data | HIGH |

Recomputed weekly; each recomputation supersedes the last, so the history of
energy is itself a record — and a **drop** in it is a health signal worth an
insight (`20`), not a silent overwrite.

Note the honest limit: walks measure a **dog owner's** behaviour as much as the
dog's. Cats, birds and rodents get nothing from this path, which is why
`behavior.energy` for them must stay `USER_PROVIDED` or absent. Do not build a
model that quietly assumes every pet is walked.

---

## What behaviour is for

| Consumer | Use |
|---|---|
| `18` matching | ranking: chewing → toy durability; food motivation → treat types; anxiety → calming products **as a category, not a claim** |
| `20` insights | change detection: "Blue has been less active for three weeks" |
| `21` CRM | context on the customer screen |
| Care | training and enrichment suggestions, non-clinical |

## Gaps

| Gap | Status |
|---|---|
| `personality_tags` is untyped free text | needs mapping into ordinal keys during migration (`24`) |
| `breed_information` never seeds anything | `MISSING` — the highest-value cheap win here |
| No observation capture | there is no place an owner records "chewed through a bed today" |
| Activity-derived energy | blocked on `14` |
| Ordinal scales are unvalidated | the registry's `enum_values[]` is what fixes this |

## Migration note

`personality_tags` is Hebrew free text entered from a chip picker in
`AddPet.tsx`. Mapping it into ordinal behaviour keys requires a term map, and
some tags will not map. Rule for `24`: map what maps deterministically, keep the
rest as `behavior.tag` string facts with `USER_PROVIDED`, and **never guess**. An
unmapped tag is not a loss — it is still visible on the pet — but it does not
enter `18`.
