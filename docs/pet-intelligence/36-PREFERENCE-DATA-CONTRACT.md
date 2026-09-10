# 36 — Preference Data Contract

## Today: four stores, three of them in the browser

| Store | Key | Scope |
|---|---|---|
| Favourites | `localStorage["mipo-favorites"]` | per browser, **per owner — not per pet** |
| Cart | `localStorage["mipo-cart"]` | per browser |
| Care plan | `localStorage["mipo-care-plan:<petId>"]` | per browser, **per pet** |
| `favorite_activities[]` / `activities[]` | database | a **verified mirror** — the write path sets both to the same value |

`useCarePlan.ts` is the closest thing to a per-pet preference store, and its own
comment concedes the limit: *"Local care-plan persistence is best-effort."*

Consequences today: a preference does not follow the owner to another device, is
lost when site data is cleared, is invisible to recommendations, and — for
favourites — cannot be attributed to a pet at all.

---

## §12 — The model

| Key | Value | Card. | Polarity |
|---|---|---|---|
| `preference.food` | ref → product, or normalized term | multi | like/dislike |
| `preference.treat` | ref / term | multi | like/dislike |
| `preference.toy_type` | enum `chew\|plush\|fetch\|puzzle\|rope\|interactive` | multi | like/dislike |
| `preference.activity` | enum, species-scoped | multi | like |
| `preference.brand` | text, normalized | multi | like/dislike |
| `preference.disliked_product` | ref → product | multi | dislike |
| `preference.texture` / `.flavor` | enum, from `business_products.flavors[]` | multi | like/dislike |
| `preference.product_characteristic` | enum `grain_free\|single_protein\|small_kibble\|…` | multi | like |

Every row carries polarity and a confidence that moves with evidence.

---

## §12 — Sources and confidence evolution

| Source | Evidence | Start | Half-life |
|---|---|---|---|
| `USER_PROVIDED` | the owner said so | HIGH | **none** — stands until changed |
| `PURCHASE_DERIVED` | repeat buying | see below | 180 d |
| `BEHAVIOR_DERIVED` | observed use | MEDIUM | 120 d |
| `ACTIVITY_DERIVED` | park/walk choice (`37`) | MEDIUM | 120 d |
| `AI_INFERRED` | concluded from chat or a Moment | **LOW** | 60 d |

### A single purchase is not a preference

The brief is explicit, and it is the crux. A purchase can be: the owner liking
it, the pet liking it, a promotion, a vet's instruction, a gift, an experiment,
or a mistake.

```
1 purchase                    → nothing written. Record the order, that is all.
2 of the same product          → LOW
3+, spaced                     → MEDIUM   — the interval matters: 3 in a week is
                                            stocking up; 3 over 5 months is a habit
3+ across a brand              → MEDIUM   preference.brand
repeat with no return/complaint→ MEDIUM
a return or a dispute          → evidence of a DISLIKE — stronger than a purchase
                                 is of a like; nobody returns something by accident
switched away, never back      → let it decay. Absence is not dislike.
```

Two guards that stop this producing nonsense:

- **Prescription and diet-managed purchases are excluded.** Food bought because a
  vet said so is not a liking. Detected via `business_products.special_diet` /
  `medical_tags` plus an active diet-sensitive condition. Treating it as a
  preference leads to recommending a therapeutic diet the animal may no longer
  need.
- **Unattributed purchases are excluded.** Requires `order_items.pet_id` (`39`).
  Until that exists, purchase-derived preferences cannot be computed for a
  multi-pet household without guessing — and guessing means recommending cat
  food to a dog owner because they own both.

### Decay

```
preference.toy_type = chew   PURCHASE_DERIVED   half_life 180 d

  buy #1 (day 0)     — nothing
  buy #2 (day 40)    → LOW
  buy #3 (day 150)   → MEDIUM,  observed_at reset to day 150
  day 330            → LOW      (half-life passed, no new evidence)
  day 510            → effective_to set, status RESOLVED
```

Rules:
- New evidence **resets `observed_at`** and may raise confidence one level.
- Contradicting evidence drops it **two** levels, immediately.
- Decay is computed **at read time** from `observed_at` and the half-life. No
  nightly job — there is no durable scheduler, and a read-time rule cannot
  silently stop working (`48`).
- Expiry **closes** the fact; it never deletes it. "Stopped buying chews in
  spring" is itself a signal.

---

## Preferences rank; they never exclude

> A preference changes **order**. It never changes **eligibility**.

A pet that "prefers chew toys" still sees plush toys — lower down. The only
preference with exclusion-like force is `preference.disliked_product`, and it
suppresses one specific product, not a category.

The reason: preferences are inferred, decaying and often wrong. A filter built on
them silently shrinks the catalogue in a way nobody can see or debug. Health
facts exclude; preferences rank. Keeping that separation is what makes `52`
explainable.

---

## Migration from localStorage

| Today | Target | Backfill |
|---|---|---|
| `mipo-care-plan:<petId>` | `preference.*`, USER_PROVIDED, HIGH | **clean** — already pet-scoped |
| `mipo-favorites` | owner-level favourites table | **not pet-attributed.** Import as owner-level; ask once, in-app, which pet each is for. Never guess. |
| `favorite_activities` / `activities` | `preference.activity` | the mirror collapses to one fact set |

Migration runs on the client, once, on first load after the feature ships: read,
POST, mark migrated. **Visible to the owner** — they see what was imported.

---

## Consumers

| Consumer | Use |
|---|---|
| `52` | ranking within eligible products |
| Store | "Because Blue likes…", Buy Again, alternatives |
| `43` | "Blue has stuck with the same food for a year" |
| CRM | brand affinity, churn signal |

Every "Because Blue…" sentence must point at a fact. Never a sentence the system
cannot cite — that is what separates personalisation from flattery.

## Gaps

| Gap | Status |
|---|---|
| Favourites per-browser and per-owner, not per-pet | `MISSING` server-side |
| Care plan per-browser | right shape, wrong storage |
| No dislike capture anywhere | `MISSING` |
| No purchase→preference derivation | blocked on `order_items.pet_id` |
| `favorite_activities`/`activities` mirrored | resolve in `51` |
