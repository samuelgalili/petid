# Legacy Catalog Isolation and Ownership Review

**Status:** design only · nothing implemented · no migration · no production change
**Date:** 2026-09-14
**Branch:** `claude/mifo-project-oq44tl`

**Depends on:** [`FINAL-DESIGN-DECISION.md`](./FINAL-DESIGN-DECISION.md) ·
[`DECISIONS.md`](./DECISIONS.md) ·
[`PRODUCTION-VALIDATION-Q1-Q7.md`](./PRODUCTION-VALIDATION-Q1-Q7.md)

> **Premise, carried forward from the blocked validation.** Legacy ownership is not
> merely unmeasured — it is **unrecoverable**. `server/src/index.js:4436` assigns a
> fallback `business_id` without recording that it did so, and a fallback row is
> byte-identical to a deliberate one. No query resolves this. Therefore this design
> **never infers ownership** and **never assigns it automatically**. Every legacy record
> starts and stays `unresolved` until a human says otherwise.

---

## 1. Legacy catalog exposure

### 1.1 The shape of the problem — one server chokepoint, wide client fan-out

Every public surface that shows a scraped-backed product is fed by **one function and one
endpoint**:

```
listProducts()                    server/src/index.js:4245-4258
   └─ GET /api/products           server/src/index.js:8627-8635
        └─ getShopProducts()      src/lib/mipoApi.ts:1464-1467
             └─ 8 client surfaces (§1.3)
```

This is the single most useful fact in this document: **isolation does not require
touching eight screens.** It requires a row filter at one chokepoint, plus three
independent paths that bypass it (product detail, checkout, analytics).

### 1.2 Server paths

| # | Path | File · line | Function / route | Independently disableable? | User impact if disabled |
|---|---|---|---|---|---|
| **S-1** | public catalogue list | `server/src/index.js:4245-4258` | `listProducts()` | ✅ **yes** — add a row filter; the two table reads are already separate calls | **Highest-impact gate in the system.** Every client surface in §1.3 shrinks at once. Magnitude unknown — this is Q1. |
| **S-2** | public catalogue endpoint | `server/src/index.js:8627-8635` | `GET /api/products` | ✅ yes — independently of S-1 | same as S-1; prefer gating S-1 so admin and public share one rule |
| **S-3** | public product detail | `server/src/index.js:4525-4545`, route `:8735-8745` | `fetchPublicProductById()` → `GET /api/products/:id` | ✅ **yes, and must be done separately** — it does **not** go through `listProducts` | a direct/shared/bookmarked link to a scraped product 404s. Breaks deep links and any indexed URL. |
| **S-4** | checkout acceptance | `server/src/index.js:5320-5330` | `normalizeRequestedOrderItems()` accepts `product_source='scraped'` | ✅ yes | a client sending a scraped id gets a clean 4xx instead of an order |
| **S-5** | checkout resolution | `server/src/index.js:5349-5420` | `resolveCatalogOrderItem()` → `findScraped()` branch | ✅ yes — the branch can reject instead of resolve | **orders for scraped products stop.** Revenue impact unknown (needs Q1 + Q6). |
| **S-6** | admin analytics | `server/src/index.js:6028-6082`, route `:8448` | `listAdminAnalytics()` calls `listProducts()` at `:6079` | ⚠️ **couples to S-1** | if S-1 filters rows, **admin product counts silently drop too**. Analytics must read unfiltered — see the warning below. |
| **S-7** | admin catalogue read | `server/src/index.js:8627-8635` | same route, `isAdminRequest` branch | ⚠️ couples to S-1 | admins would lose sight of exactly the rows they must review |
| **S-8** | admin product edit / delete | `server/src/index.js:4556-4575`, `:4621-4645` | `updateProductRecord`, delete paths — both branch on `scraped_products` | ✅ yes | admin can no longer edit scraped rows; **must stay enabled** for the review workflow |

> ### ⚠️ The coupling that will bite
>
> S-6 and S-7 share `listProducts()` with S-1. A naive row filter would hide legacy rows
> **from the admins who have to review them** and would quietly restate every analytics
> number. **The gate must be a parameter of `listProducts`, not a hardcoded `WHERE`** —
> public callers pass the filter, admin and analytics callers do not.

