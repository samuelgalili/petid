# Privacy model — MIPO Activity Network

The Activity Network changes what MIPO knows about people. Today the most
sensitive thing stored is a pet's medical notes. Walks add where a person is,
when they are there, and — because dog walks start at home and repeat daily —
where they live and when they are out.

§46 says server-side authorization is mandatory and frontend settings are never
to be trusted. This document defines the rules; the point is that they are
enforced in one place rather than restated in twenty routes.

---

## Data classification

| Class | Data | Rule |
|---|---|---|
| **PUBLIC** | Park name and coordinates, aggregate park activity | Anyone, including logged out |
| **SOCIAL** | Pet profile, public Moments, check-ins with `visibility='public'` | Per the viewer's relationship |
| **PRIVATE** | Walks, route points, private Moments, the pet's timeline | Owner only unless shared |
| **SENSITIVE** | Raw GPS points, route start and end, home context | Owner only. Never shared at full precision, ever |

The fourth row admits no exception. A route the owner deliberately shares is
still published coarsened, with its ends removed — because the owner is
consenting to share a walk, not to publish their front door.

---

## Visibility, and the one place it is decided

Four levels, matching §45:

- **PRIVATE** — owner only. The default for walks and route points.
- **FOLLOWERS** — accepted followers only.
- **PUBLIC** — any signed-in user.
- **INVISIBLE** — a user-level mode, not a per-object level. See below.

Every Activity read passes through a single resolver:

```
canView(viewer, object) →
  object.owner == viewer                      → yes
  viewer is admin with an audited reason      → yes
  owner is INVISIBLE and object is presence   → no
  object.visibility == 'public'               → yes
  object.visibility == 'followers'
        and viewer follows owner              → yes
  otherwise                                   → no
```

`server/src/visibility.js`, unit-tested, called by every list and every fetch.
The reason to insist on one function: the existing codebase checks ownership
inline per route, ninety-nine times. That is survivable for orders. For a table
that holds where someone walks their dog every morning at 07:10, one forgotten
check is a different kind of failure.

**Filter in SQL, not after.** The visibility predicate belongs in the `where`
clause. Fetching rows and filtering in JavaScript makes pagination lie — page 1
returns three rows and page 2 returns eleven — and eventually someone returns
the unfiltered list by mistake.

---

## Invisible mode

§45 requires that an invisible user keep the whole product. So invisibility
suppresses **presence**, not function.

Invisible, the user can still: walk, record routes, use the map, view parks,
check in (privately, for their own timeline), create private Moments, and see
their pet's history.

Invisible, the user does not appear in: "Who's Here", live park counts, friends'
activity, or any nearby-pets surface.

Two properties this must have, and both are easy to get wrong:

**It applies to the aggregate as well as the list.** If a park shows "12 dogs
here" and an invisible user is one of them, the count must say 11. Otherwise
"Who's Here" lists 11 names beside a count of 12 and the mode leaks by
subtraction.

**It applies retroactively while it is on.** Turning invisibility on hides
presence created before it was enabled; turning it off does not resurrect past
presence into live surfaces. Presence is evaluated at read time against the
owner's current mode.

---

## Location privacy rules

1. **No live position is ever stored.** There is no "current location" column in
   the data model, by design. Presence exists only as a check-in at a park — a
   deliberate act, tied to the *park's* coordinates, never the user's.
2. **Route ends are removed before sharing.** The first and last 200 m of any
   shared route are dropped. A dog walk starts and ends at the front door.
3. **Shared routes are coarsened.** Roughly 50 points, not thousands. Enough to
   see the shape, not enough to place someone at a moment in time.
4. **Raw points expire.** 90 days, then deleted; the walk keeps its distance,
   duration and coarsened line. See LOCATION-ARCHITECTURE.md.
5. **Proximity is computed on the device.** Park detection runs client-side
   against a pre-fetched list, so MIPO does not receive a stream of the user's
   position in order to tell them a park is nearby.
6. **Check-ins expire.** `expires_at`, three hours by default. Nobody stays at a
   park forever because they closed the app.

---

## Media

Private media must not be reachable by URL alone.

Today `/uploads/*` is served by Caddy off local disk, and `private-uploads/`
sits behind the API with a `chmod 700` directory. Storage keys are random, but
an unguessable URL is not authorization: it is permanent, it is shareable, and
it survives the post being deleted or made private.

For Activity media the rule is: a Moment's media inherits the Moment's
visibility, checked server-side on every request. When media moves to S3 —
TECHNICAL-RISKS.md risk 2 — that becomes a short-lived signed URL minted per
authorized request, which is also what §58 asks for. Until then, private media
must be served through the API, not by the static file server.

---

## AI boundary

§62 in the earlier specification: the model receives only what the requesting
user is already authorized to see. Concretely, for Activity:

- The `canView` resolver runs **before** context is assembled, not after.
- Ask Mipo about a park receives: the park, its public reports, and aggregate
  counts. Never the list of who is there, even if the asker can see that list —
  it is not needed to answer the question.
- Ask Mipo about another pet receives that pet's *public* profile only. Not its
  owner's walks, not its routes, not its health record.
- Ask Mipo about your own pet may receive your own data, because it is yours.
- Captions, comments and park notes are user-written text and are untrusted
  input to the model. They are data, never instructions.

And the rule that already has code behind it: a product shown in any Activity
surface comes from `catalogRecommendations.js`, resolved against the catalogue.
The model never supplies a price, a SKU, or availability.

---

## Deletion

§71 of the earlier specification requires real deletion. What must happen when a
user deletes a walk, a pet, or their account:

| Deleted | Cascades to | Notes |
|---|---|---|
| Walk | Route points | Moments **survive**, with `walk_id` set to null. The photographs are the memory. |
| Check-in | — | Removed from history and from any aggregate count. |
| Pet | Its attributes, friendships, timeline | Moments survive with `pet_id` null, unless the owner asks otherwise. |
| Account | Everything above, plus follows | Media files must be unlinked from disk, not only from the database. |

The one honest caveat, which must appear in any user-facing wording: database
backups retain deleted rows until the backup itself expires. Never claim
immediate deletion from backups. Say what is true — removed from the product
immediately, gone from backups within the backup retention window.

---

## What is out of scope, and why

**Multi-tenant isolation.** MIPO has no organizations table and no second
tenant; `organization_id` exists as a nullable column on three AI ledger tables
and nothing else. Writing "tenant-aware" queries against a structure that does
not exist produces the appearance of isolation with none of the substance. If
MIPO gains organizations, tenancy is designed then, against something real.

---

## Tests that must exist before this ships

Not a wish list. These are the cases where a bug is a privacy incident:

- A user cannot read another user's walk, route points, or private Moment by
  changing an id in the URL — one test per Activity resource (IDOR).
- An invisible user does not appear in "Who's Here" **and is not counted** in
  the park's total.
- An expired check-in disappears from live presence with no job having run.
- A shared route omits its first and last 200 m and is returned coarsened.
- A follower-only Moment is invisible to a non-follower, and becomes visible
  when the follow is accepted.
- Ask Mipo about a park returns no answer that names who is present.
- Deleting a walk keeps its Moments and removes its route points.
