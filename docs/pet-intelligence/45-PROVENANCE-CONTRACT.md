# 45 — Provenance Contract

## The precedents already in the code

Two, and both are worth copying rather than reinventing.

**`pets.breed_confidence` + `breedSource`.** One field, in one screen, already
does the right thing: it records where a value came from and how sure it is, and
shows the owner *"זוהה: לברדור (87%)"*.

**`ai_pricing_versions`.** `effective_from`, `effective_to`, `unit_price`,
`unit`, `currency`, `source` — and every `cost_events` row **pins the pricing
version that produced it**, so an admin figure and a ledger row always reconcile.
That is exactly the shape a fact needs. The codebase already knows how to do
temporal provenance; it does it in one subsystem.

---

## §21 — Source taxonomy

The brief lists nine origins. They collapse to **seven source types** plus a
separate `source_channel`, because "SOCIAL" and "INTEGRATION" describe *how* a
value arrived, not *who asserts it*.

| `source_type` | Asserts | Trust | Promotable to |
|---|---|---|---|
| `VET_CONFIRMED` | a veterinarian, in Mipo | highest | terminal |
| `VET_DOCUMENT` | a clinical document, read by a model or a person | high; extraction may err | `VET_CONFIRMED`, or `USER_CONFIRMED` |
| `USER_PROVIDED` | the owner | high for preference, moderate for clinical | `VET_CONFIRMED` only by a vet act |
| `SYSTEM_DERIVED` | a versioned rule over other facts | exact given inputs | never — recomputed |
| `ACTIVITY_DERIVED` | measured activity, aggregated | measured | terminal |
| `PURCHASE_DERIVED` | buying behaviour | weak signal | never clinical |
| `AI_INFERRED` | a model, with no document behind it | lowest | only by a recorded human act |

```
source_channel   APP | ADMIN | DOCUMENT | INTEGRATION | SOCIAL | ACTIVITY | SYSTEM
```

`VET_CONFIRMED` has **no producer today** — there is no vet identity in the
system. Defined now so the ranking does not change when one arrives.

---

## §21 — Fact fields vs a provenance record

The brief asks which belongs where. **Everything belongs on the fact.**

| Field | Where | Why |
|---|---|---|
| `source_type`, `source_id`, `source_channel` | **on the fact** | |
| `source_timestamp` | **on the fact** | when the source itself was created |
| `confidence`, `verification_status` | **on the fact** | |
| `observed_at`, `effective_from`, `effective_to` | **on the fact** | |
| `derived_from`, `rule_version`, `ai_request_id` | **on the fact** | |
| `created_at`, `updated_at` | on the fact | |

A separate `pet_fact_provenance` table would be a 1:1 join on the hottest read
path in the system, and a nullable join at that — which means a fact could exist
without provenance. **That must be impossible.** Nine columns on the fact is the
cheaper and safer design.

The **audit trail** of status changes is a different thing and *does* get its own
table:

```
pet_fact_transitions
  fact_id, from_status, to_status, reason, actor_type, actor_id, at
```

Facts are append-only for values; status changes are few and worth logging.

---

## §27 — Confidence levels

| Level | When |
|---|---|
| `VERIFIED` | `VET_CONFIRMED` only |
| `HIGH` | `USER_PROVIDED`; clean `VET_DOCUMENT` extraction; `SYSTEM_DERIVED` from HIGH inputs |
| `MEDIUM` | low-scoring extraction; short-window `ACTIVITY_DERIVED`; repeat `PURCHASE_DERIVED` |
| `LOW` | single-signal purchase; `AI_INFERRED`; a decayed preference |
| `UNKNOWN` | genuinely unassessable |

### Where confidence is meaningless — and must be omitted

The brief is right that not everything needs it. **Do not attach confidence to:**

- `pets.name`, `species`, `gender` — Core attributes the owner set
- `identity.life_stage`, `physical.size_band` — deterministic given inputs;
  confidence belongs to the *inputs*, and `derived_from` already points at them
- an observation from a scale — it is a reading; `method` is the useful field
- an event — events do not have confidence, they either happened or were not
  recorded

Adding confidence everywhere makes it noise, and noise gets ignored on the one
screen where it matters.

### No cross-source comparison
A model logprob of 0.91 and an OCR character confidence of 0.91 are different
quantities. Raw scores may live in `derived_from` for debugging. They are
**never displayed, never averaged, never ranked across sources.**

