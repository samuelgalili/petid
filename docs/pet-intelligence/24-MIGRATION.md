# 24 — Migration Strategy

## The fact that makes this safe

**Every consumer of pet data reads the output of one function.**

`serializePet(row)` (`server/src/index.js:1790`) is the single shaping point. It
already derives `age_years`/`age_months` rather than passing `pets.age` through.
Everything downstream reads its output, not the table:

- `GET /api/me/pets`, `/api/me/pets/:id`, `PATCH`, `POST`
- `/api/me/pets/:id/health-summary`
- `compactSelectedPetForAi` — the AI prompt context is built from the serialized
  pet, including `age_years`, `weight`, `medical_conditions`, `current_food`
- `MipoPet` in `src/lib/mipoApi.ts`, and every screen through it
- `PetCard.tsx`, `Profile.tsx`, `EditPet.tsx`, `SmartRecommendations.tsx`

And there is a matching single write point: `normalizePetPayload(body)`
(`index.js:1845`), an explicit allowlist used by both insert and update.

> **One read seam, one write seam.** Storage can change underneath them without
> a single consumer changing, as long as the two function signatures hold.

That is the whole migration strategy. Everything below is an application of it.

---

## Sequence

```
ADD ──► BACKFILL ──► VALIDATE ──► DUAL-WRITE ──► DUAL-READ ──►
        MIGRATE CONSUMERS ──► DEPRECATE ──► REMOVE (much later)
```

No destructive step is in the first six. Nothing is dropped in this phase.

---

## Phase A — Add (no behaviour change)

New tables, all additive, nothing existing touched:

```
pet_fact_definitions          the registry
pet_facts                     the spine
pet_observations              measurements
life_stage_rules              versioned thresholds
ingredient_terms              the vocabulary (10)
```

Plus additive columns:

```
pets            + birth_date_precision, estimated_age_months, breed_source,
                  owner_scope_type, owner_scope_id, status
outbox_events   + pet_id, payload_version
order_items     + pet_id, pet_attribution
orders          + primary_pet_id
pet_documents   + status, content_hash, classified_type, document_date,
                  processed_at, ai_request_id
business_products + publication_state, published_at, sellable
```

**Deployment note.** The `pet_type` enum widening (`17`) is the one migration
that cannot be routine: `ALTER TYPE … ADD VALUE` **cannot run inside a
transaction block** in PostgreSQL, and `applyMigrations.js` wraps migrations.
That migration needs its own handling, and the deploy already rehearses
migrations on a restored `pg_dump` copy, which is where this will surface if it
is going to.

At the end of Phase A the application behaves **identically**. Nothing reads the
new tables.

---

## Phase B — Backfill

| From | To | Rule |
|---|---|---|
| `pets.weight` | `pet_observations` + `physical.weight` fact | `USER_PROVIDED`, `observed_at = pets.updated_at`, confidence `MEDIUM` — the real observation date is unknown and pretending otherwise is a lie in the provenance layer |
| `pets.medical_conditions[]` | `health.condition` facts, one per element | `USER_PROVIDED`, undated, `effective_from = created_at` |
| `pets.current_food` | `nutrition.current_food_text` | text, **never guess a product ref** |
| `pets.is_neutered` | `health.neuter_status` | no date available |
| `pets.personality_tags[]` | `behavior.*` where a term maps; `behavior.tag` otherwise | **never guess** — an unmapped tag stays a tag |
| `pets.favorite_activities[]` / `activities[]` | `preference.activity` | the mirrored pair collapses to one set |
| `orders.pet_name` | `order_items.pet_id` | exact single match only; else `UNATTRIBUTED` (`15`) |
| `localStorage["mipo-care-plan:<petId>"]` | `preference.*` | client-side, on first load, visible to the owner |
| `localStorage["mipo-favorites"]` | owner-level favourites | **not pet-attributed** — cannot be backfilled to a pet without guessing |
| derived | `identity.life_stage`, `physical.size_band` | computed from `birth_date` + species + weight |

### Backfill honesty rules

1. **Never invent an `observed_at`.** Where the real date is unknown, use the row's
   `updated_at` and set confidence `MEDIUM`, not `HIGH`.
2. **Never infer a source.** Everything backfilled from `pets` is
   `USER_PROVIDED` — that is what it is.
3. **Never fuzzy-match.** Not pet names to orders, not free text to products, not
   tags to ordinal scales.
4. **Idempotent.** Keyed on `(pet_id, namespace, key, source_id)` so a re-run
   changes nothing.
5. **Reversible.** Backfilled facts carry `source_id = 'backfill@<migration>'`,
   so the entire backfill is one `DELETE` away if it is wrong.

---

## Phase C — Validate

