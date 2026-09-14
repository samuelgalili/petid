# Product Intake — Next State Audit

**Date:** 2026-09-14 · **Branch:** `aws-migration` @ `3815fcf1` (= deployed production)
**Read-only audit. No code changed, no migration, no deploy.**

**Business decision recorded:** legacy products are out of scope. No preservation, repair,
mapping or migration of legacy products. The commercial catalogue will be rebuilt through
the new Product Intake process. This audit is scoped accordingly — G-7P was not run, and no
legacy exposure analysis was performed.

---

## 1. Verified current state

Each item was checked against the branch, and several were tested against a running API on
a locally migrated database. Nothing below is asserted from memory.

| # | Claim to verify | Result |
|---|---|---|
| 1 | G-1, G-6, G-7 code is on the branch | ✅ **Yes** — all three commits are ancestors of `3815fcf1` |
| 2 | Legacy Intake Freeze is active | ✅ **Yes** — `isLegacyIntakeFrozen()` returns true unless the value is exactly `"false"`. Frozen by default |
| 3 | Ownership Review Queue exists but does not block the new catalogue | ✅ **Yes** — 3 admin-only routes, and no create/update/read path consults review state |
| 4 | Legacy Exposure Measurement is not needed going forward | ✅ **Correct** — read-only, self-contained, no other code depends on it. Now dead weight, harmless |
| 5 | Image Security Patch is in the code | ✅ **Yes** — `67bdae58` + `987a9b4f`; `imagePipeline.js` routes through `fetchValidatedRemoteUrl` |
| 6 | No new migrations or unplanned schema changes | ✅ **Yes** — 38 migration files, zero changed since `1a5246ea` |
| 7 | New Product Intake is the **only** route for creating products | ❌ **FALSE** — see §4 |
| 8 | No old route lets a product into the catalogue without review | ❌ **FALSE — proven by test** — see §4 |
| 9 | The system still passes all gates | ✅ **Yes** — see §14 |

---

## 2. What already works

| Capability | Evidence |
|---|---|
| **Price is server-authoritative** | Sent `price: 1` on a ₪42 product → **409**, order refused. The client price is never read; the catalogue value under `for share` is |
| **Invalid price is rejected** | A product with `price: 0` cannot be created (though the status code is wrong — §5) |
| **Legacy scraped intake is frozen** | `409 LEGACY_INTAKE_FROZEN` on any payload carrying `source_url` |
| **Order history is independent** | `order_items` has one FK, to `orders.id`. Deleting a catalogue row leaves order lines intact |
| **Remote image fetching is SSRF-safe** | Guard + per-hop revalidation + connect-time lookup + body-bounded deadline |
| **Ownership review is append-only** | One INSERT is both decision and audit; decision-without-history is unrepresentable |
| **Product mutations are audited** | `product.created`, `product.updated`, `product.deleted` all write `admin_audit_log` rows |

---

## 3. What is missing — the new model does not exist

**None of the target entities exist**, verified against the live schema:

| Entity | Table | Status |
|---|---|---|
| Raw Import Record | `raw_import_records` | ❌ does not exist |
| Product Draft | `product_drafts` | ❌ does not exist |
| Commercial Product | — | ❌ `business_products` is the only product table |
| Variant | `product_variants` | ❌ does not exist |
| Seller Offer | `seller_offers` | ❌ does not exist |
| Inventory | `inventory` | ❌ does not exist |
| Product/Variant media | `product_media` | ❌ does not exist |
| Adoption link | `product_adoptions` | ❌ does not exist |

Consequently, of the 15 audit areas requested:

| Area | Status |
|---|---|
| Product Intake routes | ❌ **do not exist** |
| Product Draft model | ❌ does not exist |
| Import adapters (URL, scrape, CSV, Excel) | ⚠️ **exist, but entirely client-side** — §6 |
| Product review UI | ❌ does not exist (the ownership-review queue is a different thing) |
| Variant creation / editing | ❌ does not exist — `flavors text[]` display strings only |
| Inventory assignment | ❌ does not exist — `in_stock boolean` only |
| Image review / approval | ❌ **approval is not modelled**; `needs_image_review` is advisory and gates nothing |
| Publication gate | ❌ **does not exist** — no publication, visibility, active or status column on either table |
| Seller ownership | ⚠️ `business_id` exists; **no isolation** — §6 |
| Cart / checkout compatibility | ⚠️ works, but has no seller, offer, variant or SKU — §11 |
| Search indexing | ❌ **no index exists** — search is client-side filtering over `GET /api/products` |
| Product detail page | ⚠️ exists; serves any row, no gate |
| Admin permissions | ⚠️ role-based, **not seller-scoped** — §6 |
| Audit logging | ✅ present for product create/update/delete and ownership review |
| Error handling / rollback | ⚠️ one defect — §5 |

---

## 4. 🔴 Critical blocker — a product can still go live and be sold with no review

