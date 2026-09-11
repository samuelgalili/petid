# 21 — CRM Integration

## What exists, and it is the right foundation

`customer_identities` (migration `0017`) solves the hard problem in this domain:
the same person can be a guest checkout, an account, and several
`shop_customers` rows. The precedence rule is stated in the code:

```sql
coalesce(o.user_id, sc.user_id, o.customer_id)   -- ORDER_IDENTITY_EXPRESSION
```

> "An order belongs to the account that placed it, or — for a guest checkout —
> to the account that has since claimed the commerce row, or to the guest row
> itself. Same precedence `customer_identities` uses for `identity_id`, so the
> two always agree on who a person is."

The customer query aggregates orders, paid orders, total spent, first/last order
and **pets count**, with a `distinct on (identity_id)` guarding the case of two
`shop_customers` rows claimed by one account. That is careful work.

`customer_notes` carries `kind ∈ note | call | whatsapp | email | meeting` — a
real interaction log.

**Do not build a second CRM.** `customer_identities` stays canonical for people.

---

## What the CRM cannot see

| Domain | In the CRM today |
|---|---|
| Identity, guest reconciliation | ✅ |
| Orders, spend, recency | ✅ |
| **Pets** | 🟡 **a count only** — `pets_count`. No names, no species, no ages |
| Health, documents | ❌ |
| Activity | ❌ nothing to see |
| Social | ❌ |
| AI usage per customer | 🟡 `getTopCostUsers`, "data only" |
| Support | ❌ no ticket table |
| Lifecycle stage | ❌ |
| Events | ❌ `outbox_events` is not read by any CRM view |

It answers *"who buys"* and not *"who is this person and what animal do they care
for"*. For a pet platform that is the wrong half.

---

## Target: Pet 360 inside the CRM

```
customer_identities  (canonical person — unchanged)
          │
          ├── pets ──┬── pet_facts (with provenance)
          │          ├── pet_observations
          │          ├── health records + documents
          │          ├── timeline (projection, 08)
          │          └── insights (projection, 20)
          │
          ├── order_items (pet_id) ──► purchases per pet        (15)
          │
          └── interactions: customer_notes + support + comms
                          │
                  lifecycle view: acquisition → activation →
                                  retention → churn risk
                          │
                  fed by outbox_events (07) via a consumer cursor
```

### The CRM pet view

```
PET  Blue · Labrador · 4y 5m · male, neutered · ADULT
├── Overview      identity + current derived values, each with its source
├── Health        conditions, allergies, medications, vaccinations, visits
├── Nutrition     current food (product ref), diet, avoidances
├── Activity      NOT_AVAILABLE
├── Behavior      characteristics, with source and confidence
├── Preferences   with confidence and decay state
├── Commerce      purchases attributed to this pet, reorder estimate
├── Documents     with extraction status and review queue
├── Timeline      the projection
├── Facts         every fact, including SUPERSEDED and DISPUTED
└── Intelligence  insights, predictions, AI cost for this pet
```

### Provenance is always visible here

The CRM is the audience the provenance model was built for.

```
Weight        28.2 kg
              מקור: מסמך וטרינרי · DOC-123 · 9 בספטמבר 2026
              ודאות: HIGH · אימות: DOCUMENT_EXTRACTED
              [ פתח מסמך ]  [ היסטוריה (3) ]

Energy        HIGH
              מקור: פעילות · חלון 3 שבועות · ודאות: MEDIUM

Chicken       DISPUTED  ⚠️
              המשתמש: רגישות (2 בנובמבר 2025)
              מסמך DOC-123: לא נמצאה רגישות (9 בספטמבר 2026)
              → ממתין לאישור הבעלים. בינתיים: הגישה המחמירה חלה.
```

Three things the customer app must never show and the CRM must always show:
superseded facts, disputed facts, and confidence.

---

## Two queues the CRM owns

The CRM is where human review happens, and two of this design's states need a
human:

1. **`DISPUTED` facts** — indexed via `(status) where status = 'DISPUTED'` (`03`).
   These are mostly resolved by the owner in-app, but the CRM needs the view for
   support conversations.
2. **`REVIEW_REQUIRED` documents** — extractions the pipeline could not settle:
   illegible scans, multi-pet documents, low-confidence clinical values (`16`).

Without these two screens, both states are dead ends that accumulate silently.

---

## Lifecycle, from events

The event stream already records the right moments transactionally. A customer
timeline is that stream filtered by identity — and nothing consumes it today.

```
user.registered → pet.created → document.uploaded → order.created →
order.paid → … → churn signal (no order + no activity + decayed preferences)
```

Read `outbox_events` with a per-consumer cursor (`07`). Do not duplicate the
canonical data into a CRM store: the CRM composes, it does not copy.

---

## Three steps, in order

1. **`order_items.pet_id`** (`15`). Without it the CRM cannot answer a single
   pet-aware commercial question, and every downstream idea here is blocked.
2. **Pet context on the customer screen.** Names, species, ages, open health
   items. All of it already exists in `pets`; it simply is not joined in. This is
   the cheapest visible improvement in the whole document.
3. **An event consumer** for the customer timeline.

---

## What not to build

| Not this | Because |
|---|---|
| A separate CRM database | `customer_identities` is canonical |
| A duplicate contact model | `shop_customers` + `app_users` + `profiles`, already resolved |
| A marketing consent store | `profiles.marketing_consent*` + `marketing_opt_out_log` exist and are correct |
| A duplicate event bus | `outbox_events` |
| A copy of pet facts in CRM tables | the CRM reads Pet 360; it does not mirror it |

## Access control

The CRM shows health data. That is a real exposure and it needs a real rule.

- Today: `requireAdminPermission(FULL_ACCESS)` on every `/api/admin/customers*`
  route. There are two roles — `admin` (`*`) and `product_manager` — and
  `product_manager` cannot reach customers at all. That is correct as far as it
  goes.
- **Proposed:** a distinct permission for clinical data — `customers.health.read`
  — so a support agent can see orders and pets without seeing a diagnosis. The
  RBAC system already supports fine-grained permissions (the catalogue routes use
  five of them individually), so this is a new constant and a new route guard,
  not a new mechanism.
- Every read of clinical data by staff writes to `admin_audit_log` (11 columns,
  already exists). Health access that is not logged is health access nobody can
  answer for.

Listed as an `OPEN DECISION` in `28` only because the role split is a product
call; the mechanism is already there.
