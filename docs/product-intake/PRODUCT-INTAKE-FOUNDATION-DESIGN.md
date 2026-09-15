# Product Intake Foundation — Design (Stage 1, planning only)

**Date:** 2026-09-14 · **Branch:** `claude/mifo-project-oq44tl`
**No table was created. No migration written. No schema changed. No code, merge or deploy.**

Follows Stage 0 ([`LEGACY-CREATION-CLOSURE-AUDIT.md`](./LEGACY-CREATION-CLOSURE-AUDIT.md),
commit `f65d2bcd`), which closed all eight legacy creation paths.

---

## 1. Executive summary

Stage 0 left the system with **no way to create a product at all**. This design is the
replacement: seven new tables, one intake lifecycle, and Seller isolation built in from the
first table rather than retrofitted.

Three decisions shape everything below, and **two of them need your answer before any
migration is written** (§14):

| | |
|---|---|
| **The marketplace shape** | `catalog_products` carries an **owning Seller** for its content, while `seller_offers` lets *other* Sellers sell against the same product. This gives clear ownership on day one and a real marketplace later, without a shared-content free-for-all. **Open decision OD-1.** |
| **Where the lifecycle lives** | Intake state lives on `product_drafts`; publication state lives on `catalog_products`. One logical sequence, two tables, with a documented handoff at `APPROVED`. Publication is a property of a live product, not of a finished draft — a product is unpublished and republished many times after its draft is done. |
| **Seller isolation is structural** | `admin_users` gains a nullable `business_id`. Every Seller-scoped route resolves ownership **server-side from the session**, never from the request body. This is the single largest piece of work and it cannot be deferred — retrofitting it later means touching every route again. |

**Recommended order:** 1A (raw import + draft + state machine + isolation) → 1B (draft UI)
→ 2 (variants + offers) → 3 (publication gate) → 4 (cart/checkout) → 5 (E2E) → 6 (release).

**The thing to weigh first:** admins cannot create products today. Stage 1A+1B is the
shortest path back to a working create flow, and it is deliberately not short.

---

## 2. Decisions carried in

| | Decision | How this design honours it |
|---|---|---|
| **D-1** | Legacy creation closed | `POST /api/products` stays 410. Nothing here reopens it; the new routes are new paths with Review built in |
| **D-2** | Seller isolation in Stage 1 | §7. `business_id` on the admin identity, server-side ownership checks on every route, no frontend filtering |
| **D-6** | New catalogue on new tables | Seven new tables. `business_products` is not extended and not used as the commercial model |
| **D-7** | Legacy out of scope | No backfill, no legacy mapping, no F-4 fix. Legacy rows stay readable and untouched |
| **D-8** | 400 not 500 | Already shipped in Stage 0. Every new endpoint below follows the same rule |

---

## 3. Data model

Conventions for every table: `id uuid primary key default gen_random_uuid()`,
`created_at`/`updated_at timestamptz not null default now()`,
`created_by`/`updated_by uuid` (→ `admin_users.id`), and soft delete as
`archived_at timestamptz` + `archived_by uuid` where stated. **Nothing in the intake chain
is hard-deleted** — an audit trail with holes in it is not an audit trail.

### 3.1 `raw_import_records` — the external source, frozen

**Purpose:** what the outside world actually said, stored once and never edited. Every
later correction is traceable back to this row.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `business_id` | uuid **not null** | → `business_profiles.id`. **The importing Seller. No default, no fallback.** |
| `source_system` | text not null | `url` · `scrape` · `csv` · `xlsx` · `manual` · `api` |
| `source_record_id` | text | the external identifier, when the source has one |
| `source_url` | text | provenance of content, never of ownership |
| `source_host` | text | derived, for display without exposing paths or query strings |
| `payload` | jsonb **not null** | **IMMUTABLE** — the raw record verbatim |
| `payload_hash` | text not null | sha256 of `payload`, for duplicate detection |
| `content_type` | text | `application/json` · `text/csv` · … |
| `imported_at` | timestamptz not null | |
| `import_batch_id` | uuid | groups one spreadsheet or one crawl |
| `created_by` | uuid not null | the admin who imported |

**Immutable:** `payload`, `payload_hash`, `source_*`, `business_id`, `imported_at`.
Enforced by a trigger, not by convention.

**Unique:** `UNIQUE (business_id, source_system, source_record_id) WHERE source_record_id IS NOT NULL`
— one Seller cannot import the same external record twice; **a different Seller can**.
**There is no global uniqueness on `source_record_id`, and none may be added.**

**Indexes:** `(business_id, imported_at desc)` · `(import_batch_id)` · `(payload_hash)`
· `(business_id, payload_hash)`.

**Delete rule:** never. `archived_at` only. No cascade from anywhere.

### 3.2 `product_drafts` — the correction workspace

**Purpose:** the corrected content, held separately so the raw record is never overwritten.
Carries the intake lifecycle.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `business_id` | uuid **not null** | → `business_profiles.id`. Inherited from the raw record, never defaulted |
| `raw_import_record_id` | uuid | → `raw_import_records.id` `ON DELETE RESTRICT`. **Nullable** — a hand-authored draft has no external source |
| `state` | text not null default `'DRAFT'` | see §6 |
| `name` | text | corrected |
| `description` | text | |
| `brand`, `category_id`, `pet_type`, `attributes jsonb` | | corrected content |
| `proposed_price` | numeric | indicative; the binding price lives on the offer |
| `review_note` | text | required on rejection |
| `reviewed_by` / `reviewed_at` | uuid / timestamptz | |
| `submitted_by` / `submitted_at` | uuid / timestamptz | |
| `approved_catalog_product_id` | uuid | → `catalog_products.id`, set at `APPROVED` |
| `archived_at` / `archived_by` | | soft delete |

