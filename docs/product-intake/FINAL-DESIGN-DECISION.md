# Product Intake · Variants · Offers · Publication — Final Design Decision

**Status:** design closed, implementation not started
**Scope:** read-only audit. No code changed, no migration written, no production data touched.
**Date:** 2026-09-14
**Branch:** `claude/mifo-project-oq44tl`

> **How to read this document.** Section 2 is *verified repository fact* — every claim
> carries a file and line, and was read from the current tree or from a live PostgreSQL
> with all 38 migrations applied. Sections 3 onward are *recommendation*. Where a
> statement is an assumption rather than a fact it is tagged **[ASSUMPTION]**. Nothing
> here was validated against production data; see §13.

---

## 1. Executive summary

The audit found that the marketplace constraints this project has already adopted are
**not yet represented in the schema at all** — and in three places the running code
actively contradicts them.

Five findings decide the whole design:

| | Finding | Consequence |
|---|---|---|
| **F-1** | `scraped_products` rows are listed publicly and are directly purchasable. `listProducts` merges them into the shop feed (`server/src/index.js:4252-4253`) and `resolveCatalogOrderItem` will build an order line from one (`server/src/index.js:5338-5420`). | Violates *"a scraped product must not become commercially purchasable without explicit adoption."* This is the single most important gap. |
| **F-2** | A scraped product has **no Seller at all** — `mapScrapedProduct` hardcodes `business_id: null` (`server/src/index.js:4184`). | Half the purchasable catalogue has no ownership, no isolation and no permission boundary. |
| **F-3** | There is **no publication, approval, review or visibility gate anywhere**. No `is_active`, no `is_published`, no `status` column exists on either catalogue table, and no route filters on one. | "Publication requires content approval and commercial visibility" is currently unimplementable — both axes are missing. |
| **F-4** | Variants exist only as **display strings with the price baked into the text**, stored in `business_products.flavors text[]` (`src/components/admin/ProductFormDialog.tsx:375-419`). Order pricing ignores the selected variant entirely (`server/src/index.js:5399-5411`). | A customer who picks "5 ק\"ג - ₪199" is charged the *base* product price. Variant pricing is not merely unmodelled — it is silently wrong today. |
| **F-5** | `product_variations` and `product_images` exist in the database, both foreign-keyed to `scraped_products`, and have **zero code references**. | Two dead tables that look like the variant/image model but are not wired to anything. Proof in §2.6. |

**The recommended MVP shape is deliberately conservative:**

* **No canonical Product table** (CQ-01) and **no separate Offer table** (CQ-02).
  `business_products` already *is* the Seller-owned listing; it needs ownership and
  publication columns, not a replacement. Introducing a canonical Product now would
  create a second product abstraction with no consumer.
* **One new table: `product_variants`**, owned by `business_products`, carrying its own
  price, SKU and stock (CQ-03/CQ-04) — a hybrid model: typed columns for the things the
  system prices and sorts on, JSONB for the open option set.
* **Two new independent flag groups on `business_products`** for the publication axes
  (CQ-06), plus an `adoption` link from a listing back to the discovery row it came from.
* **`scraped_products` loses its public exposure entirely.** It becomes what the
  constraints say it is: discovery/staging.

Order history is already safe. `order_items` has no foreign key to any catalogue table
and pricing is fully server-authoritative (§2.5, CQ-09). No change is required there
beyond adding snapshot columns.

---

## 2. Current-state findings — verified repository facts

Every fact below was read from the tree at commit `987a9b4f` or from a local PostgreSQL
16 instance with migrations `0001`–`0039` applied (38 files; `0030`/`0031` do not exist).
Column lists come from `information_schema`, never from migration text.

### 2.1 The two catalogue tables

| | `business_products` | `scraped_products` |
|---|---|---|
| Columns | 53 | 54 |
| Seller reference | `business_id uuid NOT NULL` → `business_profiles.id` | **none** |
| Price fields | `price`, `original_price`, `sale_price`, `cost_price` | `final_price`, `regular_price`, `sale_price` |
| Stock | `in_stock boolean` | `stock_status` (enum) |
| Variant carrier | `flavors text[]`, `sizes` absent | `variants jsonb`, `flavors[]`, `sizes[]`, `colors[]` |
| Publication flag | **none** | **none** |
| Review flags | `needs_image_review`, `needs_price_review`, `is_flagged` | `is_flagged` |

`business_products.business_id` is `NOT NULL` with a real foreign key
(`business_products_business_id_fkey`). This is the only true ownership edge in the
catalogue and it confirms the constraint that `business_id` is the Seller reference.

`business_products.supplier_id uuid` exists but has **no foreign key constraint**.

### 2.2 Discovery rows are public and purchasable — F-1, F-2

```
server/src/index.js:4245  const listProducts = async () => {
server/src/index.js:4252    queryProductsWithCategories("business_products", ...),
server/src/index.js:4253    queryProductsWithCategories("scraped_products", ...),
```

Both result sets are concatenated and returned. The public route applies no filter:

