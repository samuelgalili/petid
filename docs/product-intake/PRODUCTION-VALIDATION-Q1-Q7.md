# Production Validation Q1–Q7 — **BLOCKED: no production access**

**Status:** ❌ **NOT EXECUTED.** Production database access is unavailable from this session.
**Date:** 2026-09-14
**Branch:** `claude/mifo-project-oq44tl`
**Source of queries:** §13 of [`FINAL-DESIGN-DECISION.md`](./FINAL-DESIGN-DECISION.md)

> **No production query was run. No production result is reported anywhere in this
> document.** Every cell that would hold a production number reads `NOT RUN`. Nothing
> below is estimated, inferred or simulated from a local database.
>
> What *is* reported are the findings that are provable from the repository and schema
> alone. Those are labelled **[CODE-PROVEN]** and require no production data. They are
> kept strictly separate from the blocked items.

---

## 1. Environment and access confirmation

**Target (from `deploy/aws/sync-ssm-env.sh`):**

| Property | Value |
|---|---|
| Environment | production |
| Region | `eu-central-1` |
| Config store | AWS SSM Parameter Store, prefix `/mipo/prod` |
| Deploy host | `ubuntu@63.183.241.110`, path `/opt/mipo` |
| Runtime env file | `/opt/mipo/.env` on the production host |
| Database | **external** — `DATABASE_URL` comes from SSM. The Postgres service in `deploy/aws/docker-compose.yml:82-84` carries `profiles: ["staging"]` and therefore **does not run in production**. |

**Access attempts made, and their results:**

