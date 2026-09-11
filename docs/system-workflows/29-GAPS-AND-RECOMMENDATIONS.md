# 29 — Gaps and Recommendations

## A. What already exists

**Solid and reusable, needing no redesign:**

- Authentication and sessions — opaque tokens, hashed at rest, timing-safe
  comparison, two independent identity systems (customer / staff)
- Admin RBAC — 2 roles, 7 permissions, enforced on both API and routes, tested
- Pet CRUD, archive, lost-pet flow, public QR page with real privacy filtering
- Health records — vet visits, vaccinations, insurance claims, service bookings
- Document storage — magic-byte validation, private directory, owner-only serve
- Store — catalogue, categories with aliases and hierarchy, product page,
  image normalisation pipeline with originals retained
- Checkout, CardCom payments, guest orders with a hashed access token
- Social — Moments, reactions, threaded comments, saves, polls, SQL-enforced
  visibility, full-screen vertical reel
- **AI Gateway** — provider/model/pricing catalogue, three separate ledgers,
  versioned pricing, idempotent accounting, sanitised errors, admin economics
- **Transactional outbox** — `FOR UPDATE SKIP LOCKED`, HMAC-signed delivery,
  capped backoff, loop prevention
- Customer identity resolution across accounts and guest checkouts
- Deployment — 4-stage CI gate, 130 server tests, 60+ Playwright tests,
  migration dry-run rehearsal on a restored dump, schema-aware healthcheck

## B. What can be reused

| Asset | Reuse for |
|---|---|
| AI Gateway + `recordExternalUsage` | document OCR, matching, insights — all metered from day one |
| `outbox_events` | notifications, CRM timeline, analytics, integrations |
| `events.js` claim/backoff pattern | the durable job runner (`25`) |
| `customer_identities` | the CRM, unchanged |
| `imagePipeline.js` | user media normalisation and EXIF stripping |
| `catalogRecommendations.js` pattern | every "the model proposes, a trusted store disposes" flow |
| `social.js` visibility predicate | the `friends` tier, one clause |
| `ai_pricing_versions` temporal shape | `pet_facts` provenance |
| `resumePetCharacterJobs` | recovery for walks and document processing |
| `adminPermissions.js` | the Connectors page's access control |

## C. What needs extension

| Area | Extension |
|---|---|
| `pets.type` / `pet_type` enum | bird, rabbit, rodent, reptile, fish |
| `listBreeds` | stop coercing unknown species to `"dog"` |
| Health records | update and delete routes |
| Export | include social, uploads, shipping profiles |
| Email | order confirmations, receipts, shipping updates |
| CSP | `default-src`, `script-src`, `connect-src` |
| Event catalogue | health, social, activity, commerce completion types |
| `orders` | `pet_id` FK; CHECKs on `payment_status` and `shipping_status` |
| Inventory | quantity, not a boolean |

## D. What is missing

**Foundational:** provenance / fact store · pet timeline · organizations ·
document processing · durable job runner · retention policy

**Product:** walks · parks and check-ins · social graph · DMs · server cart ·
server favourites · product matching engine · reorder · analytics ·
push notifications · moderation review · account delegation (vet, sitter,
family)

**Operational:** media backup · admin 2FA · stuck-job sweeper ·
orphaned-media cleanup · API versioning

## E. What is duplicated

1. `business_products` + `scraped_products`, merged at read time
2. `pets.age` + `pets.birth_date`
3. Vet contact across six `pets` columns and three tables
4. Three overlapping activity arrays on `pets`

## F. What conflicts

1. **The shop trusts what the assistant refuses.** `/api/products` returns
   unreviewed `scraped_products`; `catalogRecommendations` excludes them and
   documents why.
2. **Privacy settings that do nothing.** `location_blur_enabled` and
   `allow_messages_from` are stored and never read.
3. **Photo EXIF versus the location privacy model.** The profile offers
   location controls; every uploaded photo may carry GPS coordinates.
4. **Reports are collected and unreviewable.** `content_reports` has no
   consumer.
5. **`ARCHIVED` means three things** — hidden, rehomed, deceased.

## G. Critical architecture risks

