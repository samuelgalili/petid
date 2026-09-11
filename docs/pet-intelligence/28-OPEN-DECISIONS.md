# 28 — Open Decisions

§57 of the brief: where an answer is unclear, mark it `OPEN DECISION` and do not
decide silently. These are the ones.

Format: what is being asked · what the code shows · options · my recommendation ·
what it blocks.

---

## Blocking — a person must answer before the work below can start

### OD-01 · Which species does Mipo support?
**Evidence:** `pets.type` CHECK allows `dog|cat|other`; the `pet_type` enum is
`dog|cat|other|all`; onboarding offers two buttons; `listBreeds` **coerces
anything else to `"dog"`** (`index.js:4247`), so a rabbit owner is shown dog
breeds.
**Options:** (a) dog + cat only, and say so; (b) add bird, rabbit, rodent;
(c) add reptile and fish too.
**Recommendation:** (b). Rabbit **separate from rodent** — they are lagomorphs,
hay-first, with a distinct health profile, and common in Israel.
**Blocks:** onboarding, `17`, product eligibility in `18`, the catalogue enum.
**Note:** the `listBreeds` coercion is wrong today regardless of this decision and
should be fixed independently — one line.

### OD-02 · Should unreviewed `scraped_products` be on sale?
**Evidence:** `listProducts` returns the union of both catalogues;
`catalogRecommendations.js:16-18` excludes scraped rows and says why — "no
publication state yet". The assistant refuses what the shop sells.
**Options:** (a) hide immediately, review the backlog; (b) add publication state
and migrate; (c) accept it deliberately.
**Recommendation:** (b), with (a) as an interim if the backlog is large.
**Blocks:** `18` step 0. **This one is live in production.**

### OD-03 · Feeding amount — computed, or manufacturer's guide only?
**Evidence:** every input exists (`kcal_per_kg`, `feeding_guide`, weight, life
stage, neuter status).
**Options:** (a) show the manufacturer's guide only; (b) also show a computed
RER-based figure with a vet caveat; (c) neither.
**Recommendation:** (a) for v1. Useful, attributable to the manufacturer, zero
clinical risk. And never for a `PRESCRIPTION` diet or a diet-managed condition.
**Blocks:** `10`, part of `18` step 6.

### OD-04 · Does account delegation ship in this phase?
**Evidence:** no sharing of any kind exists. `pets.user_id = $1` everywhere.
**Options:** (a) not now — the model in `22` stays a design; (b) read-only vet and
sitter grants; (c) full grants including write.
**Recommendation:** (a) now, (b) next. (c) needs a vet identity, which does not
exist — and without one there is no producer for `VET_CONFIRMED` at all (`04`).
**Blocks:** `22`, and the top rank of the source hierarchy.

---

## Model decisions — I have a recommendation; confirm or overrule

### OD-05 · Life-stage thresholds
**Evidence:** none exist. `SmartRecommendations.tsx` approximates with keyword
lists.
**Recommendation:** the size-banded dog table and the cat bands in `01`, stored
as **versioned rule data** (`life_stage_rules`), not code — so a vet review can
change them without a deploy and a recommendation can cite the version.
**Caveat, stated plainly:** those thresholds are a starting point, not veterinary
consensus. They want a vet's eyes before they gate anything.

### OD-06 · `SYSTEM_DERIVED` above `USER_PROVIDED` for derived keys
**Recommendation:** yes, and it is the one place I depart from the brief's
hierarchy. Derived keys have exactly **one** writer — the rule engine. A user who
disagrees with a life stage is disagreeing with the birth date, and the UI should
take them there. Letting a user overwrite a derived value is precisely how
`pets.age` and `pets.size` became dead columns.

### OD-07 · A `DECEASED` state
**Evidence:** the word appears nowhere in `src/` or `server/src/`. `ARCHIVED`
currently covers hidden, rehomed and deceased.
**Recommendation:** add it. The value is behavioural, not taxonomic — no
reminders, no reorder prompts, no birthdays, no recommendations. Records
retained.
**The argument in one sentence:** nothing in this system should try to sell food
to a dead pet.

