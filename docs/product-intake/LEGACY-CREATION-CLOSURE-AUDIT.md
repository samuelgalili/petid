# Stage 0 — Legacy Product Creation Closure Audit

**Date:** 2026-09-14 · **Branch:** `claude/mifo-project-oq44tl`
**No migration. No schema change. No merge. No deploy. No production change.**

Follows the audit in [`PRODUCT-INTAKE-NEXT-STATE.md`](./PRODUCT-INTAKE-NEXT-STATE.md)
(commit `8b9bfa79`), which proved by execution that a product could be created,
published and purchased with no review at all.

---

## 1. Every product-creation path found

The audit result is better than expected: **there is exactly one write boundary.**

```
7 admin screens ──► createAdminProduct()  ──► POST /api/products ──► createProduct()
                    src/lib/mipoApi.ts:1706      index.js route          index.js:4621
                                                                              │
                                                                   insert into business_products
                                                                          index.js:4693
```

| # | Path | Entry point | Reaches the insert via |
|---|---|---|---|
| 1 | Hand-written product form | `src/components/admin/ProductFormDialog.tsx:796` | `createAdminProduct` |
| 2 | URL / scrape import wizard | `src/components/admin/ProductImportWizard.tsx:405` | `createAdminProduct` |
| 3 | Bulk URL import | `src/pages/admin/AdminProducts.tsx:344` | `createAdminProduct` |
| 4 | CSV / Excel import | `src/components/admin/BulkProductImport.tsx:892` | `createAdminProduct` |
| 5 | Quick import | `src/pages/admin/AdminQuickImport.tsx:340` | `createAdminProduct` |
| 6 | Smart product editor | `src/pages/admin/AdminSmartProductEditor.tsx:237` | `createAdminProduct` |
| 7 | Product duplication | `src/components/admin/products/ProductBulkActions.tsx:185` | `createAdminProduct` |
| 8 | Direct API call | any client | `POST /api/products` |

**Verified exhaustively:**

* `insert into business_products` appears **once** in production code — `index.js:4693`,
  inside `createProduct`. The only other occurrences are in tests and
  `server/scripts/seed-workbench.mjs` (a local developer seed, not a route).
* `createProduct(` is called from **one** place — the `POST /api/products` route.
* `updateProduct` contains **zero** insert or upsert statements; it cannot create.
* There is **no** `insert into scraped_products` anywhere in the server — no route or
  script creates discovery rows either.

## 2. Paths now blocked

**All eight**, by closing the single boundary. Proven by execution (§10).

| Response | |
|---|---|
| Status | **410 Gone** |
| Body | `{"error":"Legacy product creation is no longer supported. Use Product Intake.","details":{"code":"LEGACY_PRODUCT_CREATION_DISABLED"}}` |

410, not 403: the caller may well be entitled to create products. The **capability** was
withdrawn. Retrying with a different account will not change the answer.

> The `details.code` wrapper is the repository's existing error convention
> (`sendError(response, status, message, details)`), not the flat shape in the brief. The
> error string and the code are exactly as specified.

**The block is unconditional — there is no flag.** G-1 froze the scraped half behind an
environment variable, which was right while a hand-written product was still a legitimate
thing to make. It no longer is. A flag here would be a way to silently reopen a route that
was proven to publish and sell unreviewed products; the way back is to revert the commit,
which is visible in the history. A test asserts that no environment variable or argument
re-enables it.

## 3. Paths deliberately **not** blocked, and why

| Path | Status | Reason |
|---|---|---|
| `PATCH /api/products/:id` | **open** | Editing an existing product is not creation. Closing it would strand the catalogue with no way to correct anything, and Stage 0's goal is to stop new products, not freeze old ones |
| `DELETE /api/products/:id`, bulk delete | **open** | Not creation |
| `PATCH /api/products/bulk` | **open** | Updates existing rows only — verified it cannot insert |
| Category create / update / adopt | **open** | Categories are not products |
| Scraping endpoints (`/api/product-intel/*`) | **open** | They write nothing at all — `productIntel.js` has zero database writes. They return payloads to the admin UI, and the UI can no longer turn one into a product |
| All public read routes | **unchanged** | Explicitly out of scope |
| Cart / checkout | **unchanged** | No new product can be created, so none can be bought. No change was needed to prevent it |
| Order history | **unchanged** | Explicitly out of scope |
| `server/scripts/seed-workbench.mjs` | **open** | A local developer seed that writes SQL directly, bypassing the route. Not reachable in production and not an intake path. **Recorded as a known gap** — §11 |
| Admin screens | **not removed** | Per instruction. They now receive 410 |

