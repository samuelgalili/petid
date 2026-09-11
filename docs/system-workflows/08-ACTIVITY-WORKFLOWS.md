# 08 — Activity Workflows

## Status: `MISSING`

Not partial. There is no walk, no route, no GPS persistence, no session, no
summary, and no API. Stated precisely, because it is the largest gap in the
brief:

| Thing | Present? |
|---|---|
| `walks` table (or any name for it) | ❌ none of the 53 tables |
| Route / track / GPS point storage | ❌ |
| Any `/api/...` route mentioning walk, route, track, activity session | ❌ (110 routes enumerated) |
| A walk screen | ❌ |
| Background location | ❌ |
| Distance, steps, duration | ❌ |

### What does exist, and what it is worth

**`src/hooks/useLocation.ts`** — a browser geolocation wrapper. It requests a
position, tracks `loading`, `error` and `permissionDenied`, and resolves a
city. It is a foreground, one-shot reader. It does not watch, does not
accumulate, and nothing it returns is ever sent to the server.

**`src/hooks/useActivityTracker.ts`** — despite the name, this is a
**presence heartbeat**, not activity tracking. It calls
`updateMyActivityStatus()` at most once a minute on route change, which writes
`profiles.last_active_at`. Its other export is:

```ts
const trackClick = useCallback((_elementId: string, _elementLabel?: string) => {
  // Click analytics endpoint is not available on AWS yet.
}, []);
```

An empty function with an honest comment. Anything that calls it records
nothing.

**Client routes** — `/radar` → `/`, `/parks` → `/chat`, `/dog-parks` →
`/chat`, `/experiences` → `/chat`, `/guides` → `/chat`
(`src/routes/index.tsx:139, 176-179`).

So: `MISSING`, deliberately and visibly, with placeholders that redirect rather
than pretend.

---

## Platform constraints — verify before promising

The brief asks for background tracking with the screen locked. What is
deliverable depends on a decision that has not been made: **Mipo is a PWA
today.** There is no Capacitor, no React Native, no `ios/` or `android/`
directory in this repository.

| Capability | Web / PWA | Native (Capacitor) |
|---|---|---|
| Foreground GPS | ✅ `watchPosition` | ✅ |
| Background GPS, app backgrounded | ❌ on iOS Safari. Suspended. | ✅ with the always-authorisation and a background-location entitlement |
| GPS with the screen locked | ❌ | ✅ iOS: significant-change / region monitoring or a background-location plugin. Android: a foreground service with a persistent notification |
| Step count | ❌ | ✅ HealthKit / Google Fit, each with its own permission and review |
| Resume after OS kill | ❌ | ⚠️ only via a location relaunch, and only for some modes |

**Do not promise screen-locked tracking on the web.** It is not a bug to be
worked around; iOS suspends the page. This is the single decision that gates
the whole Activity Network and it belongs in `DECISIONS.md` as
`REQUIRES PRODUCT DECISION`.

---

## Target workflow (PROPOSED, web-first, native-ready)

```
Open Map ──► permission prompt ──┬── granted ──► Start Walk
                                 │                   │
                                 └── denied ──► manual map, no tracking,
                                                explain what is lost
                                                    │
                              walk_sessions row created (status ACTIVE)
                                                    │
                                 watchPosition, buffered in IndexedDB
                                                    │
                        batched POST every N points / M seconds
                                                    │
                              ┌─────────────────────┼─────────────────┐
                       nearby park?           user backgrounds     network loss
                              │                    app                  │
                        suggest check-in      pause / degrade    keep buffering,
                        (never automatic)       gracefully       flush on reconnect
                                                    │
                                            End Walk (explicit)
                                                    │
                        summary: distance, duration, route, parks
                                                    │
                    ┌───────────────┬───────────────┼──────────────┐
              pet timeline    ACTIVITY_DERIVED   Moment prompt   store context
                 (04)          facts (05)          (11)         (13 activity input)
```

### Schema sketch (PROPOSED)

```
walk_sessions   id, user_id, pet_id, status, started_at, ended_at,
                distance_m, duration_s, source(gps|manual),
                accuracy_summary, client_session_key (idempotency)

walk_points     session_id, seq, lat, lng, accuracy_m, recorded_at
                — or one PostGIS geometry per session; PostGIS is NOT
                  currently installed (extensions: pgcrypto only)
```

`client_session_key` is the answer to duplicate sessions: the client generates
it once, so a retried "start" is the same walk.

### Failure matrix — all of it must be designed, not just the happy path

| Case | Required behaviour |
|---|---|
| Permission denied at start | Map still opens. Walk button explains what it needs. No silent failure. |
| Permission granted later | Offer to start; never retro-fill a route. |
| GPS unavailable / indoors | Session continues with `source=manual`; distance marked unreliable rather than wrong. |
| Inaccurate points | Discard `accuracy_m` above a threshold at write time; keep the raw point but exclude from distance. |
| Background restricted (iOS PWA) | Detect suspension on resume; mark the gap explicitly in the summary instead of drawing a straight line across it. |
| Low battery | Reduce sampling rate; tell the user. |
| Network loss | Buffer locally; the walk is not lost. Flush is idempotent on `(session_id, seq)`. |
| App crash / tab closed | Session left `ACTIVE`. A recovery prompt on next open: "finish this walk?" with the buffered points. |
| Duplicate start | Same `client_session_key` returns the existing session. |
| Two devices | One `ACTIVE` session per pet; the second is refused with a clear message. |

**`RECOVERABLE` is a required state**, not an optional nicety — see `22`. The
character-generation queue already demonstrates why: it recovers stuck jobs on
boot (`resumePetCharacterJobs`, `server/src/index.js:8732`), and a walk needs
the same treatment for the same reason.

---

## Dependencies

Blocked on: the native-vs-web decision. Feeds: `09` (parks), `11` (Moments
with walk context), `04`/`05` (ACTIVITY_DERIVED facts), `13` (activity as a
matching input), `26` (`WALK_STARTED` / `WALK_COMPLETED`).

Note that "activity level" is listed as an input to the Product Matching Engine
in the brief. **Until this document is implemented, that input does not exist**
and any matching model must treat it as `INSUFFICIENT_DATA` rather than
assuming a default.
