# Stage 1A — what is built, and what a working marketplace still needs

Status of the shop as of this commit. Written from the code, not from the plan:
every "done" below has a route, a migration or a test behind it, and every "not
done" says what specifically is missing.

**Nothing here is deployed.** M1b must not reach production before D-18 has run.

---

## Done

### Schema — 9 migrations, `0041`–`0049`, all additive

| | |
|---|---|
| `0041` | M1b: four roles + `admin_users_scope_check` |
| `0042` | `raw_import_records`, frozen after insert by trigger |
| `0043` | `product_drafts` |
| `0044` | `catalog_products` with a real `publication_state` |
| `0045` | `product_variants` — the sellable unit |
| `0046` | `seller_offers` — where price lives |
| `0047` | `inventory` — per offer, defaulting to `OUT_OF_STOCK` |
| `0048` | `product_media` — source / adopted / approved as three facts |
| `0049` | `business_profiles.commercial_status` |

No column dropped, no type changed, no row rewritten. Apply and re-apply verified
clean.

### Identity and isolation

* four roles with explicit scopes; no `"*"` wildcard, so an undeclared permission
  is denied to everybody including `admin`
* `provisionAdmin.js --business-id`, writing role and scope in one statement
* session carries `business_id`, `scope` and `identity_source`
* the `isAdminRequest` field leak is closed — decided per row, not per request
* cross-Seller answers 404, never 403; attempts are audited

### Product Intake — the chain is closed end to end

```
import → draft → submit → review → approve → product
       → variant → offer → inventory → media → approve → publish
```

19 routes. Verified as one continuous walk through HTTP with a real
`seller_admin` and a real `product_manager`, including the refusals: review
cannot be skipped, a Seller cannot approve, a submitter cannot approve their own
draft, and publication fails while the gate is unmet.

### Public catalogue on the new model

`GET /api/catalog` and `GET /api/catalog/:id`, served **alongside**
`/api/products` rather than replacing it — see the cutover note below. Visibility
is re-checked at read time rather than trusted from `publication_state`, so
suspending a Seller or running out of stock removes a product immediately.

---

## Not done

| # | What | Blocked by |
|---|---|---|
| **N-1** | **Production validation (D-18)** | no production access. Everything below is downstream of this |
| **N-2** | **The first Seller** | needs production DB access: approve a business, then `provisionAdmin --business-id`. After `0049` every business reads `commercial_status = 'none'`, including `Mipo Shop` |
| **N-3** | **Legacy catalogue cutover** | a decision. `/api/products` still reads `business_products`; nothing was migrated, and legacy ownership is deliberately not legitimised. Switching the route would empty the shop |
| **N-4** | **Cart** | **B-2** — there is no cart table at all; the cart is client-side. Client-side or server-side is undecided |
| **N-5** | **Checkout** | N-4. The resolution order is documented and `resolveOfferForPurchase()` exists unused; checkout itself is untouched |
| **N-6** | **Seller orders** | **B-3** — `orders` has no `business_id`, `order_items.product_id` has no FK |
| **N-7** | **Commission and settlement** | **B-4** — Cardcom split-payment capability unverified |
| **N-8** | **Frontend** | Seller admin screens, review queue, intake wizard, product page with variant selection. No frontend work was done in this stage |

### The cutover, stated plainly

`/api/catalog` currently returns **nothing in production**, because nothing has
been through intake. That is correct, not broken. Three things have to happen
before the shop can read from the new model:

1. a Seller exists and is approved (N-2)
2. products exist in the new model — imported, reviewed, published
3. a decision on the ~10 existing `business_products` rows: migrate them through
   intake, or retire them

Until then both routes coexist and the shop is unchanged.

---

## Order of work, unchanged

```
D-18  →  deploy M1b alone  →  first Seller  →  intake real products
      →  cutover  →  cart  →  checkout  →  seller orders  →  settlement
```

M1b is safe to deploy on its own precisely because it is not connected to
anything a customer touches: it adds columns and constraints, closes a leak, and
adds routes nothing calls yet. The shop keeps reading `business_products`
exactly as it does today.
