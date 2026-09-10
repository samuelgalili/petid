# 29 — Implementation Roadmap

The brief proposes P0…P7 and says to change the order if the evidence shows a
better dependency graph. **It does, in three places:**

1. **Catalogue governance moves earlier.** Product matching cannot be built on a
   catalogue that serves unreviewed rows, and that defect is live in production
   today. It is a prerequisite for P3, not part of it.
2. **The durable job runner moves into P0.** Document intelligence, retention and
   reminders all need it, and the only background machinery today is a promise
   chain in the API process. Building document extraction on that would repeat a
   known failure — a job that hangs leaves the row wedged forever.
3. **The provenance layer and Pet 360 merge.** The brief separates "pet data
   foundation" (P0) from "Pet 360 + provenance" (P1). Provenance is not a layer on
   top of facts; it is nine columns *of* a fact. Splitting them means writing the
   fact table twice.

---

## P0 — Foundation

Nothing later is safe without these.

| # | Item | Effort | Unblocks |
|---|---|---|---|
| 0.1 | **`pet_fact_definitions` + `pet_facts` + `pet_observations`**, provenance included from day one | L | everything |
| 0.2 | **Durable job runner** — a `jobs` table using the `events.js` claim pattern, a `mipo-worker` container, `locked_at` + a sweeper | M | P2, retention, reminders |
| 0.3 | **`order_items.pet_id` + `pet_attribution`** | S | P4, `12`, `21` |
| 0.4 | **Species enum widened**, and `listBreeds` stops coercing to `"dog"` | S | `17`, `18` |
| 0.5 | **`business_products.publication_state`**; the shop reads published rows only | S | `18` step 0 |
| 0.6 | **Drop the 11 dead columns** on `pets` | S | clarity; zero API impact |
| 0.7 | `birth_date_precision`, `life_stage_rules`, derived `life_stage` + `size_band` | M | `18`, `19` |
| 0.8 | `outbox_events` + `pet_id` + `payload_version` + a consumer cursor | S | P5, CRM, analytics |

**Free-standing quick wins, any time:** 0.4's coercion fix, 0.6, and creating
`qr_scan_logs` so the QR trail stops being discarded (OD-16).

### Added by the data-contract phase (`30`–`53`)

| # | Item | Priority | Ref |
|---|---|---|---|
| 0.9 | **Pick one feeding calculation.** Two exist in the client and disagree — `CentralBrainContext` (RER/MER) and `TopRecommendation` (% of body weight). Owners see different numbers depending on the screen. | **P0** — a live defect | DD-02 |
| 0.10 | **Canonical weight in grams**, with the unit on the observation. `pets.weight_unit` is dead and a budgerigar is 0.035 kg. | P0 | DD-01 |
| 0.11 | **`ingredient_terms` vocabulary** with `is_derivative`. The only place a pet fact and a product row actually meet. | P0 — prerequisite for `52` | `34` |
| 0.12 | Fix `InsuranceSheet.tsx` — it renders a field the API never sends. | S, any time | DD-14 |
| 0.13 | Encrypt `insurance_claims.owner_id_number`; check `ai_consent_given` before clinical AI calls. | P0 (security) | DD-16, DD-18 |
| 2.7 | Convert `breed_information.weight_range_kg` from free text to two numerics **before** `size_band` gates anything. | with P3 | DD-15 |

---

## P1 — Pet 360

| # | Item | Depends on |
|---|---|---|
| 1.1 | Backfill + validate (Phase B/C of `24`) | 0.1 |
| 1.2 | Dual-write, then dual-read behind a flag | 1.1 |
| 1.3 | `GET /pets/:id/360` with provenance on every value | 0.1 |
| 1.4 | Weight as observations + trend | 0.1 |
| 1.5 | Conflict resolution as a pure module (`06`) | 0.1 |
| 1.6 | **Health record update/delete routes** | — |
| 1.7 | CRM pet context: names, species, ages, open health items | 0.3 |

1.6 is independent of everything and fixes the most user-visible defect in the
health area: a mistyped vaccination date is currently permanent.

---

## P2 — Document Intelligence

| # | Item | Depends on |
|---|---|---|
| 2.1 | `pet_documents` + status, `content_hash`, `document_date`, `ai_request_id` | — |
| 2.2 | Classification + extraction through the **existing AI Gateway** | 0.2, 2.1 |
| 2.3 | `pet_document_extractions` + normalization | 0.1 |
| 2.4 | Review flow — one batched question per document | 2.3 |
| 2.5 | Facts from extractions, clinical ⇒ confirm | 0.1, 1.5 |
| 2.6 | Admin review queue | 2.4 |

