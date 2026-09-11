# 14 — Activity Integration

## Status: `MISSING`, and this document only prepares for it

No walk table, no route storage, no check-in, no API. `/parks`, `/dog-parks` and
`/radar` are `<Navigate>` redirects. `dog_parks` (24 columns) is referenced in
exactly two places in the repository, both TypeScript type strings. There is no
PostGIS — installed extensions are `pgcrypto` and `plpgsql`.

`useLocation.ts` reads a browser position; `useActivityTracker.ts`, despite its
name, is a presence heartbeat whose `trackClick` is an empty function with the
comment *"Click analytics endpoint is not available on AWS yet."*

**This document does not design Activity.** That is
`docs/system-workflows/08-ACTIVITY-WORKFLOWS.md`, and it is blocked on the
native-vs-web decision. What this document defines is the **contract** Activity
must satisfy when it arrives, so Pet Intelligence is ready and Activity does not
invent its own parallel model.

---

## The three layers, never conflated

The brief's §26 distinction is the whole point:

```
RAW EVENT              AGGREGATED METRIC           DERIVED CHARACTERISTIC
walk.completed         12.4 km this week           behavior.energy = HIGH
4.2 km, 47 min         4 sessions                  ACTIVITY_DERIVED
                       avg 3.1 km                  confidence by window
     │                        │                            │
outbox_events         computed at read time         pet_facts
+ walk_sessions       or a small rollup             (supersedes weekly)
```

| Layer | Storage | Mutable | In Pet 360 |
|---|---|---|---|
| Raw event | `outbox_events` + `walk_sessions` / `walk_points` | never | timeline only |
| Aggregate | computed; a rollup table only if measured to be needed | recomputed | `activity` section |
| Derived characteristic | `pet_facts`, `ACTIVITY_DERIVED` | supersedes | facts, and `18` |

The trap to avoid: writing "high activity" as a stored column that a nightly job
maintains. That is how `pets.size` and `pets.current_mood` became dead columns —
a derived value with a hand-maintained home.

---

## The contract Activity must satisfy

When walks are built, they must produce **exactly these** into Pet Intelligence:

### 1. Events (`07`)
```
walk.started      pet_id, session_id, source(gps|manual)
walk.completed    pet_id, session_id, distance_m, duration_s, point_count,
                  gap_count, accuracy_class
walk.abandoned    pet_id, session_id, reason
park.checked_in   pet_id, park_id, visibility          ← confirmed, never automatic
park.checked_out  pet_id, park_id
```
`gap_count` and `accuracy_class` are not optional. A walk with a 20-minute hole
because iOS suspended the page must say so, or every downstream aggregate is
quietly wrong.

### 2. Observations
```
pet_observations   distance_m, duration_s per session
```

### 3. Facts, recomputed weekly
```
activity.activity_level      VERY_LOW … VERY_HIGH   ACTIVITY_DERIVED
activity.walks_per_week      number
activity.avg_distance_m      number
behavior.energy              mirrors activity_level when no better source (11)
```

### 4. Timeline entries (`08`)
`walk_completed`, `park_checked_in`.

Nothing else. Activity does **not** write to `pets`, does not maintain a
counter, and does not create its own notion of a pet.

---

## Confidence rules

Activity data is measured, which makes it tempting to over-trust. It is measured
**through a phone**, which is a different thing.

| Window | Sessions | Confidence |
|---|---|---|
| < 2 weeks | any | **do not write the fact at all** |
| 2–4 weeks | ≥ 6 | MEDIUM |
| > 8 weeks | ≥ 20, regular | HIGH |
| any window with `gap_count` > 30% of sessions | — | cap at MEDIUM |

And a limitation that must be stated in the model rather than discovered later:

> **Walks measure the owner as much as the animal.** A dog that is not walked is
> not necessarily low-energy; it may be under-exercised. `ACTIVITY_DERIVED`
> energy is therefore capped at MEDIUM confidence and is always superseded by an
> owner-provided value.

It also does not exist for most species. Cats, birds and rodents are not walked.
For them `activity.*` comes from `enrichment_minutes` or nothing at all, and
`18` must read absence as `INSUFFICIENT_DATA` rather than "low activity". A
matching engine that assumes every pet is a walked dog is the failure this rule
prevents.

---

## What Activity is allowed to influence

| Consumer | Allowed | Not allowed |
|---|---|---|
| `18` matching | ranking; an activity gate only where a product declares an activity requirement | **never a health gate** |
| `10` nutrition | an energy-factor input to a *suggested* feeding amount, with the vet caveat | never a prescription |
| `20` insights | trend detection, including declines | never a diagnosis |
| `19` Store | context signals — "after a long walk" | never a medical or nutritional claim |
| `08` timeline | walk and park entries | |

The line, from §50 of the brief: a 7 km walk is a **context signal**. It is not
evidence that this animal needs more calories, and Mipo must not say so.

---

## Privacy, decided now rather than later

Because the model is being designed before the feature, these are constraints on
the feature, not requests to it:

1. **Routes are private by default.** A walk route is a map of where someone
   lives. It is never in an event payload, never in the timeline projection, and
   never in a response another user can read.
2. **Location resolves to a place, never a point.** A check-in returns a park id.
   Coordinates do not leave the account.
3. **No automatic check-in.** GPS may suggest proximity; the user confirms.
   Enforced server-side — a route that accepts coordinates alone could create one
   silently.
4. **Aggregates, not points, feed facts.** `activity.activity_level` derives from
   distances and durations. `walk_points` is never read by Pet Intelligence.

---

## Until Activity exists

Every consumer must handle its absence honestly:

```
GET /pets/:id/360  →  "activity": { "status": "NOT_AVAILABLE" }
18 matching        →  activity compatibility = INSUFFICIENT_DATA
20 insights        →  no activity insights, no placeholder
19 Store           →  no "based on activity" section
```

Not an empty array, not a zero, not "low". `NOT_AVAILABLE` and
`INSUFFICIENT_DATA` are real answers, and the whole reason `18` has an
`INSUFFICIENT_DATA` output is so this case never has to be faked.
