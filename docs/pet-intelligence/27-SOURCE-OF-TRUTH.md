# 27 — Source of Truth

## §45 — The matrix

Filled from repository evidence. "Current" is what the code does today.

| Domain | Current source | Target source | Migration |
|---|---|---|---|
| **Pet identity** | `pets` (57 cols) | `pets` (~28 cols, identity only) | shrink by moving, then dropping (`24` G) |
| **Age** | **already derived** — `serializePet` → `calculatePetAge(birth_date)`. `pets.age` is a **dead column** | unchanged, + `birth_date_precision` | drop `pets.age` immediately — zero API impact |
| **Life stage** | `MISSING`; approximated by keyword lists in `SmartRecommendations.tsx` | `identity.life_stage`, `SYSTEM_DERIVED`, from `life_stage_rules` | new derived fact; the client keyword maps retire |
| **Size** | `pets.size` — **dead column** | `physical.size_band`, derived from weight + `breed_information.weight_range_kg` | drop; derive |
| **Weight** | `pets.weight` scalar; `pets.weight_unit` **dead** | `pet_observations` (points) + `physical.weight` (current) | backfill one observation per pet, `MEDIUM` confidence |
| **Body condition** | `MISSING` | `physical.body_condition` enum fact | new; `UNKNOWN` default |
| **Health — records** | `pet_vet_visits`, `pet_vaccinations`, `insurance_claims` | **unchanged** | add update/delete routes |
| **Health — facts** | `pets.medical_conditions[]`, `health_notes` | `health.*` facts, one row per condition/allergy | split the array; never guess a date |
| **Allergies** | `MISSING` — folded into `medical_conditions` | `health.allergy`, clinical, with `normalized_value` | manual split; unmapped entries stay conditions |
| **Nutrition** | `pets.current_food` free text | `nutrition.current_food` **ref → product** + `_text` fallback | text backfills to `_text`; **never guess a product** |
| **Behavior** | `pets.personality_tags[]` free text; `breed_information` priors **unused** | `behavior.*` ordinal facts; breed baseline as LOW-confidence `SYSTEM_DERIVED` | map what maps; keep the rest as tags |
| **Preferences** | `localStorage["mipo-favorites"]`, `["mipo-care-plan:<petId>"]`, mirrored `favorite_activities`/`activities` | `preference.*` facts + a server favourites table | care plan backfills cleanly (pet-scoped); favourites do not (owner-scoped) |
| **Activity** | `MISSING` — `useActivityTracker` is a presence heartbeat, `trackClick` is empty | `walk_sessions` + `activity.*` facts | `14`, blocked on the native decision |
| **Commerce** | `orders.pet_name` **TEXT**; `order_items` has `product_source`, no pet | `order_items.pet_id` + `pet_attribution` | exact single-name match only; else `UNATTRIBUTED` |
| **Documents** | `pet_documents` (files only) | unchanged + `status`, `content_hash`, extractions | additive |
| **Product catalogue** | `business_products` **∪** `scraped_products`, merged at read time | `business_products` canonical + `publication_state`; `scraped_products` = staging | add a state; `order_items.product_source` keeps history readable |
| **Vet identity** | strings on three tables | `care_providers` | `OPEN DECISION`, not urgent |
| **Timeline** | `MISSING` | `pet_timeline_entries` — **projection** | rebuildable by definition |
| **Insights** | `MISSING` | `pet_insights` — **projection** | |
| **Product match** | client-side: `petSafetyScore.ts`, `SmartRecommendations.tsx` | `productMatching.js`, server, pure, versioned | move; keep the explanation and the `null`-not-zero rule |
| **Events** | `outbox_events` | unchanged + `pet_id`, `payload_version` | additive |
| **AI usage** | `ai_requests` → `usage_events` → `cost_events`, pricing pinned | unchanged | already carries `pet_id` and `organization_id` |
| **Customer identity** | `customer_identities` with a documented precedence rule | unchanged | do not duplicate |
| **Media** | `user_uploads` + `product_images` + `imagePipeline.js` | unchanged | user media should also go through the pipeline (EXIF) |

---

## Duplications, resolved

| # | Duplication | Resolution |
|---|---|---|
| 1 | `pets.age` **and** `birth_date` | **Not really a duplication** — `age` is dead. Drop it. |
| 2 | `favorite_activities` **and** `activities` | A deliberate mirror: the write path sets **both to the same value**. Collapse to one `preference.activity` fact set. |
| 3 | Vet contact across six `pets` columns + three tables | `vet_name`/`vet_phone` are dead. The rest → `care_providers` eventually. |
| 4 | `business_products` **and** `scraped_products` | Staging + publication state. **Not** a merge. |
| 5 | `pets.size` stored vs derivable | Dead column; derive. |
| 6 | `orders.shipping_address` vs `shipping_profiles` | **Not a duplication.** A snapshot and a reusable profile are different things and both are correct. |
| 7 | Weight in `pets` and (target) in observations | Resolved by dual-read then removal (`24`). |

---

## The rule for every new domain

> **One writer. Many readers. Projections are disposable.**

Applied:

| Domain | The one writer |
|---|---|
| `identity.life_stage`, `physical.size_band` | the rule engine — **nobody else, including the user** (`06`) |
| `health.*` | owner, document extraction, or a vet — never inference |
| `activity.*` | the activity aggregator |
| `preference.*` from purchases | the commerce deriver |
| `pet_timeline_entries` | the projector |
| `pet_insights` | the insight engine |
| A product match | computed on read; **never stored** |

A derived value with two writers is how `pets.size` and `pets.current_mood`
became dead columns: something computed them, something else let a user type
them, and neither won. The single-writer rule is what prevents the next one.

---

## Two-repository note

`samuelgalili/petid` is canonical for the product. `samuelgalili/mipo` is a
separate 10-file Supabase prototype (`001_vector_memory`, `002_episodic_memory`,
`003_agent_evals`) about conversational memory — a capability `petid` does not
have. Not a merge candidate; a separate decision.

---

## Verification checklist

For each row of the matrix, before the target is declared canonical:

```
□ exactly one code path writes it
□ every reader reads through the seam (serializePet, or the fact API)
□ the old source is either dropped or provably unread
□ a projection can be dropped and rebuilt to an identical result
□ provenance is present on every value the target returns
```

The third box is the one that actually gets skipped. The 11 dead columns on
`pets` are what "provably unread" looks like when nobody checks — each was
presumably written by something once, and each is now schema nobody can safely
reason about.
