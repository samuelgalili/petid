# Legacy Catalogue Exposure Measurement (G-7)

**Status:** measurement tool implemented and tested. **No exposure figures exist yet.**
**Date:** 2026-09-14 · **Branch:** `claude/mifo-project-oq44tl`
**Read-only. No migration. No production access. Nothing deployed or merged.**

---

## ⚠️ Read this before anything else

**This document deliberately contains no counts.**

The tool built in this checkpoint measures whatever database it is pointed at. The only
database available here is a local scratch instance seeded by migration `0010` — ten
placeholder products and one placeholder business profile. Numbers from it would be
arithmetic on fixtures, and they would look exactly like production numbers on the page.

So none are printed. The tool is built, proven correct against known fixtures, and
**waiting for an operator to run it somewhere that matters.**

Every claim below is labelled with how it is known:

| Label | Meaning |
|---|---|
| **[CODE]** | verified by reading the current source; true regardless of data |
| **[FIXTURE]** | the query was exercised against fixtures this session created, to prove the arithmetic — **not an exposure figure** |
| **[BLOCKED-PROD]** | measurable, but needs production access that does not exist |
| **[UNRECONSTRUCTIBLE]** | no query will ever answer it; the fact was never recorded |
| **[UNMEASURABLE-CLIENT]** | lives in the browser; not observable server-side at any cost |

---

## 1. What the tool measures, and what it refuses to

### Measurable — awaiting a production run · **[BLOCKED-PROD]**

| Dimension | Metric |
|---|---|
| **A · Population** | commercial listings; discovery records; content provenance present/absent; supplier reference present |
| **B · Public exposure** | rows served by the public listing, split by source; rows reachable via product detail |
| **C · Purchase exposure** | listings that pass checkout resolution; that can reach order resolution; with no resolvable price; variant-data distribution; upper bound exposed to the variant-price bug |
| **D · Order exposure** | items by `product_source`; distinct products in history; orders containing a discovery item; items with no `product_id`; items whose catalogue row is gone |
| **H · Ownership review** | total events; products with any/multiple events; reopened after a decision; counts by latest state |
| **I · Provenance** | content provenance available / missing / ambiguous |
| **J · Breakdowns** | by business_id, category, creation month, order exposure, review state |

### Answerable from code alone · **[CODE]**

| Question | Answer |
|---|---|
| Are discovery records served publicly? | **Yes.** `listProducts()` concatenates both tables and applies no row filter; `toPublicProduct()` strips columns, never rows. |
| Are any rows excluded by an existing filter? | **No — zero.** No publication, visibility, active, status or approval column exists on either catalogue table. There is nothing for a filter to exclude. |
| Do AI recommendations include discovery records? | **No.** `catalogRecommendations.js` queries `business_products` only, and says so at line 16. |
| Do client-side recommendations include them? | **Yes**, transitively — they rank the array from `GET /api/products`. |
| Is there persisted recommendation data? | **No.** Computed per request; no table. |
| Do analytics include discovery records? | **Yes.** `listAdminAnalytics` calls the same `listProducts()`. |
| Does order history depend on the catalogue? | **No.** `order_items` has one foreign key, to `orders.id`. `attachOrderItems` selects from `order_items` with no join. |
| Does any seller analytics surface exist? | **No.** Nothing groups by `business_id`. |

### Never answerable · **[UNRECONSTRUCTIBLE]**

| Question | Why no query will ever answer it |
|---|---|
| Which products were created through the legacy intake path? | No intake channel was ever recorded. |
| Which products carry a **fallback** `business_id`? | The fallback wrote nothing to distinguish itself. A fallback row and a deliberate one are byte-identical. |
| Who owns any legacy product? | That is a human decision (G-6), not a property of the data. |
| What is the publication state of a legacy product? | No publication column exists. |

The tool returns the literal string `UNRECONSTRUCTIBLE` for each, **with no number
attached**. A test asserts that these fields carry no `count` key, so a future reader
cannot mistake an estimate for a measurement.

### Not observable server-side · **[UNMEASURABLE-CLIENT]**

| Question | Why |
|---|---|
| How many carts hold a legacy product? | Carts are `localStorage` under `mipo-cart`. **There is no cart table in the schema and no telemetry.** Not a gap in the query — a structural impossibility. Adding telemetry was out of scope here. |
| What does a visitor see after filtering? | Shop search and filters run in the browser over the already-delivered array. |

---

## 2. Why `source_url` and `supplier_id` are not ownership evidence

Both are read by this tool — and neither is read as ownership.

**`source_url`** states where the *content* came from. It is the same field G-1 uses to
recognise a scraped-backed intake, and that is its honest meaning. It says nothing about
who sells the product: two sellers can legitimately list from the same supplier page, and
a product with no `source_url` is not thereby Mipo Shop's.

