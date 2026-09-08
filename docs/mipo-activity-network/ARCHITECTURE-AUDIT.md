# Architecture audit — MIPO Activity Network

Phase 0. Nothing here is proposed; everything is what the repository contains
today. Verified against `aws-migration` (production tip `fffa67a3`) on
8 September 2026 by reading the code, applying the 33 migrations to a real
PostgreSQL 16, and running the server and browser suites.

Where a claim could not be verified from the repository it is marked UNKNOWN
rather than guessed. Spec §77 forbids inventing capability, and that cuts both
ways: it also forbids inventing certainty.

---

## Summary table

| Area | Status | One line |
|---|---|---|
| Frontend app | **REUSABLE** | React 18 + Vite 7 + TypeScript, PWA. Solid base. |
| Mobile | **MISSING** | No native project of any kind. Web/PWA only. |
| Backend | **NEEDS EXTENSION** | One 8,750-line Node HTTP server, hand-rolled routing. |
| Database | **REUSABLE** | PostgreSQL on RDS, 33 checksum-verified migrations. |
| Authentication | **REUSABLE** | scrypt hashes, opaque hashed session tokens. Sound. |
| Authorization | **NEEDS EXTENSION** | Ownership checks per route; no shared object-level layer. |
| Media storage | **NEEDS EXTENSION** | **Local disk on one EC2 host. No S3, no CDN.** |
| Maps | **MISSING** | No map library. No tile provider. Nothing. |
| Location | **MISSING** | `getCurrentPosition` in 3 places. No `watchPosition` anywhere. |
| Walks / Parks / Check-ins | **MISSING** | Zero tables, zero routes, zero UI. |
| Social | **REUSABLE** | Working feed: 5 tables, 11 routes, video upload. |
| Social graph (follows) | **MISSING** | No follow table of any kind. |
| Pets | **REUSABLE** | Rich pet model; needs a confidence/source layer. |
| Notifications | **NEEDS EXTENSION** | In-app rows only. **No web push, no VAPID.** |
| AI gateway | **REUSABLE** | Providers, models, pricing, trace ids, cost ledger. |
| Store catalog | **REUSABLE** | Canonical catalogue + a public-field allowlist. |
| Outbound events | **REUSABLE** | Transactional outbox. Integration, not analytics. |
| Product analytics | **MISSING** | None. The client tracker is a documented no-op. |
| Multi-tenancy | **MISSING** | `organization_id` on 3 AI ledger tables. No tenants. |
| AWS infrastructure | **REUSABLE** | Single EC2 + Caddy + Docker, RDS for the database. |
| CI/CD | **REUSABLE** | 3 workflows, incl. a migration rehearsal on real Docker. |
| Testing | **REUSABLE** | 118 server tests, 60 browser tests. |

---

## Frontend — REUSABLE

React 18, Vite 7, TypeScript, Tailwind, react-router, framer-motion,
lucide-react. RTL Hebrew throughout.

`src/components/MainShell.tsx` switches four surfaces off the pathname —
`/feed`, `/chat`, `/shop`, and Home — each lazily imported, with a bottom nav.
The Activity Network would add a fifth (Map) and this is where it goes.

It is already a **PWA**: `vite-plugin-pwa` in `vite.config.ts` generates the
manifest, `src/sw.ts` is the service worker, and `public/` carries the icons and
an offline page. So MIPO can already be added to a phone's home screen and open
full-screen without browser chrome. That matters for the mobile question below:
what MIPO lacks is not the appearance of an app, it is the OS permissions.

**Caveat found during this audit.** `npm run typecheck` compiles
`tsconfig.active.json`, whose file list is only `src/main.tsx` and `src/sw.ts`.
It therefore checks only what the running app imports. Sixty imports elsewhere
under `src/` point at modules that do not exist on disk — dead trees under
`components/feed`, `components/admin`, `components/training` and
`components/common`. None is reachable, so none can break production, but a new
Activity surface that imports one of those barrels would break the build for no
visible reason. A ratchet (`scripts/check-imports.mjs`) now fails CI on any
*new* broken import.

## Mobile — MISSING

