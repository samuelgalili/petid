# 42 — Event Data Contract

## §18 — Identify what exists first

`server/src/events.js` + `outbox_events` is a **correct transactional outbox**:

- `emitEvent(client, …)` writes inside the caller's transaction — no event
  without the business write, no business write without the event
- `claimDueEvents` uses `UPDATE … FOR UPDATE SKIP LOCKED`, so two dispatchers
  cannot double-deliver
- HMAC-SHA256 signed delivery, verified with `timingSafeEqual`
- backoff `[10s, 60s, 5m, 30m, 2h]`, capped at 8 attempts
- `originFromRequest` honours `X-Mipo-Origin: automation` and **only** that
  value, so a caller cannot claim to be the system
- database CHECKs constrain the shape:
  `event_type ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'`,
  `entity_type ~ '^[a-z][a-z0-9_]{1,39}$'`,
  `status IN ('pending','delivering','delivered','failed','skipped')`
- it **never throws into a business path**

**No second event system.** Pet events are `EVENT_TYPES` entries and `emitEvent`
calls. The mechanism does not change.

### The 16 declared types
```
user.registered
order.created · order.paid · order.payment_failed
order.status_changed · order.shipped
pet.created · pet.marked_lost · pet.found · pet.qr_scanned
insurance_claim.submitted · service_booking.created · content.reported
```

Four pet events already exist. `pet.qr_scanned` is emitted **before** the log
write so the alert survives a logging failure — which is fortunate, because the
table it writes to (`qr_scan_logs`) does not exist.

### Why nothing happens today
`AUTOMATION_WEBHOOK_URL` is not in `deploy/aws/sync-ssm-env.sh`'s key list. In
production it is unset, the dispatcher logs and returns a no-op, and events
accumulate. Deliberate: enabling delivery later replays everything recorded while
it was off.

---

## Three additions the outbox needs

### 1. `pet_id` as a first-class column
Today an event has `entity_type` + `entity_id`. A walk event's entity is the
walk, so "everything that happened to Blue" would require knowing every entity
type that can reference a pet.

The AI ledgers already do this — `ai_requests`, `usage_events` and `cost_events`
all carry `pet_id`. The event table should match.

### 2. `payload_version`
`payload` is free-form jsonb with no version. A consumer cannot tell v1 of
`order.paid` from v2. **Add before the first consumer exists** — cheap now,
breaking later.

### 3. An internal consumer cursor
Delivery is one webhook. Internal consumers (timeline, insights, CRM, analytics)
should read `outbox_events` directly with their own cursor rather than compete
for the same delivery status:

```
event_consumers   consumer_key, last_event_id, last_processed_at, status
```

Keep the webhook for external automation. Do not build a broker for a
single-host deployment.

---

## The pet event catalogue

`EXISTS` = declared today. All else `PROPOSED`.

### Profile
| Event | Status | Payload |
|---|---|---|
| `pet.created` | **EXISTS** | species, has_photo, has_breed |
| `pet.updated` | PROPOSED | `changed_fields[]` — **names, never values** |
| `pet.archived` / `.restored` | PROPOSED | |
| `pet.deceased` | PROPOSED | needs the state (`53`) |
| `pet.deleted` | PROPOSED | matters: deletion orphans documents |
| `pet.marked_lost` / `.found` / `.qr_scanned` | **EXISTS** | |

### Facts — one generic event, not one per key
```
pet_fact.created      namespace, key, source_type, confidence, is_sensitive
pet_fact.superseded   fact_id, superseded_by, reason
pet_fact.disputed     fact_ids[], key
pet_fact.confirmed    fact_id, by whom
pet_fact.resolved     fact_id, effective_to
```

> **Clinical fact events carry the key, never the value.**

The outbox delivers to an external endpoint. A payload reading "Blue is allergic
to chicken" is a health disclosure the owner never agreed to. Consumers that need
the value read it back through an authorized API.

One generic fact event beats forty typed ones precisely because there is then
**one place** to get this right.

### Health, documents, observations
```
health_record.created · vaccination.recorded · vaccination.due
medication.started · medication.ended
document.uploaded · .processing_started · .processed · .failed · .review_required
weight.recorded        ← an OBSERVATION event, distinct from the fact event
```

### Activity, social, commerce
```
walk.started · walk.completed · walk.abandoned      (37)
park.checked_in · park.checked_out
moment.created                                      ← social emits nothing today
order.created · .paid · .shipped     EXISTS, + pet_id per line (39)
order.delivered · product.reorder_due               PROPOSED
```

### Where each is produced

| Kind | Producer | Transport |
|---|---|---|
| Server state change | the API, inside the business transaction | `emitEvent(client, …)` |
| Client interaction (`product.viewed`) | the browser | a **separate** ingest, never `emitEvent` |

Mixing them is the mistake: a client-reported "order paid" is not trustworthy,
and a server-reported "product viewed" is not observable. Two transports, one
taxonomy.

---

## The event standard

```jsonc
{
  "event_type": "pet_fact.created",
  "payload_version": 1,
  "entity_type": "pet_fact",
  "entity_id": "fact_…",
  "pet_id": "pet_…",
  "user_id": "usr_…",
  "organization_id": null,          // ready for §40, always null today
  "occurred_at": "2026-09-10T…",
  "origin": "app",                  // app | admin | automation | system
  "payload": { … }
}
```

Every proposed type fits the existing CHECK patterns.

### Idempotency
Consumers key on `outbox_events.id`, already sent as `x-mipo-event-id`.
Producers are idempotent by construction: the event is written in the same
transaction as the state change, so a rollback emits nothing and a retried
idempotent request emits once.

### What is *not* an event
- Reading a page, opening a screen, a search.
- Correcting a typo (`pet.updated` fires only on a **material** field change).
- Every fact supersession — only clinically or materially meaningful ones reach
  the timeline (`43` §projection rules).
- A derived value being recomputed. Recomputation is not news.

---

## Retention

`outbox_events` has no retention policy today and grows unbounded on a single
host. Proposed: **delivered events older than 90 days are archived once every
internal consumer's cursor has passed them.** Never before — the cursor is what
makes it safe.

## What events are not

- **Not the source of truth.** Facts are. An event says a fact was created; it
  does not carry the fact's authority.
- **Not the timeline.** The timeline is a projection over events *and* facts.
- **Not analytics.** They feed analytics; the taxonomy is a domain contract, not
  a measurement plan.
