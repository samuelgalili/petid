# 18 — Product Matching Engine V1

## Correction: this is not being built from nothing

The previous audit said "Product Matching Engine = MISSING". That is imprecise.
Two pieces of real, deterministic, pet-aware logic already exist — and one of
them already obeys most of the rules this document is about to state.

### `src/lib/petSafetyScore.ts` — 124 lines, unit-tested

```ts
export const computePetAdjustedScore = (baseScore, pet, category) => { … }
```

- Adjusts a product's `safety_score` for **this** pet by age band and by
  diet-sensitive conditions.
- Returns **`null`, not 0**, when the product has no score — with the comment
  *"'we do not know' must not render as zero, which reads as 'dangerous'"*.
- Ships `explainAdjustment()`, which names the reasons in Hebrew:
  *"הציון הותאם לבלו לפי גיל צעיר ורגישות תזונתית מתועדת"*.
- Covered by `server/test/petSafetyScore.test.js` (136 lines).
- `DIET_SENSITIVE_CONDITIONS = ["allergies","digestive","kidney","urinary","heart"]`
  is an existing controlled list — **reuse it, do not invent a second one**.

That is deterministic, explainable, honest about missing data, and tested. It is
the seed of V1, not a thing to replace.

### `src/components/shop/SmartRecommendations.tsx` — 275 lines
Scores products against pet age, breed and conditions using keyword maps
(`PUPPY_CATEGORIES`, `SENIOR_CATEGORIES`, `HEALTH_CATEGORY_MAP`) and returns a
`relevanceScore` **and** a `relevanceReason`.

### The two real problems with both

1. **They run in the browser.** A health-relevant exclusion computed client-side
   is not an exclusion — it is a suggestion the client may ignore, and it cannot
   be audited.
2. **They match on free text**, not on the metadata that already exists.
   `life_stage`, `dog_size`, `special_diet[]`, `medical_tags[]`, `breed_tags[]`
   and `ingredients` are all on `business_products` **and all already shipped to
   the client** in `PUBLIC_PRODUCT_FIELDS`. Keyword-matching category names when
   typed columns are sitting there is the gap.

**V1 is therefore: move it to the server, drive it from metadata, give it
provenance, and keep its explanation.**

---

## Inputs: what actually exists

| Input | Available? | Source |
|---|---|---|
| Species | 🟡 dog/cat/other only (`17`) | `pets.species` |
| Breed | ✅ | `pets.breed` |
| Age | ✅ **already derived** | `birth_date` |
| Life stage | ❌ → `01` | derived fact |
| Sex, neutered | ✅ / 🟡 | `pets.gender`, `health.neuter_status` |
| Size band | ❌ → derived | weight + `breed_information.weight_range_kg` |
| Weight | 🟡 scalar today | `physical.weight` |
| Target weight, body condition | ❌ | `13`, `21` |
| Conditions | 🟡 untyped array | `health.condition` |
| **Allergies, sensitivities** | ❌ **no column** | `health.allergy` |
| Nutrition | 🟡 free text | `nutrition.*` |
| Activity | ❌ | `14` — read as `INSUFFICIENT_DATA` |
| Behaviour | 🟡 free text | `behavior.*` |
| Preferences | 🟡 localStorage | `preference.*` |
| Measurements | ❌ | `13` |
| Purchase history | 🟡 **not joinable to a pet** | needs `order_items.pet_id` |

Nine of nineteen are missing. The **product** side is fully annotated. That
asymmetry is the whole reason this is P3 in the roadmap and not P1.

---

## The pipeline

```
product
   │
0. SELLABLE?              publication_state = PUBLISHED and in_stock   (15)
   │                                              ✗ → not a candidate at all
1. SPECIES ELIGIBILITY    pet_type ∈ {species, 'all', null}
   │                                              ✗ → NOT_ELIGIBLE
2. HARD CONSTRAINTS       life_stage, dog_size vs the pet
   │                                              ✗ → NOT_ELIGIBLE
3. HEALTH CONSTRAINTS     ingredients ∩ health.allergy.normalized_value
   │                      medical_tags vs contraindicated conditions
   │                      ── only VET_* or USER_PROVIDED facts ──
   │                                              ✗ → NOT_RECOMMENDED
4. DIET FILTERS           nutrition.ingredient_avoidance (owner-waivable)
   │                                              ✗ → NOT_RECOMMENDED (waivable)
5. PHYSICAL               weight, measurements vs size/variant
6. NUTRITION              kcal_per_kg vs energy need
7. ACTIVITY               INSUFFICIENT_DATA today
8. BEHAVIOUR              chewing → durability; food motivation → treats
9. PREFERENCE             brand, toy type, flavour            ← ranking only
10. PURCHASE CONTEXT      repeat, returns, current food
   │
   ▼
classification + evidence
```

**Steps 0–4 are gates. Steps 5–10 are ranking.** A product failing a gate is
excluded at any score. There is no weighting that can rescue it, and no model
that gets to overrule it.

