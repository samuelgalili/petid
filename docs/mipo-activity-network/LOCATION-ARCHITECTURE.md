# Location architecture — MIPO Activity Network

Starting position: `navigator.geolocation.getCurrentPosition` appears in three
files (`src/hooks/useLocation.ts`,
`src/components/profile/PetWeatherAlert.tsx`,
`src/components/profile/PreventiveCareEngine.tsx`), all one-shot foreground
reads. **`watchPosition` does not appear anywhere in the repository.** There is
no permission state machine, no sampling, no distance accumulation.

---

## Permission states, and the one that is usually forgotten

The browser reports three states through `navigator.permissions.query({name:
"geolocation"})`, and the product needs four:

| State | What MIPO does |
|---|---|
| `granted` | Full Map and Walk. |
| `prompt` | Show the value proposition first, then ask. |
| `denied` | Map opens on a searched city; walks are unavailable, and the screen says why and how to undo it. |
| unavailable | No `navigator.geolocation` at all — old browser, or a non-secure context. Same handling as `denied`. |

§16 requires that denial not break MIPO. The rule: **location is required only
by Walks and by "parks near me".** Everything else — searching a park by name,
viewing a park, the feed, the pet profile, the timeline, creating a Moment —
must work with location off. That is a testable rule, and UX-FLOWS.md carries
the states.

Never call `getCurrentPosition` on page load to "warm it up". On iOS that
triggers the permission prompt with no context attached, which is the fastest
way to a permanent denial.

## Asking at the right moment

§16 puts the request in onboarding. That is a mistake at the moment of asking:
onboarding is where a user has the least reason to say yes.

Ask on the first tap of **START WALK** or **Parks near me**, where the reason is
self-evident and the sentence writes itself: *"Mipo needs your location to
record the route."* Deferring the prompt costs nothing and materially improves
the grant rate. Onboarding can still explain that MIPO uses location — it just
should not be where the browser dialog appears.

## Foreground tracking — what actually gets built

```
watchPosition({
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 15000,
})
```

**Filtering.** Raw GPS is noisy, and unfiltered noise inflates distance — a
phone standing still on a bench can accumulate hundreds of metres. Every fix is
rejected unless it passes:

- `accuracy <= 50` metres. Anything worse is a cell-tower fix, not GPS.
- at least 10 metres from the previous accepted point.
- at least 3 seconds since the previous accepted point.
- implied speed below 10 m/s — above that it is a jump, not a walk.

Distance accumulates only across accepted points, by haversine. This is where
"never fabricate metrics" (§18) is actually enforced, and it is pure logic:
extract it as `src/lib/walkTracking.ts` and unit-test it with recorded fixture
tracks. No browser needed for those tests.

**Sampling and upload.** Accepted points are batched and posted every ~15
seconds or 20 points, whichever comes first. Each batch carries the point
sequence numbers, so `walk_route_points`' composite primary key makes a retry
idempotent. The client keeps the batch until the server acknowledges it.

**Screen wake.** Request a `WakeLock` when a walk starts so the screen does not
lock while the phone is in the user's hand; release it on end. Not supported
everywhere, and `navigator.wakeLock` must be feature-detected — it is a nicety,
not the mechanism.

## Backgrounding — the honest part

When the page is hidden (`visibilitychange`), positions stop arriving. There is
no web API that changes this on iOS. MIPO must not pretend otherwise:

1. On `hidden`, record the timestamp. Keep the walk `active`.
2. On return within **5 minutes**, resume. The gap is a straight line the user
   really did walk in roughly that time; accept it and carry on.
3. On return after 5 minutes, or if the page is closed, the walk is closed as
   **`partial`**. Distance is what was actually observed, and the summary says
   the recording was interrupted rather than showing a number that is wrong.
4. A walk with no accepted point for 2 hours is closed as `abandoned` by a
   server-side sweep, so a forgotten walk does not stay "active" forever.

This is the mechanism referred to in TECHNICAL-RISKS.md risk 1, and it is why
`walks.status` has a `partial` value.

## Park proximity

Detection is client-side against a small set the server already sent: on walk
start, fetch parks within 3 km once and hold them in memory. Then proximity is
arithmetic on each accepted point — no request per fix, no continuous stream of
the user's position to the server.

Within 150 m of a park, show the suggestion card. **Never check in
automatically** (§25) — the card offers `I'M HERE` and nothing happens until it
is tapped. Suppress the card for a park the user has already dismissed during
this walk, so a bench next to a park does not produce a nagging loop.

## What leaves the device, and what does not

| Data | Leaves the device? | Precision |
|---|---|---|
| Accepted route points, own walk | Yes, to the owner's own walk | Full |
| Route shown to anyone else | Only if the walk is shared | Coarsened; first and last 200 m removed |
| Current position | **Never stored as a live field** | — |
| Park check-in | Yes | The *park's* coordinates, not the user's |
| Moment location | Park reference only | No coordinates |

The third row is the important one. §17 forbids exposing continuous live
movement. MIPO therefore has **no "current location" column anywhere**. Presence
is expressed only as a check-in at a park — a deliberate, revocable act — which
is exactly the model §25 and §26 describe. Nothing in the schema can leak a live
position because nothing in the schema holds one.

## Retention

Raw points are the sensitive part; the aggregate is not.

| Data | Kept | Then |
|---|---|---|
| `walk_route_points` | 90 days | Deleted. |
| Walk distance, duration, timestamps | Indefinitely | The Timeline needs it. |
| Coarsened polyline (~50 points) | Indefinitely | Computed at completion, so the map still draws after the raw points are gone. |
| Closed check-ins | 12 months | Then reduced to a count. |
| Expired reports | 7 days | Deleted. |

A daily job enforces this. It has to exist from the first release — the point of
a retention policy is that it runs before anyone has to think about it, and
retrofitting one means deleting data users already gave you.

## Battery

High-accuracy GPS with the screen on is the dominant cost, and there is no way
around it for route tracking. What can be controlled:

- One `watchPosition` for the whole app, never one per component.
- Release the watch the instant the walk ends. A leaked watcher is a battery
  complaint that will be blamed on the map.
- No network request per fix — batching is a battery decision as much as a
  server one.
- Do not run high accuracy for the Map when no walk is active; a single
  `getCurrentPosition` is enough to centre it.

## Platform limits, stated plainly

| | Web / PWA (today) | Native (Capacitor, later) |
|---|---|---|
| Foreground GPS | ✅ | ✅ |
| Background GPS, screen locked | ❌ **Not possible** | ✅ with permission |
| Step count (HealthKit / Health Connect) | ❌ Not reachable | ✅ with permission |
| Wake lock | ⚠️ Where supported | ✅ |
| Push while closed | ⚠️ Android; iOS only for an installed PWA | ✅ |
| Offline map tiles | Depends entirely on the provider | Depends on the provider |

These are the constraints the MVP is designed around, not obstacles to be
engineered past. §77 requires saying so rather than promising capability that
does not exist.

## Testing

- **Pure logic** — filtering, distance, proximity, gap handling — is a module
  with no browser dependency, tested with recorded fixture tracks including a
  noisy stationary one, a tunnel gap and a backgrounded walk. This is where the
  correctness of every number in the summary is established.
- **Browser behaviour** — Playwright supports geolocation emulation and
  permission grants/denials, currently unused in this repository. The permission
  states, the denied path and the nearby-park card are all testable that way.
