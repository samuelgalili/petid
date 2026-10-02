# MIPO — context for coding agents

Written against `aws-migration` at `5d10b145` (2026-09-30, merge of [#48](https://github.com/samuelgalili/petid/pull/48)). This file describes the tree that production runs once that deploy finishes. Anything marked "not verified" was not checked against the live host or GitHub settings. `CLAUDE.md` is the short rule list. `todo.md` is the open work, with links.

Older design notes under `docs/` often describe an earlier schema. When they disagree with `server/sql` and `server/src`, trust the code.

## Production is not `main`

The live site is [https://mipo.pet](https://mipo.pet). Production is `aws-migration`, deployed by the **Deploy AWS** workflow (`.github/workflows/deploy-aws.yml`) on push.

`main` and `aws-migration` diverged at `ee5f033c` (2026-04-29, "Update URLs to custom domain petid.co.il"). As of this snapshot:

- GitHub's default branch is `aws-migration` (`git ls-remote --symref origin HEAD`). When it changed from `main` is not verified.
- `main` has 316 commits that are not in `aws-migration`.
- `aws-migration` has 448 commits that are not in `main`.

A green check on a pull request into `main` does not ship anything. Five open pull requests still target `main` (see `todo.md`). Merging one of those branches into `aws-migration` would drag the diverged `main` history with it, including Supabase-era files that production no longer runs. Port the change onto a new branch from `aws-migration` instead.

There is no remote branch named `staging`. The deploy workflow is already willing to deploy one. `docs/STAGING.md` says the AWS staging host has not been created.

## Product

MIPO ("My Precious One") is a Hebrew, right-to-left pet app and shop. The customer surfaces that are actually routed are:

- Account: signup, login, email verification, password reset, onboarding.
- Home, community feed, and AI chat, switched inside `MainShell` (`/`, `/feed`, `/chat`, `/shop`).
- Pets: create and edit, profile, archive, documents, breed encyclopedia, and a public found-pet page for a QR scan.
- Shop: search, product page, cart, favorites, checkout, order history and tracking, payment result pages.
- Admin, under `/admin`, for people who hold an admin role.

`index.html` sets `lang="he"` and `dir="rtl"`. The manifest language is Hebrew. Customer copy is Hebrew. `src/locales` also has English (left-to-right) and Arabic (right-to-left); Hebrew is the default.

A large set of older paths (parks, live video, stories, business CRM, insurance, training, and many `/admin/*` tools) still exist as redirects in `src/routes/index.tsx`. They are not features. Do not rebuild them because a component file is still on disk. `src/components` still contains folders for those retired surfaces.

## Tech stack

| Layer | What production uses |
|---|---|
| Frontend | Vite 7, React 18, TypeScript, React Router 7, TanStack Query, Tailwind, Radix. PWA via `vite-plugin-pwa` (`injectManifest`, worker `src/sw.ts`). Dev server port **8080**. |
| API | Node.js ESM, no Express. One HTTP server in `server/src/index.js`, plus modules it imports. Node `^20.19.0` or `>=22.12.0`. CI pins **20.19.0**. |
| Database | PostgreSQL. AWS RDS in production. Postgres 16 in CI and in the local workbench. Migrations are SQL files in `server/sql`, applied by `server/src/applyMigrations.js` into `schema_migrations` (checksummed, locked). |
| Host | AWS Lightsail. Docker Compose in `deploy/aws`. Caddy serves `dist/`. The API container serves `/api` and is health-checked on `/api/health/schema`. |
| Payments | Cardcom Low Profile. All four Cardcom variables, or payments stay off. |
| Mail | Resend. |
| AI | Gemini by default (`GEMINI_API_KEY`). Pet character images can use Vertex instead. Product import can use Firecrawl. Usage is metered through the AI gateway. |
| Automation | Transactional outbox. Delivery is off until `AUTOMATION_WEBHOOK_URL` is set. |

Supabase and Vercel are not the runtime. Leftover references belong to the `main` history. Do not add a Supabase client or a Vercel config on this branch.

## Folder map

| Path | Role |
|---|---|
| `src/pages`, `src/routes/index.tsx` | Screens and the route table. `src/routes/index.tsx` is the source of truth for what is reachable. |
| `src/components` | UI. `src/components/ui` is the shared kit. `src/components/mipo`, `shop`, `pet`, `admin`, `onboarding`, `checkout` are the live areas. Other folders may be unused. |
| `src/lib/mipoApi.ts` | Browser client for the API. |
| `src/lib/catalogSearch.ts` | Shop search. Must stay a verbatim copy of `server/src/catalogSearch.js`. A server test compares them character for character. |
| `src/hooks`, `src/contexts`, `src/locales` | Hooks, cart/auth/language state, copy. |
| `server/src/index.js` | API router and most domain logic. Very large. New admin-OS and product-intake routes live in `server/src/adminOs/` and `server/src/productIntakeRoutes.js` and return before the long `if` chain. |
| `server/sql` | Forward-only migrations. 61 files, numbered `0001`–`0061`: `0018` and `0061` are each used twice, `0030` and `0031` are unused. |
| `server/test` | `node:test` files. 108 files. Tests that need a database skip without `DATABASE_URL`. |
| `server/scripts` | Maintenance scripts. They are not copied into the API image. Production one-shots bind-mount them. |
| `e2e` | Playwright. Only `*.aws.spec.ts` runs (28 files). Older `*.spec.ts` files are quarantined. |
| `deploy/aws` | Production compose, Caddy, backup, migration dry-run. |
| `deploy/local` | Workbench compose (Postgres, API, Caddy). |
| `scripts/workbench.sh` | Local full stack. |
| `.github/workflows` | Deploy, CI, and the production one-shots. |
| `docs/` | Design history. Useful, often stale. See the last section. |

`@/` maps to `src/`.

## Run, test, and build

Node 20.19 or newer.

Day-to-day, two processes:

```bash
npm ci
npm ci --prefix server
cp .env.example .env   # then fill DATABASE_URL and whatever the flow needs
npm run db:migrate
npm run dev:api        # API on :3000, reads .env
npm run dev            # Vite on :8080, proxies /api to VITE_API_PROXY_TARGET
```

`VITE_API_PROXY_TARGET` defaults to `http://127.0.0.1:3000`.

The workbench is the same shape as production (Postgres 16, the API image, Caddy) and cannot reach the production host:

```bash
bash scripts/workbench.sh up
```

See `docs/WORKBENCH.md`. Postgres is on `127.0.0.1:55432`. `up` migrates and seeds an empty catalogue.

Commands that match CI:

| Command | What it checks |
|---|---|
| `npm test --prefix server` | API tests (`node --test` from `server/`). |
| `npm run lint` | ESLint, quiet. `lint:all` and `lint:strict` exist. |
| `npm run typecheck` | The graph imported from `src/main.tsx` and `src/sw.ts` (`tsconfig.active.json`). |
| `npm run check:imports` | Every import under `src/` points at a file, including modules the app no longer imports. |
| `npm run build` | Production frontend bundle. |
| `npm run test:e2e` | Playwright. Locally starts Vite on 8080. In CI, starts `vite preview` of `dist/` on 4173. |

Install browsers once with `npx playwright install chromium`. Specs mock the API. They do not hit a live database. Under `CI=1`, the browser loads `dist/`, so a source edit is invisible until `npm run build`.

`npm run typecheck:all` covers `tsconfig.app.json` and is not what CI runs.

A database that already has tables but no `schema_migrations` ledger will refuse to replay history. Baselining is a one-time, explicit act: `MIGRATION_BASELINE_THROUGH=<last existing filename>` and `MIGRATION_BASELINE_CONFIRM=existing-schema-reviewed`. Later runs must omit both.

## Environments and deploy

### Branches

| Branch | What a push does |
|---|---|
| `aws-migration` | **Deploy AWS.** This is production. |
| `staging` | Same workflow, GitHub Environment `staging`. The branch does not exist yet, and the staging host is not created (`docs/STAGING.md`). |
| `main` | Former default branch. Push runs the **Quality** workflow only. It does not deploy. |
| `claude/*`, `cursor/*`, anything else | No deploy. Open a PR. |

Do not push to `aws-migration`. Do not merge your own PR. The owner merges, and a push to `aws-migration` is what starts a production deploy.

### Deploy AWS

`.github/workflows/deploy-aws.yml`, on push to `aws-migration` or `staging`, or `workflow_dispatch`.

1. **Quality gate** (no GitHub Environment, so it does not wait for approval): reject tracked `.env` files other than `.env.example`, `npm ci`, `audit-ci`, server `npm audit`, `node --check`, server tests, lint, typecheck, `check:imports`, production build with `VITE_APP_URL` from `MIPO_PUBLIC_BASE_URL`, Playwright.
2. **Database integration** (reusable workflow): applies migrations to an ephemeral Postgres 16 and rehearses `deploy/aws/dry-run-migrations.sh`. On `aws-migration` this job is called by Deploy AWS so the deploy waits for it. As a standalone workflow it ignores `aws-migration` and runs on other pushes and on every pull request.
3. **Deploy**, only after both succeed, and only for those two branches. Bound to the GitHub Environment `production` or `staging`. That is the only job that can pause for a required reviewer, and only if one is configured on the environment. `docs/DEPLOY_APPROVAL.md` is the setup note. A comment in `production-search-vocabulary.yml` records that, at the time of the D-18 run, the `production` environment had no required reviewer, so binding to it obtained the SSH key and the log without an approval pause. Whether a reviewer is configured now is a GitHub setting, not something this repo can prove.

The deploy itself: verify the host (a staging deploy that resolves to the production host is refused), rsync `server/` and `deploy/aws/` but not `dist/` yet, build the API image, dump the database and stop if the dump fails, rehearse migrations on a throwaway copy of that dump, apply migrations, recreate the API and wait on `/api/health/schema`, then rsync `dist/` and reload Caddy, then smoke-test `/api/health`, `/api/health/schema`, and `/`. The reported `version` must match the first 12 characters of `GITHUB_SHA`. `unknown` is a warning, not a failure.

Frontend is published only after the API is healthy, so a new bundle is never served against the previous API.

Runtime secrets live in AWS SSM and are synced to `/opt/mipo/.env` (mode `0600`). The workflow secret is `MIPO_AWS_SSH_PRIVATE_KEY` on the `production` environment. Variable names: `MIPO_PUBLIC_BASE_URL`, `MIPO_AWS_HOST`, `MIPO_AWS_USER`, `MIPO_REMOTE_PATH`, `MIPO_SKIP_DRYRUN`. `MIPO_SKIP_DRYRUN=1` skips the migration rehearsal. Leave it unset.

Pull requests into `aws-migration`, `main`, or `master` run `.github/workflows/e2e-tests.yml` (also named Quality: audits, server tests, lint, typecheck, build, Playwright). They do not deploy.

### Production read-only and one-shot workflows

These workflows are `workflow_dispatch` only. They use the `production` environment and the existing SSH key. They do not create a second credential. Concurrency group is the literal `aws-production`, the same group a production deploy holds, so a measurement cannot sit on `ACCESS SHARE` locks while a migration waits on `ACCESS EXCLUSIVE`.

Shared safety pattern:

- A typed confirmation is required before anything connects. Read-only workflows accept only the exact text `READ-ONLY`. A wrong value exits before SSH.
- The SQL in the workflow file is checked, before connecting, to be `SELECT` only.
- Statements run inside `BEGIN` / `SET TRANSACTION READ ONLY` / `ROLLBACK`.
- `DATABASE_URL` is not printed and is not passed as a value on the workflow's command line. The container receives the name; the process on the host still sees the value for the length of the query.
- They do not rsync, build, migrate, restart, or publish.

| Workflow | File | What it does |
|---|---|---|
| D-18 production read-only | `production-d18-readonly.yml` | Counts for the admin and business-population questions. |
| C-0 catalogue measurement | `production-catalogue-measure.yml` | Counts over the legacy catalogue. No product names, descriptions, supplier URLs, or barcode values. |
| S-0 search vocabulary | `production-search-vocabulary.yml` | Word frequencies for `catalogSearch.js`. Brands and categories are the deliberate exception. |
| Legacy catalogue migration | `production-legacy-catalogue-migrate.yml` | **Writes.** Dry-run is the default. `apply` needs a second confirmation that matches the step (`MIGRATE-LEGACY`, `APPROVE-LEGACY`, `COMPLETE-LEGACY`, `SELLER-STATUS`). Takes the deploy's backup first. `migrate` inserts only into `raw_import_records` and `product_drafts` (drafts stay `IMPORTED`). `approve`, `complete`, and `seller` are separate steps. `seller` changes one business id, never "all". |
| Hide broken-image products | `production-hide-broken-image-products.yml` | **Writes** in `hide` / `unhide`. Dry-run default, a confirmation per write mode, backup before a write. Sets `shop_hidden` on an allowlist and records the previous value. Stock is not touched. Whether it was run in a write mode: not verified. |
| Hide irrelevant products | `production-hide-irrelevant-products.yml` | Same pattern for 42 products the owner judged irrelevant or duplicate ([#43](https://github.com/samuelgalili/petid/pull/43)). |
| Cancel test orders | `production-cancel-test-orders.yml` | **Writes** in `apply` with confirmation `CANCEL-TEST-ORDERS`. Cancels seven allowlisted order numbers only while still unpaid. Rows stay. ([#41](https://github.com/samuelgalili/petid/pull/41), [#47](https://github.com/samuelgalili/petid/pull/47).) |
| Set email env | `set-email-env.yml` | **Writes** two keys in `/opt/mipo/.env` (`PASSWORD_RESET_FROM_EMAIL`, `RESEND_API_KEY` from the GitHub secret) and recreates the API. Dry-run default; a write needs `SET-EMAIL-ENV`. It does not touch SSM, so the next `sync-ssm-env.sh` overwrites both unless SSM is updated too ([#48](https://github.com/samuelgalili/petid/pull/48)). |
| Cardcom missed payments | `production-cardcom-missed-payments-readonly.yml` | Read-only list of shop orders that may have been charged while the indicator webhook answered 502. Confirmation text is `READ-ONLY`. Selects order numbers and low-profile codes, not names, emails, phones, or addresses. Added by [#27](https://github.com/samuelgalili/petid/pull/27). It does not mark anything paid. |

## Data model

Schema is the SQL files, in filename order. The runner sorts filenames, so the two `0018_*.sql` files both run. There is no Prisma.

**Identity.** `app_users`, `user_sessions` (hashed token), `profiles`. Signup requires terms acceptance (`0023`) and can record email verification (`0024`). Customer and admin sessions are different cookies (`mipo_user_session`, `mipo_admin_session`).

**Pets.** `pets` (owner, species dog/cat/other, archive). Pet character images (`0015`, `0029`). Pet facts (`0036`, `0037`) with a registry in `server/src/petFactRegistry.js`. Health: vet visits, vaccinations, documents, insurance claims, service bookings (`0006`–`0009`).

**Legacy catalogue, what the shop still sells.** `business_profiles`, `business_products`, categories and aliases. Orders and payments (`0003`, `0004`): `orders`, `order_items` (line snapshots, no foreign key back to a product row), coupons, `cardcom_events`.

**New catalogue, not what the shop page reads.** From `0042` onward: `raw_import_records`, `product_drafts`, `catalog_products`, `product_variants`, `seller_offers`, `inventory`, `product_media`, plus seller commercial status and order seller snapshots. Public reads go through `server/src/publicCatalog.js` on `/api/catalog`. A row is visible only when the product is `PUBLISHED`, the selling business is eligible, a variant has an active priced offer with stock or preorder, and an approved image exists.

**Admin.** Roles in `server/src/adminPermissions.js`: `admin`, `product_manager`, `seller_admin`, `readonly_admin`. Permissions are enumerated. There is no `*` wildcard. Scope (`platform` or `seller`) is separate from permission. Admin OS tables start at `0056` (audit, manual orders, connectors, attested payment, price adjustment).

**Other.** Social feed (`0014`). Outbox (`0020`, `0038`). AI gateway ledger (`0026`). Shipping profiles (`0028`).

`LEGACY_INTAKE_FROZEN` defaults to frozen. It is off only when the value is exactly `false`. Frozen intake rejects payloads that carry `source_url`.

## Key flows

**Auth and onboarding.** `POST /api/auth/signup` creates `app_users` and a profile, requires terms acceptance, and sends a verification code afterwards. Signup still succeeds if the mail does not. Login and logout are session cookies. Password reset is an email OTP via Resend. `/onboarding` is behind `ProtectedRoute`. Completing it calls `createMyPet` (the same create path as Add Pet) and uploads the photo as a file. It does not write a data URL onto the pet. A local flag `onboardingCompleted` is only a client hint. The production port of this is merged PR [#21](https://github.com/samuelgalili/petid/pull/21). The still-open [#16](https://github.com/samuelgalili/petid/pull/16) is the `main` copy.

**Pet.** Owner CRUD is `/api/me/pets`. Public QR data is `/api/public/pets/:id` plus a scan log. `/pet/:id` redirects to `/found-pet/:id`. Character generation is a separate job on the pet (`petCharacter.js`) and needs a Gemini or Vertex key. Facts, observations, and events have their own subroutes.

**Shop, cart, checkout.** The shop page calls `getShopProducts()` → `GET /api/products`, which reads `business_products`. Search runs in the browser from `catalogSearch.ts` over that payload. `/api/catalog` is live and unused by the shop. Switching `/api/products` to the new tables would empty the shop: current products have not been through intake, and legacy rows are not treated as published.

`/shop` is reachable without an account. `/` still requires one. Login and signup link to the shop ([#29](https://github.com/samuelgalili/petid/pull/29)). The cart is `localStorage` key `mipo-cart`. `sellerId` exists on the line type and is not populated, so checkout is one group (`src/lib/cartGrouping.ts`). `POST /api/orders` can be a guest; the price is computed on the server from the catalogue, not from the client. Shipping is validated with Zod. Phone and zip are reduced to digits first (`src/lib/checkoutContact.ts`), so a dashed phone or a spaced zip still reaches the payment step. Product pages hide import-only columns (`src/lib/productSpecs.ts`). Coupons are `POST /api/coupons/validate`.

**Cardcom.** `POST /api/payments/shop` starts a Low Profile session when terminal, username, API password, and webhook secret are all set. If any one is set, boot fails until all four are set. If none are set, production payment returns 503; a non-production server marks the order `dev_approved`. The webhook is `POST` or `GET` `/api/payments/cardcom/webhook`. It checks the shared secret before it asks Cardcom for the indicator. A verified capture whose amount matches the order is marked paid. A decline, including one with no amount fields, is recorded and answered 200, and is not marked paid ([#27](https://github.com/samuelgalili/petid/pull/27)). Merging that fix does not replay old callbacks. Cash on delivery is a separate payment method and does not call Cardcom.

**Admin.** `POST /api/admin/login`, then a password change for a provisioned account (`/admin/change-password`) before other admin calls. Provision with:

```bash
npm --prefix server run admin:provision -- --email <email> --role <role> --display-name "<name>"
```

Roles: `admin` (full enumerated list), `product_manager` (legacy catalogue edits, not deletes, not orders), `seller_admin` (seller-scoped intake and offers, cannot review their own draft), `readonly_admin` (seller-scoped reads, not the audit log). The client copy in `src/lib/adminPermissions.ts` is a subset of the server list. The server is authoritative.

Two-factor ([#32](https://github.com/samuelgalili/petid/pull/32), `server/src/adminTwoFactor.js`, migration `0061_admin_two_factor.sql`) is TOTP plus recovery codes, off unless `ADMIN_2FA_ENABLED` is on. With it on, `SECRET_ENCRYPTION_KEY` is required at boot and `ADMIN_2FA_REQUIRE_ENROLLMENT` stops an unenrolled admin at enrolment. `ADMIN_API_KEY` callers are not challenged. Setup: `docs/ADMIN_2FA_DEPLOYMENT.md`. Whether the flag is on in production: not verified.

Ready admin screens include Command Center, customers and customer 360, orders (including a manual order), products (catalogue, publishing, import), categories, coupons, analytics, AI economics, connectors, notifications, audit log, settings. Thirteen more routes render `AdminPlannedScreen` on purpose. They are listed in `todo.md`.

**Owner notifications.** `server/src/ownerNotify.js` sends the owner a WhatsApp through Twilio for orders, payments, signups and outages ([#30](https://github.com/samuelgalili/petid/pull/30)). Off unless `OWNER_NOTIFICATIONS_ENABLED` and the Twilio settings are present. `site-health.yml` probes the public health endpoint every ten minutes from a runner, and the deploy notifies on success or failure. Whether the secrets are set: not verified.

**Shop visibility.** `business_products.shop_hidden` (`0061_product_shop_visibility.sql`) hides a product from the shop, search, categories and sitemap without touching stock. Hidden, imageless and zero-price products are not sold, and the cart drops an unavailable line at checkout ([#44](https://github.com/samuelgalili/petid/pull/44), [#45](https://github.com/samuelgalili/petid/pull/45)). Rules: `server/src/shopVisibility.js`.

**Mail.** `PASSWORD_RESET_FROM_EMAIL` defaults to Resend's testing sender, which delivers only to the Resend account's own address. Production must set a verified sender. A bad sender is reported (health and Command Center), not a boot failure, because signup is designed to succeed even when the message does not go out.

## Environment variable names

Never commit values. `.env.example` is the template and does not list every name the server reads.

**Browser, baked at build.** `VITE_APP_URL`, `VITE_API_URL`, `VITE_DEFAULT_BUSINESS_ID`, `VITE_APP_VERSION` (deploy sets the short SHA; local builds say `dev`). `VITE_API_PROXY_TARGET` is dev-only.

**Process and database.** `PORT`, `NODE_ENV`, `DATABASE_URL`, `DB_SSL`, `DB_SSL_REJECT_UNAUTHORIZED`, `DB_POOL_MAX`, `DB_CONNECTION_TIMEOUT_MS`, `SQL_DIR`, `MIGRATION_BASELINE_THROUGH`, `MIGRATION_BASELINE_CONFIRM`, `MIPO_DEPLOY_SHA`.

**Public URL and business.** `PUBLIC_APP_URL`, `APP_URL`, `DEFAULT_BUSINESS_ID`.

**Sessions and mail.** `ADMIN_API_KEY`, `ADMIN_SESSION_HOURS`, `USER_SESSION_DAYS`, `RESEND_API_KEY`, `PASSWORD_RESET_FROM_EMAIL`, `PASSWORD_RESET_OTP_MINUTES`, `PASSWORD_RESET_DEBUG`, `EMAIL_VERIFICATION_HOURS`, `EMAIL_VERIFICATION_RESEND_SECONDS`, `TERMS_VERSION`, `SECRET_ENCRYPTION_KEY`, `SECRET_ENCRYPTION_KEYS_RETIRED`, `ADMIN_2FA_ENABLED`, `ADMIN_2FA_REQUIRE_ENROLLMENT`, `ADMIN_MFA_STEP_UP_MINUTES`, `ADMIN_TOTP_ISSUER`.

**Files.** `UPLOAD_DIR` (public pet and community media), `PRIVATE_UPLOAD_DIR` (identity and medical; authenticated routes only; do not serve it from Caddy), `MAX_UPLOAD_BYTES`, `MAX_SOCIAL_UPLOAD_BYTES`, `MAX_DOCUMENT_UPLOAD_BYTES`, `MAX_AI_ATTACHMENT_BYTES`, `MAX_IMAGE_SOURCE_BYTES`.

**Cardcom.** `CARDCOM_TERMINAL_NUMBER`, `CARDCOM_USERNAME` (alias `CARDCOM_API_NAME`), `CARDCOM_API_PASSWORD`, `CARDCOM_WEBHOOK_SECRET`.

**AI and images.** `GEMINI_API_KEY`, `GEMINI_MODEL`, `PET_CHARACTER_IMAGE_MODEL`, `PET_CHARACTER_VISION_MODEL`, `VERTEX_AI_API_KEY`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `VERTEX_AI_IMAGE_MODEL`, `VERTEX_AI_VISION_MODEL`, `FIRECRAWL_API_KEY`, `PRODUCT_IMAGE_REMOVE_BACKGROUND`, `PRODUCT_IMAGE_BACKGROUND_MODEL`, `PRODUCT_IMAGE_BACKGROUND_TIMEOUT_MS`, `IMAGE_FETCH_TIMEOUT_MS`, `IMAGE_DOWNLOAD_TIMEOUT_MS`.

**Automation and ops.** `AUTOMATION_WEBHOOK_URL`, `AUTOMATION_WEBHOOK_SECRET`, `AUTOMATION_DISPATCH_INTERVAL_MS`, `AUTOMATION_DISPATCH_BATCH`, `AUTOMATION_DISPATCH_TIMEOUT_MS`, `AUTOMATION_DELIVER_OWN_EVENTS`, `LEGACY_INTAKE_FROZEN`, `WAREHOUSE_WHATSAPP_NUMBER`, `MEASUREMENT_ENVIRONMENT_LABEL`, `OWNER_NOTIFICATIONS_ENABLED`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `OWNER_WHATSAPP_TO`, `OWNER_NOTIFY_QA_SECRET`, `TWILIO_WHATSAPP_CONTENT_SIDS`, `OWNER_NOTIFY_THROTTLE_MS`, `OWNER_NOTIFY_TIMEOUT_MS`, `SITE_URL`.

**GitHub Actions names only.** Secret `MIPO_AWS_SSH_PRIVATE_KEY`. Variables `MIPO_PUBLIC_BASE_URL`, `MIPO_AWS_HOST`, `MIPO_AWS_USER`, `MIPO_REMOTE_PATH`, `MIPO_SKIP_DRYRUN`. Environments `production` and `staging`.

## Conventions

- Customer-facing copy is Hebrew. Keep `dir="rtl"` on new screens. English is the only left-to-right locale.
- Do not use the virtual-pet toy name in any Mipo text, in Hebrew (טמגוצ׳י) or in English (Tamagotchi). That covers UI, commits, docs, tests, and alt text. Naming them in this rule and in `CLAUDE.md` is the only exception.
- Tone for product copy lives in `src/lib/brandVoice.ts`: warm, plain, not a hard sell.
- TypeScript function components, two-space indent, double quotes in frontend TypeScript, Tailwind, `@/` imports. Components in PascalCase, hooks `useSomething`, Playwright files `*.aws.spec.ts`.
- API tests go in `server/test` and use `node:test`. Browser tests mock `/api`. Prefer roles, labels, and visible Hebrew text.
- The next migration is `0062`. `0018` and `0061` are each used by two files and stay that way. Do not use `0030` or `0031`. Do not edit a migration that has already been applied in production; the checksum will refuse it.
- Change shop search in `server/src/catalogSearch.js`, then paste the same text into `src/lib/catalogSearch.ts`.
- Pull requests: new branch from `aws-migration`, PR base `aws-migration`, no force-push, no secrets and no real credential values. The owner approves and merges. A merge to `aws-migration` deploys production after the quality gate and, if configured, the production environment reviewer.

## Known gaps

These are in the current tree, not a roadmap someone wished for.

- The shop still sells `business_products`. The intake model and `/api/catalog` exist beside it. Publication is a human step (`production-legacy-catalogue-migrate.yml`), not an automatic cutover.
- Cart lines do not carry an offer or a seller. Marketplace grouping is written and unused.
- Home attention has two unwired slots: reorder / low stock, and an unread assistant reply (`src/hooks/useHomeAttention.ts`).
- Thirteen admin routes are explicit placeholders (`status: "planned"` in `src/components/admin/adminNavigation.ts`).
- Admin two-factor is in the tree but off unless `ADMIN_2FA_ENABLED` is on. Whether production has it on: not verified.
- No `staging` branch and no staging host, despite the workflow.
- `docs/DEPLOY_APPROVAL.md` still says the quality gate runs "60 browser tests". This tree has 28 `*.aws.spec.ts` files, each run on desktop and mobile Chromium.
- `docs/product-intake/PRODUCT-INTAKE-NEXT-STATE.md` (2026-09-14) says the intake tables do not exist. They do (`0042`–`0048` and later). `docs/system-workflows/29-GAPS-AND-RECOMMENDATIONS.md` says two admin roles. The server has four.
- Client `ADMIN_PERMISSIONS` is a subset of `server/src/adminPermissions.js`.
- `server/src/index.js` is the router, the domain layer, and the Cardcom client in one file. Prefer the extracted modules when adding a route that matches their shape.

## Docs that lag the code

Trust, in order: `server/sql` and `server/src`, then `src/routes/index.tsx`, then this file. Treat `docs/pet-intelligence/`, `docs/system-workflows/`, and `docs/product-intake/` as design notes with dates in their headers. `docs/STAGING.md`, `docs/DEPLOY_APPROVAL.md`, `docs/WORKBENCH.md`, and `README.md` describe the deploy and local setup and are closer to the code, with the stale test count above.