### `verification_status` — orthogonal to confidence
```
UNVERIFIED · USER_CONFIRMED · VET_CONFIRMED · DOCUMENT_EXTRACTED
DISPUTED · REJECTED
```

Confidence says *how sure the producer was*. Verification says *who has since
looked*. A `VET_DOCUMENT` fact starts `HIGH`/`DOCUMENT_EXTRACTED` and becomes
`HIGH`/`USER_CONFIRMED` on confirmation — same confidence, stronger standing.

---

## §26 — Conflict resolution

### First: is it a conflict at all?

`pet_fact_definitions.volatile` decides.

- **Volatile keys** (weight, activity level) — a later value **supersedes**. Two
  weights are two truths about a changing quantity. Never a conflict.
- **Stable keys** (allergy, neuter status, birth date) — an overlapping
  disagreement **is** a conflict.

### The hierarchy, scoped by key class

The brief's ordering is nearly right and wrong in one place: `SYSTEM_DERIVED`
must **not** sit below `USER_PROVIDED` for derived keys.

| Rank | Source | Clinical keys | Derived keys | Everything else |
|---|---|---|---|---|
| 1 | `VET_CONFIRMED` | ✅ wins | corrects inputs | ✅ |
| 2 | `VET_DOCUMENT` | ✅ | corrects inputs | ✅ |
| 3 | `USER_PROVIDED` | ✅ | **cannot set directly** | ✅ wins |
| 4 | `SYSTEM_DERIVED` | ❌ never | ✅ **sole writer** | ✅ |
| 5 | `ACTIVITY_DERIVED` | ❌ | — | ✅ |
| 6 | `PURCHASE_DERIVED` | ❌ | — | ✅ preferences only |
| 7 | `AI_INFERRED` | ❌ | — | ✅ lowest |

**Derived keys have exactly one writer.** A user who disagrees with a life stage
is disagreeing with the birth date, and the UI routes them there. This is the one
departure from the brief, and it exists because two writers on a derived value is
precisely how `pets.age` and `pets.size` became dead columns.

### Tie-breaks, in order
1. Rank
2. **`observed_at`** — not `created_at`. A March document uploaded in September
   describes March
3. **Precision** — `EXACT` beats `ESTIMATED` at equal rank
4. Verification — `USER_CONFIRMED` beats `UNVERIFIED`
5. Still tied ⇒ `DISPUTED`. **Never coin-flip.**

### The worked case from the brief

```
User            28.0 kg   observed 2026-09-01   USER_PROVIDED
Vet document    29.2 kg   observed 2026-09-09   VET_DOCUMENT
Activity        28.7 kg   observed 2026-09-08   ACTIVITY_DERIVED
```

`physical.weight` is **volatile**. Not a conflict — three observations of a
changing quantity:

```
pet_observations   all three kept, each with its source and method

physical.weight
  fact_1  28.0  USER_PROVIDED     09-01 → 09-08   SUPERSEDED
  fact_2  28.7  ACTIVITY_DERIVED  09-08 → 09-09   SUPERSEDED
  fact_3  29.2  VET_DOCUMENT      09-09 → null    CURRENT
```

Current = 29.2 kg. Trend = +1.2 kg in 8 days. Nothing overwritten, nothing
disputed, and the CRM can show all three with their sources.

**Change one thing:** the document is dated 2026-08-15 and says 24.0 kg. Rank
says the document wins; recency says the user's September value is later. Rank
applies *within an effective period* — the document takes August, the user keeps
September, and the 4 kg gap becomes an **insight** ("down 14% since August —
worth mentioning to your vet"), not a conflict. That falls straight out of
modelling weight as periods rather than a scalar.

### The safety rule
> While a **clinical** fact is `DISPUTED`, the **restrictive** reading applies.

A disputed chicken allergy keeps chicken excluded until it is settled. Enforced
in the rule engine, not left to whoever writes the query. Ambiguity resolves
toward not harming the animal.

### Auditability
Nothing is deleted. Ever. `pet_fact_transitions` records every status change with
its actor. A year later the CRM can still show that Blue was recorded as
chicken-allergic from November to September, which is exactly the question a vet
asks.

---

## Where this is enforced

A pure module — `server/src/petFactResolution.js` — with **no database and no
network access**, in the style of `server/src/aiAccounting.js`, which is
deliberately pure "so they can be unit tested directly".

```
in:   the incoming fact, the current facts for that key, the definition
out:  the writes to perform
```

Every case in this document becomes a test.