### 1.3 Client surfaces — all inherit from S-1/S-2

| # | Surface | File · line | Path |
|---|---|---|---|
| C-1 | Shop grid + search + filters | `src/pages/Shop.tsx:243`, search at `:375`, filters `:360-392` | `getShopProducts()` |
| C-2 | Explore | `src/pages/Explore.tsx:422` | `getShopProducts()` |
| C-3 | Favorites | `src/pages/Favorites.tsx:34` | `getShopProducts()` |
| C-4 | Smart recommendations (shop) | `src/components/shop/SmartRecommendations.tsx:150` | `getShopProducts()` |
| C-5 | Medical pharmacy | `src/components/shop/MedicalPharmacy.tsx:54` | `getShopProducts()` |
| C-6 | Feed product cards | `src/components/feed/FeedProductCards.tsx:44` | `getShopProducts()` |
| C-7 | Client-side recommendation engine | `src/lib/productRecommendations.ts:83`, `:99` | `getShopProducts()` |
| C-8 | Pet shop / pet essentials | `src/components/profile/PetShopView.tsx:46`, `PetEssentials.tsx:53` | → `fetchRecommendedProducts()` → `getShopProducts()` |

**Search is client-side** (`src/pages/Shop.tsx:375`) over the same array — it has no
independent data path and needs no separate gate.

### 1.4 Paths that are **already clean** — verified, no gate needed

| Path | File · line | Why it is clean |
|---|---|---|
| **AI catalogue recommendations** | `server/src/catalogRecommendations.js:80` | queries `public.business_products` **only**. The module comment at `:16` states the exclusion explicitly: *"Only business_products is searched. scraped_products holds raw import rows."* |
| **Product intel catalogue lookup** | `server/src/productIntel.js:984` | `business_products` only |
| **Order history** | `server/src/index.js:5625-5639` | reads `order_items` only, no catalogue join — proven independent, including empirically |

### 1.5 Repeat purchase — **structurally impossible for scraped rows today**

Three independent facts, each verified:

1. `auto_restock` and `restock_interval_days` exist on `business_products`
   (`server/src/index.js:4486-4487`) and **do not exist as columns on `scraped_products`**
   — confirmed against the live 54-column schema.
2. `order_type: 'auto-restock'` (`server/src/index.js:5656-5660`) is a **label written onto
   an order**. It does not schedule anything.
3. **No scheduler exists.** The only recurring job machinery in the server is
   `schedulePetCharacterJob` (`server/src/index.js:2526`), which is unrelated.

**Conclusion:** repeat purchase is not a legacy exposure path. It needs a *forward* gate
(so it is never wired to unresolved records), not a remediation.

### 1.6 Cart — accepts anything, validates nothing

`src/contexts/CartContext.tsx:78-106` stores whatever it is handed, into `localStorage`.
There is no server cart, no catalogue validation, and no seller field. A cart line
therefore **survives any server-side gate we add** and will still be sitting in customers'
browsers pointing at rows that have become unpurchasable.

**This is the one exposure that cannot be closed server-side**, and it is the reason
gate G-4 (§5) exists.

---

## 2. Ownership review workflow

### 2.1 State machine

```
                    ┌────────────────────────────────────────┐
                    │                                        │
   unresolved ──claim──> ownership_review ──approve──> verified_mipo_shop
   (every legacy                 │                           │
    record starts        approve │                    verified_external_seller
    here, always)                ▼                           │
                             rejected <────────────────────── (revoke)
```

`unresolved` is **not** a null state. It is the asserted, recorded fact that ownership is
unknown, and it is the default for every pre-existing row.

### 2.2 Roles and rules

