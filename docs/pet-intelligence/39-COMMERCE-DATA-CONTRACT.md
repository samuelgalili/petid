# 39 — Commerce Data Contract

## The gap, verified

```
orders        pet_name TEXT          ← no pet_id anywhere
order_items   id, order_id, product_id, product_source, product_name,
              product_image, quantity, price, variant, size, sku,
              weight, weight_unit, created_at
                                     ← no pet_id
```

There is no `pet_id` in commerce. Purchase history cannot be attributed to an
animal by key. That single gap independently blocks:

- purchase-derived preferences (`36`)
- reorder prediction and Buy Again
- pet-aware CRM
- "same food, cheaper" and switch suggestions (`34`)
- commerce entries on the pet timeline

Three separate documents reach this from three directions. It is the highest-value
single column in the whole design.

**Note what already exists:** `order_items.product_source` records which
catalogue a line came from, and `order_items.weight` / `weight_unit` record pack
weight. Both are needed for reorder prediction and both are already there.

---

## §15 — Attribution belongs on the line item

An order can contain food for Blue, a litter tray for Luna and a leash for the
household. `pet_id` on `orders` would force one pet per order, or a lie.

```
orders
  + primary_pet_id   uuid null → pets       -- display convenience only,
                                            -- NEVER the source for attribution

order_items
  + pet_id           uuid null → pets  ON DELETE SET NULL
  + pet_attribution  enum
```

`pet_attribution` is provenance **for the attribution itself** — this is what
stops weak guesses being read as strong ones:

| Value | When | Usable for `PURCHASE_DERIVED` facts? |
|---|---|---|
| `USER_SELECTED` | the buyer chose | ✅ |
| `INFERRED_SINGLE_PET` | the household has exactly one pet | ✅ |
| `INFERRED_SPECIES` | product `pet_type` matches exactly one of the user's pets | ⚠️ ranking only, never a fact |
| `HOUSEHOLD` | deliberately not pet-specific (a carrier, a cleaner) | ❌ |
| `UNATTRIBUTED` | ambiguous | ❌ |

**Never guess between two pets of the same species.** A two-Labrador household
gets `UNATTRIBUTED`, and that is the correct answer.

### Capture without a new checkout step
The cart knows the products; `PetPreferenceContext` and `useActivePet` know the
active pet. Default each line to the active pet where the species matches, show
it as an editable chip on the cart row, let the buyer change it. One glance, no
extra step.

---

## The dictionary

| Item | Category | Storage | Status |
|---|---|---|---|
| Products purchased | EVENT + RELATIONSHIP | `order_items.pet_id` | needs the column |
| Current products | FACT | `nutrition.current_food`, `commerce.current_product` | `MISSING` |
| Previous products | FACT (historical) | supersession — free | |
| Favourites | FACT / RELATIONSHIP | `preference.*` + a server table | `localStorage` today |
| Wishlist | RELATIONSHIP | `pet_wishlist` | `MISSING` |
| Returns | EVENT | — | **no returns model at all** |
| Brand preferences | FACT | `preference.brand`, PURCHASE_DERIVED | `MISSING` |
| Product preferences | FACT | `preference.food/.toy_type` | `MISSING` |
| Purchase frequency | **DERIVED** | computed from order history | `MISSING` |
| Reorder pattern | **DERIVED** | interval between repeat purchases | `MISSING` |
| Reorder due | **PREDICTION** | pack size ÷ daily amount | `MISSING` |

Note the split: **frequency and pattern are derived** (recomputable, exact given
the orders); **reorder due is a prediction** (has a horizon, expires, is
invalidated by events). They are not the same category and should not share a
storage strategy (`43`).

---

## Reorder prediction — derived, never a promise

```
days_remaining = (pack_weight_g × quantity) ÷ grams_per_day
grams_per_day  = nutrition.feeding_amount, or the manufacturer's feeding_guide
                 for this pet's weight
```

Every input exists or is proposed: `order_items.weight`/`weight_unit`,
`business_products.feeding_guide`, `kcal_per_kg`, `physical.weight`.

It is a **PREDICTION**: recomputed, given `valid_until`, always phrased as an
estimate. Invalidated by a new purchase, a food change, or a weight change over
~10%.

`orders.order_type = 'auto-restock'` is accepted at checkout today and nothing
acts on it. `business_products.auto_restock` and `restock_interval_days` are
also unread. The subscription data model is half-built and idle.

### Returns are strong evidence
A return is evidence of a **dislike**, and stronger than a purchase is of a like
— nobody returns something by accident. There is no returns model (`cancelled` is
the only reversal on `orders`), so this is a dependency, not a design.

---

## §15 — Catalogue governance

Two catalogues, merged at read time:

```js
[...businessProducts.rows.map(mapBusinessProduct),
 ...scrapedProducts.rows.map(mapScrapedProduct)]
```

while `catalogRecommendations.js` searches only `business_products` and says why:

> "scraped_products holds raw import rows that no one has reviewed: they have no
> publication state yet, so the assistant must not be the thing that puts them in
> front of a customer."

**The assistant is right and the shop does not follow it.** Unreviewed scraper
output is on sale.

### Do not create a third catalogue. Add a state.

```
business_products
  + publication_state  IMPORTED | NORMALIZED | VALIDATED | REVIEW_REQUIRED
                       | PUBLISHED | UNPUBLISHED
  + published_at, published_by
  + sellable           generated: publication_state='PUBLISHED' AND in_stock
```

Every review flag already exists as a column — `needs_image_review`,
`needs_price_review`, `is_flagged`, `flagged_reason` — and
`/admin/quick-import` and `/admin/smart-editor` are the screens. What is missing
is the state and a shop query that respects it.

`scraped_products` becomes explicitly staging. `order_items.product_source`
keeps historical lines readable through the change.

**`sellable` is gate 0 in `52`.** Matching cannot be introduced on top of an
ungoverned catalogue without inheriting the defect: an engine that confidently
recommends a row nobody reviewed is worse than no engine.

---

## Privacy

Purchase history is `PRIVATE` (`50`). It reveals health conditions by inference —
buying a renal diet says something clinical about the animal. Therefore:

- Purchase-derived facts inherit the sensitivity of what they imply. A
  `PURCHASE_DERIVED` preference for a prescription diet is treated as clinical
  context, not as a shopping preference.
- Commerce data is **not** in a care-team grant's default scope (`49`).
- Order events carry ids and product identity, never a health inference.

## Gaps

| Gap | Severity |
|---|---|
| No `pet_id` on order items | **P0** |
| No server cart | `localStorage["mipo-cart"]` |
| No server favourites, not pet-scoped | `localStorage["mipo-favorites"]` |
| No wishlist | |
| No inventory quantity — `in_stock` boolean only | nothing decrements, nothing reserves |
| No returns model | blocks dislike evidence |
| No publication state | **live merchandising defect** |
| `auto-restock` accepted, unacted | |
| No `order.delivered` event | `order.shipped` is the last declared one |
| `product_variations` exists only for `scraped_products` | the canonical catalogue has no variant model |
