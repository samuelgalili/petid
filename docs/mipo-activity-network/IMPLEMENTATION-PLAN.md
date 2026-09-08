# Implementation plan — MIPO Activity Network

Phase 0 is this documentation set. No production code has been written for the
Activity Network, per §83.

The phases below follow §75's order where it survives contact with the
repository, and depart from it where the audit found a dependency the spec did
not anticipate. Departures are marked and justified.

Each milestone is meant to be **small, testable, reversible, and shippable on
its own** — MIPO deploys by merging to `aws-migration`, with a quality gate, a
database rehearsal and an approval in front of it. Anything that cannot go
through that gate on its own is too big a milestone.

---

## Two departures from §75's ordering

**Analytics moves to the front.** §75 does not schedule it; §60 makes
"COMPLETED ACTIVITY LOOP" the primary KPI. If instrumentation lands after the
surfaces, the first weeks of the only question the MVP exists to answer are
lost. It is one table and one endpoint.

**Moderation moves to the front.** Not in §75 at all. `moderation_status` exists
in `social_posts` today and **no route can write it**. The Activity Network
multiplies public user video. Shipping more of it with no way to hide a post is
not defensible, and the fix is small.

---

## Phase 1 — Foundations that everything else assumes

Three independent, individually shippable pieces. None has UI risk; all are
prerequisites.

**1.1 Product analytics.** `product_events` table, `POST /api/events` (batched,
rate-limited, `user_id` stamped from the session, unknown names dropped), client
batching with a flush on `visibilitychange`.
*Done when:* the eighteen events of §60 can be recorded and the loop query runs.

**1.2 Moderation.** An admin route that writes `moderation_status`, plus
author-initiated deletion. The feed already filters on the column.
*Done when:* an admin can hide a post and it leaves every feed immediately.

**1.3 The visibility resolver.** `server/src/visibility.js` — `canView`, pure,
unit-tested, and the SQL predicates that go with it. Nothing consumes it yet.
*Done when:* the table in PRIVACY-MODEL.md is covered by tests.

**1.4 The social graph.** `user_follows` and `pet_friendships`, their routes,
and the "Following" feed tab — the first time that tab has a data source.
*Done when:* a user can follow another and see their Moments in Following.

Phase 1 ships value on its own even if Activity never proceeds: moderation
closes a real risk, follows make the existing feed social.

---

## Phase 2 — The park domain, without a map

Deliberately before the map. Parks are useful as a searchable list, and this
phase carries no external dependency, no cost decision, and no rendering risk.

**2.1 `parks` table and ingestion.** Source-tagged rows (`osm` / `municipal` /
`manual`), idempotent by `(source, source_ref)`, one launch city. **Blocked on
the data-source decision** — TECHNICAL-RISKS.md risk 4. Measure OSM coverage for
the launch city before committing.

**2.2 Park queries.** Nearby by bounding box plus haversine; search by name so
the feature survives a denied permission. `server/src/parks.js`, unit-tested.

**2.3 Check-ins.** Create, close, expiry; one open check-in per user enforced by
a partial unique index. "Who's Here" through the resolver from 1.3.

**2.4 Reports.** Closed `kind` list with TTL, and the aggregate view.

**2.5 Invisible mode.** The user setting, and its enforcement in both the list
*and* the counts.

*Done when:* a user can find a real park by name, check in, see who is there,
report water, and an invisible user appears in neither the list nor the count.

---

## Phase 3 — The map

Now, when there is real data to draw.

**3.0 The provider decision.** A library and a tile source, with a cost
attached. Nothing in this phase starts before it is made.

**3.1 Map surface.** A fifth route in `MainShell`, current location, park pins,
a bottom sheet for detail. Every failure state from UX-FLOWS.md — tiles down,
location denied, no parks nearby.

*Done when:* the map is usable with location denied and with tiles failing.

---

## Phase 4 — Walks

The largest phase, and the one with the most correctness risk.

**4.1 The tracking module.** `src/lib/walkTracking.ts` — accuracy filtering,
distance, gap handling — pure, with fixture tracks including a noisy stationary
track, a tunnel gap and a backgrounded walk. **Written and tested before any
UI.** Every number the user is shown comes from here.