**Unique:** `UNIQUE (raw_import_record_id) WHERE raw_import_record_id IS NOT NULL AND archived_at IS NULL`
— one live draft per source record.

**Indexes:** `(business_id, state)` · `(state, updated_at desc)` · `(raw_import_record_id)`.

**Immutable after `APPROVED`:** `business_id`, `raw_import_record_id`,
`approved_catalog_product_id`. Content edits force the state back to `DRAFT` (§6).

**Delete rule:** `ON DELETE RESTRICT` toward the raw record. Soft delete only.

### 3.3 `catalog_products` — the canonical commercial product

**Purpose:** the product as a thing that exists in the catalogue, independent of price and
stock.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `owning_business_id` | uuid **not null** | → `business_profiles.id`. **Who curates the content.** Not who may sell it — see `seller_offers` |
| `origin_draft_id` | uuid not null | → `product_drafts.id` `ON DELETE RESTRICT`. Every product came from a reviewed draft. **Immutable** |
| `publication_state` | text not null default `'UNPUBLISHED'` | `UNPUBLISHED` · `PUBLISHED` · `ARCHIVED` |
| `published_at` / `published_by` | | |
| `unpublished_at` / `unpublished_reason` | | |
| `name`, `description`, `brand`, `category_id`, `pet_type`, `attributes jsonb` | | approved content |
| `slug` | text | `UNIQUE (slug) WHERE archived_at IS NULL` |
| `archived_at` / `archived_by` | | |

**Indexes:** `(publication_state) WHERE publication_state = 'PUBLISHED'` (the public
catalogue reads this) · `(owning_business_id)` · `(category_id)` · `(slug)`.

**Immutable:** `origin_draft_id`. `owning_business_id` changes only through an explicit,
audited transfer action — never as a side effect.

**Delete rule:** never hard-deleted. `ARCHIVED` + `archived_at`.

### 3.4 `product_variants` — the sellable unit

**Purpose:** what a customer actually buys. **The variant, not the product, is the unit of
price and stock.**

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK — **the stable purchase identity** |
| `catalog_product_id` | uuid not null | → `catalog_products.id` `ON DELETE RESTRICT` |
| `options` | jsonb not null default `'{}'` | `{"size":"L","flavor":"עוף"}` |
| `option_signature` | text not null | canonical serialisation of `options`, for duplicate prevention |
| `label` | text | derived display string, **never parsed for meaning** |
| `barcode` | text | GTIN/EAN. **Optional and not unique** — the same barcode legitimately appears under many Sellers |
| `weight`, `weight_unit` | numeric, text | |
| `status` | text not null default `'ACTIVE'` | `ACTIVE` · `INACTIVE` · `ARCHIVED` |
| `is_default` | boolean not null default false | |
| `archived_at` / `archived_by` | | |

**Unique:** `UNIQUE (catalog_product_id, option_signature) WHERE archived_at IS NULL` — no
two live variants of one product may describe the same combination.
`UNIQUE (catalog_product_id) WHERE is_default AND archived_at IS NULL`.

**Indexes:** `(catalog_product_id, status)` · GIN on `options` only if an attribute filter
is actually built.

> **No SKU here.** A SKU is a *Seller's* code for a thing they sell, so it belongs on the
> offer. Two Sellers offering the same variant have different SKUs. See §4.

### 3.5 `seller_offers` — a Seller's commercial terms

**Purpose:** the marketplace join. **This is what makes a variant purchasable, and from
whom.**

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK — the `offer_id` carried by cart and order |
| `business_id` | uuid **not null** | → `business_profiles.id`. **The selling Seller** |
| `product_variant_id` | uuid not null | → `product_variants.id` `ON DELETE RESTRICT` |
| `sku` | text | the Seller's own code |
| `price` | numeric **not null** | **the binding price.** Locked at creation |
| `sale_price` | numeric | |
| `currency` | text not null default `'ILS'` | |
| `price_locked_at` | timestamptz not null | |
| `price_source` | text | `manual` · `adopted` — recorded, never auto-synced |
| `status` | text not null default `'INACTIVE'` | `INACTIVE` · `ACTIVE` · `SUSPENDED` · `ARCHIVED` |
| `adopted_from_raw_import_id` | uuid | → `raw_import_records.id`. How this Seller came to offer it |
| `archived_at` / `archived_by` | | |

**Unique:** `UNIQUE (business_id, product_variant_id) WHERE archived_at IS NULL` — one live
offer per Seller per variant. `UNIQUE (business_id, sku) WHERE sku IS NOT NULL AND archived_at IS NULL`
— SKU unique **within a Seller**, never globally.

**Indexes:** `(product_variant_id, status)` (checkout reads this) · `(business_id, status)`
· `(business_id, sku)`.

**Immutable:** `business_id`, `product_variant_id`. **Price is not immutable but is
never changed implicitly** — only by an explicit, audited price action.

### 3.6 `inventory` — stock per offer