```
server/src/index.js:8627  if (request.method === "GET" && url.pathname === "/api/products") {
server/src/index.js:8628    const products = await listProducts();
```

`toPublicProduct` (`server/src/index.js:4237`) is a **field** allowlist, not a **row**
filter — it strips columns, never rows.

`mapScrapedProduct` sets the seller to null and treats an unknown stock status as
purchasable:

```
server/src/index.js:4182  in_stock: row.stock_status === "in_stock" || row.stock_status === null,
server/src/index.js:4184  business_id: null,
```

Ordering resolves against either table by id (`server/src/index.js:5338-5420`), selected
by an optional `product_source` discriminator that the checkout client never sends
(`src/pages/Checkout.tsx:355-364`).

**There is no adoption route.** The only `/adopt` endpoint in the tree is for categories
(`server/src/index.js:8656`). Nothing promotes a discovery row into a listing.

### 2.3 No publication model exists — F-3

Searched the live schema for every publication-shaped column across both catalogue
tables. Present: `in_stock`, `is_featured`, `is_flagged`, `needs_image_review`,
`needs_price_review`. Absent: `is_active`, `is_published`, `published_at`, `status`,
`visibility`, `approved_at`, `approved_by`, `review_state`.

The three review flags that do exist are **advisory only** — no route reads them as a
gate. `is_flagged` is surfaced to admin screens; it does not suppress public display.

### 2.4 Variants are display strings with prices inside them — F-4

Admin import flattens every scraped variant into one label per entry, appending the
price into the text, and writes the array to `flavors`:

```
src/components/admin/ProductFormDialog.tsx:375   // CRITICAL: Process ALL variants
src/components/admin/ProductFormDialog.tsx:399     label += ` - ₪${v.sale_price} (במקום ₪${v.price})`;
src/components/admin/ProductFormDialog.tsx:419     updates.flavors = variantLabels;
```

The same flattening exists in Quick Import (`src/pages/admin/AdminQuickImport.tsx:316-321`).

The shop then lets the customer pick one of those labels and sends it as free text:

```
src/pages/ProductDetailAws.tsx:257  const variantLabel = [...].filter(Boolean).join(" · ");
src/pages/ProductDetailAws.tsx:267  ...(variantLabel ? { variant: variantLabel } : {}),
src/pages/Shop.tsx:501              variant: selectedSize || undefined,
```

And the server prices the line from the **product**, never the variant:

```
server/src/index.js:5399  const price = source === "manual"
server/src/index.js:5400    ? toMoney(Number(row.sale_price) > 0 ? row.sale_price : row.price)
```

`requestedItem.variant` is carried to the snapshot (`server/src/index.js:5423`) but is
never used to select a price, a SKU or a stock level.

> **Verified consequence.** On a product whose variants differ in price, the amount
> charged is the base price regardless of which variant the customer selected. This is a
> present-tense pricing defect, not a future modelling concern. It is **not** exploitable
> for arbitrary pricing — the client price is ignored entirely (§2.5) — the charge is
> simply the wrong catalogue number.

### 2.5 Order history is already independent and server-priced — good news

Foreign keys on `order_items`: **only** `order_items.order_id → orders.id`. There is no
FK to `business_products` or `scraped_products`; `order_items.product_id` is a bare uuid.
Deleting a catalogue row cannot cascade into history.

`order_items` snapshots 14 columns including `product_name`, `product_image`, `price`,
`sku`, `weight`, `weight_unit`, `variant`, `size` and `product_source`.

Price resolution is server-authoritative:

* every line is re-read from the catalogue under `for share` (`server/src/index.js:5343`, `5352`);
* the client-submitted `price` field is **never read** by `resolveCatalogOrderItem`;
* `expected_total` is a *confirmation* check only — a mismatch throws 409
  (`server/src/index.js:5690-5697`), it never becomes the charged amount.

Verified by reading the whole `createOrder` path (`server/src/index.js:5641-5810`).

### 2.6 Two dead tables — F-5, proof

```
server/sql/0010_catalog_seed_and_import_helpers.sql:1   create table ... public.product_variations (
server/sql/0010_catalog_seed_and_import_helpers.sql:12  create table ... public.product_images (
```

Both foreign-key to the **discovery** table, not the listing table:

```
product_variations.product_id -> scraped_products.id
product_images.product_id     -> scraped_products.id
```

Repository-wide search for any read, write, join or DDL reference outside `server/sql/`
returns **nothing**:

```
grep -rniE "(from|into|update|join|table)\s+(public\.)?(product_images|product_variations)"
  --include=*.js --include=*.mjs --include=*.ts --include=*.tsx .
→ no matches
```

The only textual hits for `product_variations` in code are a scraper CSS selector,
`$("[data-product_variations]")` (`server/src/productIntel.js:353`, `:481`), which reads a
supplier's HTML attribute and has nothing to do with the table.

`product_images` has **zero** occurrences in any source file.

**Conclusion: both tables are dead.** This is proven for *code*. Whether they hold rows in
production is unknown — see §13.

