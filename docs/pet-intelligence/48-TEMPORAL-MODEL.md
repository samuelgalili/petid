# 48 — Temporal Model

## §24 — Five timestamps, and which data needs which

| Timestamp | Question it answers |
|---|---|
| `observed_at` / `measured_at` | when was the world like this? |
| `effective_from` | when did this start being true? |
| `effective_to` | when did it stop? `null` = still true |
| `created_at` | when did the row appear in Mipo? |
| `updated_at` | when was the row last touched? |

### Per entity

| Entity | `observed_at` | `effective_from/to` | `created/updated_at` |
|---|---|---|---|
| **Core attribute** (`pets`) | ✗ | ✗ | ✅ |
| **Fact** | ✅ | ✅ | ✅ |
| **Observation** | ✅ (`measured_at`) | ✗ — a point, not a period | ✅ (`recorded_at`) |
| **Event** | ✅ (`occurred_at`) | ✗ | ✅ |
| **Document** | ✅ (`document_date`) | ✗ | ✅ (`uploaded_at`) |
| **Health record** | ✅ (`visit_date`) | ✅ for medications and recovery | ✅ |
| **Derived value** | inherits its inputs' | ✅ for stored derived facts | recomputed |
| **Insight / prediction** | ✗ | `computed_at` → `valid_until` | ✅ |

### Per key — the answer to the brief's list

| Data | Shape |
|---|---|
| **Weight** | observations (points) + facts (periods). Volatile: supersedes by recency, never disputes |
| **Health condition** | fact with a real period: onset → resolution |
| **Medication** | fact with a period: started → ended. The clearest case in the system |
| **Food** | fact with a period. Supersession *is* "previous foods" |
| **Behavior** | fact with a period, plus `observed_at` driving decay |
| **Preference** | fact with a period, plus decay; expiry closes it |
| **Activity level** | fact, recomputed weekly, each superseding the last |
| **Life stage** | fact — and the one that can carry a **future `effective_to`** |

---

## The three-timeline problem

Three different clocks, and confusing them is the most common temporal bug:

```
   valid time     when it was true in the world      observed_at, effective_*
   record time    when Mipo learned it              created_at
   source time    when the source was created       source_timestamp, document_date
```

A March vet document uploaded in September:

```
document_date     2026-03-11     ← source time
observed_at       2026-03-11     ← valid time: the weight was true in March
effective_from    2026-03-11
created_at        2026-09-10     ← record time
```

Getting this wrong makes a six-month-old weight look like today's, and `45`'s
recency tie-break then resolves in the wrong direction — a stale value beating a
current one. This is why `document_date` is a required addition in `40`, not a
nicety.

---

## §25 — Fact status state machine

```
                          ┌───────────┐
                write     │  CURRENT  │   effective_to IS NULL
            ─────────────►│           │   what Pet 360 returns
                          └─────┬─────┘
                                │
     ┌──────────────┬───────────┼───────────┬──────────────┐
 a better       the thing    a human     two sources    a human says
 source wins    stopped      corrects    disagree       it was wrong
     │          being true      │            │               │
     ▼              ▼           │            ▼               ▼
┌───────────┐ ┌──────────┐      │      ┌──────────┐   ┌───────────┐
│SUPERSEDED │ │ RESOLVED │      │      │ DISPUTED │   │ RETRACTED │
└───────────┘ └──────────┘      │      └────┬─────┘   └───────────┘
                                │           │ human decides
                                └──► new    ├──► CURRENT (one wins)
                                     CURRENT└──► RESOLVED (both retired)
```

`UNKNOWN` is **the absence of a row**, not a state. Never write a fact whose
value is "we do not know" — a missing fact is how the system says that, and `52`
reads it as `INSUFFICIENT_DATA`.

`HISTORICAL` is likewise **not a state**. It is the read-side name for anything
with `effective_to` set — `SUPERSEDED`, `RESOLVED` or `RETRACTED`.

