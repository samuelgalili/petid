# 18 — Event Architecture

## Status: `EXISTS` and `REUSABLE` — a correct transactional outbox, switched off

`server/src/events.js` (8.5 KB) and `outbox_events` (migration `0020`).

```
business write ──┐
                 ├── one transaction ──► commit
emitEvent(client)┘                          │
                                      outbox_events (pending)
                                            │
                                    startDispatcher (5 s tick)
                                            │
                              claimDueEvents: UPDATE … FOR UPDATE SKIP LOCKED
                                            │
                                    POST to AUTOMATION_WEBHOOK_URL
                                    HMAC-SHA256 x-mipo-signature
                                            │
                              ┌─────────────┴─────────────┐
                            2xx                        failure
                              │                            │
                        markDelivered            markFailed + backoff
                                                 [10s, 60s, 5m, 30m, 2h]
                                                 MAX_ATTEMPTS = 8 → failed
```

### What makes it correct

1. **The event commits with the business write.** `emitEvent(client, …)` takes
   the caller's transaction client. No event without the order; no order
   without the event.
2. **It never throws into a business path.** Both the unknown-type check and
   the insert are wrapped; a broken event returns `null` and logs. The file
   says: "A failure to record or deliver an event must never fail the order,
   signup, or payment that produced it."
3. **`FOR UPDATE SKIP LOCKED`.** Two dispatchers — during a rolling restart,
   say — cannot deliver the same event twice.
4. **Exponential backoff with a cap**, and the last interval repeats.
5. **Signed delivery.** HMAC-SHA256 over the body, verified with
   `timingSafeEqual`.
6. **Loop prevention.** `originFromRequest` honours `X-Mipo-Origin: automation`
   from a header — and *only* that value, so a caller cannot claim to be the
   system or an admin. Events an automation platform caused are not delivered
   back to it unless `AUTOMATION_DELIVER_OWN_EVENTS=true`.
7. **Type constraints in the database**, not only in code:
   ```sql
   CHECK (event_type ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$')
   CHECK (entity_type ~ '^[a-z][a-z0-9_]{1,39}$')
   CHECK (status IN ('pending','delivering','delivered','failed','skipped'))
   ```

### Why it does nothing today

```js
if (!endpointUrl) {
  console.log("outbox dispatcher: AUTOMATION_WEBHOOK_URL not set — events recorded but not delivered");
  return () => {};
}
```

`AUTOMATION_WEBHOOK_URL` is **not** in `deploy/aws/sync-ssm-env.sh`'s required
or optional key list. In production it is unset. Events accumulate in
`outbox_events` and are never delivered — which the code notes as deliberate:
enabling delivery later replays everything recorded while it was off.

**So the backbone is built, tested (`server/test/events.test.js`), and idle.**

---

## The declared event catalogue

16 types, and the file says adding one here is the only place a new type is
declared, so this list doubles as the subscriber contract:

```
user.registered

order.created            order.paid              order.payment_failed
order.status_changed     order.shipped

pet.created              pet.marked_lost         pet.found
pet.qr_scanned

insurance_claim.submitted
service_booking.created
content.reported
```

### Against the brief's proposed catalogue

| Requested | Present? |
|---|---|
| `USER_CREATED` | ✅ `user.registered` |
| `PET_CREATED` | ✅ |
| `PET_UPDATED` | ❌ |
| `DOCUMENT_UPLOADED` / `DOCUMENT_PROCESSED` | ❌ |
| `HEALTH_FACT_CREATED` | ❌ |
| `WEIGHT_UPDATED` | ❌ |
| `WALK_STARTED` / `WALK_COMPLETED` | ❌ (`08` missing) |
| `PARK_CHECKED_IN` / `OUT` | ❌ (`09` missing) |
| `MOMENT_CREATED` | ❌ — social emits nothing |
| `PRODUCT_VIEWED` / `RECOMMENDED` / `ADDED_TO_CART` | ❌ |
| `CART_CREATED` | ❌ (no server cart) |
| `ORDER_CREATED` / `PAID` | ✅ |
| `ORDER_FULFILLED` | 🟡 `order.shipped` |
| `ORDER_DELIVERED` | ❌ |
| `PRODUCT_REORDER_DUE` | ❌ |

Commerce and pet-identity events exist. **Health, activity, social and
behavioural events do not.** That maps exactly onto which subsystems are built.

---

## Two structural limits to decide

### 1. One subscriber
Delivery goes to a single URL. There is no fan-out, no per-subscriber cursor,
no replay-to-one-consumer. Adding a second consumer (a CRM sync, a
notification service) means either an external fan-out at the webhook target,
or a subscriber table here. The `entity_type`/`entity_id` columns and the
delivery status live on the event row itself, so per-subscriber state has
nowhere to go today.

**Recommendation:** keep the single webhook for external automation, and for
*internal* consumers read `outbox_events` directly with a per-consumer cursor
table. Do not invent a message broker for a single-host deployment.

### 2. Events are notifications, not a log
`payload` is jsonb and free-form. There is no schema per event type and no
version field. A consumer cannot tell v1 from v2 of `order.paid`.

**Recommendation:** add `payload_version` before the first external consumer
exists. Cheap now, breaking later.

---

## Sequencing

`18` is a prerequisite for `16` (notifications), `17` (CRM timeline) and `26`
(analytics). All three want the same stream, and it already exists. The work is
not "build events" — it is:

1. Declare the missing types (they are one `EVENT_TYPES` entry plus one
   `emitEvent` call each).
2. Add `payload_version`.
3. Add an internal consumer cursor.
4. Set `AUTOMATION_WEBHOOK_URL` when there is something to deliver to.

**Do not build a second event system.** This one is correct.
