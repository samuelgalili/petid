# 05 — Pet Knowledge & Data Provenance

Status: **`MISSING`**. There is no provenance anywhere in the schema. I searched
the built schema for `source`, `confidence`, `verified`, `observed_at`,
`effective_from` on pet-related tables and found none.

The one place the codebase *does* get this right is the AI ledger, and it is
worth copying: `aiAccounting.js` keeps tokens, credits and money as three
separate quantities and refuses to collapse them in one step. Pet knowledge
needs the same discipline applied to facts, observations and inferences.

---

## The seven categories

The brief's categories, with what the system can express today:

| Category | Definition | Today |
|---|---|---|
| **FACT** | A stated truth with a source | Column on `pets` — no source |
| **OBSERVATION** | A measured event at a time | ❌ nothing measures |
| **INFERENCE** | A model's conclusion | ❌ chat output is not stored |
| **PREFERENCE** | A revealed liking | ❌ `localStorage` favourites only |
| **EVENT** | Something that happened | 🟡 `outbox_events`, 16 types, not consumed |
| **INSIGHT** | An interpretation over time | ❌ |
| **PREDICTION** | A forward statement | ❌ |

Worked example, in the brief's own terms:

```
FACT         Blue weighs 28.2 kg          → pets.weight = 28.2   (no source, no date)
OBSERVATION  Blue walked 6.2 km today     → nowhere to put it
INFERENCE    Blue has high activity       → nowhere to put it
PREFERENCE   Blue prefers chew toys       → localStorage["mipo-favorites"]
INSIGHT      Activity up 18% this week    → nowhere to put it
PREDICTION   Food reorder due soon        → nowhere to put it
```

Five of six have no home. That is the state of Pet Knowledge.

---

## Provenance model (PROPOSED)

Every fact carries all nine fields. No exceptions — an optional provenance
column becomes a null column.

| Column | Purpose |
|---|---|
| `source` | one of the seven classes below |
| `source_id` | the row that produced it (`pet_documents.id`, `orders.id`, `ai_requests.id`, `user_sessions.id`) |
| `confidence` | 0–1. `USER_PROVIDED` and `VET_CONFIRMED` are 1.0 by definition |
| `verification_status` | `unverified` \| `user_confirmed` \| `vet_confirmed` \| `disputed` |
| `observed_at` | when the world was like this |
| `effective_from` | when it started being true |
| `effective_to` | null = still true |
| `created_at` / `updated_at` | when the row was written |

### The seven source classes

| Class | Trust | Can it become another class? |
|---|---|---|
| `USER_PROVIDED` | high for preference, low for clinical values | → `VET_CONFIRMED` only by a vet document or a vet action |
| `VET_CONFIRMED` | highest | terminal |
| `VET_DOCUMENT` | high, but extraction may be wrong | → `VET_CONFIRMED` on user confirmation |
| `SYSTEM_DERIVED` | exact, given its inputs | recomputed, never promoted |
| `ACTIVITY_DERIVED` | measured | terminal |
| `PURCHASE_DERIVED` | strong signal, weak fact | never a clinical fact |
| `AI_INFERRED` | lowest | **never silently promoted** |

### The one rule that must not bend

> An `AI_INFERRED` fact never becomes `USER_PROVIDED` or `VET_CONFIRMED`
> without an explicit human act that is itself recorded.

Promotion is a write, with its own `source_id` pointing at the confirmation.
The model is not allowed to launder its own output by writing it back and
reading it as truth. This is the same principle
`server/src/catalogRecommendations.js` already applies to products — the model's
product names are treated as a *search*, never as data — generalised to facts.

---

## Conflict resolution (PROPOSED)

Two facts for the same `(pet_id, key)` with overlapping effective ranges:

```
                new fact arrives
                       │
          same key, overlapping period?
                  ┌────┴────┐
                 no        yes
                  │         │
              insert    compare source rank
                        (VET_CONFIRMED > VET_DOCUMENT >
                         USER_PROVIDED > ACTIVITY_DERIVED >
                         PURCHASE_DERIVED > AI_INFERRED)
                             │
              ┌──────────────┼──────────────┐
        new outranks     equal rank     new is lower
              │              │               │
      close the old,   newer observed_at   store it, but
      insert new       wins; loser kept    do not surface it
                       with effective_to   as current
```

Never: overwrite. Never: delete the loser. `effective_to` is how a fact stops
being current; the row stays so the timeline can explain itself.

**Medical conflicts are different.** If a new `VET_DOCUMENT` fact contradicts a
current `VET_CONFIRMED` one, neither wins automatically — both are marked
`disputed` and the owner is asked. Silently changing a recorded allergy on the
strength of an OCR pass is the failure mode this rule exists to prevent.

---

## What must never be inferred

A hard list, to be enforced in code, not convention:

- allergy or intolerance
- medication, dose, or schedule
- diagnosis or condition
- vaccination status or date
- pregnancy, neuter status
- anything that changes a product's safety recommendation

These may be **extracted** from a vet document (`VET_DOCUMENT`, pending
confirmation) or **entered** by the owner. They may never originate as
`AI_INFERRED`. Everything in `13-PRODUCT-MATCHING.md` marked "hard constraint"
draws only on facts from this list, which is why their provenance has to be
trustworthy.

---

## Sequencing

This is P0 for everything the brief calls Pet 360, Pet Intelligence, Product
Matching or CRM. Not because it is glamorous — because each of those, built
first, would encode "a value with no source" into its own storage, and undoing
that later means a migration per feature instead of one.