| Question | Answer |
|---|---|
| **Reviewer role** | a new admin permission, `PRODUCTS_OWNERSHIP_REVIEW`, modelled on the existing `ADMIN_PERMISSIONS` pattern (`server/src/index.js:8748`, `:8785`). **Deliberately separate from `PRODUCTS_UPDATE`** — being able to edit a product must not confer the power to assign it a Seller. |
| **Who may change ownership** | only a holder of `PRODUCTS_OWNERSHIP_REVIEW`. **No automated process may ever write this field** — not import, not adoption, not backfill, not a repair script. |
| **Evidence required — `verified_mipo_shop`** | a named person asserts Mipo Shop stocks and sells this item. A supplier URL is **not** evidence. Purchase history is **not** evidence. |
| **Evidence required — `verified_external_seller`** | a `business_profiles` row that exists **and** a stated commercial basis (contract, onboarding record, agreement reference). The target Seller must be named explicitly by the reviewer; it is never derived. |
| **Approval action** | writes `ownership_state`, `ownership_reviewed_by`, `ownership_reviewed_at`, `ownership_evidence` (free text, **required, non-empty**). For `verified_external_seller` it also writes the chosen `business_id`. |
| **Rejection action** | `rejected` — the record is not a sellable listing (junk import, duplicate, discontinued). Requires a non-empty reason. **The row is never deleted.** |
| **Audit trail** | every transition writes an `admin_audit_log` row (the table exists, 11 columns) via the established `recordAdminAudit` helper (`server/src/index.js:8750-8755`), capturing actor, old value, new value and evidence. |
| **Reversible?** | ✅ **yes, always, and it is audited.** Any verified state may be revoked back to `ownership_review`. **Reversal does not retroactively unpublish** already-placed orders (they are snapshots) but **does** immediately revoke publication eligibility. |
| **Conflicts** | two Sellers claiming one record → the record goes to `ownership_review` and **stays unpublishable** until one claim is withdrawn or a reviewer decides with recorded evidence. **A conflict never resolves itself by timeout, by first-claim, or by any default.** |

### 2.3 The one-way gate

**`unresolved` and `ownership_review` records may never be published, sold, recommended or
migrated into the new model.** They are visible internally, and nowhere else.

---

## 3. New intake isolation

**Design principle: the new pipeline shares no table, no default, and no code path with
legacy ownership.** It must be buildable and shippable while every legacy record is still
`unresolved`.

### 3.1 Required stages — all mandatory, none skippable

| # | Stage | Requirement | Hard rule |
|---|---|---|---|
| 1 | **Explicit Seller** | `business_id` supplied by the caller and validated against `business_profiles` | **The `defaultBusinessId` fallback (`server/src/index.js:4436`) is not available on this path.** Absent Seller = 400, never a default. |
| 2 | **Raw source record** | the discovery row is stored as captured, unmodified | staging only; never sellable (PD-08) |
| 3 | **Adoption event** | an explicit, audited act creating a listing from a discovery row | recorded in `product_adoptions`; **no unique constraint on the source row** — many Sellers may adopt one (PD-11) |
| 4 | **Price approval** | a human confirms the price | **locked at adoption; never auto-synced from source** (PD-10) |
| 5 | **Availability** | stock state set deliberately | **no "unknown ⇒ in stock" default.** Today's `stock_status === null → in_stock` (`server/src/index.js:4182`) must not be carried forward. |
| 6 | **Variant configuration** | at least one variant, explicitly configured, each with its own price | **no auto-created default variant on this path** — the Seller states the variants |
| 7 | **Image approval** | ≥1 image adopted **and** approved | approval is separate from adoption (PD-24) |
| 8 | **Content approval** | `content_state = approved` | reviewer-gated (PD-20) |
| 9 | **Publication approval** | `visibility = listed` | Seller-controlled, independent axis (PD-17) |

**Publicly visible ⇔ all nine stages complete.** Failing any one keeps the listing
internal, and the missing stage is named in the admin UI.

### 3.2 Independence guarantees

| Guarantee | How |
|---|---|
| New intake does not read legacy ownership | stage 1 requires an explicit Seller; it never consults `defaultBusinessId` |
| New intake does not depend on the legacy migration | it writes new-model rows from the start; no backfill is a prerequisite |
| Legacy records cannot leak into the new pipeline | a record may enter only through stage 3, which requires stages 1–2; an `unresolved` legacy row has neither |
| The two can run side by side | the publication gate is a single predicate evaluated per row; legacy rows simply never satisfy it |

