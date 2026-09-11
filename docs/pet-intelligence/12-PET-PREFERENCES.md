# 12 — Pet Preferences

## Today: three browsers' worth of state

Preferences exist and none of them reach the server.

| Store | Key | Scope |
|---|---|---|
| Favourites | `localStorage["mipo-favorites"]` | per browser, **not per pet** |
| Cart | `localStorage["mipo-cart"]` | per browser |
| Care plan | `localStorage["mipo-care-plan:<petId>"]` | per browser, per pet |
| `pets.favorite_activities[]` / `activities[]` | database | a **mirrored pair** — the write path sets both to the same value |

`useCarePlan.ts` is the closest thing to a per-pet preference store, and its own
comment concedes the limit: *"Local care-plan persistence is best-effort."*

Consequences: a preference does not follow the owner to another device, is lost
when site data is cleared, is invisible to recommendations, and cannot be
attributed to a pet in the case of favourites.

---

## The model

| Key | Value | Cardinality |
|---|---|---|
| `preference.food` | ref → product, or normalized term | multi |
| `preference.treat` | ref/term | multi |
| `preference.toy_type` | enum (`chew`, `plush`, `fetch`, `puzzle`, `rope`, `interactive`) | multi |
| `preference.activity` | enum, species-scoped | multi |
| `preference.brand` | text (normalized) | multi |
| `preference.disliked_product` | ref → product | multi |
| `preference.texture` / `.flavor` | enum, from `business_products.flavors[]` | multi |

Every row carries a **polarity** (`likes` / `dislikes`) and a confidence that
moves with evidence.

### Sources and what each is worth

| Source | Evidence | Starting confidence |
|---|---|---|
| `USER_PROVIDED` | the owner said so | HIGH |
| `PURCHASE_DERIVED` | repeat buying | see below |
| `BEHAVIOR_DERIVED` | observed use | MEDIUM |
| `AI_INFERRED` | a model concluded it from chat or a Moment | **LOW, and never a hard filter** |

---

## Purchase ≠ preference

The brief is explicit and it is the crux of this document. A purchase is one of:
the owner liking it, the pet liking it, a price promotion, a vet's instruction,
a gift, an experiment, or a mistake. Confidence must reflect that.

```
1 purchase                  → not a preference at all. Record the order, nothing more.
2 purchases, same product    → LOW      "possibly"
3+ purchases, spaced         → MEDIUM   the interval matters — 3 in one week is
                                        stocking up, 3 over 5 months is a habit
3+ across a brand            → MEDIUM   preference.brand
repeat + no return/complaint → MEDIUM
a return or a dispute        → evidence of a **dislike**, not a like
switched away and never back → close the fact, open preference.disliked_product? NO —
                               absence is not dislike. Just let it decay.
```

Two guards that stop this producing nonsense:

- **Prescription and diet-managed purchases are excluded.** Food bought because a
  vet said so is not a preference, and treating it as one leads to recommending
  more of a therapeutic diet the animal may no longer need. Detected via
  `business_products.special_diet` / `medical_tags` and an active diet-sensitive
  condition.
- **Purchases with no pet attribution are excluded.** Which requires
  `orders.pet_id` (`15`). Until that exists, `PURCHASE_DERIVED` preferences
  cannot be computed at all for a multi-pet household without guessing — and
  guessing here means recommending cat food to a dog owner because they own both.

---

## Confidence over time

Preferences decay; that is what separates them from facts (`05`).

```
preference.toy_type = chew   PURCHASE_DERIVED   half_life 180d

  buy #1 (day 0)    — nothing written
  buy #2 (day 40)   → LOW
  buy #3 (day 150)  → MEDIUM,  observed_at reset to day 150
  day 330           → LOW       (half-life passed with no new evidence)
  day 510           → effective_to set, status RESOLVED
```

Rules:
- **New evidence resets `observed_at`** and can raise confidence one level.
- **Contradicting evidence drops it two levels**, immediately.
- Decay is computed **at read time** from `observed_at` and the half-life. No
  nightly job — there is no durable scheduler
  (`docs/system-workflows/25`), and a read-time computation cannot silently stop.
- Expiry closes the fact; it never deletes it. "Stopped buying chews in spring" is
  itself a signal.

| Source | Half-life |
|---|---|
| `USER_PROVIDED` | none — it stands until the owner changes it |
| `PURCHASE_DERIVED` | 180 days |
| `BEHAVIOR_DERIVED` | 120 days |
| `AI_INFERRED` | 60 days |

---

## Preferences never exclude

The hard rule for `18`:

> A preference changes **order**. It never changes **eligibility**.

A pet that "prefers chew toys" still sees plush toys — lower down. The only
preference with exclusion-like force is `preference.disliked_product`, and even
that suppresses one specific product rather than a category.

The reason: preferences are inferred, decaying and often wrong, and a filter
built on them silently shrinks the catalogue in a way nobody can see or debug.
Health facts exclude. Preferences rank. Keeping those separate is what makes the
matching engine explainable.

---

## Migration from localStorage

| Today | Target | Note |
|---|---|---|
| `mipo-favorites` | `preference.*` + a server favourites table | **not pet-attributed today** — cannot be backfilled to a pet without guessing. Import as owner-level; ask once, in-app, which pet each is for. |
| `mipo-care-plan:<petId>` | `preference.*`, `USER_PROVIDED`, HIGH | **already pet-scoped** — this one backfills cleanly |
| `favorite_activities` / `activities` | `preference.activity` | the mirrored pair collapses to one fact set |

Migration happens on the client, once, on first load after the feature ships:
read localStorage, POST, mark migrated. Never silently — the owner sees what was
imported. And never inferred: an un-attributed favourite stays un-attributed
until someone says otherwise.

---

## What preferences are for

| Consumer | Use |
|---|---|
| `18` | ranking within eligible products |
| `19` Store | "Because Blue likes…", Buy Again, alternatives |
| `20` insights | "Blue has stuck with the same food for a year" |
| `21` CRM | brand affinity, churn signal |

## Gaps

| Gap | Status |
|---|---|
| Favourites are per-browser and per-**owner**, not per-pet | `MISSING` server-side |
| Care plan is per-browser | `PARTIALLY IMPLEMENTED` — right shape, wrong storage |
| No dislike capture anywhere | `MISSING` |
| No purchase→preference derivation | blocked on `orders.pet_id` |
| `favorite_activities`/`activities` mirrored | resolve in `24` |