### 2.7 `defaultBusinessId` — CQ-07 evidence

```
server/src/index.js:88    const defaultBusinessId = process.env.DEFAULT_BUSINESS_ID || "cf941cc4-e1d1-4d7c-8122-a5df81a1e53c";
server/src/index.js:4309  const ensureDefaultBusinessProfile = async () => { ... 'Mipo Shop' ... }
server/src/index.js:4436  const businessId = body.business_id || await ensureDefaultBusinessProfile();
src/lib/productStore.ts:1 export const DEFAULT_BUSINESS_ID = import.meta.env.VITE_DEFAULT_BUSINESS_ID || "cf941cc4-...";
```

The same hardcoded UUID is the fallback on both server and client. `createProduct` uses it
whenever the caller omits `business_id` — and **no caller in the tree sends one**. Quick
Import does not (`src/pages/admin/AdminQuickImport.tsx:295-328`).

Therefore every product created through any current path is owned by `cf941cc4-…`,
whether or not it is genuinely a Mipo Shop product.

### 2.8 `supplier_id` — audit result

Seven references, all benign:

```
src/lib/mipoApi.ts:51                      type field only
src/pages/admin/AdminQuickImport.tsx:311   supplier_id: selectedSupplierId || null
server/src/index.js:3971, 4104, 4490       column mapping / payload passthrough
server/test/catalogRecommendations.test.js:75,81  asserts supplier_id is NOT exposed publicly
```

`supplier_id` is **never** used for ownership, permission or isolation anywhere. The
existing test at `catalogRecommendations.test.js:81` actively asserts it stays out of
public responses. The constraint is already satisfied.

Note: the supplier picker that writes it is dead UI —
`const [suppliers] = useState<any[]>([])` (`src/pages/admin/AdminQuickImport.tsx:161`) has
no setter, so the list is permanently empty and `selectedSupplierId` is always `""`.
`supplier_id` is therefore always written as `null` by the only screen that sets it.

### 2.9 `source_record_id`

**Zero occurrences repository-wide**, including migrations. It was proposed in earlier
commerce design notes but never implemented. There is consequently no global uniqueness
constraint to remove, and none must be added (constraint honoured by default).

### 2.10 Carts — CQ-08 evidence

**There is no cart table.** The live schema contains no `carts`, `cart_items` or
equivalent. The cart is entirely client-side:

```
src/contexts/CartContext.tsx:48  localStorage.getItem("mipo-cart")
src/contexts/CartContext.tsx:69  localStorage.setItem("mipo-cart", JSON.stringify(items))
```

The persisted line shape (`src/contexts/CartContext.tsx:4-15`):

```ts
interface CartItem {
  id: string;          // JSON.stringify([productId, variant, size]) — line identity
  productId: string;
  name: string; price: number; image: string; quantity: number;
  variant?: string;    // free text
  size?: string;       // free text
}
```

No `seller_id`, no `variant_id`, no `sku`, no `product_source`.

A legacy-shape migration already exists and works: `getLegacyProductId`
(`src/contexts/CartContext.tsx:34-39`) recovers `productId` from an older
`"{productId}-{size}"` line id, and every stored line is re-keyed on load
(`:52-61`). **This is the precedent to follow** for the next migration.

### 2.11 Image handling

`business_products` carries `image_url text NOT NULL`, `images text[]`,
`image_source_url`, `image_adopted_at`, `needs_image_review`. Adoption downloads the bytes
and rewrites the URL to `/uploads/...` (`server/src/index.js:4373-4416`), keeping the
supplier origin in `image_source_url` and stamping `image_adopted_at`.

`withoutSupplierOrigin` (`server/src/index.js:4350`) strips both from public responses.

So **adopted** is already modelled (`image_adopted_at is not null`). **Approved** is not —
`needs_image_review` is advisory and gates nothing. Variant-level images do not exist.

---

## 3. Domain model

```
business_profiles ──1:N── business_products ──1:N── product_variants
    (Seller)                (Seller Listing)          (sellable unit)
                                  │
                                  │ product_adoptions (N:M, price-locked)
                                  ▼
                          scraped_products
                            (Discovery)

orders ──1:N── order_items   ← no FK to anything above; snapshot only
```

## 4. Product vs Discovery Product vs Seller Listing vs Variant vs Inventory

| Concept | Table | Owner | Sellable | Mutable after order |
|---|---|---|---|---|
| **Discovery Product** | `scraped_products` | nobody (`business_id` does not exist) | **never** | yes, freely |
| **Seller Listing** | `business_products` | `business_id` → Seller | only when published | yes |
| **Variant** | `product_variants` *(new)* | inherits listing's `business_id` | yes — this is the unit that carries price | yes |
| **Inventory** | columns on `product_variants` | inherits | n/a | yes |
| **Canonical Product** | *not created* | — | — | — |
| **Order line** | `order_items` | the order | n/a | **never** — immutable snapshot |

