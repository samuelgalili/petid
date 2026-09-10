# 25 — API Contract

Design only. Nothing here is implemented, and **most of it should not be** —
the first rule is reuse.

## Reuse before addition

| Need | Existing route | Change |
|---|---|---|
| Pet identity CRUD | `GET/POST/PATCH/DELETE /api/me/pets[/:id]` | **none** — `serializePet` gains optional fields (`24`) |
| Health summary | `GET /api/me/pets/:id/health-summary` | extend with facts |
| Vet visits, vaccinations | `GET/POST /api/me/pets/:id/{vet-visits,vaccinations}` | **add `PATCH`/`DELETE`** — a mistyped date is currently permanent |
| Documents | `GET/POST /api/me/documents`, `/:id/file`, `DELETE` | extend the response with `status` and extraction counts |
| Products | `GET /api/products`, `/api/products/:id` | add an optional `?pet_id=` for match annotation |
| Chat | `POST /api/ai/chat` | richer context; same contract |
| Public pet | `GET /api/public/pets/:id` | **do not touch** — its own privacy projection |

Everything above is additive. No new endpoint replaces one of these.

---

## Proposed endpoints, each with a justification

### Pet 360
```
GET /api/me/pets/:id/360
```
**Why not extend `/api/me/pets/:id`?** Because it is a fan-out read — facts,
observations, records, documents, timeline, insights — and making it the default
would slow every list, every card and every chat context. Separate route, opt-in
cost. Response shape in `02`.

### Facts
```
GET    /api/me/pets/:id/facts?namespace=&key=&include_history=
POST   /api/me/pets/:id/facts            USER_PROVIDED only
PATCH  /api/me/facts/:factId             confirm | dispute | reject — never edit a value
DELETE                                    ✗ does not exist
```
There is no fact delete. A wrong fact is `REJECTED`, which is a status change
that keeps the audit trail (`05`). Values are never edited in place — a
correction is a new fact that supersedes.

`POST` accepts only `USER_PROVIDED`. Derived, activity-derived, purchase-derived
and document-extracted facts have their own producers; a client that could assert
`VET_DOCUMENT` could forge provenance.

### Observations
```
GET  /api/me/pets/:id/observations?type=weight&from=&to=
POST /api/me/pets/:id/observations
```
`GET` returns points **and** the derived trend, so the client never computes a
trend itself and two screens cannot disagree about it — the
`petSafetyScore.ts` lesson applied.

### Timeline
```
GET /api/me/pets/:id/timeline?cursor=&kinds=
```
Cursor on `(occurred_at, id)` — the same stable shape `listSocialFeed` already
uses.

### Documents
```
GET  /api/me/documents/:id/extractions
POST /api/me/documents/:id/reprocess           idempotent on content_hash
POST /api/me/documents/:id/review              batched: accept/reject many at once
```
One review call per document, never one per extraction (`16`).

### Matching
```
GET /api/me/pets/:id/product-match/:productId    one product, full evidence
GET /api/me/pets/:id/recommendations?section=    for_my_pet | buy_again |
                                                  alternatives | because
```
`GET /api/products?pet_id=` annotates a list; the two routes above are for the
product page and the Store sections. All three call the same
`productMatching.js` — one evaluator, three consumers (`19`).

### Insights
```
GET  /api/me/pets/:id/insights
POST /api/me/insights/:id/dismiss
```

### Preferences and commerce
```
GET/PUT/DELETE /api/me/pets/:id/preferences
GET            /api/me/pets/:id/purchases        needs order_items.pet_id (15)
PATCH          /api/me/orders/:id/items/:itemId  set pet attribution
```

### CRM (admin)
```
GET   /api/admin/customers/:id/pets
GET   /api/admin/pets/:id/360                    full provenance
GET   /api/admin/facts/disputed
GET   /api/admin/documents/review-queue
PATCH /api/admin/facts/:id/verify                VET_CONFIRMED — needs a vet identity
```
The last one has no producer today (`04`). The two queue routes are what stop
`DISPUTED` and `REVIEW_REQUIRED` from being silent dead ends (`21`).

---

## Cross-cutting requirements

**Every response carrying a fact carries its provenance.** There is no "light"
fact shape. A consumer that renders a value cannot avoid knowing where it came
from — that is the point of the whole model.

**Absence is explicit.** `INSUFFICIENT_DATA`, `NOT_AVAILABLE`, `null` — never an
empty array that reads as "this pet does nothing" and never a zero that reads as
"dangerous" (`petSafetyScore.ts` already gets this right).

**Authorization** follows `22`: owner, or an active grant covering the requested
scope. Enforced in the query, in the style already used everywhere —
`where user_id = $1`, extending to `owner_scope_id`.

**Rate limits** reuse the existing named-bucket mechanism. New buckets:
`petFactWrite`, `documentReprocess`, `matchEvaluate`.

**Errors** use the existing typed-code pattern — `INVALID_REFERENCE_PHOTOS`,
`REFERENCE_PHOTOS_FACE_ONLY` are the model. Proposed:
`UNKNOWN_FACT_KEY`, `SPECIES_NOT_APPLICABLE`, `CLINICAL_SOURCE_REQUIRED`,
`FACT_DISPUTED`, `AI_CONSENT_REQUIRED`.

**Versioning.** There is no `/v1` anywhere in the current API and this design
does not introduce one. Additive changes only; a breaking change would need the
versioning decision made first, which is an `OPEN DECISION`.

---

## Endpoints deliberately not proposed

| Not proposed | Why |
|---|---|
| `GET /pets/:id/intelligence` | vague. `/360`, `/facts` and `/insights` cover it with defined shapes |
| `GET /pets/:id/health` | `/health-summary` exists |
| `GET /pets/:id/activity` | `14` does not exist; an endpoint returning `NOT_AVAILABLE` is not worth shipping |
| `POST /facts/bulk` | no caller needs it; it would be the easiest way to bypass conflict resolution |
| Anything returning raw walk points | `22` — a route is a map of where someone lives |
| A public pet-facts endpoint | clinical data has no public surface |

## Build order

```
1. /facts (read)  +  /observations       ← nothing else works without them
2. /360                                   ← composes them
3. /documents/:id/extractions + /review   ← 16
4. /product-match + ?pet_id=              ← 18
5. /timeline                              ← 08, a projection, any time
6. /insights                              ← 20
7. admin queues                           ← 21
```
