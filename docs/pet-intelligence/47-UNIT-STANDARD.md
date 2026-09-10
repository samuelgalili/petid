# 47 — Unit Standard

## The rule

> **Store canonical. Convert on input. Convert on display. Never store a mixed
> unit without normalisation.**

The current schema breaks this in a small way that shows the cost:
`pets.weight_unit` exists as a column, is never read and never written, and
`pets.weight` is therefore a bare number whose unit is an assumption. It works
because everything is dogs and cats in kilograms. It stops working the moment a
400 g cockatiel is onboarded.

---

## §23 — Canonical units

| Quantity | Canonical | Precision | Display (he-IL) | Notes |
|---|---|---|---|---|
| **Weight** | **grams** (`g`) | integer | kg for ≥ 1 kg, g below | see below |
| **Distance** | metres (`m`) | integer | km for ≥ 1 km, m below | walks |
| **Height / length** | centimetres (`cm`) | 1 dp | cm | measurements |
| **Temperature** | Celsius (`°C`) | 1 dp | °C | |
| **Energy** | kilocalories (`kcal`) | integer | kcal | `business_products.kcal_per_kg` is already per kg |
| **Volume** | millilitres (`ml`) | integer | l for ≥ 1 l | water intake, liquid meds |
| **Duration** | seconds (`s`) | integer | min / h | walks, enrichment |
| **Count** | integer | — | — | steps, sessions |
| **Currency** | agorot (minor units) | integer | ₪ | **not in scope here** — `orders` already uses `numeric` |

### Weight in grams, not kilograms

This is the one non-obvious choice and it is deliberate.

| Species | Typical | In kg | In g |
|---|---|---|---|
| Great Dane | 70 kg | 70.0 | 70000 |
| Labrador | 28.2 kg | 28.2 | 28200 |
| Cat | 4.5 kg | 4.5 | 4500 |
| Rabbit | 2 kg | 2.0 | 2000 |
| Cockatiel | 90 g | **0.09** | 90 |
| Budgerigar | 35 g | **0.035** | 35 |
| Hamster | 120 g | **0.12** | 120 |

A budgerigar in kilograms is `0.035` — three significant figures lost to leading
zeros, and every rounding rule in the system has to special-case it. In grams
every species is an integer with full resolution.

**A gram is meaningful for a bird and meaningless for a Great Dane**, which is
exactly why the canonical unit must be the small one: you can always round up for
display, never down for storage.

```
display rule:  ≥ 1000 g  →  kg, 1 decimal place   ("28.2 ק״ג")
               < 1000 g  →  g,  integer            ("90 גרם")
```

The current `numeric` column holding kilograms converts by `× 1000` with no
precision loss for any real value.

---

## Input units and conversion

`pet_fact_definitions.allowed_units` lists what a writer may send.
**Conversion happens once, at write time**, into the canonical unit. The unit the
source used is kept for audit:

```
pet_observations
  value_number      canonical    e.g. 28200
  unit              canonical    'g'
  source_unit       as supplied  'kg'
  source_value      as supplied  28.2
```

Keeping `source_unit`/`source_value` matters for `40`: a vet document saying
"28.2 kg" should render as it was written when the owner opens the extraction
review, not as "28200 g".

| Quantity | Accepted on input | To canonical |
|---|---|---|
| Weight | `kg`, `g`, `lb`, `oz` | × 1000, × 1, × 453.592, × 28.3495 |
| Distance | `m`, `km`, `mi` | × 1, × 1000, × 1609.34 |
| Length | `cm`, `mm`, `in` | × 1, ÷ 10, × 2.54 |
| Temperature | `C`, `F` | `(F − 32) × 5/9` |
| Volume | `ml`, `l`, `cup` | × 1, × 1000, × 240 |
| Duration | `s`, `min`, `h` | × 1, × 60, × 3600 |

Imperial units are accepted on input and **never** stored or displayed. Israel is
metric; supporting `lb` on input costs one line and prevents a mis-entry from a
US product label.

---

## Precision

| Quantity | Stored | Rounded at |
|---|---|---|
| Weight | integer grams | write |
| Distance | integer metres | write |
| Length | `numeric(6,1)` cm | write |
| Temperature | `numeric(4,1)` °C | write |
| Energy | integer kcal | derivation |
| Duration | integer seconds | write |

**Never round at display and store the rounded value back.** That is how a 28.24
kg reading becomes 28.2, then 28, over three passes.

### Derived precision
A derived value is never more precise than its least precise input. An energy
need computed from a weight known to ±100 g is not a 4-digit number. `43`'s
`derived_from` is what lets a consumer know the input precision — and the display
rule is: **round derived values down to a sensible unit and say they are
estimates.**

---

## Localisation

| | he-IL | en |
|---|---|---|
| Weight ≥ 1 kg | `28.2 ק״ג` | `28.2 kg` |
| Weight < 1 kg | `90 גרם` | `90 g` |
| Distance ≥ 1 km | `4.2 ק״מ` | `4.2 km` |
| Distance < 1 km | `640 מ׳` | `640 m` |
| Temperature | `38.4°` | `38.4°C` |
| Duration | `47 דק׳` | `47 min` |

Formatting lives in the client, from the canonical value plus
`pet_fact_definitions.display_unit`. **The API returns canonical values with an
explicit unit field, never a pre-formatted string.** A formatted number in an API
response cannot be recomputed, compared or converted, and it breaks the moment a
second locale appears — the app is Hebrew-first with an English fallback, so
there already is one.

RTL note: Hebrew renders the number then the unit, and both must sit inside the
same bidi isolate or `28.2 ק״ג` reverses in a mixed-direction line. That is a
client concern, but it is the reason the API must not pre-format.

---

## Species-specific display

The canonical unit never changes by species. The **display** rule does, and it
falls out of the magnitude rule automatically:

| Species | Canonical | Displays as |
|---|---|---|
| Dog, cat, rabbit | grams | kg |
| Bird, hamster, gerbil | grams | **g** |
| Guinea pig, rat | grams | g under 1 kg, kg above |

No species branch in code. The threshold does the work.

---

## What this touches today

| Existing | Unit today | Target |
|---|---|---|
| `pets.weight` | `numeric`, kg assumed | grams, in `pet_observations` + `physical.weight` |
| `pets.weight_unit` | **dead column** | replaced by per-observation `unit` |
| `business_products.weight` / `weight_unit` | pack weight, unit stored | **leave alone** — a different quantity (product, not animal) |
| `order_items.weight` / `weight_unit` | pack weight | leave alone |
| `business_products.kcal_per_kg` | kcal per kg of product | leave alone; it is already canonical for its purpose |
| `breed_information.weight_range_kg` | **free text** `"25-36"` | parsed at read time — `TopRecommendation.tsx` already does this with a regex. Not worth migrating; worth never trusting |

That last row is worth flagging: a breed weight range stored as a string and
parsed with `/(\d+)-(\d+)/` is fragile, and it is an input to `size_band` and
therefore to life stage. If `size_band` becomes a gate in `52`, this column
should become two numerics first.
