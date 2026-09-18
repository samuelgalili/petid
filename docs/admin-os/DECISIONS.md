# MIPO Admin OS — Architecture Decisions

Each decision records what was chosen, what it was chosen over, and what would
have to be true for it to be wrong. A decision with no rejected alternative is
not a decision, it is a description.

Numbering is `D-n`. Decisions are appended, never rewritten; a reversal gets a
new number that supersedes the old one by name.

---

## D-1 — The outbox is the event bus. Nothing new is built.

**Decision.** `outbox_events` + `server/src/events.js` is MIPO's event
mechanism. Admin OS event types are added to the existing frozen `EVENT_TYPES`
map and emitted through `emitEvent(client, …)` inside the transaction that
caused them.

**Over:** a second bus, an in-process emitter, or a queue service.

**Why.** It is a transactional outbox that already works: the event commits or
rolls back with the business write, delivery is HMAC-signed, retries use
exponential backoff to `MAX_ATTEMPTS = 8`, and the dispatcher is started at
boot. The brief (§23) explicitly says not to build one if a reliable mechanism
exists. It does.

**What follows.** New types go in `EVENT_TYPES` — that map is the published
contract for subscribers, which is why it is the only place a type may be
declared. The existing disclosure rule extends to Admin OS events: **an event
payload carries identifiers and a type, never a value that would be a
disclosure if it left the system.** A ledger event carries the ledger entry id
and the customer id, not the balance.

**Wrong if.** Admin OS needs sub-second fan-out to many in-process consumers.
It does not; everything here is minutes-scale.

---

## D-2 — Customer 360 is keyed on `shop_customers`, reconciled to `profiles`.

**Decision.** The Customer 360 entity is a `shop_customers` row. Where a
`user_id` links it to an account, the 360 view joins `profiles` and `app_users`
and shows the union. Where it does not, the card says so in words.

**Over:** (a) keying on `app_users`, (b) creating a new `customers` table and
migrating, (c) merging duplicates on sight.

**Why.** `orders.customer_id` already points at `shop_customers`, so it is the
only table that reaches the whole order history. `app_users` misses every guest
checkout. A new table is a migration across live commercial data for a naming
preference.

**Why not merge duplicates.** The system already knows duplicates exist —
`index.js:6589` uses `distinct on` to survive "two `shop_customers` rows".
Merging them is a destructive write over financial history and belongs in its
own reviewed piece of work with a reversal path, not inside a UI feature.

**What follows.** A Customer 360 that shows a partial history must say it is
partial. A card that silently shows three of a customer's nine orders is worse
than one that shows three and says "2 more records may exist under a different
email."

**Wrong if.** A deduplication pass lands first and makes `shop_customers` 1:1
with people. Then this is revisited.

---

## D-3 — The ledger is append-only. Balance is derived, never stored.

**Decision.** `customer_account_ledger` is insert-only. There is no
`customers.balance` column. A balance is `sum(direction * amount)` over the
customer's entries, computed in one indexed query.

**Over:** a mutable balance column updated on each transaction.

**Why.** A stored balance and a transaction list are two sources of truth that
will disagree, and the disagreement is discovered by a customer. The brief
(§11) is explicit: do not model this as a single mutable field. An append-only
ledger also gives §48 ("no destructive financial history") for free rather than
by convention.

**What follows.**
- A correction is a **reversal entry**, never an `UPDATE` or `DELETE`.
- Every write runs inside a transaction with the order/payment it belongs to.
- Concurrency is handled by the ledger's own insert, not by read-modify-write.
- A test asserts the balance under concurrent inserts, and a test asserts that
  `UPDATE`/`DELETE` on the ledger is not reachable from any service path.

**Cost accepted.** Reading a balance is a `sum`, not a column read. If that
becomes slow, the answer is a materialised snapshot with the ledger still
authoritative — not a mutable column.

---

## D-4 — Connectors are blocked on a secret-storage decision. **STOP.**

**Decision.** No connector, credential or OAuth work starts until secret
storage is chosen by the owner. This is raised as a §65 STOP, not decided
unilaterally.

**Why.** There is no secret storage in this repository.
`SECRET_ENCRYPTION_KEY` appears in five documents under `docs/` and in **zero**
files under `server/src/`. Provider secrets today are environment variables read
at boot. Building a connector vault means choosing where third-party OAuth
refresh tokens live, and that choice has cost, operational and blast-radius
consequences that are the owner's to make.

**The options, with the trade-off stated honestly:**

| | AWS KMS envelope encryption | App-level envelope encryption with a key in Secrets Manager | Postgres `pgcrypto` |
|---|---|---|---|
| Key never in app memory | ✅ | ❌ (data key is) | ❌ |
| Works if RDS is dumped | ✅ | ✅ | ❌ if the key is in the DB |
| Rotation | Managed | Manual, scriptable | Manual |
| New AWS dependency | Yes | Small | No |
| Cost | Per-request | Near zero | Zero |

**Recommendation:** KMS envelope encryption — a KMS-wrapped data key per
credential, ciphertext in `connector_credentials`, plaintext never written and
never logged. It is the only option on the list where a database dump is not a
credential breach.

