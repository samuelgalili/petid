# Technical risks — MIPO Activity Network

Ordered by how much they change the plan, not by how likely they are. Each
carries the GREEN / YELLOW / RED classification §76 asks for, and the closest
technically valid alternative where the answer is RED.

Classification is about *this* repository, not about what is possible in
general.

---

## 1. Background walk tracking cannot be built on the web — **RED**

§19 and MVP steps 6–7 require: start a walk, **lock the phone**, keep walking,
come back, end the walk.

MIPO is a web app. There is no `ios/` or `android/` project, no Capacitor, no
React Native. On iOS, when the screen locks or Safari is backgrounded, page
JavaScript is suspended: timers stop and `watchPosition` stops delivering. There
is no web API that grants a page background location on iOS. On Android Chrome
the page is also frozen in the background, and while a PWA has slightly more
latitude, continuous background positioning is not something a page can rely on.

A walk tracked this way does not degrade gracefully — it silently records a
straight line from where the screen locked to where it woke, and the user is
shown a distance that is wrong. Under §18 ("never fabricate metrics") that is
worse than not offering the feature.

**Closest valid alternatives, in order of cost:**

1. **Screen-on walk (GREEN, available now).** `watchPosition` while the app is
   in the foreground, with a wake-lock request and an honest banner: *"Keep
   Mipo open to record the route."* Ends the walk automatically if the page is
   hidden for more than a few minutes, and marks the walk `partial` rather than
   inventing the gap. A 30-minute dog walk with the phone in hand is a real use
   case, and this is enough to prove the loop.
2. **Capacitor wrapper (YELLOW, weeks).** Wraps the existing site unchanged —
   same React, same build — in a native shell, then a background-geolocation
   plugin supplies the missing capability. Costs: an `ios/`+`android/` project
   in the repository, an Apple Developer account, store review on every
   release, and a release cadence that is no longer "push to a branch".
3. **Native rewrite (RED).** No justification. It throws away a working app.

**Recommendation:** ship (1), and treat (2) as a funded decision to take after
the loop is proven. Building the wrapper first spends weeks before learning
whether anyone walks with MIPO open at all.

## 2. Media storage will not survive video — **RED as currently built**

User media is written to the **local disk of the single EC2 instance**
(`/app/uploads`, `/app/private-uploads`, `server/src/index.js:88-89`). There is
no S3 bucket and no AWS SDK dependency in either `package.json`. Caddy serves
the files straight off disk; there is no CDN.

The Activity Network is media-heavy by design: a Moment per park visit, video
encouraged, 25 MB per upload allowed today. Three consequences:

- **Capacity.** Instance disk is finite and fills silently. A full disk does not
  only stop uploads; PostgreSQL is on RDS, but the API's logs and Docker itself
  share that disk.
- **Durability.** `pg_dump` backs up the database before every deploy. **Nothing
  backs up the uploads directory.** Losing the instance loses every photo every
  user has ever posted. That is not recoverable and it is not currently stated
  anywhere.
- **Delivery.** Every image and video is served by the single origin. One
  instance streaming video to a growing audience is the first thing that will
  fall over.

**Alternative:** S3 for objects plus CloudFront for delivery, with the API
issuing short-lived signed URLs for private media — which is also what §58's
media-security requirements want. This is a self-contained infrastructure task
that does not depend on any product decision, and it should be done before
Moments are encouraged, not after.

**Interim mitigation if that is deferred:** back the uploads volume up on a
schedule, and alarm on disk usage. Neither exists today.

## 3. There is no product analytics pipeline — **MISSING, blocks the KPI**

§60 names "COMPLETED ACTIVITY LOOP" as the primary KPI and lists eighteen
events. MIPO has no client analytics at all: `useActivityTracker.trackClick` is
an empty function with a comment saying the endpoint does not exist on AWS.

Without it, the Activity Network ships and nobody can answer whether the loop
works — which is the entire stated purpose of the MVP (§82). And the feed
ranking that Social wants later has no signals to rank on.

One endpoint and one table. It is small; it is just currently at zero. It should
land *before* the surfaces it measures, not after.

## 4. Park data has no source — **YELLOW, and it is a decision, not a task**

§24 requires park data to be verified or real and forbids inventing it. MIPO has
no park data and no ingestion path.

Candidate sources, none of which this audit has validated for coverage in
Israel — that check has to happen before committing:

- **OpenStreetMap** (`leisure=dog_park`), via a bulk extract or the Overpass
  API. Open licence (ODbL, requires attribution). Coverage in Israel is
  **UNKNOWN** and must be measured before it is relied on.
- **Municipal open data.** Several Israeli municipalities publish facility
  datasets. Quality, format and coverage vary; **UNKNOWN**.
- **Manual curation of one city.** Slowest per park, highest quality, and enough
  for an MVP that only needs one city to work well.

**Recommendation:** measure OSM coverage for the launch city first. If it is
good, seed from it and let community reports correct it. If it is thin, curate
one city by hand — an MVP needs one city, not a country.