| State | `effective_to` | Pet 360 | Matching |
|---|---|---|---|
| `CURRENT` | null | ✅ | ✅ |
| `SUPERSEDED` | set | history | ✗ |
| `RESOLVED` | set | history | ✗ |
| `DISPUTED` | null | ⚠️ flagged | **✗ — restrictive reading applies** |
| `RETRACTED` | set | audit only | ✗ |

### SUPERSEDED vs RESOLVED — the distinction that matters

They look identical in SQL and mean opposite things.

- **SUPERSEDED** — the *record* changed, the world did not. Weight recorded as
  28 kg; the document says it was 29.2 kg **on that same day**. The pet was never
  28 kg.
- **RESOLVED** — the *world* changed, the record was right. The chicken allergy
  was real and has since resolved. The old row keeps its full effective period
  because it was true then.

```
SUPERSEDED   fact_A.superseded_by_fact_id = fact_B.id
             fact_A.effective_to = fact_B.effective_from     (they abut)

RESOLVED     fact_A.effective_to = the date it stopped being true
             superseded_by_fact_id = null; no successor required
```

Getting this wrong destroys history in one direction and invents it in the other.

`RETRACTED` (the brief's word; `REJECTED` elsewhere in these documents — same
state) is for "this should never have been recorded": a fact written against the
wrong pet, or an extraction the owner dismissed. It keeps the row for audit and
never re-proposes it.

---

## Decay — read-time, never scheduled

```
preference.toy_type = chew   PURCHASE_DERIVED   half_life 180 d

  day 0    MEDIUM     3 purchases in 4 months
  day 180  LOW        nothing since
  day 360  effective_to set, status RESOLVED
```

- New evidence **resets `observed_at`** and may raise confidence one level.
- Contradicting evidence drops it **two** levels immediately.
- **Clinical facts never decay.** An allergy does not become less true because
  nobody mentioned it for a year. Only a source can end it.

**Computed at read time** from `observed_at` and the half-life — not by a nightly
job. There is no durable scheduler in this system, and a read-time computation
cannot silently stop working. This is the same reasoning that puts vaccination
due dates and preventive care on a read predicate (`43`).

---

## Retention

The governing rule:

> **A superseded fact is not stale data. It is history. A current value changing
> is never a reason to delete what came before.**

| Data | Retain | Then |
|---|---|---|
| Clinical facts, any status | life of the pet + 7 years | archive, never hard-delete while the account lives |
| Non-clinical `CURRENT` | life of the pet | with the pet |
| Non-clinical `SUPERSEDED`/`RESOLVED` | 3 years | archive |
| `RETRACTED` | 1 year | delete |
| Documents | life of the pet + 7 years | archive |
| Weight / clinical observations | with the clinical facts | the trend **is** the value |
| Body measurements | 3 years | archive |
| **Raw GPS points** | **90 days** | **delete** — a route maps where someone lives |
| Activity aggregates | indefinitely | |
| Insights / predictions | 90 days or `valid_until` | **delete** — projections, recomputable |
| Timeline entries | as long as their sources | **rebuild, never restore** |
| `outbox_events` | 90 days **after every consumer cursor has passed** | archive |
| AI ledgers | 24 months | aggregate, delete detail |

Nothing here can run today: there is no durable job runner. Read-time expiry
covers decay and due dates; everything else accumulates knowingly and is listed
as debt rather than quietly ignored.

---

## Lifecycle transitions

**Pet archived** — nothing deleted; derived facts stop recomputing; insights go
`STALE`; reminders stop.

**Pet deceased** (`53`) — records retained in full; insights, predictions,
reminders and reorder prompts stop **immediately**. Nothing in this system should
try to sell food to a dead pet.

**Pet deleted** — facts, observations, extractions, insights and timeline cascade.
Note what already happens and must not be copied: `pet_documents`,
`pet_service_bookings`, `insurance_claims` and `social_posts` are all
`ON DELETE SET NULL` on `pet_id`, so today a delete **silently orphans** them.

**Document deleted** — facts it produced are **closed with reason
`source_deleted`**, not orphaned. A deleted medical record must not leave its
conclusions behind.