No new AI vendor: Gemini vision through the Gateway is already how chat reads
attachments, and it is already metered.

---

## P3 — Product Matching V1

| # | Item | Depends on |
|---|---|---|
| 3.1 | `ingredient_terms` vocabulary, with `is_derivative` | — |
| 3.2 | `productMatching.js` — pure, server-side, gates only | 0.1, 0.4, 0.5, 0.7 |
| 3.3 | Move `petSafetyScore.ts` server-side, **keeping** its `null`-not-zero rule and `explainAdjustment` | 3.2 |
| 3.4 | `?pet_id=` annotation + `/product-match/:productId` | 3.2 |
| 3.5 | Retire the keyword maps in `SmartRecommendations.tsx` | 3.4 |

Classification only. **No scores until a versioned weights row exists.**

---

## P4 — Store 2.0

| # | Item | Depends on |
|---|---|---|
| 4.1 | Server cart + pet-scoped favourites; migrate the three `localStorage` stores | 0.3 |
| 4.2 | "For My Pet", "Because Blue…" — every sentence traceable to a fact | 3.2 |
| 4.3 | Buy Again + reorder estimate | 0.3, 3.2 |
| 4.4 | Purchase → preference derivation, with the confidence rules in `12` | 0.3 |
| 4.5 | Product variants on the canonical catalogue (OD-15) | 0.5 |

---

## P5 — Timeline, Insights, CRM

| # | Item |
|---|---|
| 5.1 | `pet_timeline_entries` projection (`08`) |
| 5.2 | Deterministic insights: weight trend, vaccination due, reorder due |
| 5.3 | AI phrasing over deterministic detection (`20`) |
| 5.4 | CRM Pet 360 with full provenance; disputed + review queues |
| 5.5 | Retention jobs (`23`) |

---

## P6 — Activity

Blocked on the native-vs-web decision, not on this design. When it lands it must
satisfy the contract in `14`: events, observations, weekly-recomputed facts,
timeline entries — and nothing else. It does not write to `pets`.

## P7 — Advanced

Delegation and care-team grants (`22`) · `care_providers` · predictions ·
`VET_CONFIRMED` producers · organizations · cross-pet household insights.

---

## Dependency graph

```
0.1 pet_facts ──┬──► 1.x Pet 360
                ├──► 2.x Document Intelligence
                ├──► 3.x Matching
                └──► 5.x Insights

0.2 job runner ─┬──► 2.x  ├──► 5.5 retention  └──► reminders

0.3 order_items.pet_id ─┬──► 4.3 Buy Again
                        ├──► 4.4 preferences
                        └──► 1.7 / 5.4 CRM

0.4 species enum ──► 3.2 eligibility gate
0.5 publication ───► 3.2 gate 0        ← without this, matching inherits the defect
0.7 life stage ────► 3.2 gate 2

0.8 events ─┬──► 5.1 timeline  ├──► 5.4 CRM  └──► analytics

native decision ──► P6 Activity ──► activity facts ──► 3.2 step 7
```

---

## Suggested first sprint

Small, independent, each closing a real defect, and together they unblock P0:

1. `listBreeds` stops coercing unknown species to `"dog"` — one line, wrong today
2. Drop the 11 dead columns on `pets`
3. Create `qr_scan_logs`
4. `order_items.pet_id` + backfill (exact single matches only)
5. `outbox_events` + `pet_id` + `payload_version`
6. `PATCH`/`DELETE` for vet visits and vaccinations

None of them needs the fact table, and every one of them is hours to days.

---

## What NOT to build

| Not this | Because |
|---|---|
| A second pet or health database | `pets`, `pet_vet_visits`, `pet_vaccinations` stay canonical |
| A third product catalogue | two is already one too many — add a state |
| A second event bus | `outbox_events` is a correct transactional outbox |
| A second AI gateway | `aiGateway.js` is the strongest code in the repo |
| A second CRM | `customer_identities` resolves identity correctly |
| A message broker | `FOR UPDATE SKIP LOCKED` on Postgres is already proven here |
| A JSON blob for pet data | `03` — matching needs typed, queryable columns |
| **Match percentages without a model** | a fabrication, and unimprovable once shown |
| **Insights that are templated strings** | detection must be deterministic and testable |
| AI-written clinical facts | `04` — enforced by `is_clinical`, not by review |
| A longer onboarding | §38 — enrich progressively, from documents and purchases |
| A stored product match | stale the moment a fact changes; a stale health exclusion is the worst possible cache miss |
| A stored age, size, or trend | this is how `pets.age` and `pets.size` died |