---

## Outputs

| Status | Meaning |
|---|---|
| `NOT_ELIGIBLE` | wrong species, wrong life stage, wrong size — not for this animal |
| `NOT_RECOMMENDED` | eligible, but a health or diet constraint says no |
| `INSUFFICIENT_DATA` | we do not know enough to say |
| `ELIGIBLE` | passes every gate, nothing notable in its favour |
| `GOOD_MATCH` | passes, and ≥2 positive rules fire |
| `STRONG_MATCH` | passes, and ≥4 positive rules fire including a health or nutrition fit |

### `INSUFFICIENT_DATA` is a real answer

For a brand-new pet — which is every pet on day one — the honest output is "we do
not know enough", not a default assumption. This is what stops the engine being
confidently wrong at exactly the moment a user is forming an opinion of it.

It is also the pattern `petSafetyScore.ts` already uses: `null`, not zero.

---

## No fake percentages

> **V1 publishes a classification, never a score.**

A "92% match" with no defined model is a fabrication, and once it is on screen
nobody can say what it would take to make it 93%. Scores arrive only when:

1. the weights are written down in a `product_match_weights` row,
2. that row is **versioned and dated**, and
3. every published score cites the version that produced it.

Until then: `GOOD_MATCH`, and the reasons.

The precedent is in this repository. `ai_pricing_versions` pins the exact pricing
version on every `cost_events` row so an admin figure and a ledger row always
reconcile. Match scores need the same discipline before they are shown to
anyone.

---

## §30 — Explanation

```jsonc
{
  "product_id": "…", "pet_id": "…",
  "match_status": "GOOD_MATCH",
  "rules_version": "match@2026-09-10",
  "matched_rules": [
    { "rule": "life_stage",  "detail": "ADULT",  "evidence": ["identity.life_stage"] },
    { "rule": "size_band",   "detail": "LARGE",  "evidence": ["physical.size_band"] },
    { "rule": "weight_range","detail": "28.2 kg","evidence": ["physical.weight"] }
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
    "identity.life_stage": { "source": "SYSTEM_DERIVED", "confidence": "HIGH" },
    "health.sensitivity/chicken": { "source": "VET_DOCUMENT", "source_id": "doc_88",
                                    "confidence": "HIGH",
                                    "verification_status": "USER_CONFIRMED" }
  }
}
```

Rendered to the owner:

```
✓ מתאים לכלב בוגר
✓ גזע גדול · 28.2 ק״ג
⚠️ מכיל רכיב שמופיע ברגישות המתועדת של בלו   → "מהמסמך הווטרינרי, 2 בנובמבר"
```

`missing_data` is deliberately in the contract. It is what powers "tell us Blue's
weight and we can be more precise" — the honest way to ask for data, at the
moment it would pay off, rather than in onboarding (§38).

---

## §31 — Medical safety

The engine does not diagnose. Ever.

| Never say | Say instead |
|---|---|
| "This food treats dermatitis" | "מתויג בקטלוג כמתאים לצורך תזונתי מתועד" |
| "Blue is overweight" | "לפי המסמך מהמרפאה, 9 בספטמבר" |
| "This will help her joints" | "מסומן בקטלוג לתמיכה במפרקים" |

Enforced by construction:

1. **Health gates read only catalogue-controlled metadata** — `medical_tags[]`,
   `special_diet[]`, `ingredients`. Never model output, never free text.
2. **Health gates read only `VET_CONFIRMED`, `VET_DOCUMENT` or `USER_PROVIDED`
   facts.** `AI_INFERRED` and `PURCHASE_DERIVED` are structurally excluded from
   step 3.
3. **A `DISPUTED` clinical fact reads restrictively** (`05`) — disputed allergy
   means the ingredient stays excluded.
4. **The LLM never overrides a gate.** It phrases the outcome; it does not
   compute it (`20`).
5. **Prescription and diet-managed products** carry a vet caveat and are never
   presented as a Mipo recommendation.

---

## Where it lives

```
server/src/productMatching.js     pure. no db, no network.
                                  in: (petFacts, productRow, rulesVersion)
                                  out: the contract above
server/src/ingredientTerms.js     normalization (10)
product_match_rules               versioned rule data, not code
```

Pure so it is unit-testable exactly the way `aiAccounting.js` is — deliberately
free of database and network access "so they can be unit tested directly". Every
case in this document becomes a test, and the existing
`petSafetyScore.test.js` is the template.

Server-side so a health exclusion is an exclusion.

---

## What to do before it exists

Two changes make today's recommendations meaningfully better with **no new
schema**, using columns that already exist on both sides:

1. Pass the pet's `medical_conditions[]` into `buildCatalogSearch` as a
   **negative** filter against `medical_tags[]` and `ingredients` — one
   `not ilike any` clause.
2. Filter by `life_stage` and `dog_size` where the pet's `birth_date` and weight
   are known.

Neither pretends to be a scoring model. Both are strictly better than keyword
matching in the browser.