**Inventory is not a separate table for MVP.** It is `stock_quantity` +
`stock_status` on `product_variants`. A separate inventory ledger is justified only by
multi-location stock or reservation semantics, neither of which exists in this codebase.

---

## 5. Final decisions, CQ-01 … CQ-09

### CQ-01 — Product abstraction → **No canonical Product table for MVP**

`business_products` already is the Seller-owned commercial listing, with a real
`NOT NULL` foreign key to `business_profiles`. A canonical Product would be a fourth
abstraction alongside discovery row, listing and variant, and **nothing in the tree would
read it**: there is no cross-seller price comparison screen, no "other sellers offer this"
component, no catalogue-wide dedup requirement.

The stated constraint — *"do not introduce a competing Product abstraction unless the
audit proves it is necessary"* — is not met. The audit proves the opposite: the missing
pieces are ownership on discovery rows (solved by *not* selling them) and publication
state (solved by columns), neither of which a canonical Product provides.

**Decision: keep `business_products` as the listing. Revisit only when a screen needs to
show one product offered by several sellers.**

### CQ-02 — Offer abstraction → **No separate Offer table**

A Seller Offer is `(seller, product, price, availability)`. In this schema that tuple is
exactly `business_products` (seller + content + price) joined to `product_variants`
(per-unit price and availability). Adding an `offers` table would duplicate
`business_products` one-to-one.

Ambiguity is avoided by naming rather than by structure: `business_products` **is** the
offer. The adoption link (§6) records *where the content came from*; it never implies a
shared commercial object. Two Sellers adopting the same discovery row get two independent
`business_products` rows with independent, locked prices — which is precisely CD-02 /
CQ-12 / CQ-14 as already accepted.

### CQ-03 — Variant identity

**Minimum stable identity:** `product_variants.id uuid` (internal, generated). Nothing
else is stable enough to be the key.

| Attribute | Role | Uniqueness |
|---|---|---|
| `id` | the identity. Referenced by carts and snapshotted into orders. | PK |
| `sku` | seller-facing code, **optional** | `UNIQUE (business_product_id, sku) WHERE sku IS NOT NULL` |
| `barcode` (GTIN/EAN) | cross-seller matching signal, **optional, not an identity** | **no unique constraint** — the same barcode legitimately appears under many Sellers |
| `source_variant_key` | text key from the discovery payload, for re-import matching | `UNIQUE (business_product_id, source_variant_key) WHERE NOT NULL` |
| seller scope | **implicit** via `business_product_id` → `business_products.business_id` | — |

Every uniqueness rule is scoped to the listing, therefore to the Seller. **No global
uniqueness on any source or barcode field**, per the standing constraint.

**Multiple dimensions** are held in `options jsonb` as a flat map:

| Example | `options` | `label` (derived, display only) |
|---|---|---|
| size + color | `{"size":"L","color":"אדום"}` | `L · אדום` |
| flavor + weight | `{"flavor":"עוף","weight":"3kg"}` | `עוף · 3 ק"ג` |
| package size + flavor | `{"package":"6 יח׳","flavor":"בקר"}` | `6 יח׳ · בקר` |

**Legacy products without variants.** Every `business_products` row gets exactly one
**default variant** at migration: `options = '{}'`, `is_default = true`, price and SKU
copied from the parent. This makes "listing without variants" disappear as a special case
— every sellable thing is a variant — while changing nothing a customer sees.

### CQ-04 — Variant storage → **hybrid (option 4)**

| Option | Verdict |
|---|---|
| 1 · single free-text field | **This is today's model** (`flavors text[]` with prices inside the string). It is the direct cause of F-4. Reject. |
| 2 · pure JSON attributes | Cannot be indexed or constrained for the things the system prices and sorts on. Reject as the whole model. |
| 3 · fully normalized attribute rows (EAV) | Correct but heavy: three tables, a join per render, and no consumer needs attribute-level querying yet. Reject for MVP. |
| 4 · **hybrid** | **Accept.** Typed columns for what the system *acts on* — `price`, `sale_price`, `sku`, `stock_status`, `stock_quantity`, `weight`, `weight_unit`, `image_url`. `options jsonb` for the open dimension set. |

**Migration complexity: low.** One new table, one backfill that creates a default variant
per existing listing, and no destructive change — `flavors` stays in place as a display
fallback until the frontend is cut over. GIN index on `options` only if a dimension filter
is actually built.

### CQ-05 — Images → **reuse nothing; `product_images` is dead (§2.6)**

`product_images` cannot be reused as-is: it foreign-keys to `scraped_products`, has no
seller scope, no approval state, no variant link, and no code reads it. Recommendation:
**leave it untouched for now** (dropping it is a separate, evidence-gated task — §10) and
introduce a purpose-built table.

Required distinctions:

| State | Meaning | Representation |
|---|---|---|
| **source image** | the supplier's URL. Bytes are not ours. | `source_url` |
| **adopted image** | bytes downloaded, normalized, stored by us | `storage_path` + `adopted_at IS NOT NULL` |
| **approved image** | a human accepted it for public display | `approved_at IS NOT NULL` + `approved_by` |
| **Product-level image** | belongs to the listing | `variant_id IS NULL` |
| **Variant-level image** | belongs to one variant | `variant_id IS NOT NULL` |