Before anything reads the new tables:

```
□ every pet with a weight has exactly one CURRENT physical.weight fact
□ no fact whose (namespace, key) is missing from the registry
□ no fact violating species applicability
□ no clinical fact with source AI_INFERRED
□ derived life_stage matches a fresh computation for every pet
□ serializePet output is byte-identical before and after, for every pet
□ order_items.pet_id count matches the expected unambiguous-match count
□ no order_items.pet_id pointing at a pet the order's user does not own
```

The sixth check is the important one and it is cheap: dump `serializePet` output
for every pet before and after, diff. A non-empty diff means stop.

---

## Phase D — Dual-write

Writes go to **both** `pets` columns and `pet_facts`. Reads still come from
`pets`. `normalizePetPayload` is the one place this is implemented, so it is one
function, not forty call sites.

Run for at least one full release cycle. A reconciliation query compares the two
and reports drift; drift means the fact write path is wrong and there is still a
correct value in the old column to fall back to.

---

## Phase E — Dual-read, behind a flag

`serializePet` reads facts first, falls back to the column:

```js
weight: currentFact(facts, "physical.weight")?.value_number ?? row.weight
```

Per-field, flag-controlled, one field at a time. Because the output shape is
unchanged, **no consumer knows this happened** — not the API, not `MipoPet`, not
`compactSelectedPetForAi`, not any screen.

This is where the design pays for itself.

---

## Phase F — Migrate consumers, deliberately

Only *after* dual-read is stable do consumers start asking for what the columns
could never give them:

| Consumer | New capability |
|---|---|
| Pet profile | weight history and trend (`13`) |
| CRM | provenance per value (`21`) |
| Product page | server-side matching with evidence (`18`, `19`) |
| Chat context | facts with source and confidence instead of bare values (`20`) |
| Timeline | the projection (`08`) |

`MipoPet` gains optional fields. It does not lose any.

---

## Phase G — Deprecate, then remove (a later release)

### Removable immediately — 11 dead columns
Verified: never read by `serializePet`, never written by `normalizePetPayload`.

```
age · size · weight_unit · current_mood · mood_score · mood_updated_at
vet_name · vet_phone · license_number · license_renewal_date
insurance_policy_number
```

Zero API impact. This is a free simplification and it can land in Phase A.

### Removable after dual-read proves out
```
weight · medical_conditions · health_notes · current_food
personality_tags · favorite_activities · activities
last_vet_visit · next_vet_visit
```

### Never removed
`is_lost` and the seven `lost_*` columns. A lost poster is read by an
unauthenticated public endpoint under latency pressure; moving it into facts
buys nothing and costs a join on the one path that must never be slow.

---

## §44 — Backward compatibility

| API | Depends on | Target | Compatibility |
|---|---|---|---|
| `GET /api/me/pets*` | `serializePet` | facts via dual-read | **none needed** — shape unchanged |
| `PATCH /api/me/pets/:id` | `normalizePetPayload` | dual-write | none needed |
| `/api/me/pets/:id/health-summary` | `serializePet` + health tables | + facts | additive |
| `POST /api/ai/chat` | `compactSelectedPetForAi` | + source/confidence | additive |
| `GET /api/public/pets/:id` | its own projection, privacy-filtered | unchanged | **do not touch** |
| `MipoPet` (TS) | the serialized shape | optional new fields | additive |
| `petSafetyScore.ts` | `birthDate`, `medicalConditions[]`, `category` | server-side, facts | keep the client signature working through the transition |

`GET /api/public/pets/:id` deserves emphasis: it has its own hand-written
projection with the lost/visibility rules baked in
(`server/src/index.js:2064`). It is the highest-risk surface in the codebase to
change and it needs nothing from this migration. Leave it alone.

---

## Risk register

| Risk | Mitigation |
|---|---|
| Backfill invents provenance | rules above; `MEDIUM` confidence; `source_id = 'backfill@…'` |
| Fact table grows fast | current-value partial index; observations in their own table |
| Dual-write drift | reconciliation query; the old column is still authoritative |
| Registry becomes a junk drawer | unknown key ⇒ rejected at write time (`03`) |
| Enum widening breaks the migration runner | own migration, outside the transaction wrapper; the deploy's dry-run rehearsal catches it |
| A consumer reads `pets` directly | there is exactly one — `serializePet`. Add a lint or a test that fails on a second. |

## What this migration explicitly does not do

- Does not drop a column in the first phase.
- Does not rewrite the API.
- Does not change `serializePet`'s output shape.
- Does not touch the public pet endpoint.
- Does not replace `pet_vet_visits` or `pet_vaccinations` — facts reference them.
- Does not merge the two product catalogues — it adds a state (`15`).
