# 30 — Implementation Roadmap

Priority is by **dependency, risk and data foundation** — not by how appealing
a feature looks. Several attractive features rank low here precisely because
building them first would make the foundations harder to fix.

Each item lists what it unblocks. Effort is relative (S/M/L), not a date.

---

## P0 — Foundation

Nothing in P1 or beyond is safe to build before these.

| # | Item | Effort | Unblocks |
|---|---|---|---|
| 0.1 | **Media backup.** `/opt/mipo/uploads` and `/opt/mipo/private-uploads` are on one instance with no snapshot in any script. | S | survival |
| 0.2 | **Strip EXIF on ingest.** Route user uploads through `imagePipeline.js`. Fixes the location leak and gives thumbnails. | S | `11`, `20` |
| 0.3 | **`pet_facts` + `pet_fact_definitions`.** The provenance spine: source, source_id, confidence, verification_status, observed_at, effective_from/to. | L | `04`, `05`, `06`, `13`, insights |
| 0.4 | **`orders.pet_id`.** Nullable FK, backfilled only on an unambiguous `pet_name` match. | S | `13`, `14`, `17`, reorder |
| 0.5 | **Durable job runner.** A `jobs` table using the `events.js` claim pattern; a `mipo-worker` container; `locked_at` + a sweeper. Move character generation onto it. | M | `06`, `16`, `25`, reminders |
| 0.6 | **Species enum widened**, and `listBreeds` stops coercing to `"dog"`. | S | `02`, `13`, `27` |
| 0.7 | **`scraped_products` publication state**, and the shop reads only published rows. | S | `12`, `28` |
| 0.8 | **Admin 2FA.** `claude/admin-2fa` exists; it needs `SECRET_ENCRYPTION_KEY` in SSM. | S | `19`, and the Connectors page |
| 0.9 | **Encrypt `insurance_claims.owner_id_number`**, following the `profiles.id_number_encrypted` precedent. | S | `19` |

**Sequencing note:** 0.8 and 0.9 both need `SECRET_ENCRYPTION_KEY`, and so does
the Connectors page. Provisioning that one parameter unblocks three things and
should happen first.

---

## P1 — Core product

| # | Item | Effort | Depends on |
|---|---|---|---|
| 1.1 | **Document intelligence.** Classify → OCR (Gemini via the gateway) → extract → confidence → `pet_facts` as `VET_DOCUMENT`, pending confirmation for anything clinical. | L | 0.3, 0.5 |
| 1.2 | **Pet 360 read model.** `GET /api/me/pets/:id/profile-360`, returning provenance with every value. | M | 0.3 |
| 1.3 | **Weight and mood as time series.** Move to `pet_facts`; keep the current value mirrored on `pets`. | S | 0.3 |
| 1.4 | **Server cart + favourites.** Cross-device, and the first commerce signal the server can see. | M | — |
| 1.5 | **Declare the missing events + `payload_version` + an internal consumer cursor.** | M | — |
| 1.6 | **Notifications that fire.** Driven by 1.5: order confirmation, shipping, vaccination expiry. In-app + email first. | M | 0.5, 1.5 |
| 1.7 | **Product matching v1.** Gates only — species, life stage, size, health constraints. `INSUFFICIENT_DATA` where data is absent. No scores yet. | M | 0.3, 0.6, 0.7 |
| 1.8 | **Moderation review.** An admin queue over `content_reports` that can set `moderation_status`. | S | — |
| 1.9 | **Health record update/delete routes.** A mistyped vaccination date is currently permanent. | S | — |
| 1.10 | **Order confirmation emails.** Resend is wired; two templates. | S | — |

---

## P2 — Important

