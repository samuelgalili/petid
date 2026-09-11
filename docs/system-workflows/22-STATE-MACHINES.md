# 22 — State Machines

Only states that exist in the code are listed as existing. Proposals are marked.

---

## Pet — `PARTIALLY IMPLEMENTED`

```
                  archive
   ┌──────────┐ ──────────► ┌──────────┐
   │  ACTIVE  │             │ ARCHIVED │
   └────┬─────┘ ◄────────── └──────────┘
        │         restore
        │  is_lost = true / false
        ▼
   ┌──────────┐
   │   LOST   │  ← a flag on ACTIVE, not a state
   └──────────┘
```

Columns: `archived`, `archived_at`, `is_lost`, `lost_since`.
Events: `pet.created`, `pet.marked_lost`, `pet.found`, `pet.qr_scanned`.

**`DECEASED` is `MISSING`** — the word appears nowhere in `src/` or
`server/src/`. `ARCHIVED` is currently doing double duty for "rehomed",
"deceased" and "hidden", which are three different things to a user and to the
product. `PROPOSED`:

```
ACTIVE ──► ARCHIVED (reversible, user's choice)
       └─► DECEASED (with a date; memorial state, records retained, no
                     reminders, no product recommendations, no reorder
                     prompts, no birthday notifications)
```

The behavioural consequences matter more than the enum value: nothing in the
system should try to sell food to a dead pet. That is the reason to build it.

---

## Document — `MISSING`

`pet_documents` has **no status column**. Every document is implicitly
"uploaded" forever.

`PROPOSED` (from `06`):

```
UPLOADED ──► PROCESSING ──┬──► PROCESSED ──► ARCHIVED
                          ├──► REVIEW_REQUIRED ──► PROCESSED
                          └──► FAILED ──► (retry) ──► PROCESSING
```

`REVIEW_REQUIRED` is reached by: low extraction confidence, a clinical fact
that must be confirmed, multiple pets named, or a contradiction with an
existing fact.

---

## Walk — `MISSING`

No table. `PROPOSED` (from `08`):

```
CREATED ──► ACTIVE ⇄ PAUSED ──► COMPLETED
               │
               ├──► RECOVERABLE ──► COMPLETED   (app closed, points buffered)
               └──► FAILED                       (no usable data)
```

`RECOVERABLE` is required, not optional: a mobile app is backgrounded and
killed routinely. `resumePetCharacterJobs()` is the precedent — the codebase
already knows a job can be interrupted by a restart.

---

## Park check-in — `MISSING`

`PROPOSED` (from `09`):

```
ACTIVE ──┬──► ENDED    (user checks out)
         └──► EXPIRED  (TTL passes)
```

Expiry via a `where expires_at > now()` read predicate, not a background job —
there is no reliable scheduler (`25`), and a read-time predicate cannot
silently stop working.

---

## Order — `EXISTS`, with three axes and only one constrained

```sql
CHECK (status IN ('pending','processing','shipped','delivered','cancelled'))
```

```
pending ──► processing ──► shipped ──► delivered
    │            │             │
    └────────────┴─────────────┴──► cancelled
```

| Axis | Constrained? | Notes |
|---|---|---|
| `status` | ✅ CHECK | the five above |
| `payment_status` | ❌ | default `pending`; code also sets `awaiting_cod`, `paid`, and reads `paid` in the CRM aggregate |
| `shipping_status` | ❌ | default `label_created` |

No transition guard exists — `updateOrder` validates the *value* against
`orderStatuses` but not the *transition*, so `delivered → pending` is accepted.
Worth adding a transition table; worth adding CHECKs to the other two axes.

Events: `order.created`, `order.paid`, `order.payment_failed`,
`order.status_changed`, `order.shipped`. **No `order.delivered`.**

---

## Pet character — `EXISTS`, the best-modelled machine in the codebase

```sql
CHECK (status IN ('generating_candidates','awaiting_selection',
                  'generating_pack','ready','failed'))
```

```
                  POST /character
                        │
             generating_candidates
                        │
            ┌───────────┴───────────┐
       candidates ok            provider error
            │                        │
     awaiting_selection            failed ──► retry (POST again)
            │
     POST /character/select
            │
      generating_pack
            │
      ┌─────┴─────┐
   pack ok    inconsistent
      │            │
    ready       failed
```

`error_code` carries a typed reason (`INVALID_REFERENCE_PHOTOS`,
`REFERENCE_PHOTOS_FACE_ONLY`, `NO_GENERATED_IMAGE`,
`INCONSISTENT_CHARACTER_PACK`). `generation_version` increments so cached asset
URLs bust. Boot recovery re-queues anything left in a `generating_*` state.

Gap: **no timeout.** A job that hangs rather than throws leaves the row in
`generating_*` indefinitely, and `startPetCharacterGeneration` then returns 409
"already in progress" forever.

---

## Other constrained states in the schema

| Table | Column | Values |
|---|---|---|
| `outbox_events` | `status` | pending, delivering, delivered, failed, skipped |
| `ai_requests` | `status` | pending, running, succeeded, failed, fallback, cancelled, timed_out |
| `social_posts` | `moderation_status` | published, hidden, review |
| `social_posts` | `visibility` | public, private |
| `social_post_comments` | `status` | published, deleted, hidden |
| `pet_character_assets` | `asset_type` | candidate, expression |
| `admin_users` | `role` | admin, product_manager |
| `pets` | `type` | dog, cat, other |
| `customer_notes` | `kind` | note, call, whatsapp, email, meeting |

Unconstrained states that should be constrained: `orders.payment_status`,
`orders.shipping_status`, `insurance_claims.status`,
`pet_service_bookings.status`, `dog_parks.status`, `scraping_jobs.status`.
