# MVP scope — MIPO Activity Network

§69 lists nineteen steps a real user must be able to complete. This document
grades every one against what the repository can actually deliver, and proposes
the MVP that follows from the honest answers.

---

## The nineteen steps, graded

| # | Step | Class | Note |
|---|---|---|---|
| 1 | Create / select a dog | **GREEN** | `pets` exists; pet selection exists. |
| 2 | Grant location permission | **GREEN** | Browser geolocation. |
| 3 | Open the Activity Map | **YELLOW** | Needs a map library and a tile provider. |
| 4 | Find a real nearby dog park | **YELLOW** | Query is trivial; the *data* has no source yet. |
| 5 | Start a Walk | **GREEN** | |
| 6 | **Lock the phone** | **RED** | No web API. Native only. |
| 7 | **Keep walking, still recording** | **RED** | Same. |
| 8 | Record a real route | **GREEN, screen on** | Foreground `watchPosition`. |
| 9 | Record real distance | **GREEN, screen on** | Haversine over filtered points. |
| 10 | Record steps / activity | **RED** | HealthKit / Health Connect are native only. |
| 11 | Capture a photo or video | **GREEN** | Upload path exists, video accepted. |
| 12 | Reach a park | **GREEN** | |
| 13 | Nearby-park suggestion | **GREEN** | Client-side proximity. |
| 14 | Check in manually | **GREEN** | |
| 15 | See visible pets and users | **GREEN** | Needs the visibility resolver. |
| 16 | End the Walk | **GREEN** | |
| 17 | Accurate Walk Summary | **GREEN, screen on** | Honest about interruptions. |
| 18 | Save to the Pet Timeline | **GREEN** | |
| 19 | Surface in Mipo Social | **GREEN** | The feed exists; extend `social_posts`. |

**Fifteen green, two yellow, three red.** The three red ones are all the same
fact: MIPO is a web app.

---

## The consequence, stated plainly

Steps 6, 7 and 10 cannot be delivered without a native shell. Everything else
can.

There are two ways to respond, and only one of them is honest about the number
on the screen.

**Option A — ship the loop with the screen on.** The walk records while MIPO is
open, with a clear line in the UI: *"Keep Mipo open to record the route."* If
the phone is locked mid-walk, the walk is saved as `partial` and the summary
says the recording was interrupted rather than inventing the gap. Steps are
omitted entirely — no field, rather than a fabricated one.

**Option B — build the Capacitor wrapper first.** Weeks of work, an Apple
Developer account, store review on every release, before a single user has
walked anywhere.

**Recommendation: A.** The MVP exists to prove one hypothesis (§82) —
*is WALK → PARK → SOCIAL → MOMENT useful and delightful?* A screen-on walk
tests that completely. If the answer is no, the wrapper would have been weeks
spent on a loop nobody wanted. If the answer is yes, background tracking becomes
the obvious next investment, funded by a real result, and it wraps a product
that already works.

What this must not become is a background-tracking feature that half-works. A
walk that silently draws a straight line across the locked-phone gap breaks §18
and, worse, teaches the user the numbers cannot be trusted.

---

## MVP scope

### In

**Parks**
- Park entity with a real source (`osm` / `municipal` / `manual`), one launch city.
- Nearby parks by coordinates; park search by name so the feature survives a
  denied location permission.
- Park detail: name, live activity, recent Moments, active reports.
- Manual check-in and checkout, with expiry.
- "Who's Here", pet-first, filtered server-side by visibility.
- Park reports from a closed list, with a TTL.

**Walks**
- Start, pause, resume, end. One active walk per user, enforced by the database.
- Foreground route recording with filtering, distance and duration.
- Graceful interruption: `partial`, never interpolated.
- Walk summary: distance, duration, parks visited, Moments captured.

**Moments**
- Capture during a walk, associated automatically with pet, walk, park and time.
- Extends `social_posts`; carousel via the child media table.
- Appears in the feed and in the pet's timeline.

**Social**
- Owner follows and pet friendships (mutual, consented).
- A "Following" feed tab — the first time that tab has a data source.
- Pet profile with activity totals, favourite park, Moments.

**Timeline**
- Walks, park visits and Moments in one chronological pet view.

**Privacy**
- The `canView` resolver, used by every Activity read.
- Invisible mode, including in aggregate counts.
- Route coarsening and end-trimming on anything shared.
- The retention job, running from day one.

**Analytics**
- `product_events` plus `POST /api/events`, and the eighteen events, so the
  loop KPI is measurable at launch rather than later.

**Moderation**
- A route that writes `moderation_status`. It exists as a column today and
  nothing can write it; a public feed with user video and no way to hide a post
  is not shippable.

### Out

Named explicitly, so nobody has to infer it:

- Background walk tracking and steps — RED, see above.
- Pet calorie estimates. §22 allows them "where technically possible"; with no
  pet-borne sensor there is no basis, and §70 forbids fabricating activity. Show
  nothing rather than a number.
- Turn-by-turn navigation. Hand off to the device's map app for directions.
- Push notifications (§57). No VAPID, and iOS delivery is limited to installed
  PWAs.
- Feed ranking. Chronological plus the Following tab. Ranking needs signals, and
  the signals start accumulating the day analytics ships.
- Pet similarity, behavioural intelligence, achievements, sponsored placement,
  local business marketplace, creator economy.
- Offline sync. The idempotent route-point key makes it possible later; it is
  not MVP.

---

## Definition of done

A real user, on a real phone, in the launch city, can:

1. Open MIPO, see their dog, tap **START WALK** within five seconds.
2. Walk with the phone in hand and watch a real route draw.
3. Be told about a real nearby park, and tap **I'M HERE**.
4. See who else is there — and not see anyone who chose to be invisible.
5. Take a photo that lands on the walk, the park, the pet and the feed.
6. End the walk and see numbers that are true, including "recording was
   interrupted" when it was.
7. Find all of it in their dog's timeline tomorrow.

And the team can answer, from data: how many people who opened the map completed
that loop.

---

## What would make this fail

- Shipping without analytics. The MVP's purpose is to answer a question; without
  instrumentation it answers nothing.
- Park data that is thin or wrong. A map with three parks on it is not a
  product, and inventing parks is forbidden by §24 and would be found out on the
  first walk.
- A walk that reports a distance it did not measure. One wrong number and the
  numbers stop being believed.
- Building the map before deciding who pays for the tiles.
