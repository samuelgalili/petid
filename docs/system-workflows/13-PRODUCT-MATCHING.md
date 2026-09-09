# 13 — Product Matching Engine

## Status: `MISSING`

There is no matching engine, no scoring model, and no suitability computation
anywhere in the codebase. What exists is one narrower thing, and it is worth
understanding precisely because it sets the standard for what comes next.

### What exists: catalogue resolution in chat — `EXISTS`, `REUSABLE`

`server/src/catalogRecommendations.js` (117 lines). The chat model may name
products; those names are treated as a **search**, never as data:

```
model output ──► productSearchTerms()  ──► buildCatalogSearch()  ──► rows
 ["ממתק לעיסה"]     dedupe, cap 6,           ILIKE ANY over name,      │
                    2–60 chars,              brand, category;          │
                    LIKE metachars           in_stock; pet_type;       │
                    escaped                  business_products only    │
                                                                       ▼
                                            toRecommendationCard(row)
                                    every field copied off the catalogue row
```

If nothing matches, the reply carries **no products at all** — and the file
says that is "the correct outcome, not a failure to recover from".

**This is the correct architecture.** The model proposes, the catalogue
disposes, and the customer never sees a price nobody set. Any matching engine
built later must preserve that property.

What it is not: it has no notion of the pet beyond `pet_type`, no health
constraints, no scoring, and no eligibility classes.

---

## Why the engine cannot be built yet

The brief lists 19 inputs. Here is which of them the system can actually supply
today:

| Input | Available? | Where |
|---|---|---|
| Species | ✅ | `pets.type` (dog/cat/other only) |
| Breed | ✅ | `pets.breed` |
| Age | 🟡 | `birth_date` **or** stale `age` |
| Life stage | ❌ | derivable, not derived |
| Sex | ✅ | `pets.gender` |
| Neutered | ✅ | `pets.is_neutered` |
| Size | 🟡 | `pets.size`, hand-entered |
| Weight | 🟡 | current value, no trend |
| Target weight | ❌ | |
| Body condition | ❌ | |
| Health conditions | 🟡 | `medical_conditions[]`, untyped, unsourced |
| Allergies | ❌ | no column |
| Sensitivities | ❌ | |
| Nutrition | 🟡 | `current_food` free text |
| Activity | ❌ | nothing measured (`08`) |
| Behaviour | 🟡 | three overlapping free-text arrays |
| Preferences | ❌ | `localStorage` favourites |
| Measurements | ❌ | |
| Purchase history | 🟡 | `orders` + `order_items`, **not joinable to a pet by key** — `orders.pet_name` is a string |

Nine of nineteen are missing outright. Meanwhile the *product* side is already
annotated (`pet_type`, `life_stage`, `dog_size`, `special_diet[]`,
`breed_tags[]`, `medical_tags[]`, `ingredients`, `kcal_per_kg`,
`feeding_guide`). **The catalogue is ready and the pet is not.** That is the
single sentence summary of this document, and it is why `04`/`05` come first in
the roadmap.

---

## Target design (PROPOSED)

### Pipeline

```
product
   │
1. Species eligibility        pet_type vs pets.type            → NOT_ELIGIBLE
   │
2. Hard constraints           life_stage, dog_size vs the pet  → NOT_ELIGIBLE
   │
3. Health constraints         medical_tags[] / ingredients     → NOT_RECOMMENDED
   │                          vs allergies + conditions
   │                          ── requires VET_CONFIRMED or
   │                             USER_PROVIDED facts only ──
4. Physical compatibility     weight, size, measurements       → score
   │
5. Nutrition compatibility    kcal_per_kg vs energy need       → score
   │
6. Behaviour compatibility    chewing, anxiety, food motivation→ score
   │
7. Activity compatibility     ACTIVITY_DERIVED (missing today) → INSUFFICIENT_DATA
   │
8. Preference matching        favourites, brands               → score
   │
9. Purchase history           repeat, returns                  → score
   │
10. Context                   season, cart, recency            → score
   │
   ▼
classification
```

### Outputs

`NOT_ELIGIBLE` · `NOT_RECOMMENDED` · `INSUFFICIENT_DATA` · `ELIGIBLE` ·
`GOOD_MATCH` · `STRONG_MATCH`

### Rules that must hold

1. **Steps 1–3 are gates, not weights.** A product that fails a health
   constraint is `NOT_RECOMMENDED` at any score. Never a low score that a
   ranking can outvote.
2. **`INSUFFICIENT_DATA` is a real answer.** With no allergy record and no
   activity data, the honest output is "we do not know enough", not a default
   assumption. This is what stops the engine from being confidently wrong on a
   brand-new pet — which is every pet, on day one.
3. **No invented percentages.** The brief is explicit and it is right: a "94%
   match" with no defined model is a fabrication. Publish the classification;
   publish a score only once the weights are written down and versioned.
4. **Every recommendation carries its reasons**, as facts with provenance
   (`05`): "suits large adult dogs" (`SYSTEM_DERIVED` from `birth_date` +
   `weight`), "avoids chicken" (`VET_DOCUMENT`, confirmed). "Why it matches" on
   the product page is then a read of the reasons, not prose from a model.
5. **Catalogue only.** All products come from `business_products`. No external
   catalogue, no invented SKUs — the rule
   `catalogRecommendations.js` already enforces.
6. **Deterministic and testable.** The engine is a pure function of
   (pet facts, product row, weights version). That makes it unit-testable in
   the style of `server/src/aiAccounting.js` — which is deliberately free of
   database and network access for exactly this reason.

### Where it should live
A new pure module, `server/src/productMatching.js`, plus a
`product_match_weights` version row so a scoring change is a dated, auditable
event rather than a code edit. **Not in the LLM.** The model may phrase a
recommendation; it may not decide one. The gate function returns
`NOT_RECOMMENDED` and the model's job is to explain that, not overrule it.

---

## Interim behaviour (recommended now, cheap)

Before any of this exists, two changes make the current chat recommendations
meaningfully better with no new schema:

1. Pass the pet's `medical_conditions[]` into `buildCatalogSearch` as a
   **negative** filter against `medical_tags[]` and `ingredients`. It is one
   `not ilike any` clause.
2. Filter by `life_stage` and `dog_size` where the pet's `birth_date` and
   `size` are known.

Both use columns that already exist on both sides. Neither pretends to be a
scoring model.
