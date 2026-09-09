# 00 — System Workflow Master

**Repository audited:** `samuelgalili/petid` (the code that serves `mipo.pet`).
**Commit at audit time:** `8a99d0ce` (production, deploy run 45).
**Method:** every claim below was read out of the code or measured. The 33 SQL
migrations were applied to a real PostgreSQL 16 instance and the resulting
schema dumped, so the table and column facts are the database's own answer, not
a reading of the migration text.

> A second repository, `samuelgalili/mipo`, exists and is a different, much
> smaller codebase (a Supabase-backed chat/memory prototype, 6 migrations, 10
> source files). It is **not** the system described here. See
> `28-SOURCE-OF-TRUTH.md`.

---

## How to read this set

Every capability is classified with one of:

| Label | Meaning |
|---|---|
| `EXISTS` | Implemented end to end and reachable by a user |
| `REUSABLE` | Exists and is a sound foundation for the work being planned |
| `NEEDS EXTENSION` | Exists but does not yet cover the required cases |
| `PARTIALLY IMPLEMENTED` | Some layers exist (schema or UI or API) but not all |
| `MISSING` | Not present |
| `UNKNOWN` | Not determinable from this repository |
| `CONFLICTING` | Two implementations disagree |
| `DUPLICATED` | The same concept is stored or served in two places |

Anything not found is marked `MISSING` or `UNKNOWN`. Nothing on these pages was
invented.

---

## 1. The system as it actually is

```
                       Browser / PWA (React 18 + Vite + Tailwind)
                                       │
                                    Caddy 2.9
                        (TLS, SPA fallback, /api reverse proxy,
                         /assets immutable, index.html no-cache)
                                       │
                               mipo-api (Node 20, http.createServer)
                       one process · one file · 110 routes · no framework
                                       │
              ┌────────────────────────┼─────────────────────────┐
              │                        │                         │
        PostgreSQL 16            local disk                external HTTP
      (container on the      /app/uploads (public)        Gemini · Resend
        same EC2 host)     /app/private-uploads (docs)   CardCom · Firecrawl
```

**One EC2 host. One Docker Compose file. No queue, no worker fleet, no object
store, no CDN, no replica.** Secrets come from AWS SSM Parameter Store and are
written to a `.env` on the host by `deploy/aws/sync-ssm-env.sh`.

Evidence: `deploy/aws/docker-compose.yml`, `deploy/aws/Caddyfile`,
`deploy/aws/sync-ssm-env.sh`, `server/src/index.js:8730-8759`.

### Stack facts

| Layer | What it is | Evidence |
|---|---|---|
| Frontend | React + TypeScript, Vite, Tailwind, react-router, TanStack Query, Framer Motion, vite-plugin-pwa (`injectManifest`) | `vite.config.ts`, `package.json` |
| API | Node 20, **no Express** — a hand-rolled `if`-chain router inside one 8,760-line file | `server/src/index.js:7505+` |
| DB | PostgreSQL 16, 53 tables, 33 forward-only SQL migrations with a `schema_migrations` ledger | `server/sql/`, `server/src/applyMigrations.js` |
| AI | An in-house AI Gateway with provider/model/pricing catalogue and three ledgers | `server/src/aiGateway.js` |
| Payments | CardCom (Israeli PSP), hosted page + webhook | `server/src/cardcom.js` |
| Email | Resend | `server/src/index.js:103,1194` |
| Deploy | GitHub Actions → rsync → docker compose → migrations → smoke test | `.github/workflows/deploy-aws.yml` |

---

## 2. Master dependency map (as built)

```
                                  MIPO
                                    │
                       app_users ── profiles (1:1)
                                    │
                                  pets (57 cols, flat)
                                    │
   ┌───────────────┬────────────────┼─────────────────┬──────────────────┐
   │               │                │                 │                  │
 HEALTH        DOCUMENTS        CHARACTER          SOCIAL             COMMERCE
pet_vet_visits pet_documents   pet_characters     social_posts      orders
pet_vaccinations   (file only,  pet_character_    social_post_*     order_items
insurance_claims   no OCR)      assets            user_uploads      shop_customers
pet_service_                                                        customer_identities
  bookings                                                          coupons
                                                                    cardcom_events
                                    │
                              outbox_events
                       (16 declared types · webhook only)
                                    │
                       AUTOMATION_WEBHOOK_URL  ← unset ⇒ no-op
                                    │
                                 MIPO AI
              ai_providers → ai_models → ai_pricing_versions
              ai_requests → usage_events → cost_events
                                    │
                        ┌───────────┴───────────┐
                     CHAT                  PRODUCT INTEL
                 /api/ai/chat            productIntel.js
```

**What is *not* on that diagram, because it is not in the code:** walks, GPS
routes, park check-ins, pet friendships, follows, direct messages, a server-side
cart, a wishlist, a CRM beyond the shop-customer view, push notification
delivery, document OCR, and any pet-fact provenance.

---

## 3. Capability register