**Purpose:** availability, separated from price so a stock change is not a price event.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `seller_offer_id` | uuid not null | → `seller_offers.id` `ON DELETE RESTRICT`. `UNIQUE` |
| `availability` | text not null default `'OUT_OF_STOCK'` | `IN_STOCK` · `OUT_OF_STOCK` · `PREORDER` · `DISCONTINUED`. **No "unknown means in stock"** |
| `quantity` | integer | null = untracked quantity, availability still authoritative |
| `reserved_quantity` | integer not null default 0 | reserved for Stage 4; unused until then |
| `low_stock_threshold` | integer | |
| `restock_expected_at` | timestamptz | |

**Indexes:** `(seller_offer_id)` unique · `(availability)`.

A companion `inventory_events` append-only table is **deferred to Stage 2** — audit for
Stage 1 goes through `admin_audit_log` (§3.8).

### 3.7 `product_media` — images, with approval as its own fact

**Purpose:** source, adopted and approved are **three independent facts**, not one status.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `catalog_product_id` | uuid not null | → `catalog_products.id` `ON DELETE RESTRICT` |
| `product_variant_id` | uuid | → `product_variants.id`. **Null = product-level image** |
| `source_url` | text | where the bytes came from |
| `storage_path` | text | where *we* keep them |
| `checksum` | text | sha256 of the stored bytes |
| `width`, `height`, `bytes`, `content_type` | | |
| `adopted_at` | timestamptz | bytes are ours |
| `approved_at` / `approved_by` | | **a human accepted it for public display** |
| `rejected_at` / `rejection_reason` | | |
| `display_order` | integer not null default 0 | |
| `archived_at` / `archived_by` | | |

**Unique:** `UNIQUE (catalog_product_id, checksum) WHERE archived_at IS NULL` — the same
bytes are not stored twice for one product.

**Indexes:** `(catalog_product_id, display_order)` ·
`(catalog_product_id) WHERE approved_at IS NOT NULL` (the display path) · `(product_variant_id)`.

**Display fallback:** approved variant image → approved product image → approved
default-variant image → placeholder. **A non-approved image is never shown publicly.**

### 3.8 Audit

**No new audit table.** `admin_audit_log` already exists, is append-only everywhere in the
repository, and G-6 proved the pattern works. Every action in §5 writes one row:
`action_type`, `entity_type`, `entity_id`, `old_values`, `new_values`, `metadata`, actor.

**Never logged:** full URLs, query strings, credentials, customer data, whole payloads.

### 3.9 Cascade policy, stated once

**Every foreign key in the intake chain is `ON DELETE RESTRICT`.** Nothing cascades.
Removal is `archived_at`. A row that an order ever referenced must remain readable forever,
and a cascade is the mechanism by which that guarantee is usually lost.

---

## 4. Identity decisions

| Concept | Definition |
|---|---|
| **Product** | `catalog_products` — the canonical item *as content*: name, description, brand, category. Carries no price and no stock. Owned for curation by `owning_business_id` |
| **Variant** | `product_variants` — the sellable unit. Distinguished from its siblings by `options`. **Identity is `id`**, never SKU, never barcode |
| **Seller Offer** | `seller_offers` — one Seller's commercial terms for one variant: price, currency, SKU, status. **The thing a customer actually buys from** |
| **Inventory** | `inventory` — availability and quantity for one offer |
| **External source** | `raw_import_records` — the unmodified outside record. Provenance of *content*. **Never evidence of ownership** |
| **Internal identifier** | the `uuid` primary key. The only stable identity. Never derived from external data |
| **SKU** | a **Seller's own code**, on the offer. Unique within `business_id`. Optional. Never a global key, never an identity |

**Can one source be adopted by more than one Seller?** **Yes, and this is required.** Each
Seller imports their own `raw_import_records` row (uniqueness is scoped to
`business_id`), gets their own draft, and creates their own offer. Two Sellers offering the
same physical item end up as two offers against one variant, or as two products — both are
valid and neither is prevented.

**Scope of source uniqueness:** `(business_id, source_system, source_record_id)`.
**No global `UNIQUE(source_record_id)`, now or later.**

**How duplication is prevented** — four mechanisms, none of them global:

1. `payload_hash` flags a re-import of identical bytes **as a warning, not a block**;
2. `UNIQUE (business_id, source_system, source_record_id)` blocks a Seller re-importing the same record;
3. `UNIQUE (catalog_product_id, option_signature)` blocks two identical live variants;
4. `UNIQUE (business_id, product_variant_id)` blocks a Seller offering the same variant twice.

**How historical order independence is preserved:** `order_items` gains **nullable snapshot
columns only** — `seller_id`, `offer_id`, `catalog_product_id`, `variant_id`, `sku`,
`variant_options jsonb`, `unit_price`. **No foreign key is added to any of them**, for the
same reason none exists today: an order line is a record of what happened, not a pointer to
what is currently true. Archiving a product, deactivating an offer or unpublishing anything
leaves every existing order line byte-identical.

---

## 5. ERD