**Regardless of which is chosen**, these hold: the frontend receives
`connected`, `provider`, `account name`, `scopes`, `last_verified`, `expires_at`,
`health` — and never a secret, not even masked from the server side. `••••••••`
is rendered from nothing, not from a truncated real value.

---

## D-5 — No workflow engine in the first pass. Reactions are subscribers.

**Decision.** Brief §22's trigger/condition/action engine is **deferred**. The
first pass implements named reactions to existing outbox events, in code, with
the same observability the engine would have had.

**Over:** building `admin_workflows` + `admin_workflow_runs` + a condition
evaluator up front.

**Why.** A workflow engine is a product for people who need to change automation
without a deploy. Nobody has asked to yet, there are zero workflows in
production, and the engine's real cost is not the executor — it is the
condition language, its versioning, and the debugging surface when a customer
was messaged by a rule nobody can reconstruct. Building the storage first
produces an empty table and a UI for creating rows that do nothing.

**What is built instead.** Every reaction emits its own event, records to
`admin_audit_log` with `actor_type = system`, and is visible in the Exceptions
view when it fails. That is the observability §22 asks for, minus the authoring
UI.

**Wrong if.** The owner needs to author or change an automation without a
deploy. That is the trigger to build the engine, and the reactions written here
become its first migrations rather than throwaway work.

---

## D-6 — WhatsApp is deferred behind an explicit capability decision.

**Decision.** Admin OS does **not** build a WhatsApp sender in the first pass.
The existing `wa.me` deep links stay, and the Customer 360 message log keeps
recording them as what they are: a message sent from the agent's own phone.

**Why.** The brief says to use the existing WhatsApp infrastructure and not to
build a second one. There is no first one. What exists is three client-side
`wa.me` URL builders. Building the real thing means a Meta Business account,
approved message templates, a verified webhook endpoint, opt-in records,
delivery-status handling and per-message idempotency — a project, not a feature
of an admin screen, and one that depends on D-4 for credentials.

**What is built now.** The seam: `POST /api/admin/customers/{id}/messages`
records an outbound message with `channel`, `direction`, `template`, `body`,
`sent_by` and an idempotency key, and — for `channel = "whatsapp_manual"` —
returns the `wa.me` URL for the browser to open. When a real transport arrives,
it becomes a second channel behind the same endpoint, and the history written
today is still valid.

**What is deliberately not done.** No fake "sent" status. A manual link records
`status = "opened_by_agent"`, because that is all that is actually known.

---

## D-7 — Idempotency is Phase 1 infrastructure, not a Phase 3 detail.

**Decision.** `idempotency_keys` and a `withIdempotency(key, scope, fn)` helper
ship in Phase 1, before the first endpoint that moves money or sends a message.

**Over:** the brief's ordering, where §52 sits alongside the features that need it.

**Why.** Retrofitting idempotency after money has moved means a migration over
financial history to work out which of two rows was the duplicate. The helper
is perhaps eighty lines. The retrofit is a reconciliation project.

**What follows.** Every non-GET admin endpoint that has an external or financial
effect takes an `Idempotency-Key` header. A replay returns the original
response, not a second effect. Tests assert this per endpoint, not once.

---

## D-8 — An additive router boundary, not a rewrite of `index.js`.

**Decision.** Admin OS endpoints are registered through a small route table in
new modules (`server/src/adminOs/*.js`), mounted from `index.js` with a single
`if (pathname.startsWith("/api/admin/os/"))`-style delegation — exactly the
pattern `productIntakeRoutes.js` already uses.

**Over:** (a) appending to the 9,426-line if-chain, (b) porting the API to
Express.

**Why.** (a) makes the file worse in the way this audit flagged as R1. (b) is a
rewrite of every route's dispatch, auth and error handling, with the whole
commercial surface as the blast radius, in exchange for ergonomics. The intake
module proves the middle path works in this codebase.

**Wrong if.** The route count grows enough that a linear scan is measurably
slow. It is not; this is legibility, not performance.

---

## D-9 — Admin OS speaks the design language that was just settled.

**Decision.** New admin surfaces use the tokens and rules that the shop and
cart were converged onto this week, and the existing guards cover them.

- Thin line **or** shadow, never both (`surfaceDepth.test.js`).
- Ink fill for the one commitment on a screen; outline for everything else.
- `mipo-chip-selected` for a selected chip; `mipo-cta-button` for the primary
  action — **with its doubled-specificity colours**, because a component class
  loses to a utility on source order (`cascadeSpecificity.test.js`).
- 1.5rem card radius; 11px for a mark in a pill, 12px for words.

**Why.** The lesson from the shop is in the repository now: a redesign that
reaches one component is not a redesign. Admin OS is roughly twenty new
surfaces. If they are built in a fourth dialect, the same discovery happens
again at four times the size.

**What follows.** The shop guard is page-scoped by construction. An equivalent
admin-scoped guard is part of Phase 1, derived from what the admin shell
renders rather than from a hand-maintained file list.
