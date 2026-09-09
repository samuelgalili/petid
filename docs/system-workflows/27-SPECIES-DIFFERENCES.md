# 27 — Species Differences

## The constraint that shapes everything

```sql
-- pets
CHECK (type = ANY (ARRAY['dog','cat','other']))

-- the product enum
CREATE TYPE public.pet_type AS ENUM ('dog','cat','other','all');
```

**Birds and rodents are not species in Mipo. They are `other`.**

And `other` is a genuinely empty bucket, not a general-purpose one:

| Layer | Behaviour for a non-dog, non-cat pet |
|---|---|
| Onboarding | Only offers dog and cat (`chooseType(type: "dog" \| "cat")`) |
| `AddPet` | Same two icons |
| Breeds | `listBreeds` coerces anything that is not `"dog"` or `"cat"` **to `"dog"`** (`server/src/index.js:4247`). A parrot owner is shown dog breeds. |
| `breed_information` | 40 columns of dog/cat-shaped data: `size_category`, `weight_range_kg`, `exercise_needs`, `grooming_needs`, `temperament[]` |
| Catalogue | `business_products.pet_type` is the same 4-value enum |
| Recommendations | `petTypeFilter` accepts only `dog`, `cat`, `other` |
| Theming | `PetPreferenceContext` is dog/cat |

So the platform premise — "all pet types: dogs, cats, rabbits, parrots and
more" — is not supported by the data model. This is `NEEDS EXTENSION`, and it
is a schema-level change, not a UI one.

---

## Recommended change

Widen the CHECK and the enum to a named set, rather than adding `bird` and
`rodent` alone:

```
dog · cat · bird · rabbit · rodent · reptile · fish · other
```

Consequences, all of which have to be handled together:

1. `pets_type_check` — a new CHECK. Existing rows are unaffected.
2. `pet_type` enum — `ALTER TYPE … ADD VALUE`. Note this **cannot run inside a
   transaction block** in PostgreSQL, which matters because
   `applyMigrations.js` wraps migrations; the migration has to account for it.
3. `listBreeds` — stop coercing to `"dog"`. Return an empty list for a species
   with no breed data, which is honest, rather than the wrong list.
4. `breed_information` — needs rows for the new species, or a per-species
   decision that breeds do not apply (they largely do not, for rodents).
5. Onboarding and `AddPet` — a species picker rather than two buttons.
6. Catalogue — products need the new `pet_type` values, or `all`.

Step 3 is the one to do first regardless: showing a rabbit owner a list of dog
breeds is actively wrong, and the one-line fix is independent of everything
else.

---

## Per-species model (PROPOSED)

Universal core (applies to every species): identity, name, photo, sex,
birth/acquisition date, weight, microchip where applicable, documents, vet
visits, medications, Moments, ownership, privacy.

Everything below is a species extension, expressed as `pet_facts` keys with a
species applicability flag in the registry (`04`) — not as separate tables.

### Dog
| Aspect | Notes |
|---|---|
| Onboarding | breed, size, neutered |
| Health | rabies vaccination is **legally required in Israel**; `pets.is_dangerous_breed`, `license_number`, `license_expiry_date`, `license_conditions` already exist for the Israeli dangerous-breeds regime |
| Nutrition | kcal by weight × activity; `business_products.kcal_per_kg`, `life_stage`, `dog_size` already exist |
| Activity | walks, distance, parks — the whole of `08`/`09` is dog-shaped |
| Behaviour | reactivity, recall, chewing, separation anxiety |
| Products | food, leads, harnesses, chews, grooming |
| Social | park encounters, dog friends |

### Cat
| Aspect | Notes |
|---|---|
| Onboarding | breed, indoor/outdoor, neutered |
| Health | urinary and dental are the dominant categories; hairballs |
| Nutrition | wet/dry ratio, **hydration** — a first-class concern that has no dog analogue |
| Activity | **no walks.** Play sessions, enrichment, litter-box frequency |
| Measurements | litter box count and placement |
| Products | litter, scratchers, towers, wet food |
| Social | almost no shared-space model. A cat social feature is photo-led, not encounter-led |

**The cat case alone proves the point:** `08` and `09` as specified deliver
nothing to cat owners, who are roughly half the addressable market.

### Bird
| Aspect | Notes |
|---|---|
| Onboarding | species (not breed — a cockatiel is not a breed), cage size, flighted or clipped |
| Health | respiratory sensitivity, feather condition, beak and nail, **PTFE/Teflon fume toxicity** |
| Nutrition | pellets vs seed, grit, calcium, fresh food, **avocado and chocolate toxicity** |
| Activity | out-of-cage hours, foraging, flight |
| Measurements | wingspan, cage dimensions |
| Behaviour | vocalisation, plucking, bonding, biting |
| Products | cages, perches, foraging toys, species-specific pellets |
| Social | no shared-space model at all |

### Rodent (rabbits, guinea pigs, hamsters — **not one species**)
| Aspect | Notes |
|---|---|
| Onboarding | species, housing type, solitary or paired |
| Health | **dental overgrowth is the defining concern**; GI stasis in rabbits; wet tail in hamsters; vitamin C in guinea pigs |
| Nutrition | hay-first for rabbits and guinea pigs; **species-specific pellets are not interchangeable and getting it wrong is harmful** |
| Activity | enclosure time, enrichment |
| Measurements | enclosure dimensions |
| Lifespan | 2–10 years — life-stage boundaries are completely different from a dog's |
| Products | hay, bedding, chews, enclosures |

Rabbits arguably deserve their own value rather than sitting under `rodent`
(they are lagomorphs, their health profile is distinct, and they are common
pets in Israel). That is a product call, listed in `DECISIONS.md`.

---

## What this means for the other documents

| Document | Species impact |
|---|---|
| `02` Onboarding | The picker is the single highest-leverage change |
| `04`/`05` Pet 360 | Applicability must be per-species from the start, or the model becomes dog-shaped by default |
| `08`/`09` Activity, Parks | **Dog-only.** Cats, birds and rodents get nothing. Scope them as dog features and say so, rather than calling them platform features |
| `13` Product matching | Species eligibility is gate #1; the enum has to be right first |
| `16` Notifications | Reminder cadences differ wildly — annual rabies for a dog, dental checks for a rabbit |

### The rule
Do not force dog assumptions onto other species, and do not build one
universal model that is secretly the dog model. The universal core is small:
identity, health records, documents, media, ownership. **Everything
interesting is a species extension**, and the design should make that explicit
rather than discovering it later.