```
                     business_profiles (Seller)
                     ──────────┬──────────────────────────────────┐
                               │ 1                              1 │
                               │                                  │
                     ┌─────────┴──────────┐                       │
                     │ raw_import_records │                       │
                     │  IMMUTABLE payload │                       │
                     └─────────┬──────────┘                       │
                               │ 1                                │
                               │ 0..1        (RESTRICT)           │
                     ┌─────────┴──────────┐                       │
                     │   product_drafts   │  ◄── intake lifecycle │
                     │  DRAFT…APPROVED    │                       │
                     └─────────┬──────────┘                       │
                               │ 1                                │
                               │ 0..1  at APPROVED                │
                     ┌─────────┴──────────┐                       │
                     │  catalog_products  │  ◄── publication      │
                     │  owning_business_id├───────────────────────┘
                     └────┬───────────┬───┘
                        1 │           │ 1
                       1..N│           │0..N
              ┌────────────┴────┐   ┌──┴──────────────┐
              │ product_variants│   │  product_media  │  (product-level
              │  THE SELLABLE   │   │ adopted/approved│   when variant_id
              │      UNIT       │   └──┬──────────────┘   is null)
              └────────┬────────┘      │ 0..N
                     1 │               │ (variant-level)
                  0..N │  ◄────────────┘
         ┌─────────────┴──────────┐
         │     seller_offers      │ N..1 ── business_profiles (the SELLING Seller)
         │ price · sku · status   │
         └─────────┬──────────────┘
                 1 │
                 1 │
         ┌─────────┴──────────┐
         │     inventory      │
         └────────────────────┘

         order_items ─ ─ ─ ✗ ─ ─ ─►  no FK to ANY of the above.
                                     Snapshot columns only, all nullable.
```

**Cardinality:** Seller 1:N raw records · raw record 1:0..1 draft · draft 1:0..1 product ·
product 1:N variants · variant 1:N offers (**one per Seller**) · offer 1:1 inventory ·
product 1:N media · variant 1:N media.

**Ownership:** content is owned by `catalog_products.owning_business_id`; commerce is owned
by `seller_offers.business_id`. **They may differ — that is the marketplace.**

---

## 6. State machine

**Two tables, one logical sequence, with a handoff at `APPROVED`.**

```
   ── on product_drafts ───────────────────────────────────────────────┐
                                                                       │
   IMPORTED ──► DRAFT ──► IN_REVIEW ──► APPROVED ──┐                   │
      │           ▲          │                     │  creates          │
      │           │          └──► REJECTED ────────┼──► catalog_product│
      │           └──────── edit ◄─────────────────┘                   │
      └──► ARCHIVED                                                    │
   ───────────────────────────────────────────────────────────────────┘
                                   │
   ── on catalog_products ─────────┼───────────────────────────────────┐
                                   ▼                                   │
                            UNPUBLISHED ⇄ PUBLISHED ──► ARCHIVED       │
   ───────────────────────────────────────────────────────────────────┘
```

`VARIANT_CONFIGURED`, `INVENTORY_CONFIGURED` and `READY_TO_PUBLISH` from the brief are
**not stored as states**. They are *computed* from the publication gate (§8).

> **Why.** A stored "configured" flag is a claim that can drift from the data it describes:
> delete the last variant and the flag still says configured. The gate reads the actual
> rows every time it is asked, so it cannot be stale. `READY_TO_PUBLISH` becomes a
> **derived, always-true-or-false predicate**, exposed read-only on the product so an admin
> can see exactly which conditions are unmet. **Open decision OD-2** if you want them stored.

| State | Meaning | Entry | Exit | Who |
|---|---|---|---|---|
| `IMPORTED` | raw record exists, no draft yet | raw import succeeds | draft created | importer |
| `DRAFT` | being corrected | draft created, or edit of `IN_REVIEW`/`APPROVED`/`REJECTED` | submit | owner Seller admin, product manager, system admin |
| `IN_REVIEW` | awaiting a reviewer | submitted, name+category present | approve / reject / withdraw | submitter |
| `APPROVED` | content accepted; **creates `catalog_products`** | reviewer approves | edit → `DRAFT` | product manager, system admin. **Never the Seller who submitted it** |
| `REJECTED` | refused, with a required reason | reviewer rejects | edit → `DRAFT` | reviewer |
| `ARCHIVED` | abandoned | archive action | terminal | owner, system admin |
| `UNPUBLISHED` | product exists, not public | product created, or unpublish | publish | Seller admin (own), product manager, system admin |
| `PUBLISHED` | **public and purchasable** | gate passes (§8) | unpublish / archive | same |
| `ARCHIVED` (product) | withdrawn | archive | terminal | system admin |

**Forbidden transitions** — refused with `409 INVALID_STATE_TRANSITION`:

* `DRAFT → APPROVED` (review may not be skipped)
* `IMPORTED → PUBLISHED` (and any other jump to `PUBLISHED`)
* `REJECTED → APPROVED` without re-entering `DRAFT` then `IN_REVIEW`
* `ARCHIVED → anything`
* `UNPUBLISHED → PUBLISHED` when the gate fails
* self-approval: the actor who submitted may not approve

**Going back:** yes, and it is the normal path. Any content edit of `IN_REVIEW`, `APPROVED`
or `REJECTED` returns the draft to `DRAFT` and clears `reviewed_by`/`reviewed_at`. Approval
that could be edited around would be theatre. **`PUBLISHED ⇄ UNPUBLISHED` is freely
reversible.** The previous decision is never overwritten — history is append-only in
`admin_audit_log`.

**Atomicity:** every transition is one transaction — advisory lock on the entity, re-read
state inside the lock, validate, write, write audit, commit. **A failure at any step writes
nothing**, including no audit row: the transition and its audit record commit together or
not at all. A partially-configured product is representable (that is what the gate is for);
a partially-applied *transition* is not.

---

## 7. Seller isolation