**Consequence, stated plainly:** the new pipeline can be built, tested and shipped
**before** any legacy question is answered. That is the point of this section.

---

## 4. Legacy product treatment matrix

`internal` = visible to admins · `public` = visible to customers · `cart` = may be added ·
`recs` = eligible for recommendations · `repeat` = eligible for repeat purchase ·
`migrate` = may be moved into the new model

| Category | internal | public | purchasable | cart | recs | repeat | migrate |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| **verified Mipo Shop-owned** | ✅ | ✅ *if it also passes content + image + price gates* | ✅ | ✅ | ✅ | ✅ | ✅ |
| **verified external Seller-owned** | ✅ | ✅ *same gates* | ✅ | ✅ | ✅ | ✅ | ✅ |
| **unresolved** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **rejected** | ✅ (archived) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ **never** |
| **missing price** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ structure only, price must be set by a human |
| **missing image** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ allowed; publication still blocked until an image is approved |
| **ambiguous variants** | ✅ | ⚠️ **only if a single price is unambiguous** | ⚠️ same | ⚠️ line flagged for re-selection (PD-29) | ❌ | ❌ | ⚠️ **no auto default variant** — needs human variant configuration |
| **duplicate source record** | ✅ | ⚠️ permitted — duplication is legitimate in a marketplace | ⚠️ | ⚠️ | ❌ until de-duplicated for display | ⚠️ | ✅ **no global uniqueness is added** (PD-05/PD-11) |
| **stale / unavailable** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ allowed, lands unlisted |

**Two rules cut across every row:**

1. **"Currently purchasable" is never a reason to publish, migrate or trust a record.**
   The present state of the catalogue is the defect being corrected, not a baseline.
2. **Nothing moves out of `unresolved` automatically**, including by migration, backfill or
   inactivity.

---

## 5. Safety controls — scope and dependencies

**None of these are implemented.** Each is independently shippable; the ordering below is
a dependency ordering, not a schedule.

| ID | Gate | Scope | Depends on | Notes |
|---|---|---|---|---|
| **G-1** | **Legacy catalog read-only mode** | blocks writes to legacy rows except the ownership-review transition | nothing | **Ship first.** It freezes the problem set so the review works against a stable population. Lowest risk in the list — it changes no customer-visible behaviour. |
| **G-2** | **Legacy checkout allowlist** | `resolveCatalogOrderItem` (S-4/S-5) accepts only records on an explicit allowlist | G-1 | **Default must be allow-existing**, flipping to deny only per measured batch. A blanket deny before Q1/Q6 would stop revenue by an unknown amount. |
| **G-3** | **Legacy recommendation exclusion** | excludes unresolved rows from C-4, C-7, C-8 | nothing | **Cheapest real win.** Server-side AI recommendations are already clean (§1.4); this closes the client-side engine. Low blast radius — recommendations degrade, nothing breaks. |
| **G-4** | **Legacy cart validation** | on cart load, re-validate each line against the catalogue; mark unavailable lines | G-2 | **The only gate that reaches carts already in browsers.** Must mark and explain, never silently drop (PD-29/PD-30). |
| **G-5** | **Legacy repeat-purchase blocking** | prevents unresolved records from entering any future recurring flow | nothing | **Forward-looking.** Nothing to fix today (§1.5) — this stops the hole from being created. |
| **G-6** | **Ownership review queue** | admin surface listing `unresolved` rows with evidence capture | `ownership_state` column (additive), `PRODUCTS_OWNERSHIP_REVIEW` permission | The workhorse of §2. Without it, §2 is a document, not a process. |
| **G-7** | **Explicit Seller allowlist** | only allowlisted `business_id`s may publish | G-6 | Enforces PD-15. **Do not enable before G-6 produces verified records**, or the catalogue empties. |

**Universal constraint on all seven:** every gate must be **parameterised at the call
site**, not hardcoded into shared helpers — otherwise it will also blind admin screens and
restate analytics (the S-6/S-7 coupling in §1.2).

**Measurement gate:** G-2 and G-7 are the two that can remove revenue. Neither may be
switched to deny-by-default until Q1, Q5, Q6 and Q7 have returned numbers.

