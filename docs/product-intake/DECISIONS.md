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

## Legacy isolation

Source: [`LEGACY-CATALOG-ISOLATION.md`](./LEGACY-CATALOG-ISOLATION.md).

| ID | Decision |
|---|---|
| **PD-39** | **Legacy ownership is unresolved — and unrecoverable.** The fallback assignment at `server/src/index.js:4436` records nothing, so a fallback row and a deliberate one are byte-identical. Ownership **must not** be inferred from `source_url`, `image_source_url`, `supplier_id`, a fallback `business_id`, a supplier website, or historical purchasability. Every legacy record is `unresolved` until a human review says otherwise. No legacy record is ever auto-assigned to Mipo Shop or auto-reassigned to another Seller. Only a holder of `PRODUCTS_OWNERSHIP_REVIEW` may change ownership; every change is audited and reversible; conflicting claims stay unpublishable and never resolve by default or by timeout. **This supersedes the rejected `source_url` heuristic in `FINAL-DESIGN-DECISION.md` §CQ-07.** |
| **PD-40** | **Legacy Catalog Isolation.** `unresolved` and `ownership_review` records are **visible internally only** — never public, purchasable, cart-eligible, recommendable, repeat-purchase eligible, or migratable. `rejected` records are archived, never deleted, and **never migrated**. No default variant is ever auto-created for an unresolved record. Isolation is applied at the `listProducts` chokepoint **as a call-site parameter, not a hardcoded filter**, so admin screens and analytics keep reading the unfiltered set. Gates G-1…G-7 are introduced independently; **G-2 (checkout allowlist) and G-7 (Seller allowlist) may not default to deny until Q1, Q5, Q6 and Q7 return numbers.** The catalogue is not hidden until impact is measured on public shop, checkout, repeat purchase, existing carts, order history and recommendations — of which only order history is currently cleared. |
| **PD-41** | **New Intake Independence.** The new intake pipeline shares no table, default or code path with legacy ownership, and is buildable and shippable while every legacy record remains `unresolved`. It requires all nine stages — explicit Seller, raw source record, adoption event, price approval, availability, variant configuration, image approval, content approval, publication approval — and **none may be skipped or defaulted**. The `defaultBusinessId` fallback is **not available** on this path: a missing Seller is an error, never a default. Availability is set deliberately; the legacy "unknown stock ⇒ in stock" behaviour (`server/src/index.js:4182`) is not carried forward. A legacy record can enter only through an explicit adoption event, which an `unresolved` row can never satisfy. |

## Legacy intake freeze — implemented

| ID | Decision |
|---|---|
| **PD-43** | **Legacy Intake Freeze — implemented (G-1).** The legacy scraped-product intake path is frozen. Existing legacy records remain readable and customer-visible. No new scraped-backed commercial records may be created through the legacy path. The freeze does not alter checkout, carts, recommendations, analytics, order history, or public catalog reads.<br><br>**Boundary:** `createProduct()` (`server/src/index.js:4434`), first statement — before `ensureDefaultBusinessProfile` and `adoptProductImages`, so a refusal leaves no business-profile row and no downloaded image. **Discriminator:** a non-empty `source_url` on the payload, read strictly as *content provenance*, never as ownership (PD-39 is not weakened — the guard never reads or writes an owner). **Contract:** HTTP 409, `code: "LEGACY_INTAKE_FROZEN"`. **Flag:** `LEGACY_INTAKE_FROZEN`, env var, **default frozen**, lifted only by the exact string `"false"`; no schema migration. **Creation only** — editing, deleting and all reads are untouched. **CSV/Excel import is deliberately not frozen**, because its parser sets no source and its rows are not scraped-backed. **Known limitation:** the marker is client-supplied, so a re-import stripped of provenance is not caught; closing that needs a server-recorded intake channel and therefore the blocked migration. |

## Ownership review — implemented

| ID | Decision |
|---|---|
| **PD-44** | **Legacy Ownership Review Is Separate From Seller Reassignment.** The review records what a named human decided about ownership. It **never reassigns anything**; acting on a verified decision is a later, separately-approved act that needs the migration.<br><br>**Review state is not `business_id`** — because `business_id` is the field whose silent, unrecorded assignment caused ownership to become unrecoverable in the first place. Using it as the review state would overwrite the very evidence under review and make the fallback indistinguishable from a decision all over again. It is not publication state, `is_active` or `status` either: ownership is an independent axis. **Verified: no code in this change writes `business_products`.**<br><br>**`supplier_id` is not ownership** — it is a procurement reference with no foreign key, never used for identity, permission or isolation, and the only screen that sets it is dead (its supplier list has no setter and is always empty). **`source_url` is not ownership evidence** — it states where the *content* came from. The queue surfaces only its host, and only as "a provenance marker exists"; a host is never a claim about who owns the row.<br><br>**No automatic reassignment or classification exists**, because no derivable signal is sound: fallback and deliberate `business_id` are byte-identical, and order history, image origin, product name and scraped domain are each evidence of something other than ownership. Both verified states therefore require an explicit `seller_id`, validated to exist and be `is_verified` — **including `verified_mipo_shop`**, since no column designates which profile is Mipo Shop and resolving it via `defaultBusinessId` would reintroduce the original defect.<br><br>**Review actions change no public visibility** — no catalogue read, `listProducts`, price, image, cart, checkout, order item or scraped-product behaviour is altered. A `rejected` product is not deleted and not hidden.<br><br>**No migration**, because `admin_audit_log` already suffices: state is the newest row for the product, the table is append-only repository-wide, and the decision and its audit record are the same single `INSERT` — so a decision without history is unrepresentable rather than merely prevented.<br><br>**Still blocked for a later migration task:** acting on a decision (reassignment), an `is_house_seller` designation column, and a materialised review table should the audit table grow. |

## Correction to an earlier decision

| ID | Decision |
|---|---|
| **PD-42** | **F-4 cannot be remediated before the additive migration.** Resolving a variant price requires `product_variants` to exist, so the earlier note treating F-4 as independently fixable was wrong. What *can* ship with no migration is the ambiguity guard: a variant string matching zero or several priced variants is **rejected with 409**, never silently charged at the base price. That converts a silent mischarge into a visible failure and is a **customer-visible behaviour change requiring business sign-off**. |