**This requires a schema change to the admin identity**, and it is the reason D-2 belongs
in Stage 1 rather than later.

`admin_users` today: `id, email, password_hash, display_name, role, is_active, created_at,
updated_at, last_login_at, must_change_password`. **No `business_id`.**

### 7.1 Roles

| Role | `business_id` | Scope |
|---|---|---|
| `system_admin` | null | everything, all Sellers |
| `product_manager` | null | platform-wide review and approval. **Cannot approve its own submissions** |
| `seller_admin` | **not null** | its own Seller only |
| `readonly_admin` | null | read-only, platform-wide. No mutation of any kind |

### 7.2 Permissions

| Permission | system_admin | product_manager | seller_admin | readonly_admin |
|---|:--:|:--:|:--:|:--:|
| `intake.import` | ✅ | ✅ | ✅ own | ❌ |
| `intake.draft.write` | ✅ | ✅ | ✅ own | ❌ |
| `intake.draft.submit` | ✅ | ✅ | ✅ own | ❌ |
| `intake.review` (approve/reject) | ✅ | ✅ | ❌ | ❌ |
| `catalog.variant.write` | ✅ | ✅ | ✅ own | ❌ |
| `catalog.offer.write` | ✅ | ✅ | ✅ own | ❌ |
| `catalog.inventory.write` | ✅ | ✅ | ✅ own | ❌ |
| `catalog.media.approve` | ✅ | ✅ | ❌ | ❌ |
| `catalog.publish` | ✅ | ✅ | ✅ own | ❌ |
| `catalog.read` | ✅ | ✅ | ✅ own | ✅ all |
| `catalog.transfer_ownership` | ✅ | ❌ | ❌ | ❌ |

### 7.3 How ownership is enforced

```
business_id := request.admin.business_id      ← from the SESSION, never the body
if role in (system_admin, product_manager, readonly_admin): scope := PLATFORM
else if business_id is null:                  → 403, refuse. A seller_admin without a
                                                 Seller is a misconfiguration, not a
                                                 platform admin
else:                                          scope := business_id
```

Then, **on every Seller-scoped route**, one predicate applied inside the same transaction
as the write:

```sql
WHERE <table>.business_id = $session_business_id   -- never from input
```

**Rules that make this hold:**

* **`business_id` is never read from a request body** for authorisation. If a body supplies
  one, it must equal the session's or the request is refused.
* **No frontend filtering.** The server returns only what the caller may see.
* **IDOR prevention:** a Seller requesting another Seller's id gets **`404 NOT_FOUND`, not
  403** — a 403 confirms the row exists. Absence and denial must be indistinguishable.
* **Ownership is re-checked inside the transaction**, after the lock, never only at the route.
* `supplier_id` is **never** consulted. `defaultBusinessId` is **never** consulted.

**`request.admin` changes:** gains `business_id` (nullable) and `scope`.

**New permission table?** **No.** The existing `rolePermissions` map in
`adminPermissions.js` extends cleanly. A table would add a moving part without adding a
capability — revisit only if per-user overrides are needed.

**No external Seller UI is opened.** These roles exist server-side so the isolation is real
from the first table; the surface stays admin-only.

---

## 8. Publication gate

`PUBLISHED` is reachable only when **all** hold. Evaluated server-side, inside the
transaction, against live rows:

```
1  Seller approved         business_profiles.is_verified = true  (owning + offering)
2  Draft approved          origin_draft.state = 'APPROVED'
3  Product valid           name, category present; not archived
4  ≥1 live variant         a variant with status='ACTIVE', not archived
5  ≥1 active offer         seller_offers.status='ACTIVE' for that variant
6  Valid price             offer.price > 0 and currency set
7  Availability defined    inventory row exists; availability ≠ 'DISCONTINUED'
8  Approved image          ≥1 product_media with approved_at not null   [OD-3]
9  No open review errors   no draft in IN_REVIEW/REJECTED for this product
10 No duplicates           option_signature and (business_id,sku) uniqueness hold
11 Provenance present      raw_import_record_id set, OR explicitly marked hand-authored
12 Authorisation           actor holds catalog.publish and owns the product
```

Failure returns **`409 PUBLICATION_GATE_FAILED`** with a machine-readable list of the
unmet conditions — so the UI can show exactly what is missing, not merely that something is.

**Checkout conditions** (Stage 4), enforced server-side per line:

```
catalog_products.publication_state = 'PUBLISHED'
seller_offers.status = 'ACTIVE'  AND offer not archived
product_variants.status = 'ACTIVE'
inventory.availability IN ('IN_STOCK','PREORDER')   [and quantity, when tracked]
price resolved from seller_offers.price — NEVER from the request
offer.business_id recorded on the line
```

A Draft, an unpublished product, an inactive offer or an archived variant is **not
purchasable**, and the refusal happens on the server regardless of what the client sends.

---

## 9. API contract

All routes are admin-authenticated. All validation failures are **400** (D-8). All
mutations are one transaction, one audit row.