These are **three independent facts**, not one status enum: an image can be adopted but
not approved, and approval must survive re-adoption of the same bytes.

**Fallback priority for display** (first match wins):

1. approved variant image for the selected variant, lowest `display_order`
2. approved product-level image, lowest `display_order`
3. approved default-variant image
4. `/placeholder.svg`

**A non-approved image is never displayed publicly** — it does not appear at any rung.
Admin screens see all rungs plus the unapproved ones, clearly marked.

### CQ-06 — Publication → two independent axes

**Axis A — content readiness** (`content_state`): `draft → in_review → approved | rejected`
**Axis B — commercial visibility** (`visibility`): `unlisted | listed`

Valid and invalid combinations:

| `content_state` | `visibility` | Publicly visible? | Valid? |
|---|---|---|---|
| draft | unlisted | no | ✅ the initial state |
| draft | listed | no | ✅ Seller pre-arms visibility; publication waits on approval |
| in_review | unlisted | no | ✅ |
| in_review | listed | no | ✅ same — armed, awaiting approval |
| **approved** | **listed** | **yes** | ✅ **the only publicly visible combination** |
| approved | unlisted | no | ✅ approved content the Seller has withdrawn |
| rejected | unlisted | no | ✅ |
| rejected | listed | no | ✅ *stored*, never visible — arming does not survive rejection into display |

There are **no invalid combinations**; that is the point of making the axes independent.
The gate is a single predicate, and it is the only thing a public query needs:

```sql
WHERE content_state = 'approved' AND visibility = 'listed'
```

Additionally required for a listing to be publicly visible, per the constraints: **at
least one approved image** (CQ-05). Expressed as a gate, not as a state:

```sql
AND EXISTS (SELECT 1 FROM product_media m
            WHERE m.business_product_id = p.id AND m.approved_at IS NOT NULL)
```

**Exiting `in_review`:** only an admin with the products-approve permission moves
`in_review → approved` or `in_review → rejected`. Both transitions record
`reviewed_by`, `reviewed_at`, and `rejected` additionally requires `review_note`
(non-empty) so the Seller is told why.

**Rejected content is not deleted.** The row keeps its content and its rejection note.
A Seller edits and resubmits, which moves `rejected → in_review` and clears
`reviewed_at`/`reviewed_by` while **retaining the previous note in a history row**. Any
content edit to an `approved` listing drops it back to `draft` — otherwise approval would
be a one-time gate that can be edited around after the fact.

### CQ-07 — `defaultBusinessId` classification

Every product in the system is currently owned by `cf941cc4-e1d1-4d7c-8122-a5df81a1e53c`
because no caller supplies `business_id` (§2.7). The schema **cannot presently
distinguish** genuine Mipo Shop stock from fallback ownership — no column records how
ownership was assigned.

Classification, to be resolved by evidence, not by guessing:

| Class | How to identify | Action |
|---|---|---|
| **A · truly Mipo Shop-owned** | created through admin product creation with no supplier origin: `source_url IS NULL AND image_source_url IS NULL` | keep `business_id`, mark `ownership_origin = 'explicit'` |
| **B · synthetic fallback** | created by import/scrape adoption: `source_url IS NOT NULL` | keep `business_id` **unchanged**, mark `ownership_origin = 'fallback'`, require review before publication |
| **C · manual review required** | ambiguous — supplier origin present but edited by hand, or `supplier_id IS NOT NULL` | mark `ownership_origin = 'unverified'`, **block from publication** until a human assigns |
| **D · not a listing at all** | rows in `scraped_products` | never gain ownership; they stop being sellable (F-1 fix) |

**Nothing is reassigned to another Seller automatically.** The migration adds a column
that *records what we know*; it never moves a row between Sellers. Reassignment is a
deliberate admin action, audited.

**Must be blocked before migration:**

1. New `business_products` rows created **without an explicit `business_id`** — the
   fallback at `server/src/index.js:4436` must become an error for any caller that can
   supply one, or at minimum stamp `ownership_origin = 'fallback'`.
2. Publication of any class **B** or **C** row.
3. Any automated job that would bulk-assign ownership.

**[ASSUMPTION]** that class A/B/C can be separated by `source_url`/`image_source_url`.
This is a hypothesis derived from how the columns are written
(`server/src/index.js:4373-4416`); it **requires production validation** (§13) before a
migration relies on it.

### CQ-08 — Legacy carts

Target `CartItem` — every new field optional, so an old stored cart stays valid:

```ts
interface CartItem {
  id: string;                    // line identity, now includes variantId when known
  productId: string;             // unchanged — always present
  sellerId?: string;             // NEW
  businessProductId?: string;    // NEW — same as productId for listing-sourced lines
  variantId?: string;            // NEW — the sellable unit
  sku?: string;                  // NEW
  quantity: number;
  name: string; price: number; image: string;
  variant?: string;              // KEPT as display text / legacy carrier
  size?: string;                 // KEPT
}
```

