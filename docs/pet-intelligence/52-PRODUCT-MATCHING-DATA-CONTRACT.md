# 52 — Product Matching Data Contract

## What already exists

Two pieces of deterministic, pet-aware logic — both in the browser.

**`src/lib/petSafetyScore.ts`** (124 lines, unit-tested by
`server/test/petSafetyScore.test.js`): adjusts a product's `safety_score` for a
pet by age band and diet-sensitive conditions, returns **`null` not `0`** when
unknown — *"'we do not know' must not render as zero, which reads as
'dangerous'"* — and ships `explainAdjustment()` naming the reasons in Hebrew.

**`src/components/shop/SmartRecommendations.tsx`** (275 lines): scores products
against pet age, breed and conditions using keyword maps, returning a
`relevanceScore` **and** a `relevanceReason`.

Both problems are the same two: they run **client-side** (a health exclusion the
client computes is one the client can drop), and they match on **free text**
while the metadata sits next to them unused.

V1 is: move it to the server, drive it from metadata, add provenance, keep the
explanation.

---

## §32 — Input contract

| Input | Req/Opt | Hard constraint | Soft signal | Derived | Source | Exists |
|---|---|---|---|---|---|---|
| **Species** | **Required** | ✅ gate 1 | | | `pets.species` | 🟡 dog/cat/other |
| Breed | Optional | | ✅ `breed_tags[]` | | `pets.breed` | ✅ |
| Age | Optional | | | ✅ from `birth_date` | derived | ✅ |
| **Life stage** | Optional | ✅ gate 2 | | ✅ | `identity.life_stage` | ❌ |
| Sex | Optional | | ✅ | | `pets.gender` | ✅ |
| Neutered | Optional | | ✅ energy factor | | `health.neuter_status` | 🟡 bare boolean |
| **Size band** | Optional | ✅ gate 2 (`dog_size`) | | ✅ | `physical.size_band` | ❌ |
| Weight | Optional | | ✅ | | `physical.weight` | 🟡 scalar |
| Target weight | Optional | | ✅ | | `physical.target_weight` | ❌ |
| Body condition | Optional | | ✅ **only if VET_/USER sourced** | | `physical.body_condition` | ❌ |
| **Allergies** | Optional | ✅ **gate 3** | | | `health.allergy` | ❌ **no column** |
| **Sensitivities** | Optional | ✅ gate 3 | | | `health.sensitivity` | ❌ |
| Health conditions | Optional | ✅ gate 3 via `medical_tags[]` | ✅ | | `health.condition` | 🟡 untyped array |
| Ingredient avoidance | Optional | ✅ gate 4, **waivable** | | | `nutrition.ingredient_avoidance` | ❌ |
| Diet type | Optional | ✅ gate 4 (`special_diet[]`) | | | `nutrition.diet_type` | ❌ |
| Current food | Optional | | ✅ Buy Again, switch | | `nutrition.current_food` | 🟡 free text |
| Activity | Optional | | ✅ | ✅ | `activity.activity_level` | ❌ |
| Behaviour | Optional | | ✅ durability, treats | | `behavior.*` | 🟡 free text |
| Preferences | Optional | **never** | ✅ ranking only | | `preference.*` | 🟡 localStorage |
| Measurements | Optional | ✅ **for accessories only** | | | `pet_observations` | ❌ |
| Purchase history | Optional | | ✅ | ✅ | `order_items.pet_id` | ❌ **not joinable** |

**Nine of twenty-one are missing.** The product side is fully annotated —
`pet_type`, `life_stage`, `dog_size`, `special_diet[]`, `breed_tags[]`,
`medical_tags[]`, `ingredients`, `kcal_per_kg`, `safety_score`, `flavors[]` — and
**all of it is already shipped to the client** in `PUBLIC_PRODUCT_FIELDS`.

That asymmetry is the entire diagnosis: **the catalogue is ready and the pet is
not.**