**Items 7 and 8 are false, and this was proven by execution, not by reading.**

Against a freshly migrated database with the deployed code:

```
POST /api/products  {"name":"Audit Direct Product","price":42}
  → 201 Created, business_id = cf941cc4-… (the fallback)

GET /api/products            → the product is in the public catalogue immediately
GET /api/products/<id>       → HTTP 200

POST /api/orders  (guest checkout, expected_total 72)
  → 201 Created
     order_items: product_name "Audit Direct Product", price 42,
                  product_image "/placeholder.svg", sku null, variant null
```

**A product created seconds earlier — with no review, no approved image, no variant, no
SKU, and no explicitly chosen Seller — was listed publicly and purchased end to end.**

The freeze does not prevent this, and was never meant to: it blocks only payloads carrying
`source_url`. `POST /api/products` without one is untouched, and it writes directly into
the live catalogue.

**Every stage of the target flow is missing between "External Source" and "Purchasable":**

```
External Source → Raw Import Record → Product Draft → Manual Review →
Content Correction → Variant Configuration → Inventory Configuration →
Seller Approval → Publication → Searchable and Purchasable
   ▲                                                        ▲
   └──────────────── none of this exists ───────────────────┘
        today: POST /api/products → instantly live and sellable
```

---

## 5. Security risks

| # | Risk | Severity | Evidence |
|---|---|---|---|
| S-1 | **Invalid product input returns HTTP 500, not 400** | 🟠 medium | `throw new Error("A valid product price is required")` at `index.js:4031` and `:4076` carries no `statusCode`, so the handler reports 500. Same for `"Product name is required"` (`:4075`). Validation works; the status lies about why |
| S-2 | Unapproved images are publicly displayable | 🟠 medium | image approval is not modelled at all; whatever `image_url` holds is served |
| S-3 | `defaultBusinessId` fallback still assigns ownership silently | 🟠 medium | `index.js:4436`; confirmed in the test above |

**Not a risk — verified safe:** price tampering (client price ignored), SSRF on image
fetch (guarded), order-history tampering (snapshots, no FK).

---

## 6. 🔴 Ownership and Seller-isolation risks

| # | Risk | Severity |
|---|---|---|
| O-1 | **There is no Seller isolation whatsoever** | 🔴 **critical** |
| O-2 | Admin identity carries no `business_id` | 🔴 critical |
| O-3 | Import adapters run entirely in the browser | 🟠 medium |

**O-1/O-2, verified:** admin roles are `admin` and `product_manager` only.
`request.admin` has **no** `business_id`. **No product route filters by seller.** Any
authenticated admin can read, edit and delete **every** product regardless of which
business owns it.

> For a multi-seller marketplace this is the single largest architectural gap. It is not a
> legacy problem — it applies equally to every product the new pipeline will create. **Any
> Seller-facing access must not be enabled until this is built.**

**O-3:** URL/scrape adapters live in `ProductFormDialog.tsx`; CSV and Excel in
`BulkProductImport.tsx`. All parse in the browser and POST a finished product. **No raw
import record is persisted anywhere** — so "preserve raw data unmodified" is currently
impossible: the raw data is discarded in the browser tab.

---

## 7. Image risks

| # | Risk |
|---|---|
| I-1 | **Approval is not modelled.** `needs_image_review` is advisory and gates nothing |
| I-2 | No Product-level vs Variant-level distinction |
| I-3 | No banner/irrelevant-image detection; whatever the source names is adopted |
| I-4 | `product_images` table exists, is keyed to `scraped_products`, and has **zero code references** — dead |
| I-5 | Fallback is `/placeholder.svg` — a product with no image publishes and sells (proven in §4) |

Adoption itself works well: bytes are downloaded, normalised and re-hosted, with the
supplier origin stripped from public responses.

---

## 8. Variant risks

| # | Risk |
|---|---|
| V-1 | **Variants do not exist as entities.** Only `flavors text[]` — display strings with prices embedded in the text |
| V-2 | **No `variant_id`, no per-variant SKU, price, stock or image** |
| V-3 | **F-4: the selected variant does not affect the charged price.** The base product price is charged regardless |
| V-4 | The order snapshot stores `variant` as free text that matches nothing |

---

## 9. Inventory risks

| # | Risk |
|---|---|
| N-1 | Inventory is a single `in_stock boolean` — no quantity, no per-Seller or per-Variant stock |
| N-2 | No reservation or decrement at checkout; concurrent orders cannot be limited by stock |
| N-3 | For scraped rows, `stock_status = NULL` is treated as **in stock** (`index.js:4182`) |

---

## 10. Cart risks

| # | Risk |
|---|---|
| C-1 | Cart is `localStorage` only; no `seller_id`, `offer_id`, `variant_id` or `sku` |
| C-2 | Line identity is `[productId, variant, size]` with free-text variant |
| C-3 | No availability check until checkout |

