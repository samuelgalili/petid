# 09 — Park Workflows

## Status: `PARTIALLY IMPLEMENTED` — a table, and nothing else

`dog_parks` exists with 24 columns and is genuinely well designed for the
purpose:

```
id, name, city, address, latitude, longitude, google_maps_link,
status, size, fencing, water, shade, agility, parking, lighting,
notes, source, verified, rating, total_reviews,
created_at, updated_at, created_by, updated_by
```

**Nothing reads it.** Searching the whole repository, `dog_parks` appears in
exactly two places, both in `src/types/admin-data.ts`, as a string in a
`DataSourceType` union for an admin data-source concept. There is:

- no API route (all 110 enumerated — none mention parks)
- no page (`/parks` → `/chat`, `/dog-parks` → `/chat`, `src/routes/index.tsx:139,176`)
- no seed data in any of the 33 migrations
- no check-in table
- no "who's here"
- no reviews table, despite `rating` and `total_reviews` columns

So the schema anticipated the feature and the feature was never built. The
table is empty and unreferenced.

### Consequence for geo queries
There is **no PostGIS**. Installed extensions on the migrated database are
`pgcrypto` and `plpgsql` only. `latitude`/`longitude` are plain `numeric`.
Proximity search today would be a bounding-box filter plus a haversine
computation in SQL, which is fine for an Israeli city-scale dataset and should
not be over-engineered. Adding PostGIS is a decision with an operational cost
(the Postgres image in `deploy/aws/docker-compose.yml` is `postgres:16-alpine`,
which does not ship it).

---

## Target workflow (PROPOSED)

```
Discover Park ──► Navigate ──► Arrive
                                 │
                    GPS says you are near a park
                                 │
                  ┌──────────────┴──────────────┐
                  │   SUGGEST check-in only     │   ← never automatic
                  └──────────────┬──────────────┘
                                 │ user confirms
                         park_checkins row (ACTIVE, with TTL)
                                 │
              ┌──────────┬───────┴────────┬─────────────┐
          Who's Here  Friends here     Moments       Reports
          (visibility  (relationship   (11, with     (condition,
           rules)       needed — 10)    park ctx)     expiring)
                                 │
                   ┌─────────────┴─────────────┐
              user checks out            TTL expires
                    │                          │
                 ENDED                     EXPIRED
```

### The rule the brief states, restated as a constraint

> **No automatic public check-in.** GPS may suggest proximity; the user must
> confirm.

This is not a UX preference — it is the difference between a social feature and
a location-broadcast feature. It has to be enforced server-side: a check-in
route that accepts coordinates alone, without a user action token, would let a
client create one silently.

### Check-in states, TTL and visibility

| Concern | Proposal |
|---|---|
| TTL | 90 minutes, extendable by activity. An ACTIVE check-in must expire on its own — a user who walks away and closes the app must not stay "here" all day. |
| Expiry mechanism | A timestamp column plus a `where expires_at > now()` predicate on read, **not** a background job. See `25` — there is no reliable scheduler, and a read-time predicate cannot silently stop working. |
| Visibility | `public` \| `friends` \| `invisible`. Requires the relationship model in `10`, which does not exist. Until it does, only `public` and `invisible` are honest options. |
| Exact location | Never returned. A check-in resolves to a **park**, not to coordinates. `profiles.location_blur_enabled` already exists as the precedent. |
| Home location | Never derivable. A user's check-ins near home over time are a home-address disclosure; this is why the park, not the point, is the unit. See `20`. |
| Reports | Condition reports (water off, gate broken) need their own expiry — a report from three weeks ago is misinformation, not information. |
| "Current activity" | Computed from ACTIVE check-ins, filtered by the viewer's relationship. Never a stored counter that can drift. |

### Schema sketch (PROPOSED)

```
park_checkins    id, park_id, user_id, pet_id, visibility,
                 checked_in_at, expires_at, ended_at, source(manual|suggested)

park_reports     id, park_id, user_id, kind, note, created_at, expires_at,
                 confirmed_count
```

`park_reviews` is deliberately not proposed yet: `dog_parks.rating` and
`total_reviews` already exist as denormalised counters, and adding reviews
means deciding how those counters stay correct. That is a separate decision.

---

## Dependencies

- `08-ACTIVITY-WORKFLOWS.md` — proximity requires location, which requires the
  native-vs-web decision.
- `10-SOCIAL-WORKFLOWS.md` — "friends here" cannot exist without a friendship
  model, and there is none.
- Park data itself: `dog_parks.source` and `verified` suggest an import was
  planned. Where the data comes from is `UNKNOWN`.

## Priority note

Parks are attractive and cheap-looking because the table already exists. They
are not cheap: a useful park feature needs location (blocked), relationships
(missing), and a privacy model (missing). Ranked in `30` accordingly — behind
the fact store, not ahead of it.
