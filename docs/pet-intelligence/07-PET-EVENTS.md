# 07 — Pet Events

## Use the outbox that exists

`server/src/events.js` + `outbox_events` is a correct transactional outbox:
`emitEvent(client, …)` writes inside the caller's transaction, `claimDueEvents`
uses `UPDATE … FOR UPDATE SKIP LOCKED`, delivery is HMAC-signed, backoff is
`[10s, 60s, 5m, 30m, 2h]` capped at 8 attempts, and `originFromRequest` prevents
loops by honouring `X-Mipo-Origin: automation` and *only* that value.

**No second event system.** Pet events are new `EVENT_TYPES` entries and new
`emitEvent` calls. Nothing about the mechanism changes.

### What exists today

```
user.registered
order.created · order.paid · order.payment_failed
order.status_changed · order.shipped
pet.created · pet.marked_lost · pet.found · pet.qr_scanned
insurance_claim.submitted · service_booking.created · content.reported
```

Four pet events already, and `pet.qr_scanned` is emitted **before** the log write
so an alert survives a logging failure — worth noting because the log table it
writes to (`qr_scan_logs`) does not exist, and the alert still works.

---

## Three additions the outbox needs first

### 1. `pet_id` as a first-class column
Today an event has `entity_type` + `entity_id`. A walk event's entity is the
walk, so "everything that happened to Blue" requires knowing every entity type
that can reference a pet.

```
outbox_events + pet_id uuid null   -- indexed; the timeline's whole query
```

The AI ledgers already do this: `ai_requests`, `usage_events` and `cost_events`
all carry `pet_id`. The event table should match.

### 2. `payload_version`
`payload` is free-form jsonb with no version. A consumer cannot tell v1 of
`order.paid` from v2. Add it **before** the first consumer exists — cheap now,
breaking later.

### 3. An internal consumer cursor
Delivery today is a single webhook to `AUTOMATION_WEBHOOK_URL`, which is unset in
production. Internal consumers (timeline, insights, CRM) should read
`outbox_events` directly with a per-consumer cursor table, not compete for the
same delivery status:

```
event_consumers   consumer_key, last_event_id, last_processed_at, status
```

Keep the webhook for external automation. Do not build a broker for a
single-host deployment.

---

## The pet event catalogue

`EXISTS` = already declared. Everything else is `PROPOSED`.

### Profile
| Event | Status | Payload |
|---|---|---|
| `pet.created` | **EXISTS** | species, has_photo, has_breed |
| `pet.updated` | PROPOSED | changed_fields[] — never the values, for privacy |
| `pet.archived` / `pet.restored` | PROPOSED | |
| `pet.deceased` | PROPOSED | needs the state first (`OPEN DECISION`) |
| `pet.marked_lost` / `pet.found` / `pet.qr_scanned` | **EXISTS** | |
| `pet.deleted` | PROPOSED | matters because deletion orphans documents (`22`) |

### Facts — one generic event, not one per key
| Event | Payload |
|---|---|
| `pet_fact.created` | namespace, key, source_type, confidence, `is_clinical` |
| `pet_fact.superseded` | fact_id, superseded_by, reason |
| `pet_fact.disputed` | fact_ids[], key |
| `pet_fact.confirmed` | fact_id, by whom |
| `pet_fact.resolved` | fact_id, effective_to |

**The value is not in the payload** for clinical keys. An event stream is
delivered to external automation; shipping "Blue is allergic to chicken" to a
webhook is a health-data disclosure the owner did not agree to. Consumers that
need the value read it back through an authorized API. This is a deliberate
constraint, and it is why one generic fact event beats forty typed ones — there
is one place to get this right.

### Health, documents, activity, commerce, social
| Event | Status |
|---|---|
| `health_record.created`, `vaccination.recorded`, `vaccination.due` | PROPOSED |
| `medication.started` / `.ended` | PROPOSED |
| `document.uploaded` / `.processing_started` / `.processed` / `.failed` / `.review_required` | PROPOSED — all of `16` |
| `weight.recorded` | PROPOSED — an observation event, distinct from the fact event |
| `walk.started` / `.completed`, `park.checked_in` / `.checked_out` | PROPOSED — blocked on `14` |
| `moment.created` | PROPOSED — social emits nothing today |
| `product.viewed` / `.recommended` / `.added_to_cart` | PROPOSED — client-originated, see below |
| `order.created` / `.paid` / `.shipped` | **EXISTS**, + `pet_id` per line (`15`) |
| `order.delivered`, `product.reorder_due` | PROPOSED |

### Where each event is produced

| Kind | Producer | Transport |
|---|---|---|
| Server state changes | the API, inside the business transaction | `emitEvent(client, …)` |
| Client interactions (`product.viewed`) | the browser | a **separate** ingest, never `emitEvent` |

Mixing them is the mistake to avoid: a client-reported "order paid" is not
trustworthy, and a server-reported "product viewed" is not observable. Two
transports, one taxonomy.

---

## Event standard

```jsonc
{
  "event_type": "pet_fact.created",
  "payload_version": 1,
  "entity_type": "pet_fact",
  "entity_id": "fact_…",
  "pet_id": "pet_…",
  "user_id": "usr_…",
  "organization_id": null,       // ready for §40, always null today
  "occurred_at": "2026-09-09T…",
  "origin": "app",               // app | admin | automation | system
  "payload": { … }
}
```

Existing database CHECKs already constrain the shape:
`event_type ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'` and
`entity_type ~ '^[a-z][a-z0-9_]{1,39}$'`. New types must fit them — they do.

### Idempotency
Consumers key on `outbox_events.id`, which the dispatcher already sends as
`x-mipo-event-id`. Producers are idempotent by construction: an event is written
in the same transaction as the state change, so a rolled-back write emits
nothing and a retried request that is itself idempotent emits once.

### Retention
`outbox_events` has no retention policy today and grows without bound on a single
host. Proposed in `23`: delivered events older than 90 days are archived once
every internal consumer's cursor has passed them. Never before — the cursor is
what makes it safe.

## What events are not

- **Not the source of truth.** Facts are. An event says a fact was created; it
  does not carry the fact's authority.
- **Not the timeline.** The timeline is a projection over events *and* facts
  (`08`).
- **Not analytics.** They feed analytics (`docs/system-workflows/26`) but the
  taxonomy is a domain contract, not a measurement plan.
