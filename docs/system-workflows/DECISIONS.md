# Decision Log — System Workflow Audit

Status values: `CONFIRMED` (read out of the code) · `PROPOSED` (this audit's
recommendation) · `UNKNOWN` (not determinable from the repository) ·
`REQUIRES PRODUCT DECISION` (a person has to choose).

---

## CONFIRMED — established from the code

### D-01 · `samuelgalili/petid` is the Mipo system
**Reason:** it serves `mipo.pet`; 53 tables, 33 migrations, 110 routes, AWS
deploy pipeline. `samuelgalili/mipo` is a separate 10-file Supabase prototype
about conversational memory.
**Evidence:** both working copies inspected; `deploy/aws/`,
`.github/workflows/deploy-aws.yml`.
**Impact:** this audit describes `petid`.
**Status:** CONFIRMED

### D-02 · Isolation is per-user; there is no tenant model
**Evidence:** no `organizations`/`memberships` table; no `tenant_id` anywhere;
every ownership check is `where user_id = $1`. `business_products.business_id`
exists but resolves to a single `DEFAULT_BUSINESS_ID`.
**Impact:** adding organizations later changes every isolation predicate.
**Status:** CONFIRMED

### D-03 · The AI Gateway is the canonical AI seam
**Evidence:** `aiGateway.js`; features name a feature slug and a capability,
never a provider. Two justified escapes: pet character art and background
removal call Gemini directly, with character art metered through
`recordExternalUsage`.
**Alternatives:** per-feature SDK calls — rejected by the existing design.
**Status:** CONFIRMED

### D-04 · `outbox_events` is the canonical event mechanism
**Evidence:** `events.js` — transactional emit, `FOR UPDATE SKIP LOCKED`,
HMAC delivery, capped backoff, origin loop-prevention, tested.
**Note:** delivery is off in production (`AUTOMATION_WEBHOOK_URL` unset), by
configuration rather than by design.
**Status:** CONFIRMED

### D-05 · Guest orders are authorised by a hashed opaque token
**Evidence:** `canAccessOrder` — session ownership or `timingSafeEqual` against
`orders.access_token_hash`.
**Status:** CONFIRMED

### D-06 · Email verification gates order placement only
**Evidence:** `createOrder` (`server/src/index.js:5648`) rejects an unverified
signed-in user; guest checkout is exempt, with a stated rationale.
**Status:** CONFIRMED

### D-07 · Pet deletion orphans documents, bookings, claims and Moments
**Evidence:** `pg_constraint` shows `ON DELETE SET NULL` on all four `pet_id`
FKs; `deleteUserPet` does a bare delete; verified by executing the delete
against the migrated database.
**Impact:** a user's medical documents survive the pet, detached, with no
notice.
**Status:** CONFIRMED — behaviour. The *policy* is D-24.

### D-08 · The shop serves unreviewed scraper output
**Evidence:** `listProducts` unions `business_products` and
`scraped_products`; `catalogRecommendations.js:16-18` excludes the latter and
says why.
**Status:** CONFIRMED — resolution is D-22.

---

## PROPOSED — this audit's recommendations

### D-10 · One `pet_facts` table with nine provenance columns
**Reason:** every fact needs the same provenance, and the key set grows per
species. Thirty typed tables would repeat the columns thirty times.
**Alternatives:** columns on `pets` (no history, no source); a table per domain
(repetition); EAV with no registry (junk drawer). A
`pet_fact_definitions` registry is what keeps this from becoming the third.
**Precedent in this codebase:** `ai_pricing_versions` already uses
`effective_from` / `effective_to` / `source`.
**Impact:** additive; `pets` keeps identity and mirrors current values.
**Status:** PROPOSED

### D-11 · `AI_INFERRED` is never silently promoted
**Reason:** the specific failure mode is a model laundering its own guess into
a fact by writing it and reading it back.
**Precedent:** `catalogRecommendations.js` already applies exactly this rule to
products.
**Status:** PROPOSED

### D-12 · Allergies, medications, diagnoses, vaccination status and neuter
status may never originate as AI inference
**Reason:** these change product safety decisions. They may be *extracted* from
a document as `VET_DOCUMENT` pending confirmation, or entered by the owner.
**Status:** PROPOSED

### D-13 · No match percentages without a defined, versioned scoring model
**Reason:** a "94% match" with no model is a fabrication.
**Alternative:** publish the classification (`NOT_ELIGIBLE` …`STRONG_MATCH`)
and add scores when the weights exist and are versioned.
**Status:** PROPOSED

### D-14 · A durable jobs table, not a broker
**Reason:** one EC2 host running Docker Compose. Redis/SQS adds an operational
component with its own failure modes.
**Alternative considered:** keep the promise chain — rejected; it cannot
survive a hang, and `pet_characters` rows wedge in `generating_*` forever.
**Precedent:** the `events.js` claim/backoff pattern lifts almost verbatim.
**Impact:** a fifth compose service.
**Status:** PROPOSED

### D-15 · Extend the existing feed, do not build a second one
**Reason:** `listSocialFeed`'s `where` clause is already the enforcement point.
A `friends` tier is one additional predicate.
**Status:** PROPOSED

