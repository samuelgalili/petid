# MIPO Admin OS — Repository Audit

Measured on 2026-09-18 against `aws-migration` at `f8b8ef96`, by reading the
code and querying a schema built from `server/sql`. Every count in this
document came from a command, not from an estimate. Where something was
*expected* and is not there, it says so in those words rather than being
quietly omitted.

The short version: **more of the Admin OS brief already exists than a reading
of the route table suggests, and one thing the brief assumes exists does not
exist at all.** Those two facts set the implementation order more than
anything else here.

---

## 1. Current architecture

| Layer | What it actually is |
|---|---|
| Frontend | Vite + React 18 + TypeScript, Tailwind, shadcn/ui. 51 pages, 341 components. Routes centralised in `src/routes/index.tsx`. |
| API | **Raw `node:http`.** No Express, no router library. `server/src/index.js` is **9,426 lines** and dispatches with a linear `if (request.method === "GET" && url.pathname === "...")` chain, plus regex tests for id-bearing paths. 36 sibling modules in `server/src/`. |
| Database | PostgreSQL on AWS RDS. **66 tables.** 54 forward-only migrations in `server/sql`, applied through a ledger (`schema_migrations`) by `applyMigrations.js`. |
| Hosting | Caddy on AWS Lightsail. Deploy by GitHub Actions (6 workflows). |
| Not in the runtime | Supabase and Vercel are legacy. There is **no RLS** in the active path; authorisation is entirely application-level. |

**Test position.** 636 `node:test` tests in `server/test` (62 files), plus
Playwright specs matching `*.aws.spec.ts` which run against a *preview server
serving the real `dist/`* before the deploy artifact is uploaded. The quality
gate is: dependency audit → server tests → lint → typecheck → import
resolution → production build → Playwright → upload. A second job applies
migrations to a throwaway Postgres, re-applies them to prove idempotency, and
runs an API smoke test against the live schema.

That gate is the single most valuable asset for this project. It is why the
phases below are expressed as things that can be added without turning it red.

---

## 2. Existing admin functionality

**15 real screens**, all under `src/pages/admin/`:

`AdminAnalytics` · `AdminBackup` · `AdminCategories` · `AdminChangePassword` ·
`AdminCoupons` · `AdminCustomers` · `AdminEconomics` · `AdminLogin` ·
`AdminNotifications` · `AdminOrders` · `AdminProducts` · `AdminPublishing` ·
`AdminQuickImport` · `AdminSettings` · `AdminSmartProductEditor`

Supporting components in `src/components/admin/` include `AdminLayout`,
`AdminWorkspace` (two-pane list/detail), `AdminGlobalSearch`, `DataTable`,
`ConfirmDialog`, `AdminStyles` (page header, stat card, empty state),
`AdminActivityFeed`, `AdminNotificationsBell`.

`AdminCustomers` is already closer to Customer 360 than the brief assumes: a
two-pane workspace, customer notes with kinds, pets with age/weight/medical
conditions, and **orders and notes merged into one chronological stream**.

### The thing that will mislead anyone reading the route table

`src/routes/index.tsx` defines **`legacyAdminPaths` — roughly 60 admin paths**
(`/admin/tasks`, `/admin/automations`, `/admin/integrations`, `/admin/segments`,
`/admin/approval-queue`, `/admin/command-center`, `/admin/ai-os`, …) that are
**all `<Navigate>` redirects**, mostly to `/admin/analytics`. They are not
features. Several of them are exactly the features this brief asks for, which
makes the route list read like a system that already has them.

Similarly, `src/components/admin/ai-service/` contains seven components
(`AIAgentInbox`, `AIConversations`, `AIIntegrations`, `AIAutomation`,
`AIAnalytics`, `AISettings`, `AITraining`) that mention WhatsApp, Instagram and
Facebook — and `/admin/ai-service` redirects away from them. **They are dead
code and they are not evidence of an integration.**

---

## 3. Existing CRM functionality

| Capability | State |
|---|---|
| Customer list + detail | `GET /api/admin/customers`, `GET /api/admin/customers/{uuid}` |
| Customer notes | `customer_notes` table, note kinds, used by AdminCustomers |
| Pets on the customer card | Yes — avatar, age (via `formatPetAgeHe`), weight, gender, medical conditions |
| Order history on the card | Yes, merged with notes into one timeline |
| Segments | **Does not exist.** No table, no endpoint, no screen. |
| Reminders | **Does not exist.** |
| Support / tickets | **Does not exist.** |
| Customer health states | **Does not exist.** |

### Identity is split three ways — this needs a decision before Customer 360

Three tables describe a person:

