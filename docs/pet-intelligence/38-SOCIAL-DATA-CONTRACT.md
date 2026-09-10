# 38 — Social Data Contract

## What exists

| Table | Cols | Note |
|---|---|---|
| `social_posts` | 16 | **carries both `user_id` (NOT NULL) and `pet_id` (nullable)** |
| `social_post_reactions` | post_id, user_id, reaction, created_at | |
| `social_post_comments` | id, post_id, user_id, parent_id, body, status, created_at, updated_at | threaded |
| `social_post_saves` | post_id, user_id, created_at | |
| `social_poll_votes` | post_id, user_id, option_index, created_at | |
| `content_reports` | content_type, content_id, reason, reporter_id, status | collected, never reviewed |

Visibility is enforced **in SQL**, on both list and single reads:

```sql
where post.archived = false
  and post.moderation_status = 'published'
  and (post.visibility = 'public' or post.user_id = $1)
```

A private post is unreachable by id, not merely hidden from a list. That is the
right shape and it is what a `friends` tier extends — one predicate, not a second
feed.

`createSocialPost` verifies the `upload_id` belongs to the caller **and** the
`pet_id` belongs to the caller and is not archived, before inserting.

### What is missing
Follows, pet friendships, encounters, DMs, stories, live, public profiles,
favourite parks. Every one of those has a client route reserved and redirecting
(`src/routes/index.tsx`) — the honest record of scope.

---

## §14 — The four relationship types, never merged

The brief's instruction is the design's spine:

> **Never merge owner friendship and pet friendship into one relationship.**

| Type | Between | Symmetric | Consent | Table |
|---|---|---|---|---|
| **Owner connection** | user ↔ user | asymmetric (follow) or symmetric (friend) | one-way or mutual | `follows` |
| **Pet friendship** | pet ↔ pet | symmetric | **both owners** | `pet_friendships` |
| **Pet encounter** | pet ↔ pet, at a time and place | symmetric | none — it is an observation | `pet_encounters` (OBSERVATION) |
| **Pet observation** | about one pet | — | — | `pet_observations` (`41`) |

### Why they cannot be one thing

- Two owners can be friends whose pets have never met, and should not be
  presented as pet friends.
- Two pets can be park regulars whose owners have never exchanged a word.
  **An encounter is not a friendship**; promoting it to one is exactly the kind
  of inference `45` forbids.
- An owner connection carries a person's privacy; a pet friendship carries an
  animal's social profile. Different consent, different visibility, different
  deletion semantics.

```
follows            follower_user_id, followee_user_id, status, created_at
pet_friendships    pet_a_id, pet_b_id, status(pending|accepted|blocked),
                   requested_by_user_id, created_at, accepted_at
                   -- both owners must accept
pet_encounters     pet_a_id, pet_b_id, occurred_at, context(park|walk|moment),
                   context_id, source(USER_CONFIRMED|CHECKIN_OVERLAP)
                   -- an OBSERVATION, not a relationship
```

`CHECKIN_OVERLAP` is a **suggestion**, not a record. Two pets checked into the
same park in the same hour may never have met. It surfaces as "were Blue and Luna
together?" and becomes an encounter only when someone says yes.

---

## Pet-level social data

| Item | Category | Storage | Status |
|---|---|---|---|
| Pet Moments | EVENT + content | `social_posts` where `pet_id = …` | ✅ exists |
| Pet friends | RELATIONSHIP | `pet_friendships` | `MISSING` |
| Pet encounters | OBSERVATION | `pet_encounters` | `MISSING`, needs `37` |
| Favourite parks | FACT (derived) | `preference.favorite_park` | `MISSING`, needs `37` |
| Social activity level | DERIVED | computed from Moments + encounters | `MISSING` |
| Social preferences | FACT | `behavior.sociability_animals` (`35`) | `MISSING` |

**Moments already carry a pet.** `social_posts.pet_id` exists and is
ownership-verified on write. That is the foundation for pet-level social and it
needs no redesign.

---

## The orphan case

`social_posts.pet_id` is `ON DELETE SET NULL` — verified. Deleting a pet leaves
its Moments alive and detached. The feed handles it (`left join pet`), but what
the card should say is undefined.

Decision needed (`53`): does a Moment survive its pet, and if so does it say
"בלו" from a snapshot, or nothing? My recommendation: keep the Moment, snapshot
the pet's name and avatar onto the post at creation, and render the snapshot when
the pet is gone. A memorial that says nothing is worse than one that says a name.

---

## Privacy

| Data | Class | Rule |
|---|---|---|
| Public Moment | `SOCIAL` | visible to any signed-in viewer |
| Private Moment | `PRIVATE` | owner only, enforced in SQL |
| Pet friendship | `SOCIAL` | visible to both owners; not public |
| Encounter | `PRIVATE` | **owner only** — it reveals co-location |
| Favourite park | `PRIVATE` | reveals routine and, over time, home area |
| Moment `location` | `SOCIAL` | free text the owner typed |
| **Photo EXIF** | **PRIVATE, and currently leaking** | see below |

### The EXIF leak
User uploads are written byte-for-byte (`uploadDataUrlFile`), so GPS EXIF
survives into `/uploads/` and is served to every viewer of a public Moment.
Meanwhile `profiles` offers `location_blur_enabled` and `show_location`, and the
Caddy `Permissions-Policy` restricts geolocation to self. The intent is clear and
the images undo it.

`imagePipeline.js` already strips and re-encodes — for product images only.
Extending it to user media fixes this in one place.

### Never
- A health fact in a Moment, a feed, or any social surface.
- An encounter visible to anyone but the two owners.
- A `friends` visibility tier before `pet_friendships`/`follows` exist — it is a
  promise the query cannot keep.
- Coordinates in any response another user can read.

---

## What social contributes to Pet Intelligence

```
Moment created           → timeline entry; a photo, not a fact
Encounter confirmed      → OBSERVATION; may raise behavior.sociability_animals
                           to MEDIUM after several
Park visits              → preference.favorite_park after 3+, spaced
Moment count over time   → social activity, a DERIVED value
```

**A Moment is not evidence about the animal.** A photo of a dog on a beach does
not make "likes water" a fact. AI reading Moments produces `AI_INFERRED`
suggestions at LOW confidence with a 60-day half-life (`44`) — never a
clinical or behavioural assertion.

## Gaps

| Gap | Status |
|---|---|
| No relationship model of any kind | `MISSING` — blocks friends-tier visibility and "who's here" |
| Encounters | `MISSING`, blocked on `37` |
| `content_reports` never reviewed | no admin route or screen reads them |
| EXIF on user uploads | `MISSING` control — the concrete location leak |
| Moment orphaned by pet deletion | undefined behaviour |
| Blocking | `profiles.blocked_at/by/reason` exist; nothing sets or reads them |