| # | Route | Command | Result |
|---|---|---|---|
| 1 | Direct connection string | inspect environment for `DATABASE_URL` | **absent** — no `DATABASE_URL` in the environment, and no `.env` file exists in the repo (only `.env.example`) |
| 2 | Direct Postgres egress | `exec 3<>/dev/tcp/mipo.pet/5432` | **unreachable** |
| 3 | Generic TCP egress on 5432 | `exec 3<>/dev/tcp/aws.amazon.com/5432` | **blocked** — outbound is HTTPS-through-proxy only (`HTTPS_PROXY=http://127.0.0.1:41889`) |
| 4 | AWS API (SSM / RDS) | `aws sts get-caller-identity` | **no AWS CLI installed** (`aws: No such file or directory`) |
| 5 | AWS credentials | inspect `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | **placeholders, not credentials** — both literally equal `proxy-injected` |
| 6 | SSH to the deploy host | `ls ~/.ssh/` and `exec 3<>/dev/tcp/63.183.241.110/22` | **no key present** (`~/.ssh` is empty) and **port 22 unreachable** |

**Conclusion: there is no path from this session to the production database.** Every one
of the six routes is independently closed; no combination of them opens one.

## 2. Read-only safety confirmation

Read-only safety could not be *established*, because no connection was made. For the
record, the intended safety posture — to be applied when these queries are eventually run:

* connect as a role with `SELECT`-only grants, or wrap every statement in
  `BEGIN; SET TRANSACTION READ ONLY; … ROLLBACK;`
* Q1–Q7 and A–E are all pure aggregates — no `INSERT`, `UPDATE`, `DELETE`, `ALTER` or
  `DROP` appears in any of them
* no migration is run, no repair script is run

**What was actually touched in this session:** a local throwaway PostgreSQL 16 instance
with migrations `0001`–`0039` applied, used only for the structural proof in §4-D. That
proof ran inside a transaction that ended in `ROLLBACK`. **Production was not contacted.**

## 3. Q1–Q7 — exact queries, results NOT RUN

| ID | SQL (verbatim from §13) | Timestamp | Rows | Result | Interpretation | Migration impact |
|---|---|---|---|---|---|---|
| **Q1** | `select count(*) from business_products;`<br>`select count(*) from scraped_products;` | — | — | **NOT RUN** | — | **R-2 unresolved.** Cannot size the catalogue loss from PD-08. |
| **Q2** | `select count(*) filter (where source_url is null and image_source_url is null) as class_a, count(*) filter (where source_url is not null) as class_b, count(*) filter (where supplier_id is not null) as class_c from business_products;` | — | — | **NOT RUN** | — | **R-1 unresolved.** The CQ-07 ownership split remains an unvalidated hypothesis. |
| **Q3** | `select count(distinct business_id) from business_products;` | — | — | **NOT RUN** | — | Cannot tell whether any Seller besides the default UUID exists. |
| **Q4** | `select count(*) from product_images;`<br>`select count(*) from product_variations;` | — | — | **NOT RUN** | — | **R-5 unresolved.** Dead tables must not be dropped (PD-23 already forbids it). |
| **Q5** | `select count(*) from business_products where cardinality(flavors) > 1;` | — | — | **NOT RUN** | — | **R-3 / R-7 unresolved.** Cannot size the blast radius of the variant-pricing fix. |
| **Q6** | `select count(*) from order_items where product_source = 'scraped';` | — | — | **NOT RUN** | — | Cannot size historical exposure to discovery rows. |
| **Q7** | `select count(*) from business_products where image_adopted_at is null;` | — | — | **NOT RUN** | — | Cannot size the approved-image gate (rollout step 7). |

## 4. Additional validations A–E

### A · Are scraped products currently purchasable?

| Sub-question | Status | Evidence |
|---|---|---|
| returned by public catalog endpoints | ✅ **YES — [CODE-PROVEN]** | `listProducts` concatenates both tables (`server/src/index.js:4245-4258`); `GET /api/products` applies no row filter (`server/src/index.js:8627-8635`) |
| visible in the public shop | ✅ **YES — [CODE-PROVEN]** | `toPublicProduct` (`server/src/index.js:4237`) is a *field* allowlist; it removes columns, never rows |
| accepted by checkout | ✅ **YES — [CODE-PROVEN]** | `normalizeRequestedOrderItems` accepts `product_source = 'scraped'` (`server/src/index.js:5320-5330`) |
| resolvable by `resolveCatalogOrderItem` | ✅ **YES — [CODE-PROVEN]** | the `findScraped` branch builds a complete order line from `scraped_products` (`server/src/index.js:5349-5420`) |
| **counts and representative IDs** | ❌ **NOT RUN** | requires production |

**The code path is fully proven. The volume is entirely unknown.**

### B · Scraped products without Seller ownership

❌ **NOT RUN in full** — every item in B is a count.

One structural fact is code-proven and needs no data: a scraped product **cannot** have a
Seller, because the mapper hardcodes it:

```
server/src/index.js:4184   business_id: null,
```

So the four-way split B asks for is, for the `scraped_products` side, known in advance:

| Class | `scraped_products` | `business_products` |
|---|---|---|
| `business_id IS NULL` | **100% by construction** [CODE-PROVEN] | impossible — column is `NOT NULL` with an FK |
| fallback/default ownership | n/a | **NOT RUN** (needs Q2/Q3) |
| explicit Seller ownership | n/a | **NOT RUN** (needs Q2/Q3) |
| unresolved | n/a | **NOT RUN** |

### C · Variant price correctness

| Sub-question | Answer | Evidence |
|---|---|---|
| does the selected variant affect the server-resolved price? | ❌ **NO — [CODE-PROVEN]** | `resolveCatalogOrderItem` computes price from `row.sale_price`/`row.price` on the **product** row only (`server/src/index.js:5399-5411`). `requestedItem.variant` is never consulted for pricing. |
| is the selected variant only a display string? | ✅ **YES — [CODE-PROVEN]** | built by joining chosen option labels (`src/pages/ProductDetailAws.tsx:257-259`), or the raw size (`src/pages/Shop.tsx:501`). Variant labels are generated with the price embedded **inside the text** (`src/components/admin/ProductFormDialog.tsx:395-402`). |
| does the order item store the selected variant? | ✅ **YES — [CODE-PROVEN]** | carried verbatim into the snapshot (`server/src/index.js:5423-5424`), persisted to `order_items.variant` / `.size` |
| is the order item price based on the variant or the base product? | ⚠️ **BASE PRODUCT — [CODE-PROVEN]** | direct consequence of row 1 |
| **how many products are affected** | ❌ **NOT RUN** | this is Q5 |

**Confirmed defect, independent of production data:** on a product whose variants carry
different prices, the customer is charged the base product price regardless of selection.

Two qualifications, stated precisely:

1. **This is not a price-tampering vulnerability.** The client-submitted `price` is never
   read by the server; the charge always comes from the catalogue under a `for share`
   lock. The charged number is the *wrong catalogue number*, not an attacker-chosen one.
2. **Whether any customer has actually been mischarged is unknown** and is exactly what Q5
   measures. If no production listing has multiple differently-priced variants, the
   financial impact to date is zero. That cannot be asserted either way from here.

### D · Legacy order independence — ✅ **FULLY PROVEN, no production data needed**

| Sub-question | Answer | Evidence |
|---|---|---|
| `order_items` has no catalog FK | ✅ **CONFIRMED** | the only FK on the table is `order_items.order_id → orders.id`, read from `information_schema` on a fully-migrated schema |
| historical display needs no live catalog row | ✅ **CONFIRMED** | `attachOrderItems` selects only `from public.order_items` with no join (`server/src/index.js:5625-5639`); `mapOrderItem` reads only `order_items` columns (`server/src/index.js:5573-5588`) |
| price and name stored as snapshots | ✅ **CONFIRMED** | `product_name`, `product_image`, `price`, `sku`, `weight`, `weight_unit`, `variant`, `size` are all written at order time (`server/src/index.js:5783-5805`) |
| deleting/hiding a catalog product would not remove the order item | ✅ **EMPIRICALLY PROVEN** | see below |

Structural proof, executed against the **local** scratch database inside a transaction
that was rolled back:

```
BEFORE delete |           1
DELETE 1                              ← the catalogue product removed
AFTER delete  |           1           ← the order line survives

 product_name | price | quantity | variant |  sku  |              product_id
 Test Product | 99.90 |        2 | 5 kg    | SKU-1 | 22222222-2222-2222-2222-222222222222

 fk_behaviour: product_id RETAINED (no FK, no SET NULL)