There is no `ios/` or `android/` directory, no Capacitor, no React Native, no
Cordova. `package.json` contains none of them. MIPO is a website.

This is the single most consequential finding for this spec, and §19 and §20
depend on it entirely. See TECHNICAL-RISKS.md.

## Backend — NEEDS EXTENSION

`server/src/index.js` is 8,746 lines and contains 99 route handlers. There is no
framework: the request handler matches `url.pathname` with string comparisons
and regular expressions, in order. Supporting modules are extracted properly —
`social.js`, `health.js`, `events.js`, `aiGateway.js`, `security.js`,
`passwords.js`, `productIntel.js`, `shippingAddress.js` and others — and those
are unit-tested. `index.js` itself is not directly testable: importing it starts
a server.

Consequence for this project: the Activity Network adds roughly twenty routes.
Putting them inline in `index.js` follows convention but deepens the problem.
The existing convention that *does* scale is the one `social.js` established —
domain logic in its own module, with `index.js` holding only the routing and
auth. DATA-MODEL.md and IMPLEMENTATION-PLAN.md assume that pattern.

## Database — REUSABLE

PostgreSQL. Production runs on **RDS** — the `postgres` service in
`deploy/aws/docker-compose.yml` carries `profiles: ["staging"]` and never starts
in production.

33 migrations in `server/sql/`, applied by `server/src/applyMigrations.js`:
advisory-locked, recorded in a ledger, and checksum-verified, so an edited
applied file is refused. Each file runs in its own transaction; there is no
run-level transaction, which is why a mid-run failure leaves a half-migrated
database. That is not theoretical — it happened on 8 September and caused a
four-hour login outage. A dry-run rehearsal against a restored dump now runs
before production migrations, in CI and in the deploy.

**The only extension installed is `pgcrypto`.** There is no PostGIS, no
`cube`/`earthdistance`. This matters for park proximity — see
TECHNICAL-RISKS.md and DATA-MODEL.md. RDS can enable PostGIS, but at MIPO's
scale it is not needed.

## Authentication — REUSABLE

- `public.app_users` with a scrypt password hash (`server/src/passwords.js`:
  `scrypt$salt$hash`, compared with `timingSafeEqual`).
- `public.user_sessions` stores `session_token_hash` — an opaque token, hashed
  at rest, with `expires_at`. Not JWT, which means sessions are genuinely
  revocable server-side.
- Email verification (0024) and terms acceptance (0023) exist.
- Admin RBAC exists (0002, 0016, `adminPermissions.js`).

Nothing here needs replacing. Walks, check-ins and moments authenticate the same
way every other route does, through `requireUser`.

## Authorization — NEEDS EXTENSION

Every protected route checks ownership itself, inline. There is no shared
object-level authorization helper. For a domain where the objects are a person's
routes and a pet's location history, and where the spec (§46, §55–57) calls out
IDOR explicitly, that per-route pattern is where a mistake will eventually be
made. PRIVACY-MODEL.md proposes one visibility resolver that every Activity read
passes through, rather than repeating the rule twenty times.

## Media storage — NEEDS EXTENSION (and this is a real problem)

Uploads are written to the **local filesystem** of the single EC2 host:

```
server/src/index.js:88   const uploadDir        = process.env.UPLOAD_DIR         || "/app/uploads";
server/src/index.js:89   const privateUploadDir = process.env.PRIVATE_UPLOAD_DIR || "/app/private-uploads";
```

Those are Docker volumes on the instance, created by the deploy
(`deploy-aws.yml`, "Prepare remote directories"). **There is no S3 bucket and no
AWS SDK dependency in either `package.json`.** Caddy serves `/uploads/*` from
disk; there is no CDN in front of user media.

Limits today: 5 MB general, 25 MB for social
(`MAX_UPLOAD_BYTES`, `MAX_SOCIAL_UPLOAD_BYTES`), with `video/mp4`,
`video/quicktime` and `video/webm` accepted for social.

Walk and park Moments are video-first by design. This storage model does not
survive that. See TECHNICAL-RISKS.md, risk 1.

## Maps — MISSING