### D-16 · Location resolves to a place, never a point
**Reason:** a coordinate stream reveals a home address. Check-ins return a
park; walk routes are private by default.
**Status:** PROPOSED

### D-17 · Strip EXIF on ingest, using `imagePipeline.js`
**Reason:** user media is currently written byte-for-byte and served publicly,
carrying GPS. The normaliser already exists and is used for products.
**Status:** PROPOSED

### D-18 · `business_products` is the canonical catalogue;
`scraped_products` becomes staging
**Reason:** it has an owner, it is what admins edit, and it is what the
assistant already trusts.
**Alternative:** merge the tables — rejected; different lifecycles.
**Status:** PROPOSED

### D-19 · `orders.pet_id` as a nullable FK, backfilled only on an unambiguous
name match
**Reason:** three separate documents (`13`, `14`, `17`) reach the same blocker.
Never guessed — an ambiguous `pet_name` stays null.
**Status:** PROPOSED

### D-20 · Add `payload_version` to events before the first external consumer
**Reason:** cheap now, breaking later.
**Status:** PROPOSED

---

## REQUIRES PRODUCT DECISION

### D-21 · Native (Capacitor) or web-only?
**Blocks:** all of Activity (`08`) and Parks (`09`).
**Facts:** iOS Safari suspends a backgrounded PWA. Screen-locked GPS is not
deliverable on the web at any effort. There is no `ios/`, `android/` or
Capacitor config in the repository today.
**Options:** (a) web-only, foreground walks only, stated honestly;
(b) Capacitor with background-location entitlements; (c) defer Activity.
**Status:** REQUIRES PRODUCT DECISION — the single largest gate in the roadmap

### D-22 · Should unreviewed `scraped_products` be on sale right now?
**Facts:** they are, today, via `/api/products`. The assistant already refuses
them.
**Options:** (a) hide immediately and review the backlog; (b) add a publication
state and migrate; (c) accept the risk deliberately.
**Status:** REQUIRES PRODUCT DECISION — this one is live in production

### D-23 · Which species does Mipo support?
**Facts:** `pets.type` CHECK allows dog/cat/other; onboarding offers two;
`listBreeds` coerces anything else to `"dog"`. Rabbits are lagomorphs, not
rodents, and are common pets in Israel — they may warrant their own value.
**Status:** REQUIRES PRODUCT DECISION

### D-24 · What should deleting a pet do?
**Options:** (a) cascade everything; (b) keep records but tell the owner what
survives; (c) refuse while documents exist; (d) archive instead of delete.
**Note:** medical documents and orders have different answers from Moments.
**Status:** REQUIRES PRODUCT DECISION

### D-25 · A `DECEASED` state
**Facts:** the word appears nowhere in the codebase. `ARCHIVED` currently
covers hidden, rehomed and deceased.
**What matters:** the behaviour — no reminders, no reorder prompts, no
birthday notifications, no product recommendations. Records retained.
**Status:** REQUIRES PRODUCT DECISION

### D-26 · Are organizations needed?
**Impact:** every isolation predicate. The AI ledgers already carry
`organization_id`; nothing else does.
**Status:** REQUIRES PRODUCT DECISION

### D-27 · Social graph shape
**Options:** follow an owner · friend a pet · both. Determines the `friends`
visibility tier and park "who's here".
**Status:** REQUIRES PRODUCT DECISION

### D-28 · Connectors page — scope and behaviour
**Facts:** `ai_providers` has no key column. Every credential is an env var
from SSM. Production throws at startup without `GEMINI_API_KEY`.
`SECRET_ENCRYPTION_KEY` does not exist in SSM, which also blocks
`claude/admin-2fa`. `profiles.id_number_encrypted` is the encrypted-column
precedent. **No Anthropic adapter exists**, so an Anthropic key stored today
would be unusable.
**Questions:** does a database key override the env var, or only fill a gap?
Should a key be storable before an adapter can use it? Who may read the
masked value?
**Constraint carried forward:** no API key is ever to be pasted into a chat,
an email or a WhatsApp message. Key entry happens only through the encrypted
admin page itself.
**Status:** REQUIRES PRODUCT DECISION

### D-29 · Analytics vendor and lawful basis
**Status:** REQUIRES PRODUCT DECISION

### D-30 · Retention periods, especially for health documents
**Facts:** nothing expires anywhere. No purge job exists.
**Status:** REQUIRES PRODUCT DECISION

---

## UNKNOWN — not determinable from this repository

| # | Question |
|---|---|
| D-40 | Where would park data come from? (`dog_parks.source`, `verified` imply an import that does not exist) |
| D-41 | Is the CardCom webhook handler idempotent on replay? |
| D-42 | Is `POST /api/orders` idempotent on retry? |
| D-43 | Does anything drive `scraping_jobs`? |
| D-44 | Is `backgroundRemoval.js` metered? No `recordExternalUsage` call was found for it |
| D-45 | Do processor agreements exist for Google, Resend, CardCom, Firecrawl? |
| D-46 | Is `profiles.ai_consent_given` checked before any AI call? None found |
| D-47 | What does `src/pages/Support.tsx` actually do? No ticket table exists |
| D-48 | Acquisition and attribution — nothing is recorded |
