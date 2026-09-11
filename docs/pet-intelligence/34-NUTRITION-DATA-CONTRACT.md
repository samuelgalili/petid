# 34 — Nutrition Data Contract

## Today

One column: `pets.current_food TEXT`. Free text, no history, no source.

The product side is fully modelled and **already shipped to the client** in
`PUBLIC_PRODUCT_FIELDS`: `ingredients`, `feeding_guide` (jsonb), `kcal_per_kg`,
`special_diet[]`, `life_stage`, `dog_size`, `medical_tags[]`, `flavors[]`.

**The catalogue is ready and the pet is not.** That asymmetry is why `52` is
blocked.

### And there are already two feeding calculations, which disagree

| Where | Method |
|---|---|
| `src/contexts/CentralBrainContext.tsx` | **RER/MER**: `RER = 70 × weight^0.75`, `MER = RER × 1.6` (neutered) or `× 1.8` (intact) |
| `src/components/profile/TopRecommendation.tsx` | **% of body weight**: 4% under 1 y, 3% under 2 y, 2.5% adult, 2% over 7 y |

Both run in the browser. Both are shown to owners. For a 28 kg neutered adult
dog they produce different numbers, and neither cites a source. This is the
strongest single argument in this document for a canonical nutrition contract.

---

## §10 — The five things that must never be conflated

| Concept | Key | Nature | Effect in `52` |
|---|---|---|---|
| **Medical restriction** | `health.allergy`, `health.sensitivity` | clinical fact | **hard gate** — `NOT_RECOMMENDED`, not outrankable |
| **Diet choice** | `nutrition.ingredient_avoidance` | owner's decision | **hard filter, waivable** by the owner |
| **Preference** | `preference.food`, `preference.brand` | liking, decays | **ranking only** — never excludes |
| **Observed reaction** | `nutrition.observed_reaction` | an observation | **warning** + "worth mentioning to your vet" |
| **Manufacturer recommendation** | `business_products.feeding_guide` | the maker's own number | **quoted, attributed, never Mipo's claim** |

The fourth is the one that goes wrong. "Blue vomited after the new food" is an
owner's observation. It is **not** "Blue is allergic to salmon". Recording it is
useful; promoting it to an allergy is a clinical inference nobody made, and `45`
forbids the system from making it.

```
nutrition.observed_reaction
  value_json  { food_ref, reaction, severity, at }
  source      USER_PROVIDED     confidence HIGH (they saw it)
  ── never becomes health.allergy without a clinical source ──
```

---

## The model

| Key | Type | Sources | Card. | Time series |
|---|---|---|---|---|
| `nutrition.current_food` | **ref → business_products** | USER_PROVIDED, PURCHASE_DERIVED | single | ✅ history via supersession |
| `nutrition.current_food_text` | string | USER_PROVIDED | single | ✅ |
| `nutrition.diet_type` | enum, species-scoped | USER_PROVIDED, VET_DOCUMENT | single | ✅ |
| `nutrition.feeding_schedule` | json | USER_PROVIDED | single | |
| `nutrition.feeding_amount` | number + unit | USER_PROVIDED | single | ✅ |
| `nutrition.treat` | ref/string | USER_PROVIDED, PURCHASE_DERIVED | multi | |
| `nutrition.supplement` | ref/string | USER_PROVIDED, VET_DOCUMENT | multi | ✅ start/end |
| `nutrition.ingredient_avoidance` | enum (normalized) | USER_PROVIDED | multi | |
| `nutrition.observed_reaction` | json | USER_PROVIDED | multi | |
| `nutrition.wet_dry_ratio` | enum/number | USER_PROVIDED | single | cat only |
| `nutrition.diet_base` | enum PELLET/SEED/MIXED | USER_PROVIDED | single | bird only |
| `nutrition.hay_access` | enum | USER_PROVIDED | single | rabbit only |
| `nutrition.vitamin_c_supplement` | boolean | USER_PROVIDED | single | guinea pig only |

`diet_type` values are species-scoped in the registry: `DRY`, `WET`, `MIXED`,
`RAW`, `HOME_COOKED`, `PRESCRIPTION` for dogs and cats; birds and rodents get
their own set (`32`).