---

## 5A. G-1 — Legacy Intake Freeze · **IMPLEMENTED**

**Status:** implemented, tested, committed to the work branch. **Not deployed, not merged.**

### 5A.1 The write boundary that was frozen

**`createProduct()` — `server/src/index.js:4434`, first statement.**

This is the narrowest boundary that is also complete. The audit established why:

* **`server/src/productIntel.js` performs no database writes at all.** Every scraping
  endpoint (`import-products-from-url`, `scrape-products`, `scrape-product`,
  `scan-product-list`, `smart-scrape-product`, routed via
  `runProductIntelFunction`, `server/src/index.js:7228-7240`) returns a payload to the
  admin UI. None of them creates a commercial record.
* **All five client creation paths funnel into one route.** `createAdminProduct()`
  (`src/lib/mipoApi.ts:1706`) → `POST /api/products` → `createProduct`.
* Therefore **one guard at `createProduct` covers every path**, including any future
  server-side caller, with no frontend check anywhere.

**Placement is load-bearing.** The guard is the *first* statement, before
`normalizeProductPayload`. Two writes sit immediately below it:

| Line | Side effect if the guard ran later |
|---|---|
| `server/src/index.js:4443` `ensureDefaultBusinessProfile()` | inserts a `business_profiles` row |
| `server/src/index.js:4447` `adoptProductImages()` | downloads remote bytes and writes image files to disk |

A refusal placed after either would leave an artifact behind for a product that was never
created. Proven empirically in §5A.6.

### 5A.2 The discriminator, and why it is not the forbidden inference

A creation is **scraped-backed** when its payload carries a non-empty `source_url`.

Verified: **all five** scraped-backed paths set it —
`src/components/admin/ProductFormDialog.tsx:771`,
`src/components/admin/ProductImportWizard.tsx:383`,
`src/components/admin/BulkProductImport.tsx:902`,
`src/pages/admin/AdminProducts.tsx:358`,
`src/pages/admin/AdminQuickImport.tsx:299`. Duplication
(`src/components/admin/products/ProductBulkActions.tsx:185`) spreads the original's fields,
so a copy of a scraped product carries `source_url` forward and is frozen too.

> **This is not the inference PD-39 forbids.** PD-39 forbids reading `source_url` as
> evidence of **who owns** a record. The guard reads it as evidence of **where the content
> came from** — which is exactly what the column is, and what the production-validation
> report concluded it means. The guard returns a boolean about provenance; it never reads,
> derives, or writes an owner. A test asserts that `business_id`, `supplier_id` and
> `image_source_url` have no influence on the decision.

### 5A.3 Routes blocked

| Route | Condition | Result |
|---|---|---|
| `POST /api/products` | payload has a non-empty `source_url` | **409 `LEGACY_INTAKE_FROZEN`** |

Reaching that route and therefore blocked: the product form dialog, the import wizard,
bulk URL import, admin quick import, and duplication of any scraped-backed product.

### 5A.4 Routes and behaviour intentionally **unaffected**

| Surface | Status | Why |
|---|---|---|
| `POST /api/products` **without** `source_url` | ✅ unchanged | manual creation is not legacy scraped intake |
| **CSV / Excel import** | ✅ **unchanged — deliberate** | `parseCSV` (`src/components/admin/BulkProductImport.tsx:222-257`) has no source column and never sets `sourceUrl`; spreadsheet rows are not scraped-backed. Freezing them would broaden the freeze past its stated purpose. |
| `PATCH /api/products/:id` | ✅ unchanged | the freeze covers **creation** only; existing records stay editable, which the ownership review needs |
| `DELETE /api/products/:id`, bulk update/delete | ✅ unchanged | not creation |
| All scraping endpoints (`/api/product-intel/*`) | ✅ unchanged | they write nothing; admins can still research |
| `GET /api/products`, `GET /api/products/:id` | ✅ unchanged | **no public read behaviour changed; nothing hidden** |
| Checkout, carts, order history, recommendations, analytics, image pipeline, pricing, ownership | ✅ unchanged | untouched by this change |
| `server/scripts/seed-workbench.mjs:186` | ✅ unchanged | inserts directly by SQL, bypassing the route; a local developer seeding script, not an intake path |