| # | Method · Path | Permission | Request | Response | Errors | State rule |
|---|---|---|---|---|---|---|
| 1 | `POST /api/admin/intake/imports` | `intake.import` | `{source_system, source_record_id?, source_url?, payload, import_batch_id?}` | `{raw_import_record}` | 400 · 409 `DUPLICATE_SOURCE_RECORD` | creates `IMPORTED` |
| 2 | `POST /api/admin/intake/drafts` | `intake.draft.write` | `{raw_import_record_id?} \| {name, …}` | `{draft}` | 400 · 404 · 409 `DRAFT_ALREADY_EXISTS` | → `DRAFT` |
| 3 | `GET /api/admin/intake/drafts` | `intake.draft.write` \| `catalog.read` | filters: `state`, `business_id`* | `{drafts[], counts}` | 403 | any |
| 4 | `GET /api/admin/intake/drafts/:id` | same | — | `{draft, raw_record, diff}` | 404 | any |
| 5 | `PATCH /api/admin/intake/drafts/:id` | `intake.draft.write` | corrected fields | `{draft}` | 400 · 404 · 409 | any non-archived → **forces `DRAFT`** |
| 6 | `POST …/drafts/:id/submit` | `intake.draft.submit` | `{note?}` | `{draft}` | 409 `INVALID_STATE_TRANSITION` | `DRAFT` → `IN_REVIEW` |
| 7 | `POST …/drafts/:id/approve` | `intake.review` | `{note?}` | `{draft, catalog_product}` | 409 · 403 `SELF_APPROVAL_FORBIDDEN` | `IN_REVIEW` → `APPROVED` |
| 8 | `POST …/drafts/:id/reject` | `intake.review` | `{reason}` **required** | `{draft}` | 400 · 409 | `IN_REVIEW` → `REJECTED` |
| 9 | `POST /api/admin/catalog/products/:id/variants` | `catalog.variant.write` | `{options, label?, barcode?, weight?}` | `{variant}` | 400 · 409 `DUPLICATE_VARIANT` | product not archived |
| 10 | `PATCH …/variants/:id` | `catalog.variant.write` | partial | `{variant}` | 400 · 404 · 409 | not archived |
| 11 | `POST …/variants/:id/offers` | `catalog.offer.write` | `{price, currency?, sku?, sale_price?}` | `{offer}` | 400 · 409 `DUPLICATE_OFFER` / `DUPLICATE_SKU` | locks price |
| 12 | `PATCH …/offers/:id` | `catalog.offer.write` | `{status?}` / `{price}` **explicit** | `{offer}` | 400 · 404 | price change is its own audited action |
| 13 | `PUT …/offers/:id/inventory` | `catalog.inventory.write` | `{availability, quantity?}` | `{inventory}` | 400 · 404 | — |
| 14 | `POST …/products/:id/media` | `catalog.variant.write` | `{source_url} \| upload` | `{media}` | 400 · 409 `DUPLICATE_MEDIA` · 400 `url_rejected` | adopts bytes via the existing SSRF-guarded pipeline |
| 15 | `POST …/media/:id/approve` | `catalog.media.approve` | `{note?}` | `{media}` | 404 · 409 | sets `approved_at` |
| 16 | `POST …/media/:id/reject` | `catalog.media.approve` | `{reason}` | `{media}` | 400 · 404 | |
| 17 | `POST …/products/:id/publish` | `catalog.publish` | — | `{product}` | **409 `PUBLICATION_GATE_FAILED` + `unmet[]`** | → `PUBLISHED` |
| 18 | `POST …/products/:id/unpublish` | `catalog.publish` | `{reason?}` | `{product}` | 404 · 409 | → `UNPUBLISHED` |
| 19 | `GET …/products/:id/readiness` | `catalog.read` | — | `{ready, unmet[]}` | 404 | **read-only gate evaluation** |

\* `business_id` filter is accepted only from platform-scoped roles; a `seller_admin` is
scoped from its session and the parameter is ignored.

**Audit events:** `intake.import.created` · `intake.draft.{created,updated,submitted,approved,rejected,archived}`
· `catalog.product.{created,published,unpublished,archived}` · `catalog.variant.{created,updated,archived}`
· `catalog.offer.{created,price_changed,status_changed}` · `catalog.inventory.updated`
· `catalog.media.{adopted,approved,rejected}`.

**Transaction boundary:** every mutating route above is exactly one transaction covering
validation → lock → state check → ownership check → write → audit write → commit.

---

## 10. Cart and checkout compatibility

**Cart line — every new field optional, so a stored cart stays valid:**

```ts
interface CartItem {
  id: string;                 // line identity (now includes offerId when known)
  productId: string;          // unchanged — always present
  sellerId?: string;          // NEW
  offerId?: string;           // NEW — the binding commercial identity
  catalogProductId?: string;  // NEW
  variantId?: string;         // NEW
  sku?: string;               // NEW
  quantity: number;
  name: string; price: number; image: string;   // display only
  variant?: string; size?: string;              // KEPT for legacy lines
}
```

| Concern | Design |
|---|---|
| **Price resolution** | from `seller_offers.price` under `FOR SHARE`, per line. **The cart price is display only and is never trusted** — already true today and must stay true |
| **Availability** | `inventory.availability` checked server-side at checkout, per line |
| **Order line creation** | resolved from `offer_id` → variant → product → seller |
| **Snapshot** | `seller_id`, `offer_id`, `catalog_product_id`, `variant_id`, `sku`, `variant_options`, `unit_price`, plus the existing `product_name`, `product_image`, `price` |
| **Order independence** | **no foreign key on any new column.** Archiving, unpublishing or deactivating anything leaves existing lines untouched |
| **Draft / unpublished purchase** | refused server-side by the checkout conditions in §8 — regardless of what the client sends |
| **Legacy cart lines** | a line with no `offerId` resolves against the **legacy** path exactly as today. If it cannot resolve, it is **kept, flagged, and excluded from the total** — never silently dropped, never guessed into a variant |

