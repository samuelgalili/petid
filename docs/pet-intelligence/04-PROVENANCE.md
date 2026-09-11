# 04 — Provenance

## The one precedent that already exists

`pets.breed_confidence` plus `AddPet.tsx`'s `breedSource: 'ai' | 'user'`, rendered
to the owner as *"זוהה: לברדור (87%)"*. One field, in one screen, does the right
thing: it says where the value came from and how sure it is.

Everything below generalises that.

There is a second, stronger precedent in a different subsystem.
`ai_pricing_versions` carries `effective_from`, `effective_to`, `unit_price`,
`unit`, `currency` and `source`, and every `cost_events` row **pins the pricing
version that produced it**, so an admin figure and a ledger row always reconcile.
That is exactly the shape a fact needs. The codebase already knows how to do
temporal provenance — in one place.

---

## The seven source types

| Source | Meaning | Trust | Promotable to |
|---|---|---|---|
| `VET_CONFIRMED` | a veterinarian asserted it in Mipo | highest | — terminal |
| `VET_DOCUMENT` | extracted from an uploaded clinical document | high, extraction may err | `VET_CONFIRMED` (by a vet) or `USER_CONFIRMED` |
| `USER_PROVIDED` | the owner entered it | high for preference, moderate for clinical | `VET_CONFIRMED` only by a vet act |
| `SYSTEM_DERIVED` | computed from other facts by a versioned rule | exact given inputs | never promoted — recomputed |
| `ACTIVITY_DERIVED` | aggregated from measured activity | measured, terminal | — |
| `PURCHASE_DERIVED` | inferred from what was bought | weak signal | never a clinical fact |
| `AI_INFERRED` | a model concluded it | lowest | **only by an explicit recorded human act** |

`VET_CONFIRMED` has no producer today — there is no vet identity in the system
(`OPEN DECISION` in `28`). It is defined now so the ranking does not have to
change when one arrives.

## The nine columns, and what each is for

| Column | Purpose | Notes |
|---|---|---|
| `source_type` | one of the seven | |
| `source_id` | the row that produced it | `pet_documents.id`, `orders.id`, `ai_requests.id`, `user_sessions.id`, `walk_sessions.id` |
| `source_timestamp` | when the source itself was created | a document dated March, uploaded in September |
| `confidence` | how sure | see below |
| `verification_status` | who has checked it | see below |
| `observed_at` | when the world was like this | **not** when the row was written |
| `effective_from` | when it started being true | usually `observed_at` |
| `effective_to` | when it stopped; `null` = current | `05` |
| `created_at` / `updated_at` | row bookkeeping | |

**`source_id` is what makes provenance real.** Without it, "VET_DOCUMENT" is a
label. With it, the CRM renders *"28.2 kg — from your vet document, 9 Sep"* as a
link that opens the actual PDF. The document is the evidence; the fact is the
index into it.

Because every AI call already writes an `ai_requests` row, an `AI_INFERRED` fact
can point `source_id` at the exact model call — with its prompt, model, latency
and cost. That is traceability the system can support **today**, for free.

---

## §34 — Confidence, without fake precision

A numeric confidence on a value a human typed is theatre. Confidence is a **level**,
and it is only meaningful for some sources:

| Level | When |
|---|---|
| `VERIFIED` | `VET_CONFIRMED` |
| `HIGH` | `USER_PROVIDED`; `VET_DOCUMENT` with clean extraction; `SYSTEM_DERIVED` from HIGH inputs |
| `MEDIUM` | `VET_DOCUMENT` with a low-scoring extraction; `ACTIVITY_DERIVED` over a short window; `PURCHASE_DERIVED` with repeat evidence |
| `LOW` | single-signal `PURCHASE_DERIVED`; `AI_INFERRED`; a preference that has decayed |
| `UNKNOWN` | genuinely unassessable |

A raw numeric score (an OCR character confidence, a model logprob) may be kept in
`derived_from` for debugging. **It is never shown and never compared across
sources** — a 0.91 from an OCR engine and a 0.91 from an LLM are not the same
quantity, and treating them as one is exactly the false precision the brief
forbids.

### `verification_status` — orthogonal to confidence
```
UNVERIFIED       nobody has checked
USER_CONFIRMED   the owner saw it and said yes
VET_CONFIRMED    a veterinarian confirmed it
DOCUMENT_EXTRACTED  came out of a document, not yet confirmed
DISPUTED         two sources disagree and neither wins (06)
REJECTED         a human said no; kept for audit, never current
```

Confidence says *how sure the producer was*. Verification says *who has since
looked*. A `VET_DOCUMENT` fact starts `HIGH` / `DOCUMENT_EXTRACTED` and becomes
`HIGH` / `USER_CONFIRMED` when the owner taps confirm — same confidence, stronger
standing.

---

## The rule that must never bend

> **An `AI_INFERRED` fact never becomes `VET_CONFIRMED` or `USER_PROVIDED`
> without an explicit human act, and that act is itself recorded as the new
> fact's source.**

Promotion is a **write**, not an update: a new row whose `source_type` is the
human act and whose `derived_from` names the AI fact it replaces. The old row is
closed, not overwritten.

Why this is stated so strongly: the failure mode is a model laundering its own
guess. It infers something, the inference is stored, a later read treats stored
data as ground truth, and the guess is now a fact with no one accountable for it.

The codebase already refuses this in one place, and the comment in
`server/src/catalogRecommendations.js` says it plainly:

> "the model's output is treated as a SEARCH, never as data. The names it
> proposes become keywords, the catalogue answers, and every field that reaches
> the customer is copied off the row that came back."

This document generalises that from products to facts.

## Never `AI_INFERRED` — enforced by `is_clinical`

```
health.allergy · health.sensitivity · health.condition · health.medication
health.procedure · health.neuter_status · vaccination status or date
physical.body_condition when it drives a dietary recommendation
```

These may be **extracted** from a document (`VET_DOCUMENT`, pending
confirmation) or **entered** by the owner. They may never *originate* as
`AI_INFERRED`. Enforced by the `is_clinical` flag on the fact definition, checked
at write time — not by a reviewer noticing.

## Worked examples

```
physical.weight = 28.2 kg
  source_type        VET_DOCUMENT
  source_id          doc_123
  source_timestamp   2026-09-09
  confidence         HIGH
  verification       DOCUMENT_EXTRACTED
  observed_at        2026-09-09
  effective_from     2026-09-09      effective_to  null

behavior.energy = HIGH
  source_type        ACTIVITY_DERIVED
  source_id          agg_2026w36
  confidence         MEDIUM          ← 3 weeks of data, not 3 months
  verification       UNVERIFIED
  derived_from       [walk_sessions over 2026-08-19..2026-09-09]
  effective_from     2026-09-09      effective_to  null

preference.toy_type = chew
  source_type        PURCHASE_DERIVED
  source_id          order_991
  confidence         MEDIUM          ← 3rd repeat purchase; a single buy is LOW
  verification       UNVERIFIED
  decays             half_life 180 days   (12)

identity.life_stage = ADULT
  source_type        SYSTEM_DERIVED
  derived_from       [pets.birth_date, pets.species, physical.size_band]
  rule_version       life_stage@2026-09-01
  confidence         HIGH
  effective_to       2028-04-02      ← known in advance: SENIOR at 6 for a large dog
```

That last line is worth noticing. A derived fact can be given a future
`effective_to`, so life stage transitions on its own without a nightly job
touching every pet.