**4.2 Schema and lifecycle.** `walks` and `walk_route_points`; start, pause,
resume, end; one active walk per user in the database; the `abandoned` sweep.

**4.3 Point ingestion.** Batched, idempotent on `(walk_id, sequence)`.

**4.4 Active walk UI.** Map-dominant, two actions, honest recording indicator,
and the backgrounding behaviour — `partial`, never interpolated.

**4.5 Summary.** Measured values only. No steps field. No pet calories.

**4.6 Retention job.** Raw points deleted at 90 days, coarsened polyline
computed at completion. Ships **with** this phase, not after it.

*Done when:* a recorded walk's distance matches a measured route, an interrupted
walk says so, and the retention job has been observed deleting points.

---

## Phase 5 — Moments and Activity

**5.1** Extend `social_posts` with `walk_id`, `park_id`, `content_kind`,
`hashtags`, `ai_metadata`; add `social_post_media` for carousels.
**5.2** Capture during a walk, with automatic association.
**5.3** Activity content in the feed; walk summaries shared explicitly, never
automatically.

---

## Phase 6 — Timeline

Walks, park visits, Moments and friendships in one pet view. Mostly a read
model over what phases 2–5 produced.

---

## Phase 7 — Pet intelligence foundations

`pet_attributes` with source, confidence and owner confirmation, and the
confirm/correct UI. No inference yet — the table and the honesty rules first, so
that when inference arrives it has nowhere to become fact silently.

---

## Phase 8 — AI

A `social_ai` feature slug on the existing gateway. Media analysis of Moments,
Ask Mipo on a Moment, a park, a pet. Context assembled **after** `canView`, and
user text treated as data.

Only after phases 5–7, because there is nothing to reason over before that.

---

## Phase 9 — Commerce in Activity

Contextual products through `catalogRecommendations.js`, unchanged: the model
proposes a search, the catalogue answers, unmatched results are dropped. Nothing
new to build for §42 — only new surfaces calling it.

---

## Rules for every phase

1. **No Activity business logic in `server/src/index.js`.** Domain modules
   (`walks.js`, `parks.js`, `checkins.js`, `visibility.js`) with unit tests;
   `index.js` gets routing and auth only. `index.js` is 8,746 lines and cannot
   be unit-tested — see TECHNICAL-RISKS.md risk 9.
2. **Every migration is additive and independently safe.** The runner has no
   run-level transaction; a half-applied set is a known outage in this codebase.
3. **Every read goes through the resolver.** No hand-written visibility
   predicate, anywhere.
4. **No number the system did not measure.** Absent beats plausible.
5. **Tests before UI** for anything that produces a number.
6. **Location data is minimised at write time.** Retention and coarsening are
   part of the phase that creates the data, never a later cleanup.
7. **Instrument as you build.** Each phase emits its §60 events in the same
   milestone as its feature.

---

## First implementation milestone

**Phase 1.2 — the moderation write path.**

Chosen because it is the smallest complete change that closes a real risk that
exists *today*, independent of every decision still open (native, map provider,
park data). It touches one column that already exists, adds one admin route,
needs no migration, and is fully covered by the existing test infrastructure.

It also proves the working agreement on a low-stakes change: domain logic in a
module, tests first, one shippable increment through the existing gate.

**Then, in order:** 1.1 analytics → 1.4 follows → 1.3 resolver → Phase 2.

---

## Decisions required before Phase 2 and 3 can start

| Decision | Blocks | Cost of getting it wrong |
|---|---|---|
| Park data source | Phase 2.1 | A thin map is not a product; invented parks violate §24 |
| Map library and tile provider | Phase 3 | A recurring bill chosen by accident |
| Native (Capacitor) or web-only | MVP framing | Promising background tracking that cannot be delivered |
| S3 + CDN for media | Phase 5 at scale | Media loss — nothing backs up the uploads volume today |

The fourth is not a product decision and should not wait for one. Nothing
currently backs up user media, and that is true whether or not the Activity
Network is ever built.