- `app_users` (19 columns) — the authentication record
- `profiles` (39 columns) — the app-side person, carries `whatsapp_number`
- `shop_customers` (8 columns) — created at checkout, keyed by email, nullable `user_id`

`orders.customer_id` points at `shop_customers`; `orders.user_id` points at the
account. A guest checkout creates a `shop_customers` row with no `user_id`. The
code already knows this produces duplicates — `server/src/index.js:6589` carries
a comment about "two `shop_customers` rows" and uses `distinct on` to survive it.

A Customer 360 built on the wrong one of these will silently show a fraction of
a person's history. See DECISIONS.md D-2.

---

## 4. Existing commerce functionality

Two catalogues exist side by side, and this matters:

**Legacy** — `business_products`, `scraped_products`. This is what the shop
serves today.

**Intake / canonical** — `product_drafts` → `catalog_products` →
`product_variants` → `seller_offers` → `inventory`, with `product_media` and
`product_images`. A **7-condition publication gate**, 19 `/api/admin/intake/*`
endpoints, a draft state machine where the submitter may not approve their own
draft, and `AdminPublishing` as its operator screen.

### The gap that matters most commercially

`GET /api/products` calls `listProducts()` (`server/src/index.js:4326`), which
reads `business_products` and `scraped_products` **with no `where` clause at
all** and concatenates them. The customer-facing shop therefore bypasses
`publicCatalog.js`, the publication gate, seller eligibility and the whole
intake chain. Everything built in intake governs a catalogue **no shopper is
looking at**. Recorded as R5.

Also present: `coupons`, `shipping_profiles`, commission fields on
`order_items` (`commission_rate`, `commission_amount`), `platformCommission.js`,
and `business_profiles.commercial_status` (`none` / `pending` / `approved` /
`suspended`) which the publication gate reads.

---

## 5. Existing payment functionality

- CardCom integration (`server/src/cardcom.js`, `cardcom_events` table,
  `POST /api/payments/shop`, a webhook at `/api/payments/cardcom/webhook`).
- **`orders.payment_status` and `orders.payment_method` are already separate
  columns.** The brief's §10 core distinction exists.
- `orders` carries `subtotal`, `shipping`, `tax`, `discount_amount`,
  `cash_on_delivery_fee`, `total`, `coupon_id`, `payment_installments`,
  `payment_transaction_id`.

**Missing:** any ledger, any manual payment record, any credit limit, any
balance. There is no `/api/admin/orders` create endpoint — the route is **GET
and PATCH-bulk only**. An admin cannot create an order or record a payment
through any API that exists today.

---

## 6. Existing messaging / WhatsApp functionality

**There is no server-side WhatsApp integration.** This is the single largest
gap between the brief and the repository, and the brief's instruction to "use
the existing Mipo WhatsApp infrastructure if present" resolves to: it is not
present.

What exists is three client-side deep-link builders — `src/lib/customerContact.ts`,
`src/lib/orderShare.ts`, `src/lib/warehouseDispatch.ts` — which construct
`https://wa.me/<number>?text=…` and open it. The message leaves from **the
agent's own WhatsApp account**, on their own phone. `AdminCustomers` knows this
and writes the log entry *before* opening the link, because the log is the only
trace the system will ever have.

So: no Meta credentials, no templates, no delivery status, no inbound webhook,
no opt-in enforcement, no retry, no idempotency. `server/src/index.js` mentions
`whatsapp_number` only as a **profile column**.

The word "whatsapp" appearing in `productIntel.js` and `aiGateway.js` is
unrelated — those are URL/host filters.

`notifications` (in-app) is real: `user_id`, `type`, `category`, `title`,
`message`, `data`, `action_url`, `is_read`, with `GET/POST /api/me/notifications`.
But `POST /api/me/notifications` is **the user acting on their own account**;
there is no admin path to send a notification to somebody else.

---

## 7. Existing AI functionality — substantially built

This is the part of the brief that is closest to done, and building it again
would be the most expensive mistake available here.

**Schema:** `ai_providers`, `ai_models`, `ai_features`, `ai_pricing_versions`,
`ai_requests`, `cost_events`, `usage_events`.

`ai_requests` records `request_id`, `trace_id`, `user_id`, `organization_id`,
`pet_id`, `feature_id`, `provider_id`, `model_id`, `status`, `attempt`,
`started_at`, `completed_at`, `latency_ms`, **`input_tokens`, `output_tokens`,
`cached_tokens`, `total_tokens`**, `error_code`, `safe_error_message`, `metadata`.

`cost_events` records the priced consequence, joined to a
`pricing_version_id` so a price change does not rewrite history.