## 5. There is no geospatial capability in the database — **GREEN, with a caveat**

The only extension installed is `pgcrypto`. No PostGIS, no `cube`/`earthdistance`.

This is not a blocker. "Parks within 5 km" over a few thousand rows is served
well by a bounding-box prefilter on a btree index over `(latitude, longitude)`,
with an exact haversine distance computed on the small result set. No extension,
no new dependency, and it is easy to test.

Caveat: RDS supports enabling PostGIS, and if the map later needs polygons,
routes-near-me, or tens of thousands of places, that is the upgrade path. Do not
take it in the MVP for a query this small.

## 6. Route data is the most sensitive data MIPO has ever stored — **needs design, not code**

A walking route is a home address plus a daily schedule. MIPO today stores
nothing comparable: the closest is `social_posts.location`, a free-text field.

There is no retention machinery of any kind in the repository — no scheduled
deletion, no TTL, no anonymisation. §17, §45 and §47 all depend on it existing.

PRIVACY-MODEL.md and LOCATION-ARCHITECTURE.md specify: never store the start and
end of a route at full precision, coarsen anything that leaves the owner's own
view, and delete raw points on a fixed schedule while keeping the aggregate.
This must be designed in the first migration. Retrofitting privacy onto stored
location data means deleting data users have already given you.

## 7. Steps are not available to a web app — **RED**

§20 asks for real step counts from HealthKit or Health Connect. Neither is
reachable from a browser; both require a native app with a health permission.

Do not substitute an estimate derived from GPS distance and call it steps —
§20 says do not fake steps, and a derived number presented in a "STEPS" field
is exactly that.

**Alternative:** omit the field entirely until MIPO is native. Distance and
duration are real, measurable in the browser, and enough for a walk summary.
An absent number is honest; a plausible one is not.

## 8. Push notifications are limited and unbuilt — **YELLOW**

No `web-push` dependency, no VAPID keys, no `pushManager` subscription in
`src/sw.ts`. Notifications today are database rows the client pulls.

Web Push works on Android Chrome. On iOS it works only for a PWA the user has
added to the Home Screen (iOS 16.4+), which most users will not have done. So
"a friend is at the park" reaches some users and not others, and which is which
is invisible to the product.

§57's notifications are out of the MVP for this reason. If they become
important, they are another argument for the Capacitor wrapper, which makes push
uniform.

## 9. The server monolith grows by another twenty routes — **manageable, if disciplined**

`server/src/index.js` is 8,746 lines with 99 hand-matched routes, and it cannot
be unit-tested because importing it starts a server.

The Activity Network adds roughly twenty routes. Added inline, they compound the
problem and arrive untestable. The convention that already works in this
repository is `social.js`: domain logic in its own module, unit-tested, with
`index.js` holding only routing and auth.

**Rule for this project:** no Activity business logic in `index.js`. Modules
`walks.js`, `parks.js`, `checkins.js` and a shared `visibility.js`, each with
tests, and thin routing.

## 10. A half-applied migration set is a known failure mode — **mitigated, stay careful**

`applyMigrations.js` runs each file in its own transaction with no run-level
transaction. On 8 September a migration failed midway through a release, after
an earlier one had already dropped columns the running API still selected, and
customers could not log in for four hours.

The mitigations now in place — a `pg_dump` and a dry-run rehearsal against the
restored copy — will exercise Activity's migrations before they touch
production. The discipline that remains ours: every Activity migration must be
additive and independently safe, because the runner cannot roll back the set.

---

## GREEN / YELLOW / RED at a glance

| Capability | Class | Why |
|---|---|---|
| Park domain: tables, check-in, who's here, reports | **GREEN** | Plain backend and web UI. Nothing external. |
| Nearby-park query | **GREEN** | Bounding box + haversine. No extension needed. |
| Moments attached to walks and parks | **GREEN** | Extends `social_posts`. |
| Pet and owner follows | **GREEN** | One table, standard queries. |
| Walk tracking, screen on | **GREEN** | `watchPosition` in the foreground. |
| Walk summary, distance, duration | **GREEN** | Computed from recorded points. |
| Product recommendations in Activity | **GREEN** | `catalogRecommendations.js` exists. |
| AI analysis of Moment media | **GREEN** | New feature slug on the existing gateway. |
| Map rendering | **YELLOW** | Needs a library and a tile provider. Costs money. |
| Park data ingestion | **YELLOW** | Source undecided; coverage unverified. |
| Push notifications | **YELLOW** | No VAPID; iOS limited to installed PWAs. |
| Media at video scale | **YELLOW** | Works today, will not scale. Needs S3 + CDN. |
| Walk tracking, phone locked | **RED** | No web API. Native only. |
| Step counting | **RED** | HealthKit / Health Connect are native only. |
| Pet calorie estimates | **RED for MVP** | No basis to compute from. Show unavailable. |
| Tenant-aware queries | **N/A** | There are no tenants to isolate. |