---

## 11. Admin UI migration

`POST /api/products` is **not** restored. The seven screens move to the new routes.

| Screen | Becomes | Consumes |
|---|---|---|
| `ProductFormDialog` | **Draft editor** — the centrepiece | 2, 4, 5, 6 |
| `ProductImportWizard` | Import → Draft, ends at "submitted for review" | 1, 2, 6 |
| `BulkProductImport` (CSV/Excel) | Batch import → **many drafts**, one `import_batch_id` | 1, 2 |
| `AdminQuickImport` | URL import → single draft | 1, 2, 6 |
| `AdminSmartProductEditor` | Draft editor with AI assistance, **suggestions only** | 4, 5 |
| `ProductBulkActions` duplicate | **Duplicate a draft**, never a live product | 2 |
| `AdminProducts` list | Two tabs: **Drafts** (by state) and **Catalogue** (published) | 3, 19 |
| *new* | **Review queue** — approve/reject with raw-vs-corrected diff | 3, 4, 7, 8 |
| *new* | **Variants & Offers** panel | 9–13 |
| *new* | **Media review** | 14–16 |
| *new* | **Publish** panel showing `unmet[]` from the readiness endpoint | 17, 18, 19 |

**Archived:** nothing is deleted in Stage 1B. The legacy create call sites are replaced,
and the screens that have no new-model equivalent are hidden behind a flag until Stage 3.

---

## 12. Migrations plan — **listed, not created**

| # | Name | Tables / fields | Indexes · constraints | Backfill | Lock risk | Reversible | Downtime | Depends on |
|---|---|---|---|---|---|---|---|---|
| M1 | `add_admin_business_scope` | `admin_users` + `business_id uuid null` | FK → `business_profiles`; index `(business_id)` | **none** — all existing admins stay platform-scoped | **low** — nullable add, no rewrite | ✅ drop column | none | — |
| M2 | `create_raw_import_records` | new table | unique `(business_id, source_system, source_record_id) WHERE …`; 4 indexes; immutability trigger | none | none | ✅ drop | none | — |
| M3 | `create_product_drafts` | new table | unique live draft per raw record; 3 indexes | none | none | ✅ drop | none | M2 |
| M4 | `create_catalog_products` | new table | partial index on `PUBLISHED`; unique slug | none | none | ✅ drop | none | M3 |
| M5 | `create_product_variants` | new table | unique `(catalog_product_id, option_signature)`; unique default | none | none | ✅ drop | none | M4 |
| M6 | `create_seller_offers` | new table | unique `(business_id, product_variant_id)`; unique `(business_id, sku)` | none | none | ✅ drop | none | M5 |
| M7 | `create_inventory` | new table | unique `(seller_offer_id)` | none | none | ✅ drop | none | M6 |
| M8 | `create_product_media` | new table | unique `(catalog_product_id, checksum)`; partial approved index | none | none | ✅ drop | none | M4, M5 |
| M9 | `add_order_item_new_snapshots` | `order_items` + 7 **nullable** columns, **no FK** | none | **none** — historical rows keep NULLs | **low** | ✅ drop columns | none | M6 |

**All nine are additive.** No column is dropped, no type changed, no data rewritten, and
**no existing row is touched**. M1 and M9 alter existing tables; both add only nullable
columns, which in PostgreSQL 16 is a catalogue-only change with no table rewrite.

**Not required:** any legacy migration, any backfill, any change to existing `order_items`
rows, any drop of `business_products` or the dead legacy tables.

---

## 13. Rollback plan

| Level | Action |
|---|---|
| **Migration** | Each of M1–M9 drops cleanly. M2–M8 are new tables: dropping them removes only intake data. M1 and M9 drop nullable columns. **No rollback loses pre-existing data** |
| **Code** | `git revert` of the stage commit. The new routes disappear; the legacy 410 stays |
| **Partial rollout** | New routes behind an admin-only surface; the public catalogue reads nothing new until Stage 3, so a rollback before Stage 3 is invisible to customers |
| **Data written before rollback** | Drafts and raw records are orphaned but harmless — nothing public reads them. **Nothing published is lost**, because publication requires Stage 3 |
| **Point of no easy return** | **Stage 4**, when orders begin carrying new snapshot columns. Rolling back after that leaves order lines with populated columns the code no longer reads — harmless, since they are snapshots with no FK, but it is the boundary worth naming |

---

## 14. Open decisions — **needed before any migration**

| # | Decision | Recommendation |
|---|---|---|
| **OD-1** | **Does `catalog_products` carry an owning Seller, or is it a global shared catalogue?** This is the biggest structural fork in the design | **Owning Seller** (as designed). Gives real isolation on day one; a shared catalogue can be reached later by relaxing who may create offers. A global catalogue now means deciding immediately who may edit shared content, with no Seller-facing UI to negotiate it |
| **OD-2** | Store `VARIANT_CONFIGURED` / `INVENTORY_CONFIGURED` / `READY_TO_PUBLISH` as states, or compute them? | **Compute.** A stored flag can drift from the rows it describes; the gate reads live rows and exposes `unmet[]` |
| **OD-3** | **Is an approved image mandatory for publication?** | **Yes** — but confirm. It is gate condition 8, and it is the one most likely to block a real launch if image review capacity is short |
| **OD-4** | Can a `seller_admin` publish its own product, or must a product manager? | **Seller may publish**, because the gate already enforces every objective condition and review already happened at the draft |
| **OD-5** | Is `product_manager` platform-wide, or scoped to a Seller? | **Platform-wide**, matching today's behaviour |
| **OD-6** | May a Seller create an offer against **another** Seller's product? | **Not in Stage 2.** Same-owner only at first; relaxing it later is additive |
| **OD-7** | Currency — single (`ILS`) or multi? | **Single**, stored explicitly so multi is additive |