| # | Item | Depends on |
|---|---|---|
| 2.1 | **Native decision, then Activity (walks).** `08` in full, including `RECOVERABLE`. | O-1 in `29` |
| 2.2 | **Parks and check-ins.** Confirmed check-in only, TTL by read predicate, place-not-point. | 2.1, 2.4 |
| 2.3 | **Product matching v2** — weights, versioned, with reasons drawn from facts. | 1.7, 2.1 |
| 2.4 | **Social graph.** Follows and pet friendships; the `friends` tier is one clause in the existing feed query. | — |
| 2.5 | **Analytics.** Server events free from 1.5; a client ingest separately. | 1.5 |
| 2.6 | **Reorder and Buy Again.** The columns already exist; needs a scheduler. | 0.4, 0.5 |
| 2.7 | **CRM extension.** Pet context and an event-driven customer timeline. | 0.4, 1.5 |
| 2.8 | **Push notifications.** Subscription table, VAPID, sender. The `sw.ts` handler is already there. | 1.6 |
| 2.9 | **Retention and purge jobs.** | 0.5 |
| 2.10 | **Object storage for media.** Removes the single-host media risk properly. | 0.1 |

---

## P3 — Future

Organizations and multi-tenancy · account delegation (vet, sitter, family) ·
direct messages · stories and live · agent orchestrator · insights and
predictions · a second AI provider adapter · conversational memory (the
capability the `mipo` prototype explored) · public profiles and discovery ·
API versioning · splitting `index.js`.

---

## Dependency graph

```
0.8 SECRET_ENCRYPTION_KEY ─┬─► admin 2FA
                           ├─► encrypt insurance ID
                           └─► Connectors page

0.3 pet_facts ─┬─► 1.2 Pet 360
               ├─► 1.1 document intelligence ─► richer facts
               ├─► 1.3 weight history
               └─► 1.7 matching v1 ─► 2.3 matching v2

0.4 orders.pet_id ─┬─► 2.6 reorder
                   └─► 2.7 CRM

0.5 job runner ─┬─► 1.1  ├─► 1.6  ├─► 2.6  └─► 2.9

1.5 events ─┬─► 1.6 notifications
            ├─► 2.5 analytics
            └─► 2.7 CRM timeline

native decision ─► 2.1 walks ─► 2.2 parks ─► park social
2.4 social graph ─────────────┘
```

---

## What NOT to build

An explicit list, because each of these already exists and a second one would
be worse than none:

| Do not build | Because |
|---|---|
| A second user or pet system | `app_users` / `profiles` / `pets` are canonical |
| A third product catalogue | Two is already one too many — consolidate instead |
| A second social system | `social.js` and its six tables are correct |
| A second media system | `imagePipeline.js` should be extended, not duplicated |
| A second event bus | `outbox_events` is a correct transactional outbox |
| A second AI gateway | `aiGateway.js` is the strongest code in the repo |
| Microservices | One host, one team. A worker container is the right granularity |
| A message broker | `FOR UPDATE SKIP LOCKED` on Postgres is proven here already |
| More admin dashboards | 60+ legacy admin paths are already redirects |
| A longer onboarding | Four questions is a feature |
| **Fake AI intelligence** | No invented match percentages, no confidence numbers without a model, no "insights" that are templated strings |
| **External product recommendations** | Every product comes from the Mipo catalogue. `catalogRecommendations.js` enforces this — do not weaken it |
| A duplicate health database | `pet_vet_visits` / `pet_vaccinations` extend into `pet_facts`; they are not replaced |
| A CRM database | `customer_identities` is canonical |

---

## Suggested first sprint

Small, high-leverage, no new dependencies:

1. `SECRET_ENCRYPTION_KEY` into SSM (0.8 prerequisite)
2. Media backup (0.1)
3. EXIF stripping via the existing pipeline (0.2)
4. `listBreeds` stops coercing to dog (part of 0.6)
5. `orders.pet_id` (0.4)
6. Order confirmation email (1.10)

Every item is hours-to-days, uses code that already exists, and closes a real
defect. It also unblocks the Connectors page and admin 2FA, which are both
waiting on item 1.
