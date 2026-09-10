# 37 — Activity Data Contract

## Status: `MISSING`. This document is a contract, not a design.

Verified: no walk table, no route storage, no check-in, no API. `/parks`,
`/dog-parks` and `/radar` are `<Navigate>` redirects. `dog_parks` (24 columns)
appears in exactly two places in the repository, both TypeScript type strings.
No PostGIS — installed extensions are `pgcrypto` and `plpgsql`.

`useLocation.ts` reads a browser position. `useActivityTracker.ts`, despite the
name, is a presence heartbeat whose `trackClick` is an empty function with the
comment *"Click analytics endpoint is not available on AWS yet."*

The **feature** design is `docs/system-workflows/08-ACTIVITY-WORKFLOWS.md` and it
is blocked on the native-vs-web decision. What follows is what Activity must
produce into Pet Intelligence when it arrives, so it cannot invent a parallel
pet model.

---

## §13 — The three layers

```
RAW_EVENT                AGGREGATED_METRIC          DERIVED_CHARACTERISTIC
walk.completed           7.8 km today               activity.activity_level
4.2 km, 47 min           12.4 km this week          = HIGH
                         4 sessions
     │                          │                            │
outbox_events +          computed at read time,       pet_facts,
walk_sessions/points     or a small rollup            ACTIVITY_DERIVED,
                                                      superseded weekly
```

| Layer | Storage | Mutable | In Pet 360 |
|---|---|---|---|
| Raw event | `outbox_events` + `walk_sessions` / `walk_points` | never | timeline only |
| Aggregate | computed; rollup table only if measured to be needed | recomputed | `activity` section |
| Derived characteristic | `pet_facts` | supersedes | facts, and `52` |

**The trap:** writing "high activity" as a stored column a nightly job maintains.
That is exactly how `pets.size` and `pets.current_mood` became dead columns — a
derived value with a hand-maintained home and no single writer.

---

## The contract

### 1. Events (`42`)
```
walk.started      pet_id, session_id, source(gps|manual)
walk.completed    pet_id, session_id, distance_m, duration_s, point_count,
                  gap_count, accuracy_class
walk.abandoned    pet_id, session_id, reason
park.checked_in   pet_id, park_id, visibility        ← confirmed, never automatic
park.checked_out  pet_id, park_id
play.recorded     pet_id, duration_s, kind           ← cats, birds, rodents
rest.recorded     pet_id, duration_s                 ← only if actually measured
```

`gap_count` and `accuracy_class` are **not optional**. A walk with a 20-minute
hole because iOS suspended the page must say so, or every downstream aggregate is
quietly wrong.

`rest.recorded` is listed but should not ship without a real sensor. Inferring
rest from the absence of movement on a phone in a pocket is a guess, and `42`
does not accept guesses as events.

### 2. Observations (`41`)
```
pet_observations   distance_m, duration_s, step_count per session
```

**Calories are not an observation.** They are derived from distance, duration,
weight and species, with a wide error bar, and presenting them as measured is
false precision. If shown at all: `43`, clearly labelled as an estimate.

### 3. Facts, recomputed weekly
```
activity.activity_level      VERY_LOW…VERY_HIGH   ACTIVITY_DERIVED
activity.walks_per_week      number
activity.avg_distance_m      number
activity.enrichment_minutes  number               ← cat, bird, rodent
behavior.energy              mirrors activity_level when no better source (35)
```

### 4. Timeline entries
`walk_completed`, `park_checked_in`.

### 5. Relationships
```
preference.favorite_park   ref → dog_parks, PURCHASE-style derivation:
                           3+ visits, spaced, → MEDIUM confidence
```

**Nothing else.** Activity does not write to `pets`, does not maintain a counter,
and does not create its own notion of a pet.

---

## Confidence rules

Activity is measured, which makes it tempting to over-trust. It is measured
**through a phone**.

| Window | Sessions | Confidence |
|---|---|---|
| < 2 weeks | any | **do not write the fact** |
| 2–4 weeks | ≥ 6 | MEDIUM |
| > 8 weeks | ≥ 20, regular | HIGH |
| any window, >30% gapped | — | cap at MEDIUM |

Plus the limitation stated in the model rather than discovered later:

> **Walks measure the owner as much as the animal.** A dog that is not walked is
> not necessarily low-energy; it may be under-exercised. `ACTIVITY_DERIVED`
> energy is capped at MEDIUM and is always superseded by an owner-provided value.

### Species: absence is not zero

Cats, birds and rodents are not walked. For them:

```
activity.walks_per_week        NOT_APPLICABLE     ← distinct from INSUFFICIENT_DATA
activity.enrichment_minutes    the relevant key, if captured at all
```

`52` must read `NOT_APPLICABLE` as "this gate does not apply", never as "low
activity". A matching engine that assumes every pet is a walked dog is the
failure this distinction prevents.

---

## What Activity may influence

| Consumer | Allowed | Not allowed |
|---|---|---|
| `52` | ranking; an activity gate only where a product declares an activity requirement | **never a health gate** |
| `34` nutrition | an energy factor in a *suggested* amount, with the vet caveat | never a prescription |
| `43` insights | trend detection, including declines | never a diagnosis |
| Store | context — "after a long walk" | never a nutritional or medical claim |
| Timeline | walk and park entries | |

The line: a 7 km walk is a **context signal**. It is not evidence this animal
needs more calories, and Mipo must not say so.

---

## Privacy — constraints on the feature, decided now

1. **Routes are private by default.** A walk route is a map of where someone
   lives. Never in an event payload, never in the timeline projection, never in a
   response another user can read.
2. **Location resolves to a place, never a point.** A check-in returns a park id.
   Coordinates do not leave the account.
3. **No automatic check-in.** GPS may suggest; the user confirms. Enforced
   server-side — a route accepting coordinates alone could create one silently.
4. **Aggregates, not points, feed facts.** `walk_points` is never read by Pet
   Intelligence.
5. **Raw points expire at 90 days**; aggregates persist (`48`).

---

## Until Activity exists

Every consumer must handle absence honestly:

```
GET /pets/:id/360   →  "activity": { "status": "NOT_AVAILABLE" }
52 matching         →  activity compatibility = INSUFFICIENT_DATA
43 insights         →  no activity insights, and no placeholder
Store               →  no "based on activity" section at all
```

Not an empty array, not a zero, not "low". That is the whole reason `52` has an
`INSUFFICIENT_DATA` output.