## 4. Every `defaultBusinessId` use

| Location | Status after Stage 0 |
|---|---|
| `server/src/index.js:100` — the constant | still defined; no longer reachable for creation |
| `server/src/index.js:4321-4350` — `ensureDefaultBusinessProfile()` | **unreachable from any route.** Its only caller was `createProduct` |
| `server/src/index.js:4629` — `body.business_id \|\| await ensureDefaultBusinessProfile()` | **unreachable.** The block sits above it |
| `src/lib/productStore.ts:1-2` — client constant | untouched; not used to create anything |

**No new product can acquire an owner nobody chose.** This was the point of placing the
block above line 4629 rather than at the route alone.

## 5. Direct writes to `business_products`

| Location | Kind | Status |
|---|---|---|
| `index.js:4693` | `INSERT` | **blocked** — the only production insert |
| `index.js:4812, 4822, 4834` | `DELETE` | open (not creation) |
| `index.js:5068, 5218` | `UPDATE` | open (not creation) |
| `server/scripts/seed-workbench.mjs:186` | `INSERT` | local developer seed — §11 |
| test files | `INSERT` | test fixtures, rolled back |

## 6. Paths that could bypass Review

**None remain through the API.** The two that existed are closed by the same block:
creating a product directly, and duplicating an existing one into a new row.

One gap is honestly outside the API and is recorded rather than papered over: anyone with
direct database access can still `INSERT` into `business_products`. No application-layer
change can prevent that; it needs a database role restriction, which is infrastructure
work and out of Stage 0's scope.

## 7. Changes made

| Change | Why |
|---|---|
| **D-1** · unconditional 410 block at the `createProduct` write boundary | closes all eight paths at once |
| **D-1** · 410 at the route, after the permission check | so the audit row can name who attempted it, and an unauthorised caller still gets its usual answer and learns nothing new |
| **D-1** · audit row `product.creation_blocked` | records route and whether the payload carried provenance — **no product name, no payload, no URL** |
| **D-8** · five validation throws now carry `statusCode: 400` | `index.js:4017, 4026, 4032, 4082, 4083`. **Validation rules unchanged** — only the status they are reported with |
| G-1 guard retained below the block | the inner gate. Unreachable today, and kept because whatever replaces this path must still refuse an unreviewed scraped payload |

**Not changed:** schema, migrations, public read routes, cart, checkout, orders, prices,
images, recommendations, analytics, admin screens.

## 8. Files changed

| File | |
|---|---|
| `server/src/legacyProductCreation.js` | **new** — the block and its error |
| `server/src/index.js` | +1 import, block at the boundary, 410 at the route, 5 validation throws now 400 |
| `server/test/legacyProductCreation.test.js` | **new** — 5 tests |
| `server/scripts/db-smoke.mjs` | 3 superseded checks replaced by 7 Stage 0 checks |

## 9. Tests added

| Test | Proves |
|---|---|
| creation is refused unconditionally | the contract |
| refusal carries 410 and a stable code | 410, not 403 |
| message points at the replacement and nothing else | no URL, credential, database or internal name |
| **no flag, env var or argument re-enables it** | 20 env combinations + 6 argument shapes |
| each refusal is a fresh error | no shared mutable state |
| 5 × `POST /api/products is closed for a …` | each import shape: hand-written, URL/scrape, spreadsheet, quick import, duplication |
| a refused create adds nothing to the catalogue | no partial row |
| a product created before the closure is still readable | existing catalogue intact |
| invalid product input is rejected with 400, not 500 | D-8, on the still-live update path |

## 10. Test results

