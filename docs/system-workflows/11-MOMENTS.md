# 11 — Moments

## The flow as built — `EXISTS`

```
Capture / pick media
        │
POST /api/me/social/uploads          requireUser + rate limit (12/hour)
        │
decodeAndValidateDataUrl()           magic bytes; image/* and video/* allowed
        │
write to UPLOAD_DIR, insert user_uploads
        │
        ▼  returns upload.id
POST /api/feed/posts                 requireUser
        │
  verify upload_id belongs to caller
  verify pet_id belongs to caller and is not archived
        │
insert social_posts
        │
appears in GET /api/feed
```

Two upload routes exist and are distinct on purpose:
`/api/me/uploads` (general, `MAX_UPLOAD_BYTES`, default 5 MiB) and
`/api/me/social/uploads` (`maxSocialUploadBytes`, its own rate limit of 12 per
hour). Video is allowed on the social path.

### What a Moment carries
```
caption · location (free text) · media (image|video) · visibility (public|private)
allow_comments · poll_question + poll_options[] · pet_id (optional) · published_at
```

Reactions, threaded comments, saves and polls all work. The feed renders as a
full-screen vertical reel (`src/components/moments/MomentReel.tsx`).

---

## Against the requested workflow

| Step | Status |
|---|---|
| Capture photo / video | `EXISTS` |
| Attach pet | `EXISTS` — optional, ownership-verified |
| Attach walk | `MISSING` — no walk exists (`08`) |
| Attach park | `MISSING` — no check-in exists (`09`) |
| Timestamp | `EXISTS` — `published_at`, server-set |
| Media processing | `MISSING` for user media |
| AI metadata | `MISSING` |
| User confirmation | `EXISTS` — the compose screen is the confirmation |
| Privacy | `PARTIALLY IMPLEMENTED` — two tiers only |
| Publish / save | `EXISTS` |
| Social | `EXISTS` |
| Timeline | `MISSING` — no pet timeline exists |

### Media processing: the asymmetry worth fixing

`server/src/imagePipeline.js` is a well-built normalizer — one canvas
(1200×1200 @ q82 for product, 400×400 @ q78 for thumbnail), one format, stored
by us, with the original always kept. **It is used only for product images.**

User media goes to disk exactly as uploaded: no resize, no re-encode, no
thumbnail, no stripping. Consequences:

1. **EXIF survives**, including GPS coordinates, on every user photo. The feed
   serves the raw file from `/uploads/`. That is a location disclosure the
   privacy model never agreed to — see `20-PRIVACY-WORKFLOWS.md`. It is the
   most concrete privacy finding in this audit.
2. No thumbnails, so the reel downloads full-resolution originals.
3. A 5 MiB HEIC from an iPhone is served as-is to every viewer.

`normalizeProductImage` already does everything needed. Extending it to user
uploads is a small change with a large payoff, and it is listed as P1 in `30`.

### `location` is a free-text string
`social_posts.location TEXT`. It is typed by the user, not resolved, not
geocoded, not linked to `dog_parks`. It is a caption, not a place. Once `09`
exists this should become a nullable `park_id` alongside the string.

---

## AI metadata (PROPOSED)

The brief asks for AI metadata on Moments and for inference to be explicitly
marked as inferred. Where that would go:

```
social_post_ai_metadata
  post_id, kind(caption_suggestion|alt_text|scene_tags|safety),
  value(jsonb), confidence, ai_request_id → ai_requests,
  status(suggested|accepted|rejected), created_at
```

Two rules, both drawn from precedents already in this codebase:

1. **Suggested, never applied.** The pattern in
   `server/src/catalogRecommendations.js` — treat the model's output as a
   proposal that a trusted source has to confirm — applies unchanged here.
2. **Marked as inferred wherever it is shown.** An AI-written caption presented
   as the owner's is a misattribution, not a feature.

Alt text is the one case worth auto-applying: it is an accessibility
improvement, it is visible to the owner, and being wrong is recoverable.
`src/pages/Accessibility.tsx` and `AccessibilityContext` already exist, so
there is an owner for that decision.

---

## Failure paths

| Case | Behaviour today |
|---|---|
| Upload too large | 413 from `decodeAndValidateDataUrl`; body limit is `1.5×` the max so an oversized request is rejected before buffering the whole thing |
| Wrong file type | 415, checked by magic bytes not by the declared MIME |
| Rate limit hit | 429 after 12 social uploads in an hour |
| Upload succeeds, post fails | **Orphaned `user_uploads` row and file.** No cleanup exists. |
| Someone else's `upload_id` | 404 — verified against `user_id` |
| Someone else's `pet_id` | 404 — verified |
| Post deleted | Row deleted; **the `user_uploads` row and the file on disk remain**. No reference counting. |

The two orphan cases are the same underlying gap: media has no lifecycle of its
own. Disk on the single EC2 host is finite, and nothing reclaims it. Noted in
`21` and `29`.
