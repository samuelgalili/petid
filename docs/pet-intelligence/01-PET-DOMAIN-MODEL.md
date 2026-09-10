# 01 — Pet Domain Model

## What belongs in `pets`, and what does not

The test: **does this change over time in a way anyone would want to look back
at?** If yes, it is a fact, not a column.

### Pet Core (target) — identity only

| Column | Keep? | Note |
|---|---|---|
| `id`, `user_id` | ✅ | ownership; `user_id` becomes a relationship later (§40) |
| `name` | ✅ | |
| `type` → **`species`** | ✅ | widen the CHECK — see `17` |
| `breed`, `secondary_breed`, `is_mixed` | ✅ | identity, rarely changes |
| `breed_confidence`, **`breed_source`** | ✅ | the one field that already has provenance; formalise it |
| `gender` | ✅ | |
| `birth_date` + **`birth_date_precision`** + **`estimated_birth_date`** | ✅ | see §6 below |
| `color` | ✅ | identity marker |
| `avatar_url`, `theme_color` | ✅ | presentation |
| `microchip_number` | ✅ | legal identity |
| `is_dangerous_breed`, `license_*` | ✅ | Israeli regulatory identity |
| `archived`, `archived_at`, `status` | ✅ | lifecycle |
| `created_at`, `updated_at` | ✅ | |
| `is_lost` + 7 `lost_*` columns | ✅ **keep as-is** | a lost poster is an operational state read by an unauthenticated public endpoint under latency pressure. Moving it into facts buys nothing and costs a join on the one path that must never be slow. |

That is roughly **28 columns**, of which 8 are the lost-poster block.

### Moves to `pet_facts`

| Column today | Becomes | Why |
|---|---|---|
| `weight` | `physical.weight` | needs history — `20` |
| `is_neutered` | `health.neuter_status` | has a date and a source |
| `medical_conditions[]` | `health.condition` (one fact each) | needs dates, sources, resolution |
| `health_notes` | `health.note` | |
| `current_food` | `nutrition.current_food` | changes; previous foods matter |
| `personality_tags[]` | `behavior.*` | needs source and confidence |
| `favorite_activities[]` / `activities[]` | `preference.activity` | the mirrored pair collapses to one |
| `last_vet_visit`, `next_vet_visit` | **derived** from `pet_vet_visits` | already a real table |
| `has_insurance`, `insurance_*` | `insurance.*` facts, or a small table | has effective dates |

### Retired outright — dead columns

Verified: never read by `serializePet`, never written by `normalizePetPayload`.

```
age · size · weight_unit · current_mood · mood_score · mood_updated_at
vet_name · vet_phone · license_number · license_renewal_date
insurance_policy_number
```

Eleven columns removable with **zero API impact**. `size` and `weight_unit` come
back as derived/typed values on facts; `current_mood` comes back as a fact with
history if the product still wants it.

### The vet-contact block
`vet_clinic`, `vet_clinic_name`, `vet_clinic_phone`, `vet_clinic_address` are
live (the serializer falls `vet_clinic_name → vet_clinic`). `vet_name`/`vet_phone`
are dead. Target: a `care_providers` reference the pet points at, so a clinic is
one entity across `pets`, `pet_vet_visits` and `insurance_claims`. Not urgent —
`OPEN DECISION` in `28`.

---

## §6 — Age

**Already correct.** `serializePet` derives `age_years`/`age_months` from
`birth_date`. `pets.age` is dead. Nothing to fix; something to formalise.

What is missing is **precision**. Shelter and street adoptions rarely come with a
birth date, and the current model forces a false one or a null.

```
birth_date              date      the anchor, however it was arrived at
birth_date_precision    enum      EXACT | MONTH | YEAR | ESTIMATED | UNKNOWN
birth_date_source       enum      USER_PROVIDED | VET_DOCUMENT | AI_INFERRED
estimated_age_months    int       only when precision = ESTIMATED and no date
```