| Gate | Result |
|---|---|
| `test/legacyProductCreation.test.js` | ✅ **5/5** |
| Full server suite | ✅ **344/344**, 0 skipped |
| API smoke, clean database | ✅ **32/32** (was 27; +7 Stage 0, −3 superseded, +1 net elsewhere) |
| Pet-facts integration | ✅ 46 assertions |
| typecheck · lint · imports · build | ✅ ✅ ✅ ✅ |

**Success conditions, each proven by execution:**

| Condition | Result |
|---|---|
| Cannot create via `POST /api/products` | ✅ **410** |
| Cannot create via old URL import | ✅ 410 |
| Cannot create via old scraping | ✅ 410 |
| Cannot create via quick import | ✅ 410 |
| Cannot create via legacy duplication | ✅ 410 |
| No new path created without Review | ✅ none added |
| Previously created products still readable | ✅ list 200, detail 200 |
| No change to historical orders | ✅ untouched, suite green |
| All regression tests pass | ✅ 344/344 |
| typecheck / lint / build / DB tests | ✅ |

**Database state after the smoke run:** 10 products (the migration seed), **zero created**,
6 `product.creation_blocked` audit rows. One audit row, verbatim:

```
{"route": "POST /api/products", "had_source_provenance": false}  | actor=api-key
```

Checked for leakage — clean: no URL, no product name, no token, no secret.

## 11. Remaining risks

| # | Risk | Severity |
|---|---|---|
| R-1 | **Admin screens now fail at 410.** Seven screens still call `createAdminProduct`. They were deliberately not removed, so an admin pressing Save gets an error. **Expected, but user-visible from the first deploy** | 🟠 medium |
| R-2 | **Direct database `INSERT` still possible** for anyone with DB access. No application change can prevent it | 🟡 low |
| R-3 | `seed-workbench.mjs` writes SQL directly, bypassing the route. Local developer tool, not production-reachable | 🟡 low |
| R-4 | **No Seller isolation** — unchanged and still critical. Any admin can read, edit and delete every product | 🔴 **critical, carried forward** |
| R-5 | Existing legacy products remain public and purchasable, including the F-4 mispricing. **Out of scope by decision** | accepted |
| R-6 | `ensureDefaultBusinessProfile` is now dead code | 🟡 low — left in place rather than removed, since Stage 0 is not a refactor |

## 12. Blockers for Stage 1

| # | Blocker |
|---|---|
| B-1 | **Seller isolation design.** D-2 puts it in Stage 1, but admin identity carries no `business_id` and no route filters by seller. This touches admin identity, permissions and every product route |
| B-2 | **Admin UI has no replacement.** Until Stage 8, there is no way for anyone to create a product. This is intended, and worth stating plainly: **the catalogue is now read-and-edit only** |
| B-3 | The Stage 1 plan — data model, ERD, API contract, state machine, permissions, publication gate, migrations, rollback, cart/checkout compatibility, test list, rollout — must be presented and approved before any table is created |

## 13. Future migrations — listed, **not created**

No migration was written. Stage 1 would need:

| Table | Purpose |
|---|---|
| `raw_import_records` | immutable source payload per import, never overwritten |
| `product_drafts` | corrected content, raw preserved separately |
| `catalog_products` | the canonical commercial product |
| `product_variants` | `variant_id`, `sku`, optional barcode, price, availability, attributes, status |
| `seller_offers` | a Seller's offer, keyed by `business_id` |
| `inventory` | stock per Seller per Variant |
| `product_media` | source / adopted / approved as independent facts, product- and variant-level |
| *alter* admin identity | `business_id`, for Seller isolation |
| *alter* `order_items` | nullable `seller_id`, `offer_id`, `variant_id`, `sku` snapshots |

**Not needed:** legacy ownership migration · legacy backfill · `UNIQUE(source_record_id)` ·
any change to existing `order_items` rows · dropping legacy tables.

---

## Stopping here

Stage 0 is complete and every success condition is proven by execution rather than
inspection. **No migration, no merge, no deploy.** Stage 1 needs explicit approval, and the
plan presented before any code.

**The one thing worth deciding early:** R-1 means admins can no longer create products at
all. That is the intended consequence of D-1, but it starts the moment this deploys — so
the Stage 8 admin-UI migration may deserve to move earlier than its number suggests.