**Not a risk:** the cart price is **not** a source of truth — proven in §2.

---

## 11. Checkout risks

| # | Risk |
|---|---|
| K-1 | Checkout resolves against both catalogue tables, so a discovery row is purchasable |
| K-2 | No publication gate — an unreviewed product is purchasable (§4) |
| K-3 | No seller, offer or variant is recorded on the order line |

**Verified safe:** server-side price resolution under a share lock; `expected_total` is a
confirmation check only; client price never read.

---

## 12. Migrations required — for the new model

**None are needed for the current code to keep working.** The following would be needed to
build the target model, and **none may be written before the plan is approved**:

| Proposed | Purpose |
|---|---|
| `raw_import_records` | immutable source payload, per import |
| `product_drafts` | corrected content, raw kept separately and never overwritten |
| `product_variants` | the sellable unit: `variant_id`, `sku`, optional barcode, price, availability, attributes, status |
| `seller_offers` | a Seller's offer for a product, keyed by `business_id` |
| `inventory` | stock per Seller per Variant |
| `product_media` | source / adopted / approved as three independent facts, product- and variant-level |
| `business_products` alterations | publication state, ownership provenance |
| `order_items` alterations | nullable `seller_id`, `offer_id`, `variant_id`, `sku` snapshots |
| admin identity alteration | `business_id` on the admin, for Seller isolation |

## 13. Migrations **not** required

* No legacy ownership migration — legacy is out of scope by decision.
* No backfill of legacy products into the new model.
* No canonical Product table competing with `business_products` (not without approval).
* No `UNIQUE(source_record_id)` — the same discovery record may be adopted by many Sellers.
* No change to `order_items` structure for existing rows; additions only, all nullable.
* No dropping of `product_images` / `product_variations` yet.

---

## 14. Tests executed, and results

All run on this branch, on a freshly migrated local database. **No production access.**

| Gate | Result |
|---|---|
| Full server suite (unit + integration) | ✅ **339/339**, 0 skipped |
| API smoke, clean database | ✅ **27/27** |
| Pet-facts integration | ✅ 46 assertions pass |
| typecheck · lint · imports · build | ✅ ✅ ✅ ✅ |

> One earlier smoke run reported 26/27. The failure was `POST /api/me/pets` returning 500
> on a microchip-uniqueness collision — **leftover data from re-running against the same
> database**, not a code defect. On a clean database: 27/27. Recorded rather than quietly
> re-run.

**Live behaviour tests** (against a running API, local DB):

| Test | Result |
|---|---|
| A · create product with no review/image/variant | **201** |
| B · appears in public catalogue immediately | **yes** |
| C · public detail route | **200** |
| D · purchase it end to end | **201 — order created** |
| E · client-submitted price `1` on a ₪42 product | **409 — refused** ✅ |
| F · create product with `price: 0` | **500** (correctly rejected, wrong status) |

---

## 15. Decisions requiring approval before any code is written

Per the execution rules, **no migration and no code may start until the data model, API
contract, state machine, migration list, rollback plan and test list are presented and
approved.** These are the decisions that plan depends on:

| # | Decision | Why it cannot be assumed |
|---|---|---|
| **D-1** | **Does `POST /api/products` stay open, get restricted, or get removed?** | This is the hole in §4. Closing it is the single highest-value change, and it **will break the existing admin screens**, which are the only way products are created today |
| **D-2** | **Is Seller isolation in scope now?** | O-1 is critical for a marketplace but is a large piece of work touching admin identity, permissions and every product route |
| **D-3** | Does the Seller-facing role exist yet, or is everything admin-operated at first? | Determines whether D-2 is urgent or can follow |
| **D-4** | Is an approved image **required** for publication, or only recommended? | Changes the publication gate and the volume of review work |
| **D-5** | Confirm no canonical Product table — `business_products` remains the Commercial Product | The target model lists Product and Commercial Product separately; I read them as the same entity |
| **D-6** | Is `business_products` reused for Commercial Product, or is a clean new table wanted given legacy is abandoned? | With legacy out of scope, a clean table is now defensible where it was not before. **This is the biggest structural fork** |
| **D-7** | Should F-4 (variant pricing) be fixed for legacy products, or left alone since legacy is abandoned? | Legacy products remain purchasable today and are still mispriced |
| **D-8** | Fix S-1 (500 → 400) now as an isolated change? | Small, safe, independent of everything else |

---

## Summary

The three checkpoints are deployed and working, all gates pass, and no schema change has
been introduced. **But the new Product Intake pipeline does not exist in any form**, and
the old route still puts an unreviewed, imageless, variantless product into the public
catalogue and through checkout — **proven by execution, not inferred**.

The most consequential thing to settle before Stage 1 is **D-6**: with legacy abandoned,
whether the new catalogue is built on `business_products` or on a clean table.

**Stopping here. No migration, no merge, no deploy.**
