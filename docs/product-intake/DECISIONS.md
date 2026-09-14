# Product Intake — Accepted Decisions

Final accepted decisions only. Rationale, evidence and line references live in
[`FINAL-DESIGN-DECISION.md`](./FINAL-DESIGN-DECISION.md).

**Status:** design closed · not implemented · no migration written
**Date:** 2026-09-14

---

## Model

| ID | Decision |
|---|---|
| **PD-01** | **No canonical Product table.** `business_products` remains the Seller-owned commercial listing. |
| **PD-02** | **No separate Offer table.** `business_products` *is* the Seller offer. |
| **PD-03** | **`product_variants` is created.** The variant — not the listing — is the sellable unit and the thing that carries price, SKU and stock. |
| **PD-04** | **Hybrid variant storage:** typed columns for `price`, `sale_price`, `sku`, `stock_status`, `stock_quantity`, `weight`, `weight_unit`; `options jsonb` for the open dimension set. |
| **PD-05** | **Variant identity is an internal uuid.** `sku`, `barcode` and `source_variant_key` are optional. Every uniqueness rule is scoped to `business_product_id`. **No global uniqueness on any source or barcode field.** |
| **PD-06** | **Every legacy listing gets exactly one default variant** (`is_default = true`, `options = '{}'`). "Listing without variants" stops being a special case. |
| **PD-07** | **Inventory is columns on `product_variants`**, not a separate table. No ledger, no reservations, no multi-location stock. |

## Discovery and adoption

| ID | Decision |
|---|---|
| **PD-08** | **`scraped_products` is discovery/staging only.** It is removed from the public catalogue and from order resolution. A discovery row is never sellable. |
| **PD-09** | **Adoption is explicit**, recorded in `product_adoptions`, and creates a new `business_products` row. |
| **PD-10** | **Adoption price is locked** at adoption time and never auto-synchronises with the source price. |
| **PD-11** | **The same discovery row may be adopted by many Sellers.** `product_adoptions` is unique on `business_product_id` only — deliberately **not** on `scraped_product_id`. |

## Ownership

| ID | Decision |
|---|---|
| **PD-12** | **`business_id` is the only Seller ownership reference.** |
| **PD-13** | **`supplier_id` is never ownership, identity, permission or isolation.** Audit confirmed it is not used as such today. |
| **PD-14** | **`ownership_origin` is recorded** (`explicit` · `fallback` · `unverified`). No row is ever automatically reassigned between Sellers. |
| **PD-15** | **Records with `ownership_origin` other than `explicit` are blocked from publication** until a human assigns ownership. |
| **PD-16** | The `defaultBusinessId` fallback must stop silently assigning ownership on product creation. |

## Publication

| ID | Decision |
|---|---|
| **PD-17** | **Two independent axes.** Content readiness: `draft · in_review · approved · rejected`. Commercial visibility: `unlisted · listed`. |
| **PD-18** | **Publicly visible ⇔ `content_state = 'approved' AND visibility = 'listed' AND at least one approved image.`** No other combination is ever public. |
| **PD-19** | **All eight axis combinations are valid states.** Independence is the design; the gate is a single predicate. |
| **PD-20** | `in_review` is exited only by an admin with the approve permission, recording `reviewed_by` and `reviewed_at`. Rejection additionally requires a non-empty `review_note`. |
| **PD-21** | **Rejected content is retained, never deleted.** Editing and resubmitting moves `rejected → in_review`; the previous note is archived. |
| **PD-22** | **Any content edit to an approved listing returns it to `draft`.** Approval must not be editable around. |

## Images

| ID | Decision |
|---|---|
| **PD-23** | **`product_images` is dead** (zero code references, wrongly keyed to `scraped_products`). It is **not** reused and **not** dropped in this work. |
| **PD-24** | **`product_media` is created.** *Source*, *adopted* and *approved* are three independent facts — `source_url`, `adopted_at`, `approved_at` — never one status enum. |
| **PD-25** | Images attach at product level (`variant_id IS NULL`) or variant level (`variant_id IS NOT NULL`). |
| **PD-26** | **Display fallback:** approved variant image → approved product image → approved default-variant image → `/placeholder.svg`. **A non-approved image is never shown publicly.** |

## Carts

| ID | Decision |
|---|---|
| **PD-27** | **No server-side cart.** The cart stays in `localStorage`. |
| **PD-28** | Cart lines gain **optional** `sellerId`, `businessProductId`, `variantId`, `sku`. `variant` and `size` free text are kept. Old stored carts stay valid. |
| **PD-29** | **A variant is never invented.** If a legacy line matches zero or several variants, the line is kept, flagged for re-selection, and only that line is blocked from checkout. |
| **PD-30** | A line whose listing is gone or unpublished stays visible, marked unavailable, and is excluded from totals. |

## Orders

| ID | Decision |
|---|---|
| **PD-31** | **`order_items` never gains a foreign key to any catalogue table.** History stays independent. |
| **PD-32** | **Order lines are immutable snapshots.** Unpublishing, editing or deleting a listing or variant never alters an existing line. |
| **PD-33** | New snapshot columns, all nullable: `seller_id`, `business_product_id`, `variant_id`, `variant_options jsonb`, `unit_price`. `variant` and `size` are kept permanently. |
| **PD-34** | **Pricing is server-authoritative** — confirmed already true. The client price is never read; `expected_total` only triggers a 409 on drift. |
| **PD-35** | **Order pricing must come from the variant, not the listing.** This corrects a present-tense defect where the base price is charged regardless of the variant selected. |

## Non-goals

| ID | Decision |
|---|---|
| **PD-36** | No canonical Product, no Offer table, no server cart, no inventory ledger, no cross-seller matching or dedup, no automatic source-price sync, no global source uniqueness, no Seller reassignment, no dropping of dead tables in this work, no payment or shipping changes. |

## Blocking condition

| ID | Decision |
|---|---|
| **PD-37** | **No migration may be written until the production validation queries in §13 of the design document are answered.** The ownership split (PD-14) and the catalogue-size impact of PD-08 both rest on assumptions that are unverified against production data. |
| **PD-38** | Publication backfill must preserve the currently-visible catalogue. The `draft` default must never be allowed to unpublish the live shop. |