---

## 15. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R-1 | **No product can be created until 1A+1B ship.** Live today | 🔴 high | Shortest path is 1A+1B. Nothing here restores the legacy route |
| R-2 | Seller isolation touches admin identity, permissions and every new route | 🔴 high | Build it into the first tables. Retrofitting means touching every route twice |
| R-3 | The intake flow is long; admins may find it slower than the old one-screen create | 🟠 medium | That is the point, but the draft editor must be genuinely good or people will route around it |
| R-4 | Two catalogues coexist (legacy `business_products` + new) until Stage 3 | 🟠 medium | The public catalogue keeps reading legacy until Stage 3 switches it. Both are read-only to creation |
| R-5 | IDOR in Seller-scoped routes | 🔴 high | Ownership in the transaction, 404-not-403, and explicit IDOR tests (§16) |
| R-6 | Image review capacity gates publication (OD-3) | 🟠 medium | Decide OD-3 before Stage 3, not during |
| R-7 | Legacy products stay public, purchasable and mispriced (F-4) | accepted | Out of scope by decision. Worth a conscious re-look before the new catalogue goes live beside them |

---

## 16. Testing plan

| Class | Coverage |
|---|---|
| **Unit** | state machine transitions and every forbidden one · gate predicate with each condition individually unmet · option signature canonicalisation · SKU/source uniqueness scoping · role→permission matrix |
| **Integration (DB)** | every constraint enforced by the database, not just the code · `ON DELETE RESTRICT` actually restricts · immutability trigger on `raw_import_records.payload` · unique partial indexes behave under archive |
| **DB smoke** | full chain import→draft→review→variant→offer→inventory→media→publish against a live API |
| **API contract** | every endpoint: status, body shape, error codes · 400 never 500 for bad input · `unmet[]` present on gate failure |
| **Permissions** | each of 4 roles × each endpoint · `seller_admin` with null `business_id` is refused |
| **Seller isolation** | Seller A cannot read, edit, publish, archive or offer against Seller B's draft, product, variant, offer, inventory or media |
| **IDOR** | every `:id` route with another Seller's id returns **404, not 403** · body-supplied `business_id` cannot override the session |
| **State transitions** | every legal transition · every forbidden one → 409 · self-approval refused · edit-after-approve returns to DRAFT |
| **Publication gate** | 12 tests, one per condition, each proving publication is refused when only that condition is unmet |
| **Images** | unapproved never displayed publicly · fallback order · duplicate checksum refused · SSRF guard still applied on adoption |
| **Variants** | duplicate option signature refused · exactly one default · archived variant not purchasable |
| **Inventory** | availability respected at checkout · `OUT_OF_STOCK` blocks purchase · no "unknown means in stock" |
| **Cart** | legacy line without `offerId` still resolves · unresolvable line kept, flagged, excluded from total, never guessed |
| **Checkout** | price from offer not request · draft/unpublished refused · inactive offer refused · availability checked |
| **Orders** | snapshot columns written · **no FK** · archiving a product leaves lines byte-identical · historical rows unchanged |
| **Rollback** | each migration down-migrates on a populated database without error |
| **Concurrency** | two reviewers on one draft serialise · two publishes race safely · duplicate offer under race → one wins |
| **Negative** | missing required fields · wrong types · oversized payloads · unknown state values · malformed uuids |

**Regression, non-negotiable:** the existing 344 unit tests, 32 smoke checks and the
pet-facts integration suite must stay green throughout.

---

## 17. Recommended implementation order

| Stage | Contents | Gate to proceed |
|---|---|---|
| **1A** | M1–M3 · raw import · draft · state machine · roles and isolation · audit · endpoints 1–8 · unit + DB + permission + IDOR tests | isolation tests green |
| **1B** | Draft editor · import wizards → drafts · review queue with raw-vs-corrected diff | an admin can create and approve a draft end to end |
| **2** | M4–M8 · variants · offers · inventory · media adoption + approval · endpoints 9–16 | duplicate/uniqueness and image tests green |
| **3** | Publication gate · endpoints 17–19 · public catalogue reads `catalog_products` · drafts excluded from search | 12 gate tests green; public catalogue verified non-empty before the switch |
| **4** | M9 · cart fields · checkout resolution from offers · order snapshots | order-independence tests green |
| **5** | Full E2E: import → draft → review → variant → offer → inventory → publication → search → page → cart → checkout → order, plus failure, rollback, concurrency and isolation paths | all green |
| **6** | Final report · explicit approval · migrations · deploy · smoke · documented rollback | your approval at each step |

**Suggested first slice:** **M1 alone** — add nullable `business_id` to `admin_users`. It
is reversible, touches no behaviour, and unblocks the isolation work that everything else
depends on.

---

**Stopping here.** No table created, no migration written, no schema changed, no production
code, no merge, no deploy.
