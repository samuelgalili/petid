# MIPO Admin OS — Implementation Plan

Phases are ordered by **what unblocks what**, not by what is most visible. Each
one ends in a state that can ship on its own: gates green, nothing half-wired,
no screen that renders a form which cannot save.

The brief's §64 ordering is followed except where the audit found a dependency
it did not know about. Those three changes are marked **[reordered]** with the
reason, and argued in DECISIONS.md.

**Definition of done for every phase** (from §67, applied literally): UI works ·
API works · authorisation enforced server-side · schema migrated and re-appliable ·
errors handled and visible · audit written where required · tests pass ·
responsive at 768 and 1024 · existing functionality intact · docs updated ·
no secret reachable from the browser · no duplicated business logic.

---

## Phase 0 — Audit ✅ complete

`AUDIT.md`, `DECISIONS.md`, this file. Committed before any implementation.

**Headline findings that changed the plan:** the event bus already exists (D-1);
AI cost measurement already exists; there is no secret storage at all (D-4);
there is no server-side WhatsApp (D-6); the shop bypasses the publication gate
(R5).

---

## Phase 1 — Foundations

Nothing user-visible ships here except the command bar. That is deliberate:
every later phase depends on this, and each piece is cheap now and a migration
later.

1. **`idempotency_keys` + `withIdempotency()`** **[reordered — from Phase 3, per D-7]**
   Key, scope, request fingerprint, stored response, created_at, expiry. A
   replay returns the original response and causes no second effect.
2. **Admin OS router boundary** (D-8) — `server/src/adminOs/`, mounted the way
   `productIntakeRoutes.js` is. No change to existing dispatch.
3. **New permissions** in `adminPermissions.js`, enumerated, no wildcard, and
   assigned per role. The existing "unknown permission is denied to everybody"
   property must survive — there is already a test asserting `readonly_admin`
   holds no write permission by set intersection, and it must still pass.
4. **`AuditService`** — one path for writing `admin_audit_log`, with
   `actor_type` ∈ {`admin`, `system`, `ai_agent`} so a system write is
   distinguishable from a person's. Today there are 19 ad-hoc write sites.
5. **Command bar** (§5) — ⌘K over the existing `AdminGlobalSearch`, entity
   search only. **No natural-language execution in this phase**: an NL command
   that writes needs the approval path from Phase 5 to exist first.
6. **Admin design guard** (D-9) — derived from what the admin shell renders,
   like `shopOneLanguage.test.js` is derived from what Shop.tsx renders.

**Exit:** a new admin endpoint can be added with auth, audit and idempotency,
and ⌘K finds a customer.

---

## Phase 2 — Entity 360

`EntityDrawer`, `EntityHeader`, `ActivityTimeline` as shared primitives first,
then the five views. Customer 360 leads because Phase 3 lives inside it.

- **Customer 360** — on `shop_customers`, joined to `profiles`/`app_users` where
  linked (D-2). **A partial history must say it is partial.**
- **Pet 360**, **Order 360**, **Product 360** (canonical `catalog_products`, not
  the legacy tables), **Business 360** (`commercial_status` is displayed, and
  changed only through the existing script path).

Read-only. No new writes, so no new financial risk.

---

## Phase 3 — Money

The highest-risk phase. It is third because Phase 1 gave it idempotency and
Phase 2 gave it somewhere to live.

1. `customer_account_ledger` — append-only, balance derived (D-3).
2. `manual_payments` — amount, method (`cash`/`bit`/`bank_transfer`/`credit_card`/`other`),
   received_by, received_at, reference, note. Writes a ledger entry in the same
   transaction.
3. `POST /api/admin/orders` — **the first admin order-creation endpoint in the
   system.** Server recalculates every total; a client-supplied total is
   ignored, not validated (§48).
4. Credit limit and available credit on the customer, derived from the ledger.
5. UI: `OrderBuilder`, `PaymentForm`, ledger view in Customer 360.

**Tests before the UI is wired:** a replayed payment does not double-post ·
concurrent inserts leave the balance correct · no service path reaches
`UPDATE`/`DELETE` on the ledger · a reversal is an insert · a client-supplied
total is ignored.

---

## Phase 4 — Reminders and reorder

- `customer_reminders` — customer, pet, product, order, title, message, channel,
  schedule, timezone, recurrence, status, next_run_at, last_sent_at, created_by.
- Due reminders are claimed the way `claimDueEvents` claims outbox rows — same
  pattern, same backoff, no second scheduler.
- Channels available now: **in-app** (`notifications`) and **whatsapp_manual**
  (records the message, returns a `wa.me` URL — D-6). No channel claims a
  delivery it cannot observe.