---

## The pipeline

```
product
  │
0. SELLABLE?           publication_state = PUBLISHED AND in_stock      (39)
  │                                        ✗ → not a candidate at all
1. SPECIES             pet_type ∈ {species, 'all', null}
  │                                        ✗ → NOT_ELIGIBLE
2. HARD CONSTRAINTS    life_stage, dog_size, measurements-for-accessories
  │                                        ✗ → NOT_ELIGIBLE
3. HEALTH              ingredients ∩ health.allergy.normalized_value
  │                    medical_tags vs contraindicated conditions
  │                    ── only VET_* or USER_PROVIDED facts ──
  │                                        ✗ → NOT_RECOMMENDED
4. DIET FILTERS        nutrition.ingredient_avoidance, diet_type
  │                                        ✗ → NOT_RECOMMENDED (waivable)
─────────────────────── gates above · ranking below ───────────────────────
5. PHYSICAL            weight, measurements vs variant
6. NUTRITION           kcal_per_kg vs energy need
7. ACTIVITY            INSUFFICIENT_DATA today · NOT_APPLICABLE for non-dogs
8. BEHAVIOUR           chewing → durability; food motivation → treats
9. PREFERENCE          brand, toy type, flavour        ← ranking only, ever
10. PURCHASE CONTEXT   repeat, returns, current food
  │
  ▼
classification + evidence
```

**Gates 0–4 are absolute.** A product failing one is excluded at any score. No
weighting rescues it, and the LLM does not get to overrule it.

---

## Outputs

| Status | Meaning |
|---|---|
| `NOT_ELIGIBLE` | wrong species, life stage or size — not for this animal |
| `NOT_RECOMMENDED` | eligible, but a health or diet constraint says no |
| `INSUFFICIENT_DATA` | we do not know enough to say |
| `ELIGIBLE` | passes every gate, nothing notable in its favour |
| `GOOD_MATCH` | passes, ≥2 positive rules fire |
| `STRONG_MATCH` | passes, ≥4 including a health or nutrition fit |

### `INSUFFICIENT_DATA` is a real answer
For a brand-new pet — which is every pet on day one — the honest output is "we do
not know enough", not a default assumption. It is the same discipline
`petSafetyScore.ts` already applies: `null`, not zero.

### No fake percentages

> **V1 publishes a classification, never a score.**

A "92% match" with no model is a fabrication, and once it is on screen nobody can
say what would make it 93%. Scores arrive only when the weights are written down
in a `product_match_weights` row, that row is **versioned and dated**, and every
published score cites the version that produced it.

The precedent is in this repository: `ai_pricing_versions` pins the exact pricing
version on every `cost_events` row so an admin figure and a ledger row always
reconcile. Match scores need the same discipline before they are shown.

---

## §30 — The output contract

```jsonc
{
  "product_id": "…", "pet_id": "…",
  "match_status": "GOOD_MATCH",
  "rules_version": "match@2026-09-10",
  "matched_rules": [
    { "rule": "life_stage",   "detail": "ADULT",   "evidence": ["identity.life_stage"] },
    { "rule": "size_band",    "detail": "LARGE",   "evidence": ["physical.size_band"] },
    { "rule": "weight_range", "detail": "28.2 kg", "evidence": ["physical.weight"] }
  ],
  "failed_rules": [],
  "warnings": [
    { "rule": "ingredient_sensitivity",
      "detail": "contains a chicken derivative",
      "evidence": ["health.sensitivity/chicken"],
      "severity": "caution" }
  ],
  "missing_data": ["activity.activity_level", "physical.body_condition"],
  "evidence": {
    "health.sensitivity/chicken": {
      "source": "VET_DOCUMENT", "source_id": "doc_88",
      "confidence": "HIGH", "verification_status": "USER_CONFIRMED"
    }
  }
}
```

