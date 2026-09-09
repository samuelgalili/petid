# 26 — Analytics Events

## Status: `MISSING`

There is no product analytics. No provider, no SDK, no event table, no
funnel.

The clearest evidence is a function that exists and does nothing:

```ts
// src/hooks/useActivityTracker.ts
const trackClick = useCallback((_elementId: string, _elementLabel?: string) => {
  // Click analytics endpoint is not available on AWS yet.
}, []);
```

Every call site records nothing. The comment is honest, which is better than a
silent no-op, but the effect is the same.

## What measurement does exist

| Surface | What it measures | Where |
|---|---|---|
| Admin analytics | orders, revenue, customers | `GET /api/admin/analytics` |
| AI economics | tokens, credits, cost by provider / model / feature / user / time | `aiEconomics.js`, 7 routes |
| CRM aggregates | orders count, paid count, total spent, first/last order, pets count | `customerIdentityQuery` |
| Presence | `profiles.last_active_at` — the one thing `useActivityTracker` really does |
| Admin audit | `admin_audit_log` (11 cols) |

So Mipo can answer **what it earned and what AI cost**, in detail, from
reconcilable ledgers. It cannot answer **what users did**.

Nothing measures: onboarding completion, pet creation rate, document uploads,
store sessions, product views, add-to-cart, checkout start, checkout
abandonment, feed engagement, or retention.

---

## Event taxonomy (PROPOSED — map first, implement later)

The brief says to map the taxonomy before implementing, and there is a good
reason to here specifically: **`outbox_events` already exists** and is the
natural spine. Every event below that is a server-side fact should be an
outbox type, not a second telemetry pipeline.

### Server-side (extend `EVENT_TYPES` in `server/src/events.js`)

| Event | Exists? | Key properties |
|---|---|---|
| `user.registered` | ✅ | source |
| `onboarding.started` | ❌ | |
| `onboarding.completed` | ❌ | duration, fields provided, photo yes/no |
| `pet.created` | ✅ | species, has_photo, has_breed |
| `pet.updated` | ❌ | fields changed |
| `document.uploaded` | ❌ | type, size, has_pet |
| `document.processed` | ❌ | facts extracted, confidence |
| `health_fact.created` | ❌ | key, source class |
| `moment.created` | ❌ | media type, has_pet, visibility |
| `order.created` / `paid` | ✅ | |
| `order.delivered` | ❌ | |
| `product.reorder_due` | ❌ | |
| `walk.started` / `completed` | ❌ | blocked on `08` |
| `park.checked_in` / `out` | ❌ | blocked on `09` |

Adding a server event is one `EVENT_TYPES` entry plus one `emitEvent` call
inside the transaction that already exists. That is a very low cost per event.

### Client-side (a different pipeline, and it needs one)

These never reach the server today because they are not writes:

```
app.opened · onboarding.step_viewed · store.opened · product.viewed
product.recommended · search.performed · cart.item_added · cart.viewed
checkout.started · checkout.abandoned · feed.moment_viewed
feed.moment_completed · permission.requested / granted / denied
```

`product.viewed` and `checkout.abandoned` are the two with direct revenue
value, and neither can be inferred from any existing table.

---

## Design rules

1. **One taxonomy, two transports.** Server facts through `outbox_events`;
   client interactions through a separate ingest. Do not duplicate a server
   fact as a client event — they will disagree and the disagreement will be
   unresolvable.
2. **Version the payload.** `payload_version` on the event, from day one. The
   same recommendation as `18`.
3. **Never PII in properties.** Ids, not emails; species, not pet names.
   `sanitizeProviderError` is the existing precedent for cleaning at the
   boundary rather than at the sink.
4. **Consent-aware.** `profiles.marketing_consent` governs marketing; product
   analytics needs its own basis and its own switch.
5. **Aggregate, do not retain forever.** There is no retention policy anywhere
   (`20`) and one host's disk. Raw events roll up and expire.

## Sequencing

Analytics is P2, and deliberately so. Implementing it before `18` is consumed
means building a second event system next to the correct one that exists. The
right order is:

```
18 (declare the missing types, add payload_version, add an internal cursor)
   → 26 server-side analytics for free from the same stream
   → 26 client-side ingest, separately, when there is a question to answer
```

Choosing an analytics vendor is `REQUIRES PRODUCT DECISION` and is not a
technical blocker: the taxonomy above is vendor-independent.
