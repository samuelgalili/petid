# M9 — Cart and checkout migration · **plan only, nothing implemented**

**No cart code, checkout code, order code or migration was written for this.**
Per the stage brief, the cart is planned and its blockers are recorded; it is not
changed. `orders`, `order_items`, checkout and the storefront behave exactly as
they did.

Companion to [`PRODUCT-INTAKE-FOUNDATION-DESIGN.md`](./PRODUCT-INTAKE-FOUNDATION-DESIGN.md) §10.

---

## 1. What a cart line has to carry

Today a cart line identifies a product. That is ambiguous the moment two Sellers
offer the same thing, and it is already ambiguous for variants, because the flat
model has one price per product row.

| Field | Why it is on the line |
|---|---|
| `seller_id` | who is selling it. Without it, a multi-Seller order cannot be split |
| `offer_id` | **the authority.** Names the Seller, the variant and the terms at once |
| `product_id` | display and grouping only |
| `variant_id` | what is actually being bought |
| `sku` | the Seller's own code, snapshotted for the order |
| `quantity` | — |

`offer_id` is the one that matters. The other five are derivable from it, and are
carried so a cart can be rendered without five joins — **not** so that any of them
can be used as the source of truth if they disagree. On any disagreement the
`offer_id` wins and the line is re-resolved.

## 2. The price rule, unchanged and non-negotiable

**A price arriving from the client is display state, never authority.**

Checkout resolves the price server-side from `seller_offers.price`, in the same
transaction that validates availability. A client-supplied price is compared only
so a changed price can be reported back to the shopper — it is never charged.

This is already how `order_items` works, and that property is preserved rather
than rebuilt: order lines snapshot what was bought and do not join back to the
catalogue afterwards. A product renamed, repriced or archived next year must not
change what an old order says it was.

## 3. Checkout resolution order

Each step fails the checkout rather than falling back to a default.

1. the `offer_id` exists and is not archived
2. its Seller is approved *(see blocker B-1)*
3. the offer is `ACTIVE`
4. its variant is `ACTIVE` and not archived
5. its product is `PUBLISHED`
6. the price is resolved **from the offer**, server-side
7. availability is checked against `inventory`
8. an order snapshot is written, carrying the resolved values

Step 6 before step 7 is deliberate: a shopper who is about to be told the item is
unavailable should not first be charged a price nobody quoted.

## 4. Schema change required — **not written**

A cart line needs the five identifiers above. Where the cart lives determines
whether that is a migration at all, and the answer is not in this repository's
schema:

**There is no cart table.** `raw_import_records`, `product_drafts`,
`catalog_products`, `product_variants`, `seller_offers`, `inventory` and
`product_media` now exist; a cart does not. The cart is client-side state today,
posted to checkout at the end.

So M9 as listed in the foundation design — *"`order_items` + 7 nullable columns,
no FK"* — is the **order-side** half and is additive and safe. The **cart-side**
half has no schema to migrate, which means one of two decisions, and it is a
decision rather than something to infer:

| Option | Consequence |
|---|---|
| **Keep the cart client-side** | M9 is only the `order_items` columns. Cheapest. A cart cannot be recovered across devices, and a stale cart is only detected at checkout |
| **Add a server-side cart** | New tables (`carts`, `cart_items`), new endpoints, new expiry policy, and a migration path for carts already in browsers |

**Stopping here rather than choosing.** Both are defensible; they differ in scope
by an order of magnitude, and the second one changes checkout — which this stage
forbids.

## 5. Blockers

| # | Blocker | Blocks | Status |
|---|---|---|---|
| ~~**B-1**~~ | ~~`commercial_status` does not exist~~ | — | ✅ **RESOLVED** — see below |
| **B-2** | **Cart storage is undecided** (§4) | the cart half of M9 | **open — your decision** |
| **B-3** | `orders` has no `business_id` and `order_items.product_id` has no foreign key | splitting an order by Seller; `seller_orders` | **open** — deliberate for now; historical orders carry no Seller attribution and never did |
| **B-4** | Cardcom split-payment capability is unverified | settlement, multi-Seller orders | **open** — external |

### B-1 resolved

`business_profiles.commercial_status` exists (migration `0049`), taking
`none` · `pending` · `approved` · `suspended`, NOT NULL, defaulting to `none`
with no backfill. **Checkout step 2 is now evaluable**, and it uses the same
predicate as provisioning and the publication gate rather than a third spelling
of it:

```js
import { isSellerEligible, sellerEligibleSql } from "./sellerEligibility.js";
```

`pending` is the state that matters for intake: a business being onboarded can
build drafts, variants and images and still cannot sell any of it.

**Nothing in checkout was changed.** The predicate is ready for step 2 when
checkout is implemented; this stage does not touch checkout, and did not.

## 6. Explicitly not done

* no cart code, no checkout code, no order code
* no `order_items` columns added
* no cart tables
* no change to price resolution
* no change to order snapshots
* no migration file
* no change to storefront behaviour