**Code:** `aiGateway.js` (trace/request ids, provider registry),
`aiProviders.js`, `aiAccounting.js`, `aiEconomics.js` with
`getEconomicsOverview`, `getCostByFeature`, `getCostByModel`, `getCostByProvider`,
`getTopCostUsers`, `getEconomicsTimeline`, `getUserUsageSummary`, `getTrace`.

**API:** seven endpoints under `/api/admin/economics/*` — overview, features,
models, providers, timeline, users, `traces/{id}`.

**UI:** `AdminEconomics` at `/admin/ai-economics`.

Against the brief: **§26 and §27 are effectively built.** What is missing from
the AI sections is narrower than it looks — budgets and thresholds (§28), an
explicit model router policy (§29), agent identities with capability grants
(§25), a recommendations/actions store (§24), and approval routing for AI
actions (§60).

---

## 8. Existing connector functionality

**None.** There is no connector table, no credential table, no OAuth callback,
no health check, no marketplace.

More consequentially: **there is no secret storage of any kind.**
`SECRET_ENCRYPTION_KEY` appears in five files under `docs/` and in **zero**
files under `server/src/`. Provider credentials today are environment variables
read at boot.

Phase 7 of the brief cannot start until that is decided. See R2 and DECISIONS.md D-4.

---

## 9. Existing security model

Stronger than the rest of the system, and worth preserving exactly as it is.

**RBAC** (`server/src/adminPermissions.js`): four roles (`admin`,
`product_manager`, `seller_admin`, `readonly_admin`) and two scopes
(`platform`, `seller`), kept deliberately apart — a permission says *what kind
of action*, a scope says *whose rows*. **There is no `*` wildcard**: it was
removed because it made `hasAdminPermission('admin', <typo>)` return true.
Every role enumerates what it holds, so an unknown permission is denied to
everybody. A test asserts `readonly_admin` holds no write permission by set
intersection rather than by trusting a list.

**Sessions:** `admin_sessions` / `user_sessions` with opaque tokens hashed at
rest (`createOpaqueToken`, `hashOpaqueToken`, `verifyOpaqueToken` using
`timingSafeEqual`). HttpOnly cookies. Bootstrap is gated by `ADMIN_API_KEY`.

**SSRF:** `server/src/urlSafety.js` — `validateRemoteHttpUrl`,
`isPrivateOrReservedIp`, and `createConnectionSafeLookup`, which re-validates
**at connection time** so a DNS rebind between check and fetch is refused. There
is a test for exactly that.

**Audit:** `admin_audit_log` with `actor_admin_user_id`, `actor_email`,
`actor_role`, `action_type`, `entity_type`, `entity_id`, `old_values`,
`new_values`, `metadata`. **19 write sites** in `index.js`.

**Weaknesses found:** one `FixedWindowRateLimiter` instance for the entire API;
no CSRF token (cookie-based auth with same-site as the only defence — needs
verifying per route); no idempotency anywhere (see R4).

---

## 10. Existing event architecture — build nothing here

`server/src/events.js` plus the `outbox_events` table is a **transactional
outbox**, already running.

- `emitEvent(client, …)` takes the *same client as the business write*, so the
  event commits or rolls back with it, and never throws.
- **22 declared event types** across user, order, pet, pet-fact, observation,
  claim, booking and content-report domains — including `order.created`,
  `order.paid`, `order.payment_failed`, `order.status_changed`, `order.shipped`.
- Four origins: `app`, `admin`, `automation`, `system`.
- Delivery is HMAC-SHA256 signed (`signPayload` / `verifySignature`), with
  `claimDueEvents`, exponential backoff (`backoffSecondsFor`), `MAX_ATTEMPTS = 8`,
  `markDelivered` / `markFailed`.
- `startDispatcher({ pool })` is called at `server/src/index.js:9425`.

There is a deliberate disclosure rule worth knowing before extending it: a pet
fact event carries the namespace and key but **never the value**, because the
outbox delivers externally and "Blue is allergic to chicken" is a health
disclosure nobody consented to.

Per the brief's §23: **do not create an event bus.** Extend this one.

---

## 11. Database gap analysis

**Exists and should be reused:** `orders`, `order_items`, `shop_customers`,
`profiles`, `app_users`, `pets`, `business_profiles`, `catalog_products`,
`product_drafts`, `product_variants`, `seller_offers`, `inventory`,
`product_media`, `coupons`, `notifications`, `outbox_events`,
`admin_audit_log`, `admin_users`, `admin_sessions`, `cardcom_events`,
`ai_requests`, `cost_events`, `usage_events`, `ai_models`, `ai_providers`,
`ai_features`, `ai_pricing_versions`, `customer_notes`.

**Genuinely missing, in the order the phases need them:**