### 5A.5 Error contract

Repository convention (thrown error with `statusCode` + `code`, rendered at
`server/src/index.js:8855-8860`) rather than the shape suggested in the brief:

```json
{
  "error": "Legacy scraped-product intake is temporarily frozen. Use the reviewed Product Intake workflow.",
  "details": { "code": "LEGACY_INTAKE_FROZEN" }
}
```

**HTTP 409.** Not 403: the caller *is* authorised — authorization behaviour is unchanged
and still runs first, at `server/src/index.js:8748`. The system's current *state* refuses,
and retrying will not help until the freeze lifts.

**Structured log**, emitted once per refusal:

```
legacy_intake_frozen { route: 'POST /api/products', source_host: 'supplier.example.com' }
```

Host only — never the path, the query string, or any product content. A test asserts that
a `?token=` in the source URL and the product's name and description do not reach the log.

### 5A.6 Feature flag and rollback

**`LEGACY_INTAKE_FROZEN`** — environment variable, repo convention
(cf. `PRODUCT_IMAGE_REMOVE_BACKGROUND`). **No schema migration; no database row.**

**Frozen unless the value is exactly `"false"`.** Absent, empty, misspelled, `"FALSE"`,
`"0"` and `"no"` all leave the freeze **on** — the safe direction for a write guard. Tested.

**Rollback — no code change, no deploy, no migration:**

1. set `LEGACY_INTAKE_FROZEN=false` in `/opt/mipo/.env` on the production host
   (or in SSM `/mipo/prod`, then `deploy/aws/sync-ssm-env.sh`);
2. restart the API container;
3. verify: `POST /api/products` with a `source_url` returns 201 instead of 409.

**To revert the code entirely:** `git revert` the commit. It touches three files and no
data, so revert is total — there is nothing to unwind.

### 5A.7 Verification steps

Reproducible against a local database (production was never contacted):

```bash
# unit — the guard's contract
cd server && node --test test/legacyIntakeFreeze.test.js

# integration — the guard is wired, and a refusal leaves nothing behind
DB_SSL=false DATABASE_URL=<local> node scripts/db-smoke.mjs

# gates
npm test && cd .. && npm run typecheck && npm run lint && npm run build
```

### 5A.8 Test results

| Check | Result |
|---|---|
| `test/legacyIntakeFreeze.test.js` (new, 13 tests) | ✅ **13/13** |
| Full server unit suite | ✅ **296/296** (was 283) |
| `db-smoke.mjs` on a clean database | ✅ **21/21** (was 19; +2 new) |
| `npm run typecheck` | ✅ |
| `npm run lint` | ✅ |
| `npm run build` | ✅ |
| Migrations | **not run against production**; applied only to a local scratch database |

**Empirical proof that a refusal writes nothing.** On a throwaway database with
`business_profiles` and `business_products` emptied:

```
baseline:                       business_profiles=0  business_products=0
POST /api/products + source_url → HTTP 409 LEGACY_INTAKE_FROZEN
after the refusal:              business_profiles=0  business_products=0
  ✅ ensureDefaultBusinessProfile never ran — defaultBusinessId NOT used
POST /api/products, no source_url → HTTP 201
after the manual create:        business_profiles=1  business_products=1
```

The second half matters as much as the first: manual creation still works, and still uses
the existing fallback. **The freeze did not change the manual path's behaviour** — that
would have been a broadening this task forbids.

### 5A.9 Known limitation — stated, not hidden

**The freeze keys on a provenance marker the client supplies, so it is not tamper-proof.**
An admin who exports scraped products to CSV and re-imports them without a source column
would create records the guard does not recognise as scraped-backed.

This is accepted for G-1. Its purpose is to *stop the population growing through the normal
paths* while the ownership review runs — not to defend against a determined insider who is
already authorised to create products. Closing that gap needs a server-recorded intake
channel, which needs a schema column, which needs the blocked migration.

---

## 6. F-4 — variant price bug and remediation boundary

### 6.1 The bug, as verified