| Capability | Status | Note |
|---|---|---|
| Accounts, sessions, email verification, password reset | `EXISTS` | Opaque tokens, SHA-256 at rest, `user_sessions` |
| Admin panel + RBAC (2 roles, 7 permissions) | `EXISTS` | `server/src/adminPermissions.js` |
| Admin 2FA | `MISSING` | Branch `claude/admin-2fa` unmerged, blocked on `SECRET_ENCRYPTION_KEY` |
| Pet CRUD, archive, lost-pet + public QR page | `EXISTS` | |
| Pet species | `NEEDS EXTENSION` | `pets.type` CHECK allows only `dog`, `cat`, `other` |
| Pet weight/mood history | `MISSING` | Single current value; no time series |
| Pet 360 / provenance | `MISSING` | No `source`, `confidence`, `observed_at`, `effective_from` anywhere |
| Documents — upload, private serve, delete | `EXISTS` | |
| Documents — classification, OCR, extraction, facts | `MISSING` | `pet_documents` has no status or extraction column |
| Health records (vet visits, vaccinations, claims, bookings) | `EXISTS` | Manual entry only |
| Store — catalogue, search, categories, product page | `EXISTS` | |
| Store — two product tables merged at read time | `DUPLICATED` | `business_products` + `scraped_products` |
| Cart | `PARTIALLY IMPLEMENTED` | `localStorage` only; no table, no API |
| Wishlist / Favorites | `PARTIALLY IMPLEMENTED` | `localStorage` only |
| Checkout, orders, CardCom, guest order access token | `EXISTS` | |
| Product matching engine | `MISSING` | No scoring model; chat resolves names to catalogue rows only |
| Social — Moments, reactions, comments, saves, polls, reports | `EXISTS` | Full-screen vertical reel |
| Social — friends, follows, DMs, stories, live | `MISSING` | Client routes exist but all `<Navigate>` redirects |
| Walks / GPS / routes | `MISSING` | `useLocation.ts` reads geolocation; nothing persists it |
| Parks | `PARTIALLY IMPLEMENTED` | `dog_parks` table (24 cols) with **no API route and no page** |
| Notifications — in-app | `EXISTS` | `notifications` table + 5 routes |
| Notifications — push | `PARTIALLY IMPLEMENTED` | `sw.ts` has a `push` handler; nothing subscribes or sends |
| Notifications — email | `NEEDS EXTENSION` | Resend, used only for verification + password reset |
| Notifications — WhatsApp / SMS | `MISSING` | `WAREHOUSE_WHATSAPP_NUMBER` is a phone number, not a channel |
| AI Gateway, model router, ledgers, admin economics | `EXISTS` | Genuinely good; see `15-AI-WORKFLOWS.md` |
| Event architecture | `PARTIALLY IMPLEMENTED` | `outbox_events` + 16 types; delivery is a single webhook, off by default |
| Background jobs | `PARTIALLY IMPLEMENTED` | Two in-process loops; no queue, no DLQ |
| Analytics | `MISSING` | `useActivityTracker.trackClick` is an empty function |
| CRM | `PARTIALLY IMPLEMENTED` | Shop-customer view + notes; not pet- or lifecycle-aware |
| Data export / account deletion | `NEEDS EXTENSION` | Export omits all social data |
| Tests | `EXISTS` | 15 server test files, 21 Playwright specs, 4-stage CI gate |

---

## 4. The five findings that matter most

1. **There is no provenance layer.** Every pet fact is a bare column on a
   57-column table. The system cannot distinguish what an owner typed from what
   a vet document said from what the model guessed, and it cannot say when a
   fact became true. Nothing described in this prompt as "Pet 360" or "Pet
   Knowledge" can be built correctly on top of that. This is the P0.

2. **The shop serves an unreviewed catalogue.** `/api/products` returns
   `business_products` ∪ `scraped_products`. The AI assistant deliberately
   searches only `business_products`, and the code says why: scraped rows "have
   no publication state yet". The shop has no such guard.
   (`server/src/index.js:4229`, `server/src/catalogRecommendations.js:16-18`.)

3. **Activity does not exist.** Not "partially" — there is no walk table, no
   route storage, no check-in, no API. `/parks`, `/dog-parks`, `/radar` are all
   redirects to `/chat`. The `dog_parks` table is seeded data nothing reads.

4. **The event backbone is built but switched off.** `outbox_events` is a
   correct transactional outbox with 16 declared types. Delivery goes to a
   single `AUTOMATION_WEBHOOK_URL`; unset, the dispatcher is a no-op and events
   accumulate. That is a deliberate, recoverable design — but nothing consumes
   events today, so no workflow can yet be event-driven.

5. **Everything runs in one process on one host, including the media.** Uploads
   are bind mounts on the EC2 instance. There is no object store and no backup
   of user media in the deploy scripts (the database is dumped before
   migration; `/opt/mipo/uploads` is not).

---

## 5. Document index

| # | Document |
|---|---|
| 01 | User lifecycle |
| 02 | Onboarding |
| 03 | Pet lifecycle |
| 04 | Pet 360 |
| 05 | Pet knowledge |
| 06 | Document intelligence |
| 07 | Health workflows |
| 08 | Activity workflows |
| 09 | Park workflows |
| 10 | Social workflows |
| 11 | Moments |
| 12 | Store workflows |
| 13 | Product matching |
| 14 | Cart, checkout, orders |
| 15 | AI workflows |
| 16 | Notifications |
| 17 | CRM workflows |
| 18 | Event architecture |
| 19 | Security workflows |
| 20 | Privacy workflows |
| 21 | Error and recovery |
| 22 | State machines |
| 23 | Data flow |
| 24 | API map |
| 25 | Background jobs |
| 26 | Analytics events |
| 27 | Species differences |
| 28 | Source of truth |
| 29 | Gaps and recommendations |
| 30 | Implementation roadmap |
| — | `DECISIONS.md` |
