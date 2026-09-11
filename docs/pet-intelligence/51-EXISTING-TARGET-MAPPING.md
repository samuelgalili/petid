# 51 — Existing → Target Mapping

## The seam that makes all of this safe

**Every consumer of pet data reads the output of one function**, and every write
goes through one allowlist:

```
read   serializePet(row)          server/src/index.js:1790
write  normalizePetPayload(body)  server/src/index.js:1845
```

`serializePet` already derives `age_years`/`age_months` and never returns
`pets.age`. Consumers downstream of it: `/api/me/pets*`, `/health-summary`,
`compactSelectedPetForAi` (the AI prompt context), `MipoPet` in
`src/lib/mipoApi.ts`, and every screen through that — `PetCard`, `Profile`,
`EditPet`, `SmartRecommendations`, `CentralBrainContext`, `TopRecommendation`.

> One read seam, one write seam. Storage can move underneath them without a
> single consumer changing.

That is the whole migration strategy. Strategy names below:
`ADD` · `BACKFILL` · `DUAL_WRITE` · `DUAL_READ` · `DROP` · `NONE`.

---

## `pets` — all 57 columns

### KEEP (28)

| Column | Target | Strategy | Consumers |
|---|---|---|---|
| `id` | `pets.id` | NONE | everything |
| `user_id` | `pets.owner_scope_id` + `owner_scope_type` | ADD + BACKFILL, keep the column | every authorization predicate |
| `name` | `pets.name` | NONE | everything |
| `type` | `pets.species`, CHECK widened | ADD alias, DUAL_READ | `serializePet`, `petTypeFilter`, `listBreeds`, `PetPreferenceContext` |
| `breed`, `secondary_breed`, `is_mixed` | same | NONE | `AddPet`, `TopRecommendation`, breed lookup |
| `breed_confidence` | same + new `breed_source` | ADD | `AddPet` (displays it) |
| `gender`, `color` | same | NONE | `serializePet`, public pet |
| `birth_date` | same + `birth_date_precision`, `estimated_age_months` | ADD | `calculatePetAge`, `petSafetyScore`, `TopRecommendation`, `SmartRecommendations` |
| `avatar_url`, `theme_color` | same | NONE | UI |
| `microchip_number` | same | NONE | `CentralBrainContext.getField` |
| `is_dangerous_breed`, `license_conditions`, `license_expiry_date` | same | NONE | `serializePet` |
| `archived`, `archived_at` | + `status` enum | ADD | pet list filter, `ArchivedPets` |
| `created_at`, `updated_at` | same | NONE | |
| `is_lost` + 7 `lost_*` | same — **do not move** | NONE | `GET /api/public/pets/:id`, `FoundPet` |

### MOVE_TO_FACT (9)

| Column | Target key | Strategy | Backfill rule | Consumers to migrate |
|---|---|---|---|---|
| `is_neutered` | `health.neuter_status` | ADD→BACKFILL→DUAL_WRITE→DUAL_READ | `USER_PROVIDED`, no date | `serializePet`, `CentralBrainContext.calculateNrc` |
| `medical_conditions[]` | `health.condition` — **one row per element** | same | `USER_PROVIDED`, `effective_from = created_at` | `petSafetyScore`, `SmartRecommendations`, `compactSelectedPetForAi` |
| `health_notes` | `health.note` | same | | `serializePet` |
| `current_food` | `nutrition.current_food_text` | same | text only — **never guess a product ref** | `serializePet`, `compactSelectedPetForAi` |
| `personality_tags[]` | `behavior.*` where mapped, else `behavior.tag` | same | **never guess** an ordinal | `serializePet`, public pet |
| `favorite_activities[]` | `preference.activity` | same | | `serializePet` |
| `activities[]` | **collapses into the above** | DROP after DUAL_READ | verified mirror — the write path sets both to the same value | `serializePet` (falls back either way) |
| `has_insurance`, `insurance_company`, `insurance_expiry_date` | `insurance.*` | same | | `InsuranceSheet` |

### MOVE_TO_TIME_SERIES (1)

| Column | Target | Backfill rule |
|---|---|---|
| `weight` | `pet_observations` + `physical.weight` | one observation, `observed_at = updated_at`, **confidence MEDIUM — the real date is unknown and pretending otherwise is a lie in the provenance layer** |

Consumers: `serializePet`, `PetCard`, `CentralBrainContext.calculateNrc`,
`TopRecommendation`, `compactSelectedPetForAi`.

### MOVE_TO_RELATIONSHIP (4)

| Columns | Target | Strategy |
|---|---|---|
| `vet_clinic`, `vet_clinic_name`, `vet_clinic_phone`, `vet_clinic_address` | `care_providers` + `pet_care_provider` | ADD, deferred (`53`) |

Live today — `serializePet` falls `vet_clinic_name → vet_clinic`.

### DERIVED (2)

| Column | Target | Strategy |
|---|---|---|
| `last_vet_visit`, `next_vet_visit` | computed from `pet_vet_visits` | DUAL_READ, then DROP |

### DEAD (11) — DROP, zero API impact

```
age · size · weight_unit · current_mood · mood_score · mood_updated_at
vet_name · vet_phone · license_number · license_renewal_date
insurance_policy_number
```