ROLLBACK
```

The order line survived intact, the snapshot rendered without the catalogue row, and the
now-dangling `product_id` was neither nulled nor cascaded.

> **Scope of this proof.** It demonstrates the *schema and code behaviour*, which is
> identical in production because production runs the same 38 migrations. It does **not**
> demonstrate anything about production *data* — e.g. whether existing order rows already
> have NULL names. No destructive test was performed in production, as instructed.

### E · `defaultBusinessId` provenance

❌ **CANNOT BE RECONSTRUCTED FROM CURRENT DATA — [CODE-PROVEN negative]**

This is a definitive finding and it does not require production access to establish.

`createProduct` assigns ownership like this:

```
server/src/index.js:4436   const businessId = body.business_id || await ensureDefaultBusinessProfile();
```

and **no column anywhere records which branch was taken.** The resulting row is
byte-identical whether the caller supplied `business_id` explicitly or the fallback
supplied it. The live `business_products` schema (53 columns) contains no
`ownership_origin`, `created_by`, `assigned_via` or equivalent.

Further, **no caller in the repository supplies `business_id`** — Quick Import does not
(`src/pages/admin/AdminQuickImport.tsx:295-328`), and it is not in the create payload of
any admin screen. The same hardcoded UUID `cf941cc4-e1d1-4d7c-8122-a5df81a1e53c` is the
fallback on both server (`server/src/index.js:88`) and client
(`src/lib/productStore.ts:1-2`).

Therefore the requested four-way classification **cannot be produced**:

| Requested class | Can it be proven from current data? |
|---|---|
| 1 · verified Mipo Shop-owned | ❌ **No.** Nothing distinguishes a deliberate assignment from a fallback. |
| 2 · verified external Seller-owned | ❌ **No** — and Q3 (NOT RUN) would only reveal whether a *second* UUID exists, not whether it is verified. |
| 3 · fallback-assigned | ❌ **No.** Not recorded. |
| 4 · unresolved | ⚠️ **By elimination, every row is in this class.** |

**Per the interpretation rules, no row may be treated as Seller-owned.** A non-null
`business_id`, a repeated UUID, a `source_url`, or a known supplier origin are each
explicitly insufficient — and those are the only signals that exist. The Q2 heuristic
proposed in the design document (`source_url IS NULL` ⇒ Mipo-owned) is therefore
**downgraded from "assumption to validate" to "not a valid ownership basis"**: it
describes content provenance, not ownership. Q2 remains worth running to size the
*content* split, but its result must not be used to assign ownership.

## 5. Ownership classification

**Every `business_products` row is class 4 · unresolved**, by the argument in §4-E. This
holds regardless of what Q1–Q3 return.

Ownership cannot be established from data alone. It requires a **business ownership
review**: a human stating which products Mipo Shop genuinely owns. The migration can then
*record* that decision in `ownership_origin` (PD-14), which is exactly why that column was
designed to be written from an external decision rather than inferred.

## 6. Product and Variant price findings

Summarised from §4-C. Verified without production data:

* the selected variant does **not** influence the server-resolved price;
* variant labels carry prices as **text**, so the correct price is not even machine-readable
  from the stored value;
* the order snapshot records the selected variant but prices the line from the base product;
* pricing is nonetheless **server-authoritative** — the client price is never trusted.

Not verified, blocked on Q5: how many listings have multiple variants, and therefore
whether this defect has had any financial effect in production.

## 7. Production data anomalies

**None can be reported.** Anomaly detection requires reading production data. This section
is deliberately empty rather than speculative.

## 8. Migration blockers

| # | Blocker | Severity | Clears when |
|---|---|---|---|
| **B-1** | **No production access.** Q1–Q7 cannot run. | 🔴 **absolute** | a read-only connection or an operator-run result set is provided |
| **B-2** | **Ownership is unprovable from data** (§4-E). Not a data-gathering problem — the provenance was never recorded. | 🔴 **absolute** | a human business ownership review decides it |
| **B-3** | Catalogue-loss impact of PD-08 unmeasured (Q1) | 🔴 high | Q1 runs |
| **B-4** | Variant-pricing blast radius unmeasured (Q5) | 🟠 medium | Q5 runs |
| **B-5** | Approved-image gate impact unmeasured (Q7) | 🟠 medium | Q7 runs |
| **B-6** | Dead-table row counts unknown (Q4) | 🟡 low | Q4 runs — PD-23 already forbids dropping them, so this blocks nothing in the additive phase |

Per the interpretation rules, **the catalogue may not be hidden** until impact is measured
on: public shop, checkout, repeat purchase, existing carts, order history, and
recommendations. Of these, only **order history** is currently cleared — proven
independent in §4-D. The other five are unmeasured.

## 9. Assumptions confirmed

Confirmed **without** production data:

| Assumption | Verdict |
|---|---|
| `order_items` carries no catalogue FK; history is structurally independent | ✅ **CONFIRMED** (§4-D, empirical) |
| Order display requires no live catalogue row | ✅ **CONFIRMED** (§4-D) |
| Pricing is server-authoritative; the client price is never trusted | ✅ **CONFIRMED** (§4-C) |
| Scraped products are publicly listed and purchasable (F-1) | ✅ **CONFIRMED** (§4-A) |
| Scraped products have no Seller by construction (F-2) | ✅ **CONFIRMED** (§4-B) |
| The selected variant does not affect the charged price (F-4) | ✅ **CONFIRMED** (§4-C) |
| `supplier_id` is not used for ownership, identity or isolation | ✅ **CONFIRMED** (previous audit, §2.8 of the design document) |

## 10. Assumptions rejected

| Assumption | Verdict |
|---|---|
| *"Class A/B/C ownership can be separated by `source_url` / `image_source_url`"* (design document §CQ-07, R-1) | ❌ **REJECTED.** Those columns describe **content provenance**, not ownership. Under the stated interpretation rules a `source_url` is explicitly not an ownership basis. `FINAL-DESIGN-DECISION.md` §CQ-07 and risk R-1 must be amended. |
| *"Ownership provenance may be reconstructible from current data"* | ❌ **REJECTED.** The assignment branch is not recorded anywhere (§4-E). |

## 11. Assumptions still unproven

| Assumption | Needs |
|---|---|
| Removing discovery rows from the public feed leaves a viable catalogue | Q1 |
| A Seller other than the default UUID exists | Q3 |
| Multi-variant listings exist, so F-4 has real financial impact | Q5 |
| Order history meaningfully references discovery rows | Q6 |
| Enough listings have adopted images to pass the image gate | Q7 |
| The dead tables are empty as well as unreferenced | Q4 |
| Existing carts survive the change | not yet a query — carts are in `localStorage`, unmeasurable server-side. **Needs a client-side telemetry decision.** |
| Recommendations do not collapse when discovery rows are hidden | not yet a query — needs analysis of `productIntel.js:984` catalogue reads |

## 12. Exact recommended next step

**Do not proceed to migration design. Two things must happen, and they are independent —
run them in parallel.**

### Step 1 — have an operator run the queries and return the output

Everything needed is in one block. It is read-only, wrapped in a read-only transaction,
and touches no data.

```sql
BEGIN;
SET TRANSACTION READ ONLY;

