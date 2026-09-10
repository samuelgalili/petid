# 15 — Pet Commerce

## The single highest-value change in this entire design

```
orders.pet_name  TEXT        ← today
order_items      product_id, product_source, quantity, price, variant, size,
                             sku, weight, weight_unit   — and no pet
```

There is no `pet_id` anywhere in commerce. Purchase history cannot be attributed
to an animal by key. That one gap blocks, independently:

- `PURCHASE_DERIVED` preferences (`12`)
- reorder prediction and Buy Again
- pet-aware CRM (`21`)
- "same food, cheaper" and switch suggestions (`10`)
- any commerce entry on the timeline (`08`)

Three separate documents in the previous audit reached this conclusion from
three directions. It is the reason it ranks P0.

---

## §39/§27 — Attribution belongs on the line item, not the order

A single order can contain food for Blue, a litter tray for Luna and a leash for
the household. Putting `pet_id` on `orders` would force one pet per order or a
lie.

```
orders
  + primary_pet_id   uuid null → pets   -- convenience only, for display
                                        -- NEVER the source for attribution

order_items
  + pet_id           uuid null → pets  ON DELETE SET NULL
  + pet_attribution  enum: USER_SELECTED | INFERRED_SINGLE_PET
                         | INFERRED_SPECIES | UNATTRIBUTED
```

`pet_attribution` is provenance for the attribution itself, and it is what stops
weak guesses from being read as strong ones:

| Value | When | Usable for `PURCHASE_DERIVED` facts? |
|---|---|---|
| `USER_SELECTED` | the buyer chose the pet | ✅ |
| `INFERRED_SINGLE_PET` | the household has exactly one pet | ✅ |
| `INFERRED_SPECIES` | product `pet_type` matches exactly one of the user's pets | ⚠️ ranking only, never a fact |
| `UNATTRIBUTED` | ambiguous, or a household item | ❌ |

**Never guess between two pets of the same species.** A two-Labrador household
gets `UNATTRIBUTED`, and that is the correct answer.

### Capture, without a new checkout step
The cart already knows the products. `PetPreferenceContext` and `useActivePet`
already know which pet is active. So: default each line to the active pet where
the species matches, show it as an editable chip on the cart row, and let the
buyer change it. One glance, no extra step — which is the §29 rule from the
system audit applied here.

---

## Backfill of existing orders

`orders.pet_name` is free text. Rules for `24`:

```
exact case-insensitive match to exactly one of that user's pets  → pet_id, INFERRED_SINGLE_PET
matches two pets, or none                                        → leave null, UNATTRIBUTED
user has exactly one pet at order time and pet_name is empty     → pet_id, INFERRED_SINGLE_PET
anything else                                                    → UNATTRIBUTED
```

Never fuzzy-match a name. `pet_name` is kept forever as the historical record of
what was typed — the same reason `orders.shipping_address` is a snapshot.

---

## What commerce contributes to Pet Intelligence

```
order.paid
     │
 order_items (pet_id, product_id, product_source)
     │
 ┌───┴──────────────┬─────────────────┬──────────────────┐
 │                  │                 │                  │
purchase          preference       reorder            current food
 event (07)       signal (12)      prediction         confirmation (10)
 │                confidence by    from pack size     ref → product
timeline (08)     repetition       ÷ daily amount
```

### Reorder prediction — derived, never stored as a promise

```
days_remaining = (pack_weight_g × quantity) ÷ grams_per_day
grams_per_day  = from nutrition.feeding_amount, or the manufacturer's
                 feeding_guide for the pet's weight
```

Every input exists: `order_items.weight` / `weight_unit`,
`business_products.feeding_guide`, `kcal_per_kg`, and `physical.weight`.

It is a **PREDICTION**, not a fact (`00`): recomputed, given a validity horizon,
and always phrased as an estimate. It is invalidated by a new purchase, a food
change, or a weight change of more than ~10%.

`orders.order_type = 'auto-restock'` is accepted at checkout today and nothing
acts on it. `business_products.auto_restock` and `restock_interval_days` are
also unread. The data model for subscriptions is half-built and idle.

### Returns and complaints
A return is **evidence of a dislike**, and it is stronger evidence than a
purchase is of a like — nobody returns something by accident. There is no returns
model today (`cancelled` is the only reversal on `orders`), so this is noted as a
dependency, not a design.

---

## Product catalogue governance (§28)

Two catalogues, merged at read time by `listProducts`:

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
  + publication_state  enum
  + published_at, published_by
  + sellable           generated: publication_state='PUBLISHED' AND in_stock
```

```
IMPORTED ──► NORMALIZED ──► VALIDATED ──► REVIEW_REQUIRED ──► PUBLISHED
   │             │              │                │               │
scraped_    imagePipeline  productIntel     needs_image_    sellable
products    normalized     enrichment       review /
(staging)                                   needs_price_
                                            review /
                                            is_flagged      ──► UNPUBLISHED
```

Every one of those review flags **already exists** as a column on
`business_products`, and `/admin/quick-import` and `/admin/smart-editor` are the
screens. What is missing is a state column and a shop query that respects it.

`scraped_products` becomes explicitly a staging table: an import lands there, an
admin adopts a row into `business_products`, the shop reads one table.
`order_items.product_source` already records which catalogue a historical line
came from, so existing orders stay readable through the change.

---

## Matching depends on this

`18` needs `sellable` as its first gate — before species eligibility, before
anything. A product that is not published is not a candidate, no matter how well
it matches. That is one predicate, and it cannot be written until the state
column exists.

---

## Gaps

| Gap | Status |
|---|---|
| No `pet_id` on order items | `MISSING` — P0 |
| No server cart | `MISSING` — `localStorage["mipo-cart"]` |
| No server favourites | `MISSING` — `localStorage["mipo-favorites"]`, not pet-scoped |
| No inventory quantity | `in_stock` boolean only; nothing decrements, nothing reserves |
| No returns model | `MISSING` |
| No publication state | `MISSING` — the live merchandising defect |
| `auto-restock` accepted, unacted | `PARTIALLY IMPLEMENTED` |
| No `order.delivered` event | `MISSING` |
