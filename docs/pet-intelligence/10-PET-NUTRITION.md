# 10 — Pet Nutrition

## Today

One column: `pets.current_food TEXT`. Free text. Not a product reference, no
history, no source.

Meanwhile the **product** side is fully modelled:

```
business_products:
  ingredients · feeding_guide (jsonb) · kcal_per_kg · special_diet[]
  life_stage · dog_size · medical_tags[] · breed_tags[] · pet_type · flavors[]
```

and all of it is already shipped to the client in `PUBLIC_PRODUCT_FIELDS`.

**The catalogue is ready for nutrition matching and the pet is not.** That
asymmetry is the single reason `18` cannot be built yet.

---

## The four things that must not be conflated

The brief is right to separate these, and the separation is load-bearing for
`18`:

| Concept | Namespace/key | Nature | Effect on matching |
|---|---|---|---|
| **Medical restriction** | `health.allergy`, `health.sensitivity` | clinical fact | **hard gate** — `NOT_RECOMMENDED`, never outrankable |
| **Diet choice** | `nutrition.ingredient_avoidance` | owner's decision | **hard filter**, but the owner can waive it |
| **Preference** | `preference.food`, `preference.brand` | liking, decays | **ranking only** — never excludes |
| **Observed reaction** | `nutrition.observed_reaction` | an observation, not a diagnosis | **warning**, prompts a vet conversation |

The difference between the first and the fourth is the one that matters most.
"Blue vomited after the new food" is an owner's observation. It is not
"Blue is allergic to salmon". Recording the observation is useful; promoting it
to an allergy is a clinical inference nobody made, and `04` forbids the system
from doing it.

```
nutrition.observed_reaction
  value_json  { food_ref, reaction: 'vomiting', severity: 'mild', at }
  source      USER_PROVIDED
  confidence  HIGH   (they saw it)
  ── never becomes health.allergy without a vet source ──
  effect      warning on that product + a prompt: "worth mentioning to your vet"
```

---

## The model

| Key | Type | Source(s) | Cardinality |
|---|---|---|---|
| `nutrition.current_food` | **ref → product** | USER_PROVIDED, PURCHASE_DERIVED | single |
| `nutrition.current_food_text` | string | USER_PROVIDED | single — fallback when off-catalogue |
| `nutrition.diet_type` | enum | USER_PROVIDED, VET_DOCUMENT | single |
| `nutrition.feeding_schedule` | json | USER_PROVIDED | single |
| `nutrition.feeding_amount` | number + unit | USER_PROVIDED, SYSTEM_DERIVED | single |
| `nutrition.treat` | ref/string | USER_PROVIDED, PURCHASE_DERIVED | multi |
| `nutrition.supplement` | ref/string | USER_PROVIDED, VET_DOCUMENT | multi |
| `nutrition.ingredient_avoidance` | enum (normalized) | USER_PROVIDED | multi |
| `nutrition.observed_reaction` | json | USER_PROVIDED | multi |

`diet_type` values are species-scoped in the registry: `DRY`, `WET`, `MIXED`,
`RAW`, `HOME_COOKED`, `PRESCRIPTION` for dogs and cats; birds and rodents get
their own set (`17`).

### `current_food` as a reference is the point

Once it is a `ref` to `business_products.id`, four things become possible that
are impossible with a string:

1. **Ingredient checking.** The product's `ingredients` can be matched against
   `health.allergy.normalized_value`.
2. **Energy accounting.** `kcal_per_kg` × feeding amount → daily intake.
3. **Reorder timing.** Pack weight ÷ daily amount → days remaining (`15`).
4. **"Same food, better price"** and switch suggestions.

`current_food_text` stays for food Mipo does not sell. Never guess a product from
free text — that is the `catalogRecommendations.js` lesson: a name is a *search*,
and an unmatched search returns nothing rather than a plausible wrong answer.

### Previous foods
Supersession gives this for free. When `current_food` changes, the old fact keeps
its effective period. "Switched from X to Y on 3 March, and the itching started
in April" is then a question the CRM can answer.

---

## Feeding amount — derived, with a hard boundary

`SYSTEM_DERIVED` feeding amount is computable:

```
daily_kcal  ≈  RER × life-stage/neuter factor
RER         =  70 × (weight_kg ^ 0.75)
grams/day   =  daily_kcal ÷ (kcal_per_kg ÷ 1000)
```

Every input already exists or is proposed: `physical.weight`,
`identity.life_stage`, `health.neuter_status`, `business_products.kcal_per_kg`.

**But this is where the medical-safety line sits.** A computed feeding amount is
a *starting point from the manufacturer's own guide*, not a prescription. Rules:

- Prefer `business_products.feeding_guide` when the product supplies one — that
  is the manufacturer's number, not Mipo's.
- Present the derived figure only as a suggestion, always with the vet caveat,
  and never for a pet with a `PRESCRIPTION` diet type or an active
  weight-management condition — those go to the vet, full stop.
- Never derive it for a `health.condition` that is diet-managed (kidney,
  diabetes, pancreatitis). `petSafetyScore.ts` already knows this category:
  `DIET_SENSITIVE_CONDITIONS = ["allergies","digestive","kidney","urinary","heart"]`.
  Reuse that list rather than inventing a second one.

`OPEN DECISION` in `28`: whether Mipo shows a computed feeding amount at all, or
only ever the manufacturer's guide. My recommendation is the latter for v1 — it
is useful, it is attributable to the manufacturer, and it carries no clinical
risk.

---

## Ingredient normalization

The join between pet and product is text on both sides, in two languages. It
needs a controlled vocabulary or it will silently fail:

```
"עוף" · "chicken" · "Chicken meal" · "chicken by-product"   →  chicken
"סלמון" · "salmon" · "salmon oil"                            →  salmon
```

```
ingredient_terms      term_id, canonical_key, locale, surface_form, is_derivative
```

`is_derivative` matters clinically: chicken *fat* is usually tolerated by a
chicken-allergic animal; chicken *meal* is not. A normalizer that flattens both
to `chicken` produces false exclusions — annoying — and one that flattens neither
produces false inclusions — dangerous. So the vocabulary carries the distinction
and `18` decides per case, with the restrictive reading as the default.

**This vocabulary is a prerequisite for `18`, not a detail.** It is the only
place where a pet fact and a product row actually meet.

Where the terms come from: `server/src/productIntel.js` already extracts
ingredients from product pages through the AI Gateway. The same pipeline can
propose canonical terms — as **suggestions for an admin to approve**, never
auto-published. Same pattern as everything else here.

---

## What Store consumes

Detailed in `19`. In brief:

```
health.allergy + health.sensitivity      →  hard exclusion by ingredient
nutrition.ingredient_avoidance           →  filter, waivable by the owner
identity.life_stage                      →  business_products.life_stage gate
physical.size_band                       →  business_products.dog_size gate
health.condition (diet-sensitive)        →  medical_tags[] match + safety adjust
nutrition.current_food                   →  "buy again", "same food cheaper"
preference.brand                         →  ranking only
```

Every one of those product columns exists today.