| Proposed | Why it cannot be an existing table |
|---|---|
| `idempotency_keys` | Nothing in the system deduplicates a retry today. Prerequisite for manual payments and outbound messaging. |
| `customer_account_ledger` | No balance concept exists. Must be append-only; `orders` cannot carry it. |
| `manual_payments` | `cardcom_events` is gateway-specific; a cash payment has no gateway. |
| `admin_tasks` (+ relations) | No task concept exists anywhere. |
| `admin_approvals` | Draft review is intake-specific and lives in `product_drafts`; a generic queue needs its own table. |
| `customer_reminders` | No scheduling table exists. |
| `customer_segments` / memberships | — |
| `connector_accounts` / `connector_credentials` / `connector_health` | Nothing exists; credential storage is a prerequisite. |
| `ai_cost_budgets`, `ai_recommendations`, `ai_agent_actions` | The measurement half is built; the policy and action half is not. |

`admin_workflows` / `admin_workflow_runs` are deliberately **not** in this list
for now — see DECISIONS.md D-5.

---

## 12. API gap analysis

70 exact-path routes and 17 regex id-routes in `index.js`, plus 19
`/api/admin/intake/*`.

Missing for the brief, grouped by what blocks what:

- `POST /api/admin/orders` — **no admin order creation exists.**
- `POST /api/admin/payments` — no manual payment recording.
- `GET /api/admin/customers/{id}/ledger`, `POST …/adjustments`.
- `POST /api/admin/customers/{id}/messages` — no admin outbound messaging.
- `POST /api/admin/notifications` — no admin path to notify a user.
- Tasks, approvals, reminders, segments: nothing.
- Connectors: nothing.
- AI budgets, recommendations, agent actions: nothing.

---

## 13. UI gap analysis

Present: admin shell, two-pane workspace, data table, confirm dialog, page
header, stat card, empty state, activity feed, global search (171 lines,
no ⌘K binding, no natural language).

Missing: command bar with ⌘K, entity drawer as a shared primitive, filter bar,
saved views, bulk action bar, order builder, payment form, reminder builder,
connector card, health indicator, AI insight card, approval card, task card.

The design language was settled this week and is worth stating because the
Admin OS must speak it rather than invent a third: thin line **or** shadow,
never both (`server/test/surfaceDepth.test.js`); ink fill for the one
commitment per screen, outline for everything else; `mipo-chip-selected` for a
selected chip; 1.5rem card radius; type floor at 11px for marks and 12px for
words (`server/test/shopOneLanguage.test.js`).

---

## 14. Risk register

| # | Risk | Evidence | Consequence |
|---|---|---|---|
| **R1** | `index.js` is 9,426 lines with a linear if-chain router | measured | Every Admin OS endpoint makes dispatch slower and the file less reviewable. Needs an additive router boundary before Phase 2. |
| **R2** | ~~No secret storage exists at all~~ **RESOLVED 2026-09-21** | `server/src/secretStore.js`, 13 tests | Was: Phase 7 cannot start. Now: envelope encryption exists and refuses to store anything without a key. D-4 has the decision and the KMS upgrade path. |
| **R3** | One rate limiter for the whole API | 1 `new FixedWindowRateLimiter` | Admin OS adds expensive endpoints with no per-route budget. |
| **R4** | No idempotency anywhere | no match for `idempotenc` in `server/src` | §52 unimplementable as written. A retried payment double-charges; a retried message double-sends. |
| **R5** | The shop bypasses the publication gate | `listProducts()` at `index.js:4326` has no `where` | Intake governs a catalogue no shopper sees. |
| **R6** | ~60 dead admin routes + 7 dead `ai-service` components | `legacyAdminPaths` | Reads as existing capability; invites duplicate implementation. |
| **R7** | Customer identity split across 3 tables with known duplicates | `distinct on` comment at `index.js:6589` | A Customer 360 on the wrong table shows a fraction of the history. |
| **R8** | No RLS; authorisation is entirely application-level | no RLS in active path | Every new admin endpoint must carry its own check. Non-negotiable in review. |

---

## 15. What this audit changes about the brief's plan

Three re-orderings, argued in DECISIONS.md and applied in IMPLEMENTATION_PLAN.md:

1. **Idempotency moves to Phase 1**, not Phase 3. Manual payments and outbound
   messaging both require it, and retrofitting it after money has moved is a
   migration over financial history.
2. **Connectors (brief Phase 7) cannot start** until secret storage is decided.
   It is lifted out of the sequence and gated on a decision.
3. **The AI phases shrink dramatically.** Brief Phases 9–10 are mostly
   measurement, and the measurement is built. What remains is policy: budgets,
   routing, agent capability grants, and human-in-the-loop approval.
