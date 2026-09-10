# 06 — Conflict Resolution

## What counts as a conflict

Two `CURRENT` facts for the same `(pet_id, namespace, key)` — and, for
multi-valued keys, the same `normalized_value` — whose effective periods overlap.

Non-conflicts, which must not be treated as conflicts:

- **A later observation of a changing quantity.** 28.0 kg in March and 29.2 kg in
  September are two true facts. Weight changes. The March row closes when the
  September one opens; nothing is disputed.
- **A resolution.** The world changed (`05`).
- **Different keys that happen to disagree in spirit.** `behavior.energy = HIGH`
  and `activity.walks_per_day = 0.4` is a *signal*, not a conflict. It belongs in
  an insight, not a dispute.

So the first question is always **"is this the same fact, or a new one?"** —
decided by the key's `cardinality` and whether the value is expected to vary.
`pet_fact_definitions` carries a `volatile` flag for this: volatile keys
(weight, activity level) supersede by recency; stable keys (allergy, neuter
status, birth date) conflict.

---

## The hierarchy, and why it is not the brief's

The brief proposed:

```
VET_CONFIRMED > VET_DOCUMENT > USER_PROVIDED > SYSTEM_DERIVED
              > ACTIVITY_DERIVED > PURCHASE_DERIVED > AI_INFERRED
```

That is nearly right, and it is wrong in one place. **`SYSTEM_DERIVED` must not
sit below `USER_PROVIDED` in general**, because a derived fact is not an opinion
— it is a computation over other facts. If life stage is derived from birth date
and size, a user typing "SENIOR" should not override it; it should either correct
the *inputs* or be recorded as a disagreement about the inputs.

Conversely `SYSTEM_DERIVED` must never outrank a clinical source.

The resolution: **rank by source, but scope the ranking by key class.**

### Rank table

| Rank | Source | Clinical keys | Derived keys | Everything else |
|---|---|---|---|---|
| 1 | `VET_CONFIRMED` | ✅ wins | ✅ corrects inputs | ✅ |
| 2 | `VET_DOCUMENT` | ✅ | ✅ corrects inputs | ✅ |
| 3 | `USER_PROVIDED` | ✅ | **cannot set directly** | ✅ wins |
| 4 | `SYSTEM_DERIVED` | ❌ never | ✅ **sole writer** | ✅ |
| 5 | `ACTIVITY_DERIVED` | ❌ never | — | ✅ |
| 6 | `PURCHASE_DERIVED` | ❌ never | — | ✅ preferences only |
| 7 | `AI_INFERRED` | ❌ never | — | ✅ lowest |

**Derived keys have exactly one writer: the rule engine.** `identity.life_stage`,
`physical.size_band` and `behavior.energy` (when activity-derived) cannot be set
by anyone else. A user who disagrees is disagreeing with an input, and the UI
should take them to the input — the birth date, the weight — not let them
overwrite the output. This is what stops a derived value from silently becoming a
hand-maintained one, which is precisely how `pets.age` and `pets.size` became
dead columns in the first place.

### Tie-breaks, in order
1. **Rank** (table above).
2. **Recency of `observed_at`** — not `created_at`. A March document uploaded in
   September describes March.
3. **Precision** — an `EXACT` birth date beats an `ESTIMATED` one at equal rank.
4. **Verification** — `USER_CONFIRMED` beats `UNVERIFIED` at equal rank.
5. **Still tied** ⇒ `DISPUTED`. Do not coin-flip.

---

## The algorithm

```
new fact arrives
      │
  key exists in pet_fact_definitions?  ── no ──► REJECT (03)
      │ yes
  species applicable?                  ── no ──► REJECT
      │ yes
  source allowed for this key?         ── no ──► REJECT
  (is_clinical + AI_INFERRED, min_source_rank)
      │ yes
  overlapping CURRENT fact for the same key/value?
      │
      ├── no ──────────────────────────────────► INSERT as CURRENT
      │
      └── yes
             │
        key is volatile?
             ├── yes ──► supersede by observed_at, no dispute
             │
             └── no
                    │
              compare rank
                    │
        ┌───────────┼────────────┬──────────────┐
   new outranks  equal rank   new is lower   clinical +
        │             │             │        contradiction
        ▼             ▼             ▼             ▼
   close old,    tie-breaks     store, but    BOTH → DISPUTED,
   insert new    2→4, else      not CURRENT   ask the user,
   as CURRENT    DISPUTED       (shadow)      restrictive reading
                                              applies meanwhile (05)
```

### The "shadow" case
A lower-ranked source that disagrees is **kept, not discarded**. It is written
with `effective_to` set to its own `observed_at` and never becomes CURRENT. Why
keep it: three purchase signals that all disagree with a stored preference are
evidence the stored preference is stale, and that only shows up if the
disagreements were recorded.

---

## Worked example — the brief's weight case

```
User            28.0 kg   observed 2026-09-01   USER_PROVIDED
Vet document    29.2 kg   observed 2026-09-09   VET_DOCUMENT
Activity device 28.7 kg   observed 2026-09-08   ACTIVITY_DERIVED
```

`physical.weight` is **volatile**. These are not a conflict at all — they are
three observations of a changing quantity.

```
pet_observations   three rows, all kept, each with its source

physical.weight facts
  fact_1  28.0  USER_PROVIDED     from 09-01  to 09-08   SUPERSEDED
  fact_2  28.7  ACTIVITY_DERIVED  from 09-08  to 09-09   SUPERSEDED
  fact_3  29.2  VET_DOCUMENT      from 09-09  to null    CURRENT
```

Current weight = 29.2 kg. Trend = +1.2 kg in 8 days, computed over the
observations. Nothing overwritten, nothing disputed, and the CRM can show all
three with their sources.

**Now change one thing:** the vet document is dated 2026-08-15 and says 24.0 kg.
Rank says the document wins; recency says the user's 28.0 kg from September is
later. Rank is applied *within an effective period*, so the document takes
August and the user's value keeps September. A 4 kg drop between them becomes an
**insight** ("weight down 14% since August — worth mentioning to your vet"), not
a conflict. That is the correct outcome and it falls straight out of modelling
weight as periods rather than a scalar.

---

## Who resolves a dispute

| Dispute | Resolver | Prompt |
|---|---|---|
| Clinical, doc vs user | the owner | one question, plain language, once |
| Clinical, doc vs doc | the owner, newer shown first | "which of these is current?" |
| Non-clinical | automatic by rank | silent |
| Derived vs anything | automatic — derived wins, user is routed to the input | silent |
| Multiple pets named in one document | **never guessed** — the owner picks (`16`) | list their pets |

### Rules for asking
- **Never more than one question per document.** Batch every dispute a document
  raises into one review screen.
- **Never block.** An unresolved dispute does not stop the app; it holds the
  restrictive reading and waits.
- **Never ask twice.** A dismissed dispute is `REJECTED` with the dismissal as
  its source, and does not come back.
- **Never ask about something the owner cannot judge.** A disagreement between
  two OCR passes is an extraction-quality problem, not a question for a pet
  owner — it goes to `REVIEW_REQUIRED` on the document (`16`), not to a dispute.

## Where this is enforced

A pure module — `server/src/petFactResolution.js` — with no database or network
access, in the style of `server/src/aiAccounting.js`, which is deliberately pure
"so they can be unit tested directly". Input: the incoming fact, the current
facts for that key, and the definition. Output: the writes to perform. Every case
in this document becomes a test.
