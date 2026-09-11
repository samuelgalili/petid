# 05 — Fact Lifecycle

## States

```
                          ┌───────────┐
                  write   │  CURRENT  │   effective_to IS NULL
              ───────────►│           │   this is what Pet 360 returns
                          └─────┬─────┘
                                │
        ┌───────────────┬───────┼────────┬──────────────────┐
        │               │       │        │                  │
  a better source   the fact  a human  two sources      a human says
  supersedes it     ends      corrects  disagree        it was wrong
        │               │       │        │                  │
        ▼               ▼       ▼        ▼                  ▼
  ┌───────────┐   ┌──────────┐  │  ┌───────────┐     ┌───────────┐
  │SUPERSEDED │   │ RESOLVED │  │  │ DISPUTED  │     │ REJECTED  │
  └───────────┘   └──────────┘  │  └─────┬─────┘     └───────────┘
   effective_to     the thing   │        │ human decides
   set, chain to    stopped     │        ├──► CURRENT (one wins)
   the new fact     being true  │        └──► RESOLVED (both retired)
                                │
                                └──► new CURRENT row, old → SUPERSEDED
```

Plus `UNKNOWN` — **the absence of any row**, not a state. Never write a fact
whose value is "we don't know"; a missing fact is how the system says that, and
`18` reads it as `INSUFFICIENT_DATA`.

| State | `effective_to` | In Pet 360? | In the matching engine? |
|---|---|---|---|
| `CURRENT` | null | ✅ | ✅ |
| `SUPERSEDED` | set | history only | ❌ |
| `RESOLVED` | set | history only | ❌ |
| `DISPUTED` | null | ⚠️ flagged | **❌ — see the safety rule below** |
| `REJECTED` | set | audit only | ❌ |

---

## SUPERSEDED vs RESOLVED — the distinction that matters

They look the same in SQL and mean opposite things.

- **SUPERSEDED** — the *record* changed, the world did not.
  Weight was recorded as 28 kg; the vet document says it was 29.2 kg on that same
  day. The pet was never 28 kg. The old row is superseded.
- **RESOLVED** — the *world* changed, the record was right.
  The chicken allergy was real and has since resolved. The old row keeps its
  full effective period because it was true then.

Getting this wrong destroys history in one direction and invents it in the other.
The chain is what tells them apart:

```
SUPERSEDED   fact_A.superseded_by_fact_id = fact_B.id
             fact_A.effective_to = fact_B.effective_from   (they abut)

RESOLVED     fact_A.effective_to = the date it stopped being true
             superseded_by_fact_id = null
             no successor is required
```

---

## Worked example — the brief's own case

```
2025-11-02  Owner enters "chicken allergy"
            → fact_1  health.allergy = chicken
              USER_PROVIDED · HIGH · UNVERIFIED
              effective_from 2025-11-02 · effective_to null · CURRENT

2026-09-09  Vet document uploaded. Allergy panel: no chicken reaction.
            Clinical key + contradiction ⇒ DO NOT auto-resolve.

            → fact_1.status  = DISPUTED
            → fact_2  health.allergy = chicken · asserted_absent = true
              VET_DOCUMENT · doc_123 · HIGH · DOCUMENT_EXTRACTED
              status DISPUTED

            → the owner is asked, once, in plain language:
              "המסמך מהמרפאה לא מצא רגישות לעוף. לעדכן את הפרופיל של בלו?"

2026-09-10  Owner confirms the document.
            → fact_1  status RESOLVED · effective_to 2026-09-09
                      (it was true for that period, as far as anyone knew)
            → fact_2  status CURRENT · verification USER_CONFIRMED
```

**Nothing was deleted.** A year from now the CRM can still show that Blue was
recorded as chicken-allergic from November to September, which is exactly the
kind of question a vet asks.

### Why not auto-resolve
Because the failure is asymmetric. Auto-resolving a real allergy on a
misread document leads to a product recommendation that harms an animal.
Leaving a resolved allergy in place for two days leads to a slightly narrower
product list. One of those is recoverable.

---

## The safety rule for `DISPUTED`

> While a clinical fact is `DISPUTED`, the **restrictive** reading applies.

If a chicken allergy is disputed, chicken products stay excluded until the
dispute is settled. `18` treats a disputed restriction as active; it does not
treat a disputed permission as granted. Ambiguity resolves toward not harming
the animal, and this is enforced in the rule engine rather than left to whoever
writes the query.

---

## Decaying facts

Preferences and activity-derived characteristics do not stay true by default.
`pet_fact_definitions.decays` and `half_life_days` drive a confidence step-down:

```
preference.toy_type = chew   PURCHASE_DERIVED   half_life 180d

  day 0     MEDIUM     3 purchases in 4 months
  day 180   LOW        nothing since
  day 360   →  effective_to set, status RESOLVED, and it stops
               influencing recommendations
```

Decay lowers **confidence**, and only expiry closes the fact. A preference is
never deleted — it becomes history, which is itself a signal ("stopped buying
chews in spring").

Clinical facts **never decay**. An allergy does not become less true because
nobody mentioned it for a year. Only a source can end it.

Decay is computed at read time from `observed_at` and the half-life — **not by a
nightly job**. There is no reliable scheduler (`docs/system-workflows/25`), and a
read-time computation cannot silently stop working.

---

## Immutability and audit

- Facts are **append-only**. The only in-place updates permitted are:
  `status`, `effective_to`, `superseded_by_fact_id`, `verification_status`,
  `confidence`, `updated_at`. Never a value, never a source.
- A correction is a new row. The chain reconstructs the whole story.
- Every transition emits an event (`07`) inside the same transaction, using the
  existing `emitEvent(client, …)` pattern so the fact and its event commit
  together or not at all.
- **History is never deleted to make a current value tidy.** Retention is in
  `23`, and it does not permit dropping a superseded clinical fact while the pet
  exists.