No map library in `package.json`: no Leaflet, no MapLibre, no Mapbox GL, no
Google Maps loader. No tile provider is configured. The Map surface (§13–15) is
entirely greenfield and carries an external-dependency decision with a bill
attached.

## Location — MISSING

`navigator.geolocation.getCurrentPosition` appears in exactly three places:
`src/hooks/useLocation.ts`, `src/components/profile/PetWeatherAlert.tsx`, and
`src/components/profile/PreventiveCareEngine.tsx`. All are one-shot foreground
reads used to pick a nearby city or weather.

**`watchPosition` does not appear anywhere in the repository.** There is no
route sampling, no distance accumulation, no permission state machine, no
background handling. LOCATION-ARCHITECTURE.md starts from zero.

## Walks, Parks, Check-ins — MISSING

Zero. No `walk`, `park`, `check_in`, `route` or `visit` table in any of the 33
migrations; no matching route in the server; no UI. Nothing to reuse and nothing
to conflict with.

## Social — REUSABLE

`server/sql/0014_social_feed.sql`: `social_posts`, `social_post_reactions`,
`social_post_saves`, `social_post_comments`, `social_poll_votes`, with partial
indexes for the feed.

`social_posts` already carries `pet_id`, `visibility` (`public`/`private`),
`moderation_status`, `archived`, `location` (free text) and an embedded poll.
`server/src/social.js` (351 lines) and 11 routes under `/api/feed` and
`/api/me/social/uploads` implement it, with rate limits (12 uploads/hour,
60 writes/hour).

**This is the Moment table.** §7 asks for a Moment object with `walk_id`,
`park_id`, hashtags and AI metadata; `social_posts` needs those columns, not a
replacement. §37 says do not build a second feed — the correct reading of that
instruction is: extend this one.

Two gaps inside it. `upload_id` is a single `not null` reference, so a post
holds exactly one piece of media — no carousel. And `moderation_status` exists
but **no route ever writes to it**: every post is born `published` and there is
no way to hide one.

## Social graph — MISSING

There is no follow, friendship or connection table anywhere. §10–11 assume
MIPO already has social relationship infrastructure to extend. It does not. The
"Following" tab has no possible data source today.

## Pets — REUSABLE, needs a confidence layer

`public.pets` (0005) carries name, type (`dog`/`cat`/`other`), breed,
`secondary_breed`, `is_mixed`, `breed_confidence`, weight, birth date, gender,
`is_neutered`, `medical_conditions[]`, `personality_tags[]`,
`favorite_activities[]`, `activities[]`.

`breed_confidence` is the one existing precedent for §9's
`AI_INFERRED` / `OWNER_CONFIRMED` distinction. Every other field is a flat fact
with no record of who asserted it, so an AI inference written into `pets` would
silently overwrite what the owner typed. DATA-MODEL.md proposes a separate
attribute table rather than more columns.

`pet_characters` (0015) is worth studying as a pattern: generated content about
a pet, with an explicit `consented_at`, versioning and its own asset table.

## Notifications — NEEDS EXTENSION

`public.notifications` (0006) holds in-app rows: type, title, message, `data`,
`action_url`, `is_read`. Delivery is pull — the client lists them.

There is **no web push**: no `web-push` dependency, no VAPID keys, no
`pushManager` subscription in the service worker. §57's "a friend is at the
park" cannot be delivered to a closed app today.

## AI gateway — REUSABLE

`server/sql/0026_ai_gateway_foundation.sql` is real infrastructure:
`ai_providers`, `ai_models` (with a `capabilities` GIN index),
`ai_pricing_versions`, `ai_features`, `ai_requests`, plus `usage_events` and
`cost_events` ledgers keyed by `trace_id`.

Eight features are seeded, including `agent_task`. A `vision` capability already
exists and is used for documents and product images. §9's media analysis is a
new feature slug on this gateway, not new infrastructure.

Note: `usage_events` and `cost_events` are **AI cost ledgers**, not product
analytics. They answer "what did this cost", not "did the user complete a walk".

## Store — REUSABLE, and §42 is already satisfied