| Fact | Evidence |
|---|---|
| the customer selects a variant label | `src/pages/ProductDetailAws.tsx:257-259`, `src/pages/Shop.tsx:501` |
| that label is a **display string with the price inside the text** | `src/components/admin/ProductFormDialog.tsx:395-402`, `src/pages/admin/AdminQuickImport.tsx:316-321` |
| it reaches the server as free text and is snapshotted | `server/src/index.js:5423-5424` |
| **the charged price ignores it entirely** | `server/src/index.js:5399-5411` — price comes from the product row's `sale_price`/`price` |

**Effect:** on a product whose variants differ in price, the customer is charged the base
price regardless of what they selected.

**Two precise qualifications:**

* **Not a tampering vulnerability.** The client-submitted price is never read; the charge
  always comes from the catalogue under `for share`. The number is the *wrong catalogue
  number*, not an attacker-chosen one.
* **Financial impact to date is unknown** and is exactly what Q5 measures. If no
  production listing carries multiple differently-priced variants, impact is zero. That
  cannot be asserted either way from here.

### 6.2 Remediation boundary

**In scope**

1. price resolved **server-side from the variant** when one is identified;
2. client-submitted price remains **never trusted** — no change, this already holds;
3. historical `order_items` rows **untouched**; new snapshot columns nullable only;
4. **legacy products without real variants:** price resolution is unchanged — the product
   price stands. **No default variant is invented for an unresolved record** (rule 4).
5. **ambiguous variant strings:** the server **must not guess.** If the submitted text
   does not map to exactly one priced variant, the line is **rejected with a 409** telling
   the client to re-select. Charging *some* price and hoping is how the bug started.
6. regression tests (§6.3).

**Explicitly out of scope**

* parsing prices back out of legacy `flavors` strings — lossy, needs human review;
* creating variants for legacy rows;
* any ownership decision;
* any change to cart storage shape;
* any migration.

### 6.3 Required regression tests

| # | Test | Must fail before the fix |
|---|---|---|
| 1 | variant with its own price → **that** price is charged | ✅ |
| 2 | product with no variants → product price, unchanged | ❌ (guards against regression) |
| 3 | variant text matching no variant → **409**, no order created | ✅ |
| 4 | variant text matching several variants → **409**, no order created | ✅ |
| 5 | client submits a `price` field → ignored entirely | ❌ (locks in existing correct behaviour) |
| 6 | `expected_total` mismatch after variant pricing → 409 | ✅ |
| 7 | historical `order_items` row reads identically after the change | ❌ (regression guard) |
| 8 | unresolved-ownership record → rejected at checkout regardless of variant | ✅ |

### 6.4 Sequencing

F-4's fix **depends on `product_variants` existing**, which depends on the additive
migration, which is blocked. **F-4 cannot be fixed first** — earlier notes suggesting it
was independent were wrong; without a variant table there is no variant price to resolve.

What **can** be done now, with no migration and no ownership answer: **test 3 and test 4**
— rejecting an ambiguous variant string instead of silently charging the base price. That
is a pure server-side guard. It converts a silent mischarge into a visible 409 and needs
no new table.

> ⚠️ This is a **behaviour change customers will see**: some add-to-cart flows would start
> failing at checkout instead of quietly charging the wrong price. It is the correct
> trade, but it needs explicit business sign-off, not just engineering approval.

---

## 7. Open blockers

| # | Blocker | Cleared by |
|---|---|---|
| **B-1** | No production access; Q1–Q7 unrun | an operator runs the read-only block in `PRODUCTION-VALIDATION-Q1-Q7.md` §12 |
| **B-2** | Ownership unprovable from data | **human business ownership review** — no query will ever do it |
| **B-3** | Impact of hiding legacy catalogue unmeasured on: public shop, checkout, repeat purchase, existing carts, order history, recommendations | Q1/Q5/Q6/Q7 + a cart-telemetry decision. **Order history alone is cleared** (proven independent). |
| **B-4** | F-4 fix requires `product_variants`, which requires the blocked migration | B-1 + B-2 |
| **B-5** | Carts already in browsers cannot be reached server-side | G-4, which needs a client release |
