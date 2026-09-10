# 44 — AI Inference Contract

## Position in the stack

```
Canonical data   →   Pet Knowledge   →   Deterministic rules   →   AI   →   output
                     (facts, with        (matching, life         explains,
                      provenance)         stage, conflicts)      phrases,
                                                                 extracts
```

**AI sits after the rules, never before.** It phrases a match; it does not
compute one. It reads a document; it does not decide what is clinically true.

## Use the gateway that exists

`server/src/aiGateway.js` states its own contract:

> "Every AI call in Mipo goes through `runAiRequest`. Features ask for a feature
> slug and a capability; they do not name a provider, hold a key, or touch the
> ledgers."

Accounting is idempotent on `request_id`, written across `ai_requests` →
`usage_events` → `cost_events` with the pricing version pinned. The ledgers
already carry `pet_id` **and** `organization_id`, so a pet-scoped AI call is
attributable and costable today with no schema change.

Seeded slugs include `document_analysis`, `health_analysis`, `ingredient_analysis`,
`pet_character`, `product_enrichment`, `agent_task`.

**No second gateway.** Every AI call here uses a feature slug.

---

## §20 — What AI may infer

| Inference | Key | Confidence | Half-life | Clinical? |
|---|---|---|---|---|
| Possible preference (from chat, a Moment) | `preference.*` | **LOW** | 60 d | ❌ |
| Possible behaviour trait | `behavior.*` | **LOW** | 60 d | ❌ |
| Possible activity pattern | `activity.*` | **LOW** | 60 d | ❌ |
| Possible product affinity | `preference.brand` / `.product_characteristic` | **LOW** | 60 d | ❌ |
| Breed from a photo | `pets.breed` + `breed_confidence`, `breed_source=AI_INFERRED` | LOW–MEDIUM | — | ❌ |
| Summary of a document | not a fact — display only | — | — | — |
| Insight phrasing | `pet_insights.title_key` | — | `valid_until` | — |
| Prediction phrasing | `pet_insights` | — | `valid_until` | — |

### And what it may never infer

```
health.allergy · health.sensitivity · health.condition · health.medication
health.procedure · health.neuter_status · vaccination status or date
physical.body_condition (it drives dietary recommendation)
```

Enforced by `pet_fact_definitions.is_sensitive` + `requires_source`, checked at
**write time**, not by a reviewer remembering.

---

## The extraction distinction

The single most important boundary in this document:

```
model reads a document  →  fact source = VET_DOCUMENT      (not AI_INFERRED)
model concludes from    →  fact source = AI_INFERRED
  chat / a photo / behaviour
```

**The document is the source; the model is the reader.** `ai_request_id` records
which model read it, so a misreading is traceable to both the document and the
call that misread it. That is why document extraction can produce clinical facts
(pending confirmation) and inference never can.

---

## Required fields on every AI inference

| Field | Value |
|---|---|
| `source_type` | `AI_INFERRED` |
| `source_id` | **`ai_requests.id`** — the exact call |
| `ai_request_id` | same, explicit for joins |
| `model` / `provider` | **from the ledger, not copied** — `ai_requests` already has them |
| `prompt_version` | so a phrasing change is attributable |
| `created_at` / `observed_at` | |
| `confidence` | a **level**, never a number |
| `status` | `PROPOSED` \| `ACCEPTED` \| `REJECTED` \| `ACTIVE` \| `EXPIRED` |
| `evidence` | what the model was looking at: message ids, post ids, order ids |

`evidence` is what makes an inference reviewable. "Mipo thinks Blue likes chew
toys" is unanswerable. "…because of these three chat messages" can be agreed with
or dismissed.

### No false precision
A model logprob and an OCR character confidence are **not the same quantity** and
must never be compared or averaged. Raw scores may be kept inside `evidence` for
debugging. They are never displayed and never ranked across sources (`45`).

---

## Suggested, not applied

Two tiers, decided by whether the owner would be surprised to find it asserted:

| Tier | Behaviour | Examples |
|---|---|---|
| **Silent** | written directly as `AI_INFERRED`, LOW, decaying; ranks only | a toy-type preference from three chat mentions |
| **Proposed** | written `PROPOSED`; **surfaced for acceptance**; becomes `USER_PROVIDED` on accept | breed from a photo; a food change noticed in chat; anything on the pet profile |

The rule: **anything that appears on the pet's profile is proposed, not applied.**
An owner opening their pet's page and finding a trait they never entered is the
experience this prevents.

Note that `AddPet.tsx` already has the UI for this — `breedSource: 'ai' | 'user'`
with a confidence display (*"זוהה: לברדור (87%)"*) and a type-mismatch dialog.
The scaffolding exists; `detectBreed()` is currently a stub that returns without
calling anything.

---

## Never promote silently

> An `AI_INFERRED` fact becomes `USER_PROVIDED` or `VET_CONFIRMED` **only by an
> explicit human act, and that act is itself the new fact's source.**

Promotion is a **write**, not an update: a new row whose `source_type` is the
human act and whose `derived_from` names the AI fact it replaces. The old row is
closed, not overwritten.

The failure this prevents: a model laundering its own guess. It infers, the
inference is stored, a later read treats stored data as ground truth, and the
guess is a fact with nobody accountable for it.

The codebase already refuses this for products, and says why:

> "the model's output is treated as a SEARCH, never as data. The names it
> proposes become keywords, the catalogue answers, and every field that reaches
> the customer is copied off the row that came back."
> — `server/src/catalogRecommendations.js`

This document is that rule, generalised from products to facts.

---

## Prompt context

| Include | Why |
|---|---|
| Species, breed, life stage, sex, neuter status | shapes every answer |
| Current facts **with source and confidence** | so the model says "according to your vet document" instead of asserting |
| Recent relevant records | context |
| The matching result, when explaining one | it explains, it does not decide |

| Exclude | Why |
|---|---|
| Owner address, phone, ID number | not needed to answer anything |
| Payment detail beyond product identity | |
| **Other pets' facts** | no cross-pet leakage |
| Superseded and disputed facts | they invite reasoning from retracted data |
| Raw documents when a fact will do | minimise what leaves the boundary |

The existing chat prompt already instructs the model to say what is uncertain.
The fact model makes that mechanical rather than hopeful: a `MEDIUM`-confidence
fact is passed as one.

**`profiles.ai_consent_given` must be checked** before any pet-scoped clinical
call. It is stored today and, as far as I can find, read nowhere.

---

## Expiry

| Kind | Lifetime |
|---|---|
| `AI_INFERRED` fact | 60-day half-life, expires at ~180 days with no reinforcement |
| `PROPOSED` inference not acted on | 30 days, then `EXPIRED` — a suggestion box that never empties is noise |
| Insight | `valid_until`, then `STALE` |
| Prediction | `valid_until`, recomputed |
| Rejected inference | kept 1 year for audit, **never re-proposed** |

That last line matters: an owner who dismissed "Blue prefers chew toys" should
not be asked again next month.
