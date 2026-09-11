# 32 — Species Data Contract

## The constraint, verified

```sql
pets_type_check   CHECK (type = ANY (ARRAY['dog','cat','other']))
pet_type          ENUM ('dog','cat','other','all')      -- products
```

`listBreeds` (`server/src/index.js:4247`) coerces anything that is not `"dog"`
or `"cat"` **to `"dog"`**. A rabbit owner is shown dog breeds. That is wrong
today, independently of every other decision here, and it is a one-line fix.

## Target species set

```
dog · cat · bird · rabbit · rodent · reptile · fish · other
```

**Rabbit is separate from rodent.** Lagomorph, hay-first diet, GI stasis rather
than wet tail, no vitamin-C requirement. Filing rabbits under `rodent` produces
wrong nutrition rules for a large group of Israeli pet owners.

`other` remains, and remains honest: a species Mipo does not model yet gets
identity, documents, health records and Moments — and no species-specific
guidance.

### Cost of widening
1. New CHECK on `pets.species`. Existing rows unaffected.
2. `ALTER TYPE pet_type ADD VALUE` — **cannot run inside a transaction block**
   in PostgreSQL, and `applyMigrations.js` wraps migrations. Needs its own
   handling; the deploy's dry-run rehearsal on a restored dump is where this
   surfaces.
3. `listBreeds` stops coercing; returns empty for species with no breed data.
4. `breed_information` rows, or a per-species decision that breeds do not apply.
5. Species picker in onboarding and `AddPet`.
6. Catalogue rows need the new `pet_type` values, or `all`.

---

## Universal core vs extension

**Universal** — true of every animal, and therefore not species data at all:

```
identity      id, owner, name, species, sex, birth_date + precision, photo,
              status, microchip
physical      weight (with unit), body condition
health        conditions, allergies, medications, vaccinations, vet visits,
              documents, procedures
nutrition     current food, diet type, feeding schedule, ingredient avoidance
behavior      energy, sociability, anxiety, curiosity, affection
preference    food, treat, brand, disliked product
commerce      purchases, favourites
social        Moments
```

**Extension** = any key whose `allowed_species` in the registry is a strict
subset. **Not separate tables.** Adding a species is rows in
`pet_fact_definitions`, not a schema change.

A `physical.wingspan` written against a dog is **rejected at write time** —
that is what `allowed_species` is for.

---

## §6 — Per species, with a reason for each field

Only fields with a named consumer are included. The brief lists candidates; this
is the filtered set.

### DOG
| Key | Type | Required by |
|---|---|---|
| `physical.size_band` | enum S/M/L/XL, **derived** | life stage, product `dog_size` gate |
| `physical.neck_girth` | cm | collar sizing |
| `physical.chest_girth` | cm | harness sizing — the measurement people get wrong |
| `physical.back_length` | cm | coats, carriers |
| `physical.height_withers` | cm | crates, car barriers |
| `behavior.reactivity` | ordinal | training and toy guidance |
| `behavior.chewing` | ordinal | toy durability ranking |
| `behavior.training_level` | enum | non-clinical guidance |
| `activity.walks_per_week` | number | `37` |
| `health.rabies_vaccination` | date | **legally required in Israel** |

Dropped from the candidate list: `paw` — no product in the catalogue is sized by
paw. Add it when a boot category exists.

### CAT
| Key | Type | Required by |
|---|---|---|
| `environment.indoor_outdoor` | enum | parasite guidance, product relevance |
| `physical.neck_girth`, `physical.body_length` | cm | collars, carriers, beds |
| `nutrition.wet_dry_ratio` | enum/number | **hydration — a first-class feline concern with no dog analogue** |
| `behavior.scratching` | ordinal | scratcher products |
| `environment.litter_type` | enum | the largest recurring cat category |
| `activity.enrichment_minutes` | number | there are no walks |

**Cats get nothing from the walk model.** Scope Activity as a dog feature and
say so.