| # | Risk | Why it matters |
|---|---|---|
| 1 | **Single point of failure.** One EC2 host runs the API, Caddy, PostgreSQL and all media. | An instance loss is a total outage. Media loss is unrecoverable. |
| 2 | **No media backup.** DB is dumped before migrations; `/opt/mipo/uploads` and `/opt/mipo/private-uploads` are not backed up by any script. | Users' pet photos and medical documents exist in exactly one place. |
| 3 | **8,760 lines in one file, 110 routes, no framework.** | It is disciplined and consistent, but every feature makes it longer and merge conflicts are guaranteed with more than one contributor. |
| 4 | **In-memory job queue and rate limiter.** | Neither survives a restart or a second replica; both silently degrade rather than fail. |
| 5 | **Events written, never read.** | Every day of accumulation is a backlog for the first consumer. |
| 6 | **One AI provider.** | Gemini outage = chat, character generation and product intel all down. The adapter interface exists; no second adapter does. |

## H. Security risks

Detailed in `19`. In order: no admin 2FA · plaintext `owner_id_number` in
`insurance_claims` · EXIF on user uploads · no media backup · unreviewed
reports · partial CSP · static `ADMIN_API_KEY`.

## I. Data-model risks

- **No provenance.** Building Pet 360, matching or insights on top of this
  encodes "a value with no source" into every new feature.
- **`orders.pet_name` is a string.** Blocks purchase-derived facts, reorder,
  Buy Again and pet-aware CRM — three documents reach this conclusion
  independently.
- **`pets` is 57 flat columns** with derived values stored and no history.
- **Species enum is too narrow** for the stated product.
- **`SET NULL` on pet deletion** silently orphans documents, bookings, claims
  and Moments.

## J. UX risks

- The shop shows unreviewed products
- Cart and favourites are lost on device change
- Notifications exist as an inbox nothing writes to
- A rabbit owner is shown dog breeds
- Deleting a pet does something the user is not told about
- Onboarding is not resumable

## K. Product risks

- **The multi-pet premise is not in the data model.** Cats get no activity
  story; birds and rodents get no model at all.
- **Activity is the largest gap and the most platform-dependent.** It cannot be
  delivered as specified on the web.
- **"AI-powered recommendations" cannot be honest yet.** Nine of nineteen
  matching inputs do not exist.
- Reports collected without review is a compliance exposure once the feed grows.

## L. Recommended target architecture

**Keep the shape. Fix the foundations. Add one tier.**

```
              Browser / PWA  (+ Capacitor later, if 08 is approved)
                       │
                    Caddy
                       │
        ┌──────────────┴──────────────┐
     mipo-api                     mipo-worker          ← the one new component
   (requests only)            (jobs table, claimed with
                              FOR UPDATE SKIP LOCKED)
        └──────────────┬──────────────┘
                       │
                 PostgreSQL 16
                       │
        ┌──────────────┼──────────────┐
   pets + pet_facts  outbox_events   ai_* ledgers
   (provenance)      (consumed)      (already right)
                       │
              object storage (S3) for media     ← the one new dependency
```

Two additions only: a worker container and an object store. No broker, no
microservices, no second database, no new framework. Everything else is
schema and code inside what exists.

## M. Recommended implementation order

See `30-IMPLEMENTATION-ROADMAP.md`.

## N. Critical dependencies

```
pet_facts (05) ──┬──► Pet 360 (04)
                 ├──► document intelligence (06)
                 ├──► product matching (13)
                 └──► insights / predictions

orders.pet_id ───┬──► purchase-derived facts
                 ├──► reorder + Buy Again
                 └──► pet-aware CRM (17)

durable jobs (25) ──┬──► document processing (06)
                    ├──► notifications (16)
                    └──► reminders, reorder

outbox consumed (18) ──┬──► notifications (16)
                       ├──► CRM timeline (17)
                       └──► analytics (26)

native decision (08) ──┬──► walks
                       └──► parks (09) ──► park social (10)

social graph (10) ──► friends visibility ──► park "who's here"

species enum (27) ──► onboarding (02), matching (13), catalogue
```

## O. Decisions required from the product owner

1. **Native or web?** Gates all of Activity and Parks.
2. **Which species?** Gates onboarding, catalogue and matching.
3. **`scraped_products` publication.** Should unreviewed rows be on sale today?
4. **Deleting a pet** — orphan, cascade, or refuse?
5. **`DECEASED` state** — and what stops being sent to a bereaved owner.
6. **Organizations** — needed at all? Every isolation predicate depends on it.
7. **Social graph shape** — follow an owner, a pet, or both?
8. **Connectors page** — provider scope, and whether an unusable Anthropic key
   should be storable before an adapter exists.
9. **Analytics vendor and lawful basis.**
10. **Retention periods**, especially for health documents.
