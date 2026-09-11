# 17 — Species Model

## The constraint

```sql
-- pets
CHECK (type = ANY (ARRAY['dog','cat','other']))

-- products
CREATE TYPE public.pet_type AS ENUM ('dog','cat','other','all');
```

Birds and rodents are not species in Mipo. They are `other`. And `other` is an
empty bucket, not a general one:

| Layer | Behaviour for a non-dog, non-cat pet |
|---|---|
| Onboarding | offers dog and cat only (`chooseType(type: "dog" \| "cat")`) |
| `AddPet` | same two icons |
| Breeds | `listBreeds` **coerces anything that is not `"dog"` or `"cat"` to `"dog"`** (`server/src/index.js:4247`) — a rabbit owner is shown dog breeds |
| `breed_information` | 40 dog/cat-shaped columns |
| Catalogue | the same 4-value enum |
| Recommendations | `petTypeFilter` accepts `dog`, `cat`, `other` only |
| Theming | `PetPreferenceContext` is dog/cat |

The `listBreeds` coercion is the one to fix first, independently of everything
else: it is a one-line change and it is actively wrong today.

---

## Recommended species set

```
dog · cat · bird · rabbit · rodent · reptile · fish · other
```

**Rabbit is separate from rodent, deliberately.** Rabbits are lagomorphs, their
health profile is distinct (GI stasis, dental overgrowth, no vitamin-C
requirement), their diet is hay-first, and they are common pets in Israel.
Filing them under `rodent` produces wrong nutrition rules for a large group.

### What widening actually costs

1. `pets_type_check` — a new CHECK. Existing rows unaffected.
2. `pet_type` enum — `ALTER TYPE … ADD VALUE`, which **cannot run inside a
   transaction block** in PostgreSQL. `applyMigrations.js` wraps migrations, so
   the migration has to account for it. This is the one real technical wrinkle.
3. `listBreeds` — stop coercing. Return an empty list for a species with no breed
   data, which is honest.
4. `breed_information` — rows for the new species, or a per-species decision that
   breeds do not apply (largely true for rodents).
5. Onboarding and `AddPet` — a species picker rather than two buttons.
6. Catalogue — products need the new `pet_type` values, or `all`.

---

## Universal core vs extensions

**Universal core** — true of every animal:

```
identity      id, owner, name, species, sex, birth_date + precision,
              avatar, status, microchip
health        conditions, allergies, medications, vaccinations, vet visits,
              documents, procedures
physical      weight (with unit), body condition
nutrition     current food, diet type, feeding schedule, ingredient avoidance
behavior      energy, sociability, anxiety, curiosity, affection
preference    food, treat, brand, disliked product
commerce      purchases, favourites
social        Moments
```

**Everything else is a species extension**, expressed as fact keys with a
`species_applicability[]` flag in `pet_fact_definitions` — **not** four parallel
tables. Adding "bird" is rows in a registry.

---

## Per species

### DOG
| Domain | Keys |
|---|---|
| Identity | breed, secondary_breed, is_mixed, size_band (derived) |
| Physical | neck, chest, back_length, height_at_withers (`13`) |
| Health | rabies vaccination (**legally required in Israel**); `pets.is_dangerous_breed` + `license_*` already exist for the dangerous-breeds regime |
| Nutrition | kcal by weight × activity; `life_stage`, `dog_size` gates already on products |
| Activity | walks, distance, parks — all of `14` is dog-shaped |
| Behaviour | reactivity, recall, chewing, separation anxiety, training_level |
| Products | food, leads, harnesses, chews, grooming |
| Social | park encounters, dog friends |

### CAT
| Domain | Keys |
|---|---|
| Identity | breed/type, `indoor_outdoor` |
| Physical | neck, body_length. **No harness chest measurement** |
| Health | urinary and dental dominate; hairballs |
| Nutrition | wet/dry ratio, **hydration** — a first-class concern with no dog analogue |
| Activity | **no walks.** `enrichment_minutes`, play sessions, litter-box frequency |
| Measurements | litter box count and placement |
| Products | litter, scratchers, towers, wet food |
| Social | photo-led, not encounter-led |

**The cat case is the proof of the argument.** `14` and the Parks work deliver
nothing to cat owners, who are roughly half the addressable market. Scope those
as dog features and say so, rather than calling them platform features.

### BIRD
| Domain | Keys |
|---|---|
| Identity | **species, not breed** — a cockatiel is not a breed |
| Physical | weight **in grams**, wingspan, body_length |
| Environment | cage dimensions, `flighted_or_clipped` |
| Health | respiratory sensitivity, feather condition, beak and nail, **PTFE/Teflon fume toxicity** |
| Nutrition | pellets vs seed, grit, calcium, fresh food, **avocado and chocolate toxicity** |
| Activity | out-of-cage hours, foraging, flight |
| Behaviour | vocalisation, plucking, bonding, biting |
| Products | cages, perches, foraging toys, species-specific pellets |
| Social | no shared-space model at all |

Grams, not kilograms. A bird weighed in kg loses all resolution — which is why
`13` puts the unit on the observation rather than normalising everything.

### RABBIT
| Domain | Keys |
|---|---|
| Health | **GI stasis** — an emergency; **dental overgrowth**; myxomatosis/RHD vaccination |
| Nutrition | **hay-first**; pellets are a supplement, not the diet |
| Environment | enclosure dimensions, bedding, litter |
| Behaviour | sociability (often bonded pairs), chewing, digging |

### RODENT (guinea pig, hamster, rat, gerbil)
| Domain | Keys |
|---|---|
| Health | dental overgrowth; **vitamin C for guinea pigs** (they cannot synthesise it); wet tail in hamsters |
| Nutrition | **species-specific pellets are not interchangeable and getting it wrong is harmful** |
| Environment | enclosure dimensions, bedding, wheel size |
| Lifespan | 2–10 years — life-stage boundaries are completely unlike a dog's |

---

## Species-scoped rules

Three things become species-parameterised data rather than code:

| Rule set | Table | Used by |
|---|---|---|
| Life-stage thresholds | `life_stage_rules` | `01` |
| Fact applicability | `pet_fact_definitions.species_applicability[]` | `03` |
| Product eligibility | `business_products.pet_type` + species gates | `18` |

Writing them as data means a vet review can change a threshold without a deploy,
and a recommendation can cite the rule version that produced it.

---

## Matching implications

Species eligibility is **gate zero** in `18` — before sellability, before life
stage, before anything. And the honest consequence of the current enum:

> With `pet_type` limited to dog/cat/other/all, a bird product and a rabbit
> product are indistinguishable in the catalogue. Species-correct matching for
> anything beyond dogs and cats **cannot be built until the enum is widened.**
> That is a schema dependency, not a modelling preference.

## The rule

Do not force dog assumptions onto other species, and do not build one universal
model that is secretly the dog model. The universal core is small — identity,
health records, documents, media, ownership. **Everything interesting is a
species extension**, and the design should say so explicitly rather than
discovering it when the first bird owner signs up.