**`supplier_id`** is a procurement reference with no foreign key, never used for identity,
permission or isolation. The only screen that sets it is dead — its supplier list has no
setter and is always empty.

The report never prints a source host, a URL, a path or a query string. A test asserts
that none of those, nor any product name or customer address, appears in the response.

---

## 3. Why order history stays independent

`order_items` carries exactly one foreign key, to `orders.id`. No catalogue row cascades
into history, and no runtime code joins history to the catalogue.

The report does count **items whose catalogue row is gone** — and labels it a planning
metric, not a fault. **A dangling `product_id` is the correct state of an immutable
snapshot.** The count exists to size a future conversation, not to suggest history is
broken. No runtime path performs that join, and none may be added.

---

## 4. The shared-dependency risk worth acting on

`listAdminAnalytics` calls the **same `listProducts()`** that serves the public catalogue.

A row filter added there to hide legacy products would silently restate every admin
product number at the same time — and would hide from reviewers exactly the rows they must
review. **Any future visibility filter must be a parameter at the call site, never a
hardcoded `WHERE`.** This is the single most likely way a future enforcement checkpoint
does damage.

---

## 5. Why the route is read-only, and writes nothing at all

Every statement behind `GET /api/admin/products/legacy-exposure` is a `SELECT`: explicit
column lists, no `SELECT *`, no dynamic SQL from request input, aggregates throughout,
breakdowns bounded to 50 rows with deterministic ordering.

**It writes no audit row for being read.** The repository audits mutations, not reads;
making a measurement route the only `GET` in the API that writes would be a worse
precedent than the traceability it buys.

**[FIXTURE]** Proven rather than asserted: a test snapshots row counts **and an `md5`
digest of every row** across `business_products`, `scraped_products`, `order_items`,
`orders`, `business_profiles` and `admin_audit_log`, runs the full measurement twice, and
requires every table to be byte-identical afterwards. A mutation that preserved row counts
would still move the digest.

---

## 6. Why no migration

Nothing needed one. Every measurable dimension is answerable from columns that already
exist, and every dimension that would need a new column is one this checkpoint is
forbidden to invent — an intake-channel marker, a publication state, a house-seller
designation. Those belong to the migration task, and they remain blocked.

---

## 7. Response shape

```jsonc
{
  "generated_at": "…",
  "scope": {
    "read_only": true,
    "production_validated": false,   // never true from inside the process
    "environment_label": "unlabelled",
    "warning": "These counts describe whichever database served this request…"
  },
  "population": { "commercial_listings": {…}, "discovery_records": {…},
                  "created_through_legacy_path": { "status": "UNRECONSTRUCTIBLE" },
                  "default_business_id_assignment": { "status": "UNRECONSTRUCTIBLE" } },
  "public_exposure": {…}, "purchase_exposure": {…}, "order_exposure": {…},
  "cart_exposure": { "status": "UNMEASURABLE_SERVER_SIDE", "reason": "…localStorage…" },
  "recommendation_exposure": {…}, "analytics_exposure": {…},
  "ownership_review": {…}, "provenance": {…}, "breakdowns": {…},
  "blocked_questions": [ … ]
}
```

`production_validated` is a hardcoded `false` and **nothing in the codebase can set it
true.** Only a human who knows which database answered can say so, out of band.

---

## 8. Recommended next checkpoint

**Run the measurement against production and bring back the JSON.** One authenticated
`GET`, no writes, no migration, no deploy:

```
GET /api/admin/products/legacy-exposure
```

Requires an admin session or the admin API key. **Do not paste a credential into chat.**

Two decisions unlock the moment that JSON exists, and neither can be made responsibly
before:

1. **Is checkout exposure small enough to block?** `purchase_exposure` answers it. If
   discovery records are a rounding error in orders, G-2 becomes cheap; if they are the
   business, it becomes a staged migration.
2. **Is the public catalogue mostly legacy?** `public_exposure` answers it, and decides
   whether hiding legacy rows is a tidy-up or an outage.

**Still blocked regardless of that run:** ownership (needs the human review, not a query),
cart exposure (needs a client release), and everything requiring the additive migration.

---

## 9. Verification

| Check | Result |
|---|---|
| `test/legacyExposureMeasurement.test.js` (new, 17 tests) | ✅ **17/17** |
| Full server suite, with a database | ✅ **339/339** |
| Full server suite, no database | ✅ 310 pass, **29 skipped cleanly** |
| `db-smoke.mjs` on a clean database | ✅ **27/27** (was 24; +3 for G-7) |
| typecheck · lint · build | ✅ ✅ ✅ |
| Migrations | **not run against production** — local scratch only |
| Production | **not contacted** |
| Writes performed by the measurement | **zero**, proven by table digests |