- Reorder (§15): reconstruct from current variants and current prices. **Never
  replay a historical price.**
- Reorder-interval detection is a **recommendation that creates a task**. It
  does not message anyone (§14).

---

## Phase 5 — Work: tasks, approvals, exceptions

- `admin_tasks` + relations; statuses `backlog`/`todo`/`in_progress`/`blocked`/
  `done`/`cancelled`; My Work, filters, bulk actions.
- `admin_approvals` — generic queue: action, target entity, proposed changes,
  requester, approver, status, execution result. **Intake's draft review is not
  migrated into it**; it has its own state machine with a rule (a submitter may
  not approve their own draft) that a generic queue would weaken. Intake
  approvals are *surfaced* in the queue and actioned through their own endpoints.
- Exceptions view (§41) over failed outbox deliveries, failed payments, stuck
  orders, low inventory, publication-gate failures.

---

## Phase 6 — Reactions (not an engine) **[reordered — D-5]**

Named subscribers to existing outbox events: order paid → task; payment overdue →
reminder; connector error → exception; publication blocked → task. Each emits
its own event and audits as `actor_type = system`.

The brief's authoring engine is **deferred**, not cancelled. The trigger to
build it is the owner wanting to change an automation without a deploy; these
reactions become its first rows rather than throwaway work.

---

## Phase 7 — Connectors **[UNBLOCKED — D-4 resolved 2026-09-21]**

Cannot start. There is no secret storage in this repository —
`SECRET_ENCRYPTION_KEY` now has an implementation: server/src/secretStore.js.
It refuses to store anything without a key, so a missing key turns connectors
off rather than storing credentials in the clear.

**Needed to unblock:** the owner chooses between AWS KMS envelope encryption
(recommended — the only option where an RDS dump is not a credential breach),
app-level envelope encryption with the key in Secrets Manager, or `pgcrypto`.
The comparison table is in DECISIONS.md D-4.

Once unblocked: `connector_accounts` / `connector_credentials` / `connector_health`,
separated so a credential can be rotated without destroying the integration
(§33); OAuth exchanged server-side only; the frontend receives metadata and
health, never a secret.

---

## Phase 8 — Marketing · Phase 9 — AI agents

Both **depend on Phase 7**, which is no longer blocked. Marketing consumes
connectors rather than authenticating separately (§36). Agent capability grants
(§25) and human-in-the-loop (§60) are designed against the approval queue built
in Phase 5.

---

## Phase 10 — AI policy **[reordered — mostly already built]**

The brief's Phases 9–10 assume AI usage and cost tracking must be built. **It is
built**: `ai_requests` with input/output/cached tokens and latency, `cost_events`
priced against a `pricing_version_id` so a price change does not rewrite history,
`aiEconomics.js` with seven aggregations, seven `/api/admin/economics/*`
endpoints, and the `AdminEconomics` screen.

What is genuinely missing is the **policy** half:

- `ai_cost_budgets` — monthly, per agent, per workflow; alerts at 70/85/100%.
- A named budget-exceeded policy per scope: alert · require approval · route to
  a cheaper model · disable non-critical. **Never silently disable critical
  business functionality** (§28).
- A centralised model router (§29), so provider choice is one decision and not
  scattered through the codebase.

---

## Phase 11 — Analytics, system health, and R5

System Health (§45) over API, database, AI, payments, the outbox dispatcher and
webhooks.

**R5 belongs here and is the most commercially significant item in this
document.** `GET /api/products` → `listProducts()` (`index.js:4326`) reads
`business_products` and `scraped_products` with no `where` clause, so the shop a
customer sees is not governed by the publication gate, seller eligibility or any
intake decision. Until that is connected, every catalogue control in this plan
governs a catalogue nobody is shopping in.

It is last only because it changes what customers see and should not ride along
with an admin release. It deserves its own change, its own measurement of what
appears and disappears, and its own approval.

---

## Sequencing summary

```
Phase 1  Foundations            ← everything depends on this
Phase 2  Entity 360             ← needs 1
Phase 3  Money                  ← needs 1 (idempotency) + 2 (Customer 360)
Phase 4  Reminders / reorder    ← needs 2, 3
Phase 5  Work / approvals       ← needs 1
Phase 6  Reactions              ← needs 5
Phase 7  Connectors             ← unblocked; secretStore.js exists
Phase 8  Marketing              ← needs 7
Phase 9  AI agents              ← needs 5, 7
Phase 10 AI policy              ← needs 5; measurement already exists
Phase 11 Analytics / health / R5
```

Phases 1–6 and 10 can proceed today. Phases 7–9 are held on one decision.