### BIRD
| Key | Type | Required by |
|---|---|---|
| `identity.species_variant` | text | **not "breed"** — a cockatiel is not a breed |
| `physical.weight` in **grams** | number + unit | the primary avian health metric |
| `physical.wingspan` | cm | cage width, flight space |
| `environment.cage_dimensions` | json {w,d,h} cm | cage and perch products |
| `environment.flighted` | enum FLIGHTED/CLIPPED | |
| `nutrition.diet_base` | enum PELLET/SEED/MIXED | the defining avian nutrition question |
| `nutrition.grit_provided` | boolean | species-dependent |
| `health.feather_condition`, `health.beak_condition` | enum | |
| `activity.out_of_cage_minutes` | number | |

Grams, not kilograms. A bird weighed in kg loses all resolution — which is why
the unit lives on the observation (`47`).

### RABBIT
| Key | Required by |
|---|---|
| `nutrition.hay_access` | enum — **hay-first; pellets are a supplement** |
| `health.dental_check_due` | date — dental overgrowth is the defining risk |
| `health.gi_stasis_history` | boolean — an emergency condition |
| `environment.enclosure_dimensions` | json cm |
| `behavior.sociability_animals` | often bonded pairs |

### RODENT
| Key | Required by |
|---|---|
| `identity.species_variant` | guinea pig / hamster / rat / gerbil — **not interchangeable** |
| `nutrition.vitamin_c_supplement` | boolean — **guinea pigs cannot synthesise it** |
| `environment.enclosure_dimensions`, `environment.bedding_type` | |
| `environment.wheel_diameter` | hamsters/rats — wrong size causes spinal injury |
| `health.dental_check_due` | |

---

## Life-stage rules, per species

Stored as `life_stage_rules` rows — **versioned data, not code**.

### Dog — size-banded, because a Great Dane is senior at 6 and a Chihuahua is not
| Band | PUPPY | JUNIOR | ADULT | SENIOR |
|---|---|---|---|---|
| Small <10 kg | 0–6 mo | 6–12 mo | 1–8 y | 8 y+ |
| Medium 10–25 | 0–8 mo | 8–15 mo | 15 mo–7 y | 7 y+ |
| Large 25–45 | 0–12 mo | 12–18 mo | 18 mo–6 y | 6 y+ |
| Giant >45 | 0–15 mo | 15–24 mo | 2–5 y | 5 y+ |

Size band comes from `breed_information.weight_range_kg` when breed is known,
else from measured weight.

### Cat — no size dependence
KITTEN 0–6 mo · JUNIOR 6–12 mo · ADULT 1–7 y · MATURE 7–11 y · SENIOR 11 y+

### Bird, rabbit, rodent — the dog vocabulary does not transfer
`JUVENILE` · `ADULT` · `SENIOR`, with per-species thresholds. A cockatiel lives
15–20 years; a hamster lives 2–3. Same three words, entirely different numbers,
which is exactly why they are rule rows and not an enum in code.

> These thresholds are a **starting point, not veterinary consensus**. They want
> a vet's review before they gate anything. `OPEN DECISION` in `53`.

---

## Species and matching

Species eligibility is **gate 1** in `52` — after sellability, before everything
else. And the honest consequence of today's enum:

> With `pet_type` limited to `dog|cat|other|all`, a bird product and a rabbit
> product are **indistinguishable** in the catalogue. Species-correct matching
> beyond dogs and cats cannot be built until the enum is widened. That is a
> schema dependency, not a preference.

## Species-aware defaults, never species-blind ones

Three rules for every consumer:

1. **Absence ≠ zero.** A cat with no walks is not low-activity; walks do not
   apply. `37` returns `NOT_APPLICABLE`, distinct from `INSUFFICIENT_DATA`.
2. **No cross-species inference.** A dog breed baseline never seeds a cat.
3. **Registry, not `if`.** Every species branch is `allowed_species` on a
   definition or a `life_stage_rules` row. A species check in application code
   is a bug waiting for the next species.
