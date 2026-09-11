# 35 — Behavior Data Contract

## Today

`pets.personality_tags text[]` — Hebrew free text from a chip picker in
`AddPet.tsx`. No source, no time, no scale.

And an unused asset: `breed_information` carries a behavioural baseline per breed
— `energy_level` (1–5), `playfulness`, `trainability`, `barking_level`,
`mental_needs`, `affection_family`, `kids_friendly`, `dog_friendly`,
`stranger_openness`, `watchdog_nature`, `temperament[]`.

**Correction to the earlier audit:** it is not entirely unused.
`src/components/profile/TopRecommendation.tsx` reads `energy_level` and
`exercise_needs` to compute recommended activity minutes and to render an energy
display. What it does **not** do is persist anything about the pet — the breed
prior is recomputed on every render and never becomes a fact with a source.

---

## §11 — The model

Ordinal scales, not free text, because `52` reads them.

| Key | Scale | Species | Feeds |
|---|---|---|---|
| `behavior.energy` | VERY_LOW…VERY_HIGH | all | activity targets, toy ranking |
| `behavior.sociability_people` | ordinal | all | |
| `behavior.sociability_animals` | ordinal | dog, cat, rabbit | park guidance, pairing |
| `behavior.playfulness` | ordinal | all | toy ranking |
| `behavior.anxiety` | ordinal | all | calming **category**, never a claim |
| `behavior.separation_anxiety` | ordinal | dog, cat | **distinct from general anxiety** |
| `behavior.reactivity` | ordinal | dog | training guidance |
| `behavior.chewing` | ordinal | dog, rodent, rabbit | toy durability |
| `behavior.destructive_chewing` | boolean/ordinal | dog | **distinct from chewing** — one is normal, one is a problem |
| `behavior.scratching` | ordinal | cat | scratcher products |
| `behavior.food_motivation` | ordinal | dog, cat | treat and training products |
| `behavior.curiosity` | ordinal | all | puzzle toys |
| `behavior.affection` | ordinal | all | |
| `behavior.vocalisation` | ordinal | dog, cat, bird | |
| `behavior.training_level` | NONE…ADVANCED | dog | |
| `behavior.tag` | string, multi | all | **the migration landing site** for unmapped `personality_tags` |

`allowed_species` is enforced in the registry. `behavior.reactivity` on a hamster
is rejected at write time.

### Two deliberate splits
- **`anxiety` vs `separation_anxiety`.** General anxiety affects product ranking
  broadly; separation anxiety is specific, has different interventions, and is
  the one owners most often mislabel.
- **`chewing` vs `destructive_chewing`.** Chewing is a normal need to satisfy
  (durable toys). Destructive chewing is a problem to address (enrichment,
  training). Collapsing them produces the wrong recommendation for both.

---

## Per-attribute contract

Every behaviour fact carries all four, per the brief:

| Field | Meaning |
|---|---|
| `value` | the ordinal level |
| `source_type` | who says so |
| `confidence` | how sure (`VERIFIED` never applies here) |
| `observed_at` | **last observed** — drives decay |
| `effective_from` / `effective_to` | current vs historical state |

Behaviour **evolves**. A puppy's chewing at 8 months is not a permanent
attribute. Supersession keeps both, so "settled down after two years" is
visible rather than overwritten.

---

## Three source tiers, ranked

```
1. USER_PROVIDED      the owner said so                         HIGH
2. ACTIVITY_DERIVED   measured (37) — energy only               MEDIUM
3. SYSTEM_DERIVED     breed baseline from breed_information     LOW
```

### The breed prior, and its limits

`breed_information.energy_level` is a **prior about a breed, not a fact about an
animal**. A Labrador is *typically* high-energy; this Labrador may be a couch
potato. So:

- Written with `confidence = LOW` and `derived_from = [breed_information.<id>]`.
- **Any owner-provided or activity-derived value supersedes it immediately.**
- The customer UI never states it as fact about their pet. At most:
  *"לברדורים בדרך כלל אנרגטיים"* — about the breed, in the breed's words.
- **Excluded from every hard gate in `52`.** Priors rank; they never exclude.

That last rule matters: a prior that can exclude a product is a stereotype with
consequences.

---

## Activity-derived energy

The one behaviour attribute that can be measured. Once `37` exists:

```
walk_sessions over a trailing window
  → sessions/week, mean distance, mean duration
  → vs species + size + life-stage expectation
  → behavior.energy, ACTIVITY_DERIVED
```

| Window | Confidence |
|---|---|
| < 2 weeks | **do not write the fact at all** |
| 2–4 weeks | MEDIUM |
| > 8 weeks, regular | HIGH |
| any window with >30% gapped sessions | cap at MEDIUM |

Recomputed weekly, each superseding the last — so the history of energy is itself
a record, and a **drop** in it is an insight worth surfacing (`43`), not a silent
overwrite.

**The honest limit, stated in the model rather than discovered later:** walks
measure the owner as much as the animal. A dog that is not walked may be
under-exercised, not low-energy. And cats, birds and rodents are not walked at
all — for them `behavior.energy` stays `USER_PROVIDED` or absent, and `52` reads
absence as `INSUFFICIENT_DATA`, never as "low".

---

## Behaviour is never medical

`behavior.anxiety = HIGH` is not "has separation anxiety disorder".
`behavior.reactivity = HIGH` is not "is aggressive".

No behaviour key is marked `is_sensitive` in the clinical sense, and the boundary
is enforced in three places:

1. **No behaviour signal may write a `health.*` key.** A model reading a document
   may write `health.condition = separation_anxiety` only from `VET_DOCUMENT`.
2. **No behaviour fact gates a health-relevant product.** Behaviour affects
   ranking and warnings — a strong chewer sees durable toys first and a caution
   on a soft one — never eligibility.
3. **Language.** Mipo describes; it does not diagnose. The chat's existing system
   prompt sets this posture and it applies unchanged.

---

## Migration of `personality_tags`

Hebrew free text, entered from a chip picker. Rule:

```
maps deterministically to an ordinal key   →  behavior.<key>, USER_PROVIDED
does not map                               →  behavior.tag  (string, multi)
```

**Never guess.** An unmapped tag is not a loss — it is still visible on the pet
and in the CRM — but it does not enter `52`. A term map is data
(`behavior_tag_map`), reviewable, and extendable without a migration.

---

## Consumers

| Consumer | Use |
|---|---|
| `52` matching | ranking: chewing → durability, food motivation → treats, anxiety → calming category |
| `43` derived | energy from activity |
| CRM | context on the customer screen |
| Care guidance | training and enrichment, non-clinical |

## Gaps

| Gap | Status |
|---|---|
| `personality_tags` untyped | needs the term map |
| Breed baseline persists nothing | live in `TopRecommendation` as a render-time computation only |
| No observation capture | nowhere to record "chewed through a bed today" |
| Activity-derived energy | blocked on `37` |
| Ordinal scales unvalidated | `enum_values[]` in the registry fixes this |
