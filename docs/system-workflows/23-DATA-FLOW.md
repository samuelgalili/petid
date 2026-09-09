# 23 — Data Flow

## The generic path — and how short it is

The brief's canonical flow is:

```
USER → CLIENT → API → SERVICE → DATABASE → EVENT → ASYNC → AI/EXTERNAL
     → DATABASE → NOTIFICATION → CRM
```

In Mipo today it is:

```
USER → CLIENT → API (one process, one file) → DATABASE
                 │                              │
                 └─► EVENT (outbox) ────────────┘
                        │
                   [dispatcher: no endpoint configured — stops here]
```

There is **no async tier**, **no notification tier**, and **no CRM sink**. Two
in-process loops are the entire asynchronous surface. Every other step is
synchronous inside the request.

---

## Per-workflow flows

### Signup
```
POST /api/auth/signup
  → validate, hash password
  → BEGIN
      insert app_users
      insert profiles
      emitEvent(user.registered)          ← same transaction
    COMMIT
  → Resend (fire and forget; failure does not fail signup)
  → 201 + session cookie
```
Sync: everything. Async: the email, unawaited. Persistence: 3 rows.

### Create a pet
```
POST /api/me/pets → requireUser → insert pets + emitEvent(pet.created) → 201
```
One table. No enrichment, no derived facts, no CRM update.

### Upload a document
```
POST /api/me/documents
  → decodeAndValidateDataUrl (magic bytes)
  → write to PRIVATE_UPLOAD_DIR (0600 in a 0700 dir)
  → insert pet_documents
  → 201
```
**Flow ends.** No classification, OCR, extraction, fact, event or notification.
The full target chain is in `06`.

### Chat
```
POST /api/ai/chat → requireUser → rate limit (30/h)
  → build prompt from pet + profile context
  → aiGateway.runAiRequest → adapter → Gemini (45 s timeout)
  → BEGIN ai_requests + usage_events + cost_events COMMIT   ← idempotent
  → model proposes product names
  → resolveCatalogProducts: search business_products, copy real fields
  → 200
```
The only flow in the product that touches an external service, meters it, and
reconciles the model's output against a trusted store. It is the template.

### Pet character
```
POST /api/me/pets/:id/character
  → validate consent, ≤3 photos, no job in flight
  → store photos, insert pet_characters (generating_candidates)
  → schedulePetCharacterJob(id, "candidates")     ← in-process promise chain
  → 202 immediately
       │
       ├─ analyzeReferences  (Gemini vision)
       ├─ 2 candidate images (Gemini image)
       ├─ recordExternalUsage(feature=pet_character, unit=image)
       └─ insert pet_character_assets, status → awaiting_selection

POST …/character/select
  → status generating_pack → 6 expression images → validate pack
  → one corrective retry if inconsistent → status ready | failed
```
The only real background work in the product. `202` + polling is the right
shape. The queue is a promise chain in one process — see `25`.

### Order and payment
```
POST /api/orders → validate → BEGIN insert orders + order_items
                              + upsert shop_customers
                              + emitEvent(order.created) COMMIT
POST /api/payments/shop → CardCom hosted page URL → redirect
CardCom → webhook → verify secret → insert cardcom_events
                                  → update orders.payment_status
                                  → emitEvent(order.paid|payment_failed)
```

### Feed read
```
GET /api/feed → requireUser
  → one SQL statement with correlated subqueries for
    reaction_count, comment_count, viewer_has_liked, viewer_has_saved,
    poll_results (generate_series over poll_options)
  → cursor on published_at
```
One query per page, no N+1. Good.

---

## Persistence points

| Store | What | Backed up? |
|---|---|---|
| PostgreSQL (container, same host) | all 53 tables | ✅ `pg_dump` before every migration |
| `/app/uploads` (bind mount) | avatars, Moment media, product images | ❌ **no backup in any deploy script** |
| `/app/private-uploads` (bind mount) | pet documents | ❌ **no backup** |
| Browser `localStorage` | cart, favourites, onboarding flag | ❌ by nature |
| In-process memory | rate limiter, character job queue | ❌ lost on restart |

The two ❌ file stores hold the data users would be most upset to lose.

## External calls

| Service | When | Sync? | Failure |
|---|---|---|---|
| Gemini | chat, product intel, character, background removal | sync inside a job/request | typed, metered |
| Resend | password reset, email verification | fire and forget | logged, non-fatal |
| CardCom | payment page + webhook | sync out, async in | recorded in `cardcom_events` |
| Firecrawl | product import (admin) | sync | `UNKNOWN` |
| `AUTOMATION_WEBHOOK_URL` | outbox delivery | async, 5 s tick | backoff, 8 attempts |

## What the flows tell you

Three observations fall straight out of the diagrams:

1. **Writes are single-table and terminal.** A pet is created and nothing else
   happens. A document is stored and nothing else happens. There is no
   downstream anywhere except in commerce and AI.
2. **The event stream is written and never read.** Every `emitEvent` call is a
   write into a queue with no consumer.
3. **The only two flows with real depth are chat and character generation** —
   and both are AI flows, both are metered, and both reconcile against a
   trusted store or a validated schema. They are the model for how document
   intelligence, activity and matching should be built.