**Ambiguous legacy line handling.** On load, a stored line with no `variantId` is
resolved against the catalogue:

| Situation | Behaviour |
|---|---|
| listing has exactly one variant (the default) | bind `variantId` silently — no user-visible change |
| listing has several variants and the stored `variant`/`size` text matches exactly one | bind it, and **re-read the price from that variant** |
| listing has several variants and the text matches none or several | **do not invent a variant.** Keep the line, mark it `needsReselection`, show the variant picker on the cart row, and block checkout for that line only |
| listing no longer exists or is unpublished | mark the line unavailable, keep it visible with an explanation, exclude from totals |

This follows the precedent already in the file (`src/contexts/CartContext.tsx:34-61`),
which re-keys legacy lines on load without discarding them.

**No server cart is introduced.** There is no cart table today (§2.10) and adding one is
not needed to model variants. That is a separate decision about cross-device carts.

### CQ-09 — Orders → **already compliant; additive snapshot only**

Verified (§2.5): no FK from `order_items` to any catalogue table; price is read from the
database under `for share`; the client price is never consulted; `expected_total` only
triggers a 409 on drift. **Order history is independent and server-authoritative today.**

Fields to add to the `order_items` snapshot:

| Column | Why |
|---|---|
| `seller_id uuid` | multi-seller history, payouts, per-seller order views. Bare uuid — **no FK**. |
| `business_product_id uuid` | which listing was bought, without an FK |
| `variant_id uuid` | which sellable unit, without an FK |
| `variant_options jsonb` | the resolved options map, **snapshotted** — so a later rename of "L" does not rewrite history |
| `unit_price numeric` | the variant price actually charged, explicitly named |

`variant` and `size` remain as the legacy free-text snapshot and are never removed.

**Required behavioural change:** `resolveCatalogOrderItem` must price from the **variant**,
not the product (fixes F-4), and must reject a line whose listing is not
`approved + listed` (fixes F-1). Both are implementation, not migration.

---

## 6. Proposed target schema

> Not implemented. No migration file written. Names are proposals.

```sql
-- New: the sellable unit.
create table public.product_variants (
  id                  uuid primary key default gen_random_uuid(),
  business_product_id uuid not null references public.business_products(id) on delete cascade,
  options             jsonb not null default '{}'::jsonb,
  label               text,
  sku                 text,
  barcode             text,                      -- deliberately NOT unique
  source_variant_key  text,
  price               numeric not null,
  sale_price          numeric,
  stock_status        text not null default 'in_stock',
  stock_quantity      integer,
  weight              numeric,
  weight_unit         text,
  is_default          boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create unique index on public.product_variants (business_product_id, sku)
  where sku is not null;
create unique index on public.product_variants (business_product_id, source_variant_key)
  where source_variant_key is not null;
create unique index on public.product_variants (business_product_id)
  where is_default;                              -- exactly one default per listing

-- New: images with three independent facts.
create table public.product_media (
  id                  uuid primary key default gen_random_uuid(),
  business_product_id uuid not null references public.business_products(id) on delete cascade,
  variant_id          uuid references public.product_variants(id) on delete cascade,
  source_url          text,
  storage_path        text,
  adopted_at          timestamptz,
  approved_at         timestamptz,
  approved_by         uuid,
  display_order       integer not null default 0,
  created_at          timestamptz not null default now()
);

-- New: adoption link. N:M on purpose - many Sellers may adopt one discovery row.
create table public.product_adoptions (
  id                  uuid primary key default gen_random_uuid(),
  business_product_id uuid not null references public.business_products(id) on delete cascade,
  scraped_product_id  uuid not null references public.scraped_products(id) on delete set null,
  adopted_by          uuid,
  adopted_at          timestamptz not null default now(),
  adopted_price       numeric not null,          -- LOCKED. Never auto-synced.
  source_price_at_adoption numeric
);
create unique index on public.product_adoptions (business_product_id);
-- NOTE: deliberately NO unique index on scraped_product_id.

-- Altered: publication axes + ownership provenance.
alter table public.business_products
  add column content_state    text not null default 'draft',
  add column visibility       text not null default 'unlisted',
  add column reviewed_by      uuid,
  add column reviewed_at      timestamptz,
  add column review_note      text,
  add column ownership_origin text not null default 'unverified',
  add column published_at     timestamptz;

-- Altered: richer order snapshot. No foreign keys, by design.
alter table public.order_items
  add column seller_id           uuid,
  add column business_product_id uuid,
  add column variant_id          uuid,
  add column variant_options     jsonb,
  add column unit_price          numeric;
```

## 7. Proposed state machines

**Content readiness**

```
      ┌──────────────── edit ─────────────────┐
      ▼                                        │
   draft ──submit──> in_review ──approve──> approved
      ▲                   │
      │                   └──reject──> rejected ──edit+resubmit──> in_review
      └───────────────────────────────────────┘
```