### OD-08 · What happens when a pet is deleted?
**Evidence, verified by executing it:** `pet_documents`,
`pet_service_bookings`, `insurance_claims` and `social_posts` are all
`ON DELETE SET NULL` on `pet_id`. The delete succeeds and **silently orphans**
the pet's medical documents, bookings, claims and Moments. `deleteUserPet` is a
bare `delete from public.pets` with no child handling.
**Options:** (a) cascade everything; (b) keep records but tell the owner exactly
what survives; (c) refuse while documents exist; (d) archive instead.
**Recommendation:** (b) for documents and claims — a medical record is worth
keeping and the owner should be told — and cascade for facts, observations,
extractions, insights and the timeline. Silence is the one wrong answer.

### OD-09 · Confidence as a level, not a number
**Recommendation:** levels (`VERIFIED`/`HIGH`/`MEDIUM`/`LOW`/`UNKNOWN`). Raw
scores kept in `derived_from` for debugging, never shown, never compared across
sources — an OCR 0.91 and a model logprob 0.91 are not the same quantity.

### OD-10 · Preference decay half-lives
**Recommendation:** user 0 (never decays) · purchase 180d · behaviour 120d ·
AI 60d. Read-time computation, not a nightly job — there is no durable
scheduler, and a read-time rule cannot silently stop working.

### OD-11 · Are `AI_INFERRED` facts stored at all?
**Options:** (a) yes, LOW confidence, decaying, never clinical; (b) only as
suggestions the owner accepts; (c) not stored.
**Recommendation:** (a) for non-clinical (a chat-mentioned toy preference),
(b) for anything a user would be surprised to find asserted about their pet.
Never (c) for document extraction — but note that extraction facts are
`VET_DOCUMENT`, not `AI_INFERRED`: the document is the source, the model is the
reader.

---

## Operational

### OD-12 · Clinical retention period
**Recommendation:** life of the pet + 7 years.
**Caveat:** that is a reasonable default, not a legal finding. Israeli
requirements for veterinary records held by a **non-clinical platform** are
`UNKNOWN` from this repository and need real advice.

### OD-13 · A `customers.health.read` admin permission
**Evidence:** all `/api/admin/customers*` routes require `FULL_ACCESS`. The RBAC
system already supports fine-grained permissions — the catalogue routes use five
individually.
**Recommendation:** add it, so support can see orders and pets without seeing a
diagnosis, and log every clinical read to `admin_audit_log` (which exists).

### OD-14 · `care_providers` — a vet/clinic entity?
**Evidence:** clinic and vet names are loose strings across `pets`,
`pet_vet_visits` and `insurance_claims`. `vet_name`/`vet_phone` on `pets` are
dead columns.
**Recommendation:** yes, eventually. Not urgent, but it is a prerequisite for
`VET_CONFIRMED` (OD-04).

### OD-15 · Product variants on the canonical catalogue
**Evidence:** `product_variations` exists for `scraped_products` **only**.
`business_products` is the catalogue that will be canonical (`15`), and it has no
variant model. Size and flavour selection on a published product has no home.
**Recommendation:** resolve as part of OD-02 — it is the same schema decision.

### OD-16 · `qr_scan_logs` — create it or remove the write?
**Evidence:** `logPublicPetQrScan` inserts into `public.qr_scan_logs`. That table
is in **none** of the 33 migrations and none of the 53 tables. Every QR scan logs
a warning and returns `false`. The `pet.qr_scanned` event still fires, so the
alert works and the log does not.
**Recommendation:** create the table — a lost-pet scan trail is exactly the kind
of thing an owner will ask for after the fact.

---

## Deferred to other documents

| Question | Where |
|---|---|
| Native vs web (gates all of Activity) | `docs/system-workflows/DECISIONS.md` D-21 |
| Organizations / multi-tenancy | D-26; prepared for in `01` |
| Social graph shape | D-27 |
| Connectors page scope | D-28 |
| Analytics vendor and lawful basis | D-29 |
| API versioning | none exists; not needed for additive change |

---

## Unknown from this repository

| # | Question |
|---|---|
| U-01 | Where would park data come from? |
| U-02 | Is the CardCom webhook idempotent on replay? |
| U-03 | Is `POST /api/orders` idempotent on retry? |
| U-04 | Does anything drive `scraping_jobs`? |
| U-05 | Is `backgroundRemoval.js` metered? No `recordExternalUsage` call found |
| U-06 | Processor agreements for Google, Resend, CardCom, Firecrawl? |
| U-07 | Is `profiles.ai_consent_given` checked anywhere before an AI call? I found no read |
| U-08 | What does `src/pages/Support.tsx` do? No ticket table exists |
| U-09 | Israeli legal position on a platform surfacing rabies-vaccination obligations |