`business_products` (curated) and `scraped_products` (raw imports), with
`PUBLIC_PRODUCT_FIELDS` (`server/src/index.js:4197`) as an allowlist that
`toPublicProduct` copies through, so a column added later is private by default.

The catalogue carries the fields a recommender actually needs: `pet_type`,
`life_stage`, `dog_size`, `breed_tags`, `medical_tags`, `special_diet`,
`safety_score`, `category_id`.

§42's hard rule was violated until 8 September: the AI chat returned a
`products` array the model had written, and nothing checked it against the
catalogue. `server/src/catalogRecommendations.js` now reads the model's output
as a *search*, resolves it against `business_products`, and drops anything that
does not match. Any new surface that shows products must call that resolver
rather than trusting a model.

One open item, inherited: `listProducts` still serves raw `scraped_products`
rows to customers, and no publication flag exists in any migration.

## Outbound events — REUSABLE, but not analytics

`outbox_events` (0020) is a transactional outbox: an event row is written in the
same transaction as the change it describes, then delivered with retries and
backoff by `startDispatcher`. `EVENT_TYPES` is a closed list.

§66 says reuse the existing event infrastructure, and for *integration* events
(`WALK_COMPLETED` reaching n8n) that is right. It is the wrong table for
high-volume behavioural analytics — see EVENTS.md, which separates the two.

## Product analytics — MISSING

There is no analytics pipeline. `src/hooks/useActivityTracker.ts` exposes
`trackClick`, whose body is a comment:

```ts
const trackClick = useCallback((_elementId: string, _elementLabel?: string) => {
  // Click analytics endpoint is not available on AWS yet.
}, []);
```

§60 lists eighteen events and names "COMPLETED ACTIVITY LOOP" as the primary
KPI. None of it can be measured today. This is a dependency of the ranking work,
not a nice-to-have.

## Multi-tenancy — MISSING

`organization_id` appears only as a nullable column on three AI ledger tables,
and 0026 says so in its own comment: *"organization_id is added nullable on the
ledgers only."* There is no organizations table and no tenant column on `pets`,
`social_posts` or the catalogue.

MIPO is a single-tenant consumer product. Requirements written as "all queries
must be tenant-aware" describe a structure that does not exist; writing
tenant-aware code against it would be writing against nothing.

## AWS infrastructure — REUSABLE

One EC2 instance (`63.183.241.110`, `/opt/mipo`), Docker Compose with two
production services: `mipo-api` (Node) and `caddy` (TLS, static files, `/api`
proxy). The database is RDS. Caddy serves `/assets/*` before the SPA fallback
and forwards `X-Forwarded-For` from the real remote host.

Not present: S3, CloudFront, KMS usage in the app, Secrets Manager in the app,
SQS, autoscaling, a second instance. Secrets reach the container through a
`.env` file on the host. UNKNOWN from the repository: the RDS instance class,
its backup schedule, the security group rules, and whether SSM Parameter Store
is used outside the app.

## CI/CD — REUSABLE, and better than most

- `deploy-aws.yml` — quality gate (dependency audits, 118 server tests, lint,
  typecheck, import check, production build, 60 browser tests) → database
  integration → deploy behind an approval, with a `pg_dump` and a **dry-run
  migration rehearsal against a restored copy** before production is touched.
- `db-integration.yml` — ephemeral PostgreSQL per push: rehearsal, migrations,
  idempotency, ledger count, API smoke against the live schema, unit tests, and
  a seeded workbench that reproduces production's data faults.
- `e2e-tests.yml` — the same quality gate for pull requests.

New Activity work inherits all of this. Migrations will be rehearsed before they
run on production, which for a domain adding this many tables is worth a lot.

## Testing — REUSABLE

118 server unit tests (`node --test`, `server/test/*.test.js`) and 60 Playwright
tests (`e2e/*.aws.spec.ts`, chromium + Pixel 5). The pattern to follow is
`social.test.js`: pure functions extracted from the domain module and tested
without a database, plus real-schema coverage through `db-smoke.mjs`.

No test today touches geolocation, and Playwright's geolocation emulation is
unused. It exists and works, and UX-FLOWS.md's error states are testable with it.