* `approved → draft` on any content edit (approval must not be editable around).
* `rejected` retains `review_note`; resubmission archives it to history.
* Only `in_review → approved|rejected` requires the approve permission.

**Commercial visibility** — independent, Seller-controlled, two states:

```
unlisted ⇄ listed
```

**Publicly visible** = `content_state = 'approved' AND visibility = 'listed' AND has ≥1 approved image`.

**Discovery row** — `scraped_products` has no publication state at all. Its only exit is
adoption, which creates a *new* `business_products` row; the discovery row itself never
becomes sellable.

## 8. Legacy compatibility strategy

| Surface | Guarantee |
|---|---|
| Stored carts | every new field optional; old lines load, re-key and resolve (§CQ-08). Unresolvable lines are kept and flagged, never silently dropped or guessed. |
| `flavors text[]` | **kept**. Still written, still read as display fallback until the frontend is cut over. Removal is a later task. |
| `order_items.variant` / `.size` | **kept forever**. Free text, never migrated. |
| Listings with no variants | get exactly one default variant; nothing a customer sees changes. |
| `product_source` discriminator | kept; the `scraped` branch of `resolveCatalogOrderItem` becomes a hard rejection rather than being deleted, so old clients get a clear 409 instead of a 500. |
| `supplier_id` | untouched. Not ownership, already proven (§2.8). |
| `product_images`, `product_variations` | untouched in this design. Dropping them is separate and evidence-gated. |

## 9. Order-history compatibility guarantees

1. **No foreign key is added from `order_items` to any catalogue table.** Verified absent
   today (§2.5) and must stay absent.
2. All new order columns are **nullable** — historical rows keep NULLs and stay readable.
3. `variant_options` is a **snapshot**, not a reference. Renaming an option later cannot
   rewrite a past order.
4. Deleting or unpublishing a listing or variant must never alter an existing order line.
5. Price on a historical line is never recomputed. `unit_price` is additive and
   explanatory; `price` keeps its present meaning.

## 10. Data migration risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R-1 | Class A/B/C ownership split (§CQ-07) rests on an **unvalidated assumption** about `source_url` | **high** | run the §13 queries against production first; do not migrate until the split is confirmed |
| R-2 | Removing scraped products from the public feed **shrinks the visible catalogue**, possibly to near-zero | **high** | measure the split first (§13 Q1); stage the change behind an adoption backfill |
| R-3 | Default-variant backfill on a listing whose `flavors` implies several real variants creates one variant where several belong | medium | backfill the default only; parse `flavors` into real variants as a separate, reviewable job |
| R-4 | In-flight carts during deploy hold lines with no `variantId` | medium | resolution is already lazy and client-side (§CQ-08); no coordinated deploy needed |
| R-5 | Dropping `product_images`/`product_variations` could destroy rows that exist in production even though no code reads them | medium | **do not drop in this migration.** Count rows first (§13 Q4) |
| R-6 | `content_state` defaulting to `draft` unpublishes the entire live catalogue at once | **high** | backfill existing rows to `approved`+`listed` where they are currently visible, *then* enforce; never let the default decide |
| R-7 | Variant pricing fix (F-4) changes charged amounts for multi-variant products | medium | it corrects a present defect, but it **will** change prices customers see; needs an explicit business sign-off and an announcement |

## 11. Rollout sequence

Each step is independently deployable and reversible.

| Step | Change | Gate |
|---|---|---|
| **0** | Run the §13 production validation queries | **blocks everything below** |
| **1** | Additive migration: `product_variants`, `product_media`, `product_adoptions`, new columns. No behaviour change. | migration tests |
| **2** | Backfill: one default variant per listing; `content_state`/`visibility` set so **the currently-visible catalogue stays visible** (R-6); `ownership_origin` from the validated split | row counts match pre-migration |
| **3** | Server reads variants for pricing; `resolveCatalogOrderItem` prices from the variant (**fixes F-4**) | unit + smoke tests |
| **4** | Publication gate applied to public queries (**fixes F-3**) | verify the catalogue does not disappear |
| **5** | Adoption route; `scraped_products` removed from the public feed and from order resolution (**fixes F-1, F-2**) | requires step 2 backfill to have produced listings |
| **6** | Variant-aware cart and product page | legacy cart resolution tested |
| **7** | Image approval gate on public display (CQ-05) | requires approved images to exist first |
| **8** | *Separate task:* drop dead tables, retire `flavors` | evidence from step 0 |

**Steps 4, 5 and 7 each remove things from public view. None may ship before its
backfill.**

## 12. Explicit non-goals

* No canonical Product table (CQ-01).
* No Offer table (CQ-02).
* No server-side cart; the cart stays in `localStorage`.
* No inventory ledger, no reservations, no multi-location stock.
* No cross-seller product matching, dedup or "compare sellers" UI.
* No automatic price synchronisation from a source — **adoption price stays locked**.
* No global uniqueness on any source or barcode field.
* No reassignment of existing rows between Sellers.
* No change to how `supplier_id` works; it remains non-ownership.
* Not dropping `product_images` / `product_variations` in this work.
* No payment, checkout-flow or shipping changes.