### Why `current_food` must be a reference

With a product id instead of a string, four things become possible:

1. **Ingredient checking** — the product's `ingredients` against
   `health.allergy.normalized_value`.
2. **Energy accounting** — `kcal_per_kg` × amount.
3. **Reorder timing** — pack weight ÷ daily amount (`39`).
4. **"Same food, cheaper"** and switch suggestions.

`current_food_text` stays for food Mipo does not sell. **Never guess a product
from free text** — that is the `catalogRecommendations.js` rule: a name is a
*search*, and an unmatched search returns nothing rather than a plausible wrong
answer.

### Previous foods
Free, from supersession. "Switched from X to Y on 3 March, and the itching
started in April" becomes answerable.

---

## Feeding amount — the safety boundary

The inputs all exist. The question is whether Mipo should compute at all.

**Recommendation: quote the manufacturer, do not compute.**

| Option | Assessment |
|---|---|
| `business_products.feeding_guide` for the pet's weight | ✅ **v1.** Useful, attributable to the maker, zero clinical risk |
| RER/MER derivation (as `CentralBrainContext` already does) | ⚠️ only as a clearly-labelled estimate, with the vet caveat |
| % of body weight (as `TopRecommendation` already does) | ❌ retire — the cruder of the two, and its disagreement with the other is the bug |

Hard exclusions, whichever is chosen: **never** compute a feeding amount for a
pet with `diet_type = PRESCRIPTION` or an active diet-managed condition. Reuse
the existing controlled list rather than inventing a second one:

```js
// src/lib/petSafetyScore.ts
DIET_SENSITIVE_CONDITIONS = ["allergies","digestive","kidney","urinary","heart"]
```

Whichever way this goes, **one calculation, server-side, with its method named**.
Two client calculations that disagree is the state to leave behind.
`OPEN DECISION` in `53`.

---

## Ingredient normalization — the join nobody has built

Pet and product meet as text, in two languages. Without a controlled vocabulary
the match silently fails.

```
ingredient_terms
  term_id, canonical_key, locale, surface_form, is_derivative, is_allergen_common
```

```
"עוף" · "chicken" · "Chicken meal" · "chicken by-product"   →  chicken
"סלמון" · "salmon" · "salmon oil"                            →  salmon
```

**`is_derivative` is clinically load-bearing.** Chicken *fat* is usually
tolerated by a chicken-allergic animal; chicken *meal* is not. A normalizer that
flattens both to `chicken` produces false exclusions (annoying); one that
flattens neither produces false inclusions (dangerous). The vocabulary carries
the distinction and `52` decides per case, defaulting to restrictive.

Where terms come from: `server/src/productIntel.js` already extracts ingredients
from product pages through the AI Gateway. The same pipeline proposes canonical
terms — **as suggestions for an admin to approve**, never auto-published.

This vocabulary is a **prerequisite for `52`**, not a detail. It is the only
place a pet fact and a product row actually meet.

---

## What Store consumes

```
health.allergy + health.sensitivity   →  hard exclusion by ingredient
nutrition.ingredient_avoidance        →  filter, owner-waivable
identity.life_stage                   →  business_products.life_stage
physical.size_band                    →  business_products.dog_size
health.condition (diet-sensitive)     →  medical_tags[] + safety adjustment
nutrition.current_food                →  Buy Again, "same food cheaper"
nutrition.diet_type                   →  special_diet[]
preference.brand / .food              →  ranking only
```

Every product column named there exists today.

## Gaps

| Gap | Impact |
|---|---|
| `current_food` is free text | blocks ingredient checking, reorder, switch suggestions |
| No allergy or sensitivity model | blocks the hard gate |
| No ingredient vocabulary | blocks the pet↔product join entirely |
| Two disagreeing client feeding calculations | owners see different numbers depending on the screen |
| No feeding schedule or amount stored | |
| No treat or supplement model | |
| Species-specific nutrition keys absent | bird, rabbit and rodent diets are where getting it wrong is harmful |