`missing_data` is deliberately in the contract: it powers *"tell us Blue's weight
and we can be more precise"* — asking for data at the moment it would pay off,
rather than in onboarding.

---

## §31 — Store outputs mapped to required data

| Output | Requires | Available? |
|---|---|---|
| **"מתאים לבלו"** (`ELIGIBLE`+) | species, life_stage, size_band | ❌ needs `01`, `31` |
| **"נבחר עבור בלו"** (`STRONG_MATCH`) | the above + a health or nutrition fit | ❌ |
| **"לא מתאים לבלו"** (`NOT_RECOMMENDED`) | `health.allergy`/`sensitivity` + `ingredients` + `ingredient_terms` | ❌ — **needs the vocabulary** |
| **"לא מספיק מידע"** (`INSUFFICIENT_DATA`) | knowing which facts are absent | ✅ free, once facts exist |
| **"הגיע הזמן להזמין שוב"** | `order_items.pet_id`, pack weight, daily amount | ❌ — needs the P0 column |
| **"כי בלו רגיש לעוף"** | a fact **with provenance** | ❌ |
| **"כי קניתם את זה 3 פעמים"** | attributed purchase history | ❌ |

Every "Because Blue…" sentence must point at a fact. Never a sentence the system
cannot cite — that is what separates personalisation from flattery, and it is
enforced by `evidence` being **required** in the contract, not optional.

---

## §33 — V2 signals (define dependencies, do not implement)

| Signal | Depends on | Use |
|---|---|---|
| Behaviour | `35` + capture | durability, enrichment ranking |
| Activity trends | `37` + the native decision | seasonal and recovery context |
| Purchase history | `order_items.pet_id` | Buy Again, switch, brand affinity |
| Context (cart, recency) | client event ingest | ranking |
| Season | none — a clock | coat, parasite, hydration |
| Location | `37` + privacy model | regional availability. **Never a health inference** |
| Social | `38` | **ranking only.** A Moment is not evidence about the animal |
| Moments | `44` | `AI_INFERRED`, LOW, decaying, never a gate |

V2 adds **weights**, and only with a versioned weights row. It does not add
gates: the set of things that can exclude a product stays health, diet, species,
life stage, size and measurements.

---

## Medical safety

| Never say | Say instead |
|---|---|
| "This food treats dermatitis" | "מתויג בקטלוג כמתאים לצורך תזונתי מתועד" |
| "Blue is overweight" | "לפי המסמך מהמרפאה, 9 בספטמבר" |
| "This will help her joints" | "מסומן בקטלוג לתמיכה במפרקים" |

Enforced by construction:
1. Health gates read only **catalogue-controlled metadata** — never model output.
2. Health gates read only `VET_CONFIRMED`, `VET_DOCUMENT` or `USER_PROVIDED`
   facts. `AI_INFERRED` and `PURCHASE_DERIVED` are structurally excluded.
3. A `DISPUTED` clinical fact reads **restrictively**.
4. The LLM phrases the outcome; it never computes it.
5. Prescription and diet-managed products carry the vet caveat and are never
   presented as a Mipo recommendation.

## Where it lives

```
server/src/productMatching.js    pure — no db, no network
                                 in:  (petFacts, productRow, rulesVersion)
                                 out: the contract above
server/src/ingredientTerms.js    normalization (34)
product_match_rules              versioned rule data, not code
```

Pure so it is unit-testable the way `aiAccounting.js` is — deliberately free of
database and network access. `petSafetyScore.test.js` is the template.
Server-side so a health exclusion is an exclusion.

## Interim, with no new schema

Two changes make today's chat recommendations better using columns that exist on
both sides:

1. Pass `medical_conditions[]` into `buildCatalogSearch` as a **negative** filter
   against `medical_tags[]` and `ingredients` — one `not ilike any` clause.
2. Filter by `life_stage` and `dog_size` where `birth_date` and weight are known.

Neither pretends to be a scoring model. Both beat keyword matching in a browser.