## 13. Open risks requiring production validation

**No production access exists in this session.** Nothing below has been run against
production, and no result is claimed. These must be answered before step 1.

| # | Query | Decides |
|---|---|---|
| **Q1** | `select count(*) from business_products;` and `select count(*) from scraped_products;` | R-2 — how much of the catalogue disappears when discovery rows stop being public |
| **Q2** | `select count(*) filter (where source_url is null and image_source_url is null) as class_a, count(*) filter (where source_url is not null) as class_b, count(*) filter (where supplier_id is not null) as class_c from business_products;` | CQ-07 — whether the ownership split is real (R-1) |
| **Q3** | `select count(distinct business_id) from business_products;` | whether any Seller other than `cf941cc4-…` exists yet |
| **Q4** | `select count(*) from product_images;` and `select count(*) from product_variations;` | R-5 — whether the dead tables hold data |
| **Q5** | `select count(*) from business_products where cardinality(flavors) > 1;` | R-3/R-7 — how many listings have real multi-variant pricing exposure |
| **Q6** | `select count(*) from order_items where product_source = 'scraped';` | how much order history points at discovery rows |
| **Q7** | `select count(*) from business_products where image_adopted_at is null;` | how many listings would fail the approved-image gate (R-6, step 7) |

Additional open risks, independent of data:

* **Variant parsing from `flavors` is lossy.** The price was embedded in a display string
  (§2.4); recovering structured variants from those strings is a heuristic, not a
  migration. It needs human review per product.
* **[ASSUMPTION]** that `business_products` is the only path by which a Seller lists.
  Verified for the current tree; a future Seller-facing API would need the same gates.
* **Approval workload** — step 4 implies somebody reviews the existing catalogue. That
  capacity is a business question this document cannot answer.

## 14. Decision table

| # | Decision | Rationale | Affected tables | Affected routes | Migration impact | Priority |
|---|---|---|---|---|---|---|
| **D-01** | No canonical Product table | No consumer; would be a 4th abstraction | — | — | none | — |
| **D-02** | No Offer table; `business_products` **is** the offer | Already carries seller + price; a 1:1 duplicate | — | — | none | — |
| **D-03** | New `product_variants`; variant is the sellable unit | Fixes F-4; every price/stock decision needs a unit | `product_variants` | product read/write, order resolution | additive + backfill | **P0** |
| **D-04** | Hybrid variant storage (typed columns + `options jsonb`) | Prices and stock must be indexable; dimensions must stay open | `product_variants` | — | additive | **P0** |
| **D-05** | Variant identity = internal uuid; SKU/barcode/source key optional, **scoped to the listing** | No global uniqueness, per constraint | `product_variants` | — | additive | **P0** |
| **D-06** | One default variant per legacy listing | Removes "no variants" as a special case | `product_variants` | — | backfill | **P0** |
| **D-07** | Two independent publication axes + approved-image gate | Constraint requires both content approval and commercial visibility | `business_products` | `GET /api/products`, product detail | additive + **careful backfill (R-6)** | **P0** |
| **D-08** | `scraped_products` becomes non-sellable and non-public | Fixes F-1/F-2; the core constraint | `scraped_products` | `GET /api/products`, `POST /api/orders` | behaviour, not schema | **P0** |
| **D-09** | Explicit adoption via `product_adoptions`, price locked, **no unique on source** | CD-02 / CQ-12 / CQ-14 already accepted | `product_adoptions` | new adopt route | additive | **P1** |
| **D-10** | New `product_media` with adopted/approved as separate facts | `product_images` is dead and wrongly keyed | `product_media` | image adoption, product read | additive | **P1** |
| **D-11** | `ownership_origin` recorded, **never auto-reassigned** | Makes fallback ownership visible without guessing | `business_products` | product create | additive + validated backfill | **P1** |
| **D-12** | Cart gains optional seller/variant/sku; ambiguous lines flagged, never guessed | Follows existing legacy-migration precedent | none (localStorage) | — | none | **P1** |
| **D-13** | `order_items` gains nullable snapshot columns, **still no FK** | Preserves history independence | `order_items` | order create | additive | **P1** |
| **D-14** | Price from variant; reject unpublished lines at order time | Fixes the live pricing defect F-4 | — | `POST /api/orders` | none | **P0** |
| **D-15** | Dead tables kept for now, dropped only on evidence | Row counts unknown (R-5) | — | — | none | **P2** |

---

## Appendix — verification performed

| Check | Result |
|---|---|
| Focused tests (catalog, product intel, image pipeline, image fetch, url safety, shipping compat, cardcom) | **71/71 pass** |
| Full server unit suite | **283/283 pass** |
| `npm run typecheck` | pass |
| `npm run lint` | pass |
| `npm run build` | pass (`built in 214ms`, 191 precache entries) |
| Migrations | **not run** — per instruction |
| Production data | **not accessed** — no production access in this session |
| Code changed | **none** |
