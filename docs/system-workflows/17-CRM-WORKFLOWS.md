# 17 — CRM Workflows

## Status: `PARTIALLY IMPLEMENTED` — a commerce CRM, not a pet CRM

### What exists, and it is better built than it first appears

The hard problem in this domain is identity: the same person can be a guest
checkout, an account, and several `shop_customers` rows. The codebase solves it
with a real identity resolution layer.

`customer_identities` (migration `0017`) plus `ORDER_IDENTITY_EXPRESSION`:

```sql
coalesce(o.user_id, sc.user_id, o.customer_id)
```

> "An order belongs to the account that placed it, or — for a guest checkout —
> to the account that has since claimed the commerce row, or to the guest row
> itself. Same precedence `customer_identities` uses for `identity_id`, so the
> two always agree on who a person is."

The customer query then aggregates orders, paid orders, total spent, first and
last order, and **pets count**, with a `distinct on (identity_id)` guarding the
case of two `shop_customers` rows claimed by one account. That is careful work,
and it is the seed of a real CRM.

### Admin surface
```
GET    /api/admin/customers            list + search
GET    /api/admin/customers/:id        one identity
POST   /api/admin/customers/:id/notes  add a note
DELETE /api/admin/customers/:id/notes/:noteId
```
`customer_notes` has `kind` ∈ note, call, whatsapp, email, meeting — a real
interaction log. Screens: `/admin/customers`, `/admin/orders`,
`/admin/analytics`, `/admin/ai-economics`.

Supporting tables: `external_refs` (`0018`) and `entity_identifiers` (`0021`)
for mapping Mipo entities to external system ids — the integration seam an ERP
or an external CRM would use.

---

## What the CRM does not see

The brief asks the CRM to understand
`User → Pets → Events → Purchases → Interactions → Lifecycle`. Today:

| Domain | In the CRM? |
|---|---|
| User identity, guest reconciliation | ✅ |
| Orders, spend, recency | ✅ |
| Pets | 🟡 **a count only** — `pets_count`. No names, no species, no health |
| Health / documents | ❌ |
| Activity | ❌ nothing to see |
| Social | ❌ |
| AI usage per customer | 🟡 `getTopCostUsers` exists in `aiEconomics.js`, and its comment says it is "exposed as data only… not wired to any" enforcement |
| Support | ❌ `/support` is a page; no ticket table |
| Lifecycle stage | ❌ |
| Events | ❌ `outbox_events` is not read by any CRM view |

So it answers "who buys" and not "who is this person and what animal do they
care for". For a pet platform that is the wrong half.

### The blocker, again
`orders` has **`pet_name TEXT` and no `pet_id`**. Purchases cannot be attributed
to a pet by key. Every pet-aware CRM question — which pets drive spend, what
does a senior cat household buy, when is this dog's food due — is unanswerable
until that column exists. It is the same finding as `14` and `13`, reached from
a third direction, which is why it ranks P0 in `30`.

---

## Target model (PROPOSED)

**Do not add a second CRM.** `customer_identities` is canonical for people and
is already correct. Extend it:

```
                 customer_identities  (canonical person)
                            │
        ┌───────────────────┼────────────────────┐
        │                   │                    │
     orders             pets → pet_facts     interactions
  (needs pet_id)        (needs 04/05)      (customer_notes +
        │                   │              support + comms)
        └───────────────────┼────────────────────┘
                            │
                     lifecycle view
        (acquisition → activation → retention → churn risk)
                            │
                     fed by outbox_events (18)
```

Three concrete steps, in order:

1. **`orders.pet_id`** — a nullable FK, backfilled where `pet_name` matches
   exactly one of the user's pets and left null otherwise. Never guessed.
2. **A CRM read of `outbox_events`** — a customer timeline is the event stream
   filtered by identity. The events already exist and already carry
   `entity_type` + `entity_id`; nothing consumes them.
3. **Pet context on the customer screen** — names, species, ages, open health
   items. All of it already exists in `pets`; it simply is not joined in.

### What not to build

- A separate CRM database. `customer_identities` is the source of truth.
- A duplicate contact/company model. `shop_customers` + `app_users` +
  `profiles` already carry it, resolved.
- A marketing consent store. `profiles.marketing_consent*` and
  `marketing_opt_out_log` exist and are correct.
- A duplicate event bus. `outbox_events` is the one.

## Support — `MISSING`

`/support` (`src/pages/Support.tsx`) is a `Protected` page. There is no ticket
table, no support route, no assignment, no SLA. What the page does is
`UNKNOWN` beyond rendering; it was not read in depth for this audit.
