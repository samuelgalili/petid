# 10 — Social Workflows

## What exists — `EXISTS` and `REUSABLE`

`server/src/social.js` (12.9 KB) plus six tables and 10 routes. This is a real,
correctly built social core, and **nothing new should duplicate it**.

### Tables
| Table | Purpose |
|---|---|
| `social_posts` | The Moment. 16 cols incl. `visibility`, `moderation_status`, `allow_comments`, `poll_question`, `poll_options` |
| `social_post_reactions` | Likes (one per user per post) |
| `social_post_comments` | Threaded — `parent_id` self-references; `status` ∈ published/deleted/hidden |
| `social_post_saves` | Bookmarks |
| `social_poll_votes` | One vote per user per post |
| `content_reports` | Moderation reports |
| `user_uploads` | The media, referenced by `social_posts.upload_id` (`NOT NULL`) |

### Routes
```
GET    /api/feed                          list, cursor by published_at
POST   /api/feed/posts                    create
GET    /api/feed/posts/:id                read one
DELETE /api/feed/posts/:id                delete own
POST   /api/feed/posts/:id/reaction       like / unlike
POST   /api/feed/posts/:id/save           save / unsave
GET    /api/feed/posts/:id/comments       list
POST   /api/feed/posts/:id/comments       create
DELETE /api/feed/comments/:id             delete own
POST   /api/feed/posts/:id/poll           vote
POST   /api/reports                       report content (public, rate-limited)
GET    /api/profiles/:id/activity         presence
```
All except `/api/reports` require `requireUser`.

### Visibility is enforced in SQL, not in the client
```sql
where post.archived = false
  and post.moderation_status = 'published'
  and (post.visibility = 'public' or post.user_id = $1)
```
Applied identically in `listSocialFeed` and `getSocialPost`
(`server/src/social.js:128-131, 163-166`). A private post is unreachable by id,
not merely hidden from the list. That is the right shape.

### Ownership is verified before writing
`createSocialPost` checks that the `upload_id` belongs to the caller **and**
that the `pet_id` belongs to the caller and is not archived, before inserting
(`server/src/social.js:172-186`). An attacker cannot attach someone else's
media or someone else's pet to their own Moment.

### The feed UI
`src/components/moments/MomentReel.tsx` — a full-screen vertical reel
(snap scrolling, IntersectionObserver at 0.6, muted autoplay, blurred
`object-contain` backdrop). `src/pages/MipoFeed.tsx` is the page.
Pinned by `e2e/moment-reel.aws.spec.ts` (3 tests) and `critical.aws.spec.ts`.

---

## What is missing

| Concept | Status | Evidence |
|---|---|---|
| Follow / friend between owners | `MISSING` | no table, no route |
| Pet ↔ pet friendship | `MISSING` | |
| Encounters ("we met at the park") | `MISSING` | depends on `09` |
| Direct messages | `MISSING` | `/messages`, `/messages/:userId` → `/chat` |
| Stories / highlights | `MISSING` | `/story/:userId`, `/highlight/:id` → `/` |
| Live | `MISSING` | `/live`, `/live/:id`, `/live/:id/broadcast` → `/` |
| Explore / discovery ranking | `MISSING` | `/explore`, `/reels` → `/feed` |
| Public user profiles | `MISSING` | `/user/:id`, `/profile/:id` → `/feed` |
| Sharing outside the app | `MISSING` | |
| Blocking / muting | `PARTIALLY IMPLEMENTED` | `profiles.blocked_at/blocked_by/blocked_reason` exist; no route sets or reads them |
| Moderation queue | `PARTIALLY IMPLEMENTED` | `content_reports` is written; `moderation_status` exists; **no admin screen or route reviews them** |

The `<Navigate>` redirects are the honest record of scope: every one of these
had a route reserved and was cut.

---

## Two identities, one feed

A Moment carries **both** an owner (`user_id`, `NOT NULL`) and a pet
(`pet_id`, nullable, `ON DELETE SET NULL`). The feed already returns both,
joined from `profiles`, `app_users` and `pets`.

This is the foundation for the pet-identity social model in the brief and it
does not need redesigning. What is undecided:

| Question | Status |
|---|---|
| Does a user follow an owner, a pet, or both? | `REQUIRES PRODUCT DECISION` |
| Is a Moment attributed to the pet or the owner in the feed? | Currently both are shown |
| Multi-pet households: one feed identity or several? | `REQUIRES PRODUCT DECISION` |
| Can a pet_id be null on a Moment? | Yes today — an owner can post without a pet |

Once `pet_id` becomes `SET NULL` on pet deletion (it is — see `03`), a Moment
can end up with an owner and no pet. The feed handles it (`left join pet`), but
what the card should say in that case is undefined.

---

## What a relationship model would need (PROPOSED)

```
follows            follower_user_id, followee_user_id, created_at, status
pet_friendships    pet_a_id, pet_b_id, status(pending|accepted|blocked),
                   requested_by, created_at, accepted_at
blocks             user_id, blocked_user_id, created_at
```

Then `listSocialFeed`'s `where` gains a `friends` visibility tier:

```sql
(post.visibility = 'public'
 or post.user_id = $1
 or (post.visibility = 'friends' and exists (select 1 from follows …)))
```

That single predicate is the whole change on the read side, because the
existing query is already the enforcement point. **Do not build a second feed.**

### Feed ranking
Today: `order by published_at desc, id desc`. Chronological, cursor-paginated,
capped at 40. That is a correct and defensible v1. Any ranking work must keep
the cursor stable — a score-ordered feed with an offset cursor duplicates and
drops posts.

---

## Moderation gap

`content_reports` accepts reports from an unauthenticated, rate-limited
endpoint. `social_posts.moderation_status` can be `published`, `hidden` or
`review`. **Nothing sets it to `hidden` or `review`, and no admin screen lists
reports.** So reports are collected and never acted on. That is a real
compliance exposure, listed in `29`.