Verified across all of `server/src/` and `src/`. Two notes:

- **`insurance_policy_number` is a latent bug**: `InsuranceSheet.tsx` renders it
  through its own local interface, but `serializePet` never returns it and
  `MipoPet` does not declare it — so that block can never appear. Dropping the
  column changes nothing; fixing the component is a separate, real fix.
- `size` and `weight_unit` return as a derived fact and a per-observation unit
  (`47`). The column is dead; the concept is not.

---

## Satellite tables

| Table | Verdict | Change |
|---|---|---|
| `pet_vet_visits` (19) | **KEEP** — better modelled than `pets` | **add `PATCH`/`DELETE` routes**; facts reference it via `source_id` |
| `pet_vaccinations` (11) | **KEEP** | add routes; `expires_at` starts driving reminders |
| `insurance_claims` (18) | KEEP | **encrypt `owner_id_number`**; add a `status` CHECK |
| `pet_service_bookings` (17) | KEEP | `status` CHECK |
| `pet_documents` (13) | **EXTEND** | + `status`, `content_hash`, `classified_type`, `document_date`, `document_source`, `ai_request_id` (`40`) |
| `pet_characters`, `pet_character_assets` | KEEP, untouched | not pet-intelligence data |
| `breed_information` (40) | **KEEP, REPURPOSE** | today: `/api/breeds` + `TopRecommendation`. Target: also seeds LOW-confidence `SYSTEM_DERIVED` behaviour priors and `size_band` |
| `qr_scan_logs` | **MISSING — CREATE** | written by `server/src/index.js:2119`, absent from all 33 migrations. Every QR scan of a lost pet is discarded |

## Commerce

| Column | Verdict | Change |
|---|---|---|
| `orders.pet_name` | **DEPRECATE, never delete** | keep as the historical record of what was typed |
| `orders` | ADD `primary_pet_id` | display convenience only |
| `order_items` | **ADD `pet_id` + `pet_attribution`** | the P0 column |
| `order_items.product_source` | KEEP | already records which catalogue a line came from |
| `order_items.weight`, `weight_unit` | KEEP | pack weight — a reorder input |
| `business_products` | ADD `publication_state`, `published_at`, `sellable` | gate 0 of `52` |
| `scraped_products` | REPURPOSE as **staging** | not merged, not deleted |
| `product_variations` | **UNKNOWN** | exists only for `scraped_products`; the canonical catalogue has no variant model (`53`) |

### `orders.pet_name` backfill
```
exact case-insensitive match to exactly one of that user's pets  → INFERRED_SINGLE_PET
matches two pets, or none                                        → UNATTRIBUTED
user had exactly one pet at order time and pet_name is empty     → INFERRED_SINGLE_PET
anything else                                                    → UNATTRIBUTED
```
**Never fuzzy-match.**

## Social

| Column | Verdict |
|---|---|
| `social_posts.pet_id` | KEEP — already the foundation for pet-level social |
| `social_posts.location` | **DEPRECATE** to a `park_id` ref once `37` exists; keep the text |
| `social_posts` orphaned by pet deletion | `SET NULL` today — snapshot pet name/avatar at creation (`38`) |
| `content_reports` | KEEP — needs a review route, which does not exist |

## Events

| Column | Change |
|---|---|
| `outbox_events` | ADD `pet_id`, `payload_version`; ADD an `event_consumers` cursor table |

## Client-side stores

| Store | Target | Backfill |
|---|---|---|
| `localStorage["mipo-care-plan:<petId>"]` | `preference.*` | **clean** — pet-scoped already |
| `localStorage["mipo-favorites"]` | server favourites | **not pet-attributed** — import owner-level, ask once |
| `localStorage["mipo-cart"]` | server cart | |
| `localStorage["mipo-onboarding-complete"]` | leave | a per-device convenience |
| `CentralBrainContext.calculateNrc` | server `energy_need` (`43`) | **one calculation, not two** |
| `TopRecommendation` % -of-body-weight feeding | **RETIRE** | the cruder of the two; its disagreement with NRC is the bug |
| `petSafetyScore.ts` | move server-side, keep `null`-not-zero and `explainAdjustment` | |
| `SmartRecommendations` keyword maps | replace with metadata gates | |

---

## Backfill honesty rules

1. **Never invent an `observed_at`.** Unknown ⇒ use `updated_at`, confidence
   `MEDIUM`, not `HIGH`.
2. **Never infer a source.** Everything from `pets` is `USER_PROVIDED`.
3. **Never fuzzy-match** — not names to orders, not text to products, not tags to
   ordinals.
4. **Idempotent** on `(pet_id, namespace, key, source_id)`.
5. **Reversible** — `source_id = 'backfill@<migration>'`, so the whole backfill is
   one `DELETE` away.

## Validation gate

```
□ serializePet output byte-identical before and after, for every pet
□ every pet with a weight has exactly one CURRENT physical.weight fact
□ no fact whose key is missing from the registry
□ no fact violating species applicability
□ no clinical fact with source AI_INFERRED
□ order_items.pet_id count matches the expected unambiguous-match count
□ no order_items.pet_id pointing at a pet the order's user does not own
```

The first box is the cheap one that catches everything: dump `serializePet`
output for every pet before and after, diff, and stop on any difference.