-- Q1
select 'Q1a business_products' as q, count(*) from business_products;
select 'Q1b scraped_products'  as q, count(*) from scraped_products;

-- Q2  (content provenance only - NOT an ownership basis, see §10)
select 'Q2' as q,
       count(*) filter (where source_url is null and image_source_url is null) as class_a,
       count(*) filter (where source_url is not null)                          as class_b,
       count(*) filter (where supplier_id is not null)                         as class_c
  from business_products;

-- Q3
select 'Q3' as q, count(distinct business_id) from business_products;

-- Q4
select 'Q4a product_images'     as q, count(*) from product_images;
select 'Q4b product_variations' as q, count(*) from product_variations;

-- Q5
select 'Q5' as q, count(*) from business_products where cardinality(flavors) > 1;

-- Q6
select 'Q6' as q, count(*) from order_items where product_source = 'scraped';

-- Q7
select 'Q7' as q, count(*) from business_products where image_adopted_at is null;

-- B: ownership spread (counts only, no row data)
select 'B' as q, business_id, count(*)
  from business_products group by business_id order by count(*) desc;

ROLLBACK;
```

**Missing access requirements — any *one* of these unblocks Step 1:**

1. a read-only `DATABASE_URL` for production, reachable from this environment
   (requires outbound TCP/5432, currently blocked — see §1 route 3);
2. **or** an operator runs the block above on the production host and pastes the output
   back — *this needs no new access at all and is the fastest path*;
3. **or** SSH access to `63.183.241.110` with the deploy key, plus port 22 egress;
4. **or** real AWS credentials for `eu-central-1` with `ssm:GetParameter` on `/mipo/prod/*`,
   plus an AWS CLI installed and network reachability to the database.

> ⚠️ **Do not send the connection string, the SSM value or any password through chat,
> email or WhatsApp.** It would persist in the transcript. Option 2 avoids the problem
> entirely: the credential never leaves the production host, and only aggregate counts
> come back.

### Step 2 — business ownership review (**does not depend on Step 1**)

Because ownership provenance was never recorded (§4-E), **no query will ever answer it.**
A person must decide which products Mipo Shop genuinely owns. Until that decision exists,
`ownership_origin` (PD-14) has nothing truthful to be backfilled with, and PD-15 would
block the entire catalogue from publication.

**The migration remains blocked until Step 1 returns numbers *and* Step 2 returns a
decision.**