Rules:
- `age` is **never** stored. Derived on read, as today.
- With `precision = ESTIMATED`, the UI shows "about 4 years", not "4 years".
- An `estimated` birth date **may** be replaced by an `EXACT` one from a vet
  document without a conflict — precision is part of the source ranking (`06`).
- With `precision = UNKNOWN`, life stage falls back to size + breed, and
  everything downstream that needs age returns `INSUFFICIENT_DATA` (`18`).

---

## §7 — Life stage

**`MISSING` today.** No column, no computation, and `SmartRecommendations.tsx`
approximates it with keyword lists (`PUPPY_CATEGORIES`, `SENIOR_CATEGORIES`).

Life stage is **derived, never asked**. It depends on species, and for dogs on
size, because a Great Dane is senior at 6 and a Chihuahua is not.

```
                  species
                     │
        ┌────────────┼────────────┬─────────────┐
       DOG          CAT         BIRD         RODENT
        │            │            │             │
   size band    fixed bands   species-      species-
   (from breed                specific      specific
    weight_range                            (very short
    or measured                              lifespans)
    weight)
        │
   age × band → life_stage
```

**Dogs** (bands from `breed_information.size_category` / `weight_range_kg`, or
measured weight when breed is unknown):

| Band | PUPPY | JUNIOR | ADULT | SENIOR |
|---|---|---|---|---|
| Small (<10 kg) | 0–6 mo | 6–12 mo | 1–8 y | 8 y+ |
| Medium (10–25 kg) | 0–8 mo | 8–15 mo | 15 mo–7 y | 7 y+ |
| Large (25–45 kg) | 0–12 mo | 12–18 mo | 18 mo–6 y | 6 y+ |
| Giant (>45 kg) | 0–15 mo | 15–24 mo | 2–5 y | 5 y+ |

**Cats:** KITTEN 0–6 mo · JUNIOR 6–12 mo · ADULT 1–7 y · MATURE 7–11 y ·
SENIOR 11 y+. No size dependence.

**Birds and rodents:** the dog vocabulary does not transfer. A cockatiel lives
15–20 years; a hamster lives 2–3. Proposed neutral set: `JUVENILE`, `ADULT`,
`SENIOR`, with per-species thresholds in the fact-definition registry rather than
in code.

> **These thresholds are a starting point, not veterinary consensus.** They are
> stored as versioned rule data (`life_stage_rules`), not hardcoded, so a vet
> review can change them without a deploy — and so a recommendation can cite
> which rule version produced it. Marked `OPEN DECISION` in `28`.

`life_stage` is emitted as a `SYSTEM_DERIVED` fact with `derived_from` naming
`birth_date`, `species` and the size input. It is recomputed, never edited.

---

## Species architecture — universal core vs extensions

Full split in `17-SPECIES-MODEL.md`. The principle:

- **Universal core** = identity + anything true of every animal: name, species,
  sex, birth date, weight, media, ownership, documents, health records.
- **Species extension** = everything else, expressed as fact *keys* with a
  species applicability flag in the registry — **not** as four parallel tables.

One table, a registry that says which keys apply to which species. Adding
"bird" is rows in the registry, not a schema change.

---

## Relationship model, prepared for §40

Today: `pets.user_id → app_users`. One owner, hard-coded.

Target, without implementing organizations now:

```
pets.owner_scope_type   enum   'user' (today) | 'organization' (later)
pets.owner_scope_id     uuid   = user_id today
```

Every authorization predicate becomes `where owner_scope_id = $1 and
owner_scope_type = $2` instead of `where user_id = $1`. Populated by backfill,
identical behaviour, and the day organizations arrive nothing above the data
layer changes. A future `pet_access_grants` table (vet, sitter, family) hangs off
the same seam — see `22-PRIVACY.md`.

Note the AI ledgers (`ai_requests`, `usage_events`, `cost_events`) already carry
both `organization_id` and `pet_id`. The AI layer anticipated this; the pet layer
should meet it.
