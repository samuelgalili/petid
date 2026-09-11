# 19 — Security Workflows

## Authorization model — `EXISTS`

Two independent identities, by design:

| | Customer | Staff |
|---|---|---|
| Table | `app_users` | `admin_users` |
| Sessions | `user_sessions` | `admin_sessions` |
| Cookie | user cookie | separate admin cookie |
| Guard | `requireUser` | `requireAdmin` / `requireAdminPermission` |

Sessions are **opaque random tokens**, SHA-256 hashed at rest, compared with
`timingSafeEqual` (`server/src/security.js:57-66`). No JWT, so revocation is a
delete. Good.

### Admin RBAC
`server/src/adminPermissions.js`: roles `admin` (`*`) and `product_manager`
(products read/create/update, asset upload, tool use — **no delete, no
full-access screens**). `requireAdminPermission` also blocks any action while
`must_change_password` is set. Enforced on both sides: the API guards each
route, and `src/routes/index.tsx` wraps each admin page with the matching
permission. Covered by `e2e/admin-rbac.aws.spec.ts` and
`server/test/adminPermissions.test.js`.

### The machine key
`requireAdmin` accepts `x-admin-api-key` matched with `secretsEqual` and grants
full `admin`. That is a static, non-rotatable, non-attributable credential —
its audit identity is the literal string `"api-key"`. Acceptable for a
provisioning path; it should not be used for anything routine, and it is the
one credential a Connectors page must never be able to read or replace.

## Object-level authorization (IDOR / BOLA)

Every `/api/me/...` handler carries `where user_id = $1`. I checked each of the
`requireUser` routes; the predicate is present consistently. Notable
verifications beyond the obvious:

| Surface | Check |
|---|---|
| `/uploads/:key` | Looks the key up in `pet_documents` first. If it is a document, the request **must** be authenticated and be the owner, and the file is served `isPrivate` + `sandbox`. Public media falls through. (`server/src/index.js:7480`) |
| `GET /api/orders/:ref` | `canAccessOrder` — session owner **or** a guest token verified with `timingSafeEqual` against a stored hash |
| `POST /api/feed/posts` | Verifies `upload_id` belongs to the caller **and** `pet_id` belongs to the caller and is not archived, before insert |
| `GET /api/public/pets/:id` | Filters by `profiles.profile_visibility`, `show_location`, and `is_lost`; the phone number is only returned when the pet is lost **and** `lost_show_phone` is set |
| `GET /api/products` | `isAdminRequest` decides shape; `toPublicProduct` allowlists fields so `image_source_url` and `image_adopted_at` never reach a shop response |

**Tenant isolation: N/A.** There is no tenant. Isolation is per-user. If
organizations are ever added, every one of these predicates changes.

## Transport and headers — `EXISTS`

From `deploy/aws/Caddyfile`:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self)
Content-Security-Policy: base-uri 'self'; object-src 'none'; frame-ancestors 'none'
X-Robots-Tag: {$MIPO_ROBOTS_POLICY:all}   ← staging sets noindex
```

**`X-Forwarded-For` is replaced, not appended.** Caddy's default appends the
peer to whatever the client sent; the API reads the header to pick a rate-limit
bucket and records it on session rows. Left at the default, a client could mint
a fresh bucket per request and the per-IP login limit would not exist. The
config fixes this with `header_up X-Forwarded-For {remote_host}` — and says
why.

The CSP is **partial**: it sets `base-uri`, `object-src` and `frame-ancestors`
but no `default-src`, `script-src` or `connect-src`. So it does not constrain
where scripts load from. Noted as `NEEDS EXTENSION`.

## Rate limiting — `EXISTS`

`FixedWindowRateLimiter` (in-memory, per process) with 18 named buckets:

```
userLogin 20/15m · signup 8/h · passwordResetRequest 5/h
emailVerificationRequest 6/h · orderCreate 20/10m · paymentCreate 20/10m
aiChat 30/h · petCharacterGeneration 3/24h · petCharacterPack 5/24h
mediaUpload 30/h · socialUpload 12/h · socialWrite 60/h
documentUpload 20/h · reportCreate 10/h · publicPetScan 60/h · …
```

Limitation: in-memory. One process today, so it works. It does not survive a
restart and would not be shared across replicas.

## Upload safety — `EXISTS`

`decodeAndValidateDataUrl` validates by **magic bytes**, not the declared MIME:
PDF `%PDF-`, PNG signature, WebP `RIFF`/`WEBP`, HEIC by ISO brand, MP4 vs MOV
by `ftyp` + `qt  `, and DOCX by requiring `[Content_Types].xml` and
`word/document.xml` while rejecting `vbaProject.bin`. Base64 padding is
validated before decoding. Private documents are written `0600` into a `0700`
directory.

`server/src/urlSafety.js` exists for outbound fetch (SSRF protection on
imports) and is unit-tested.

## Deployment security

- `.github/workflows/deploy-aws.yml` gate: reject tracked env files → npm audit
  (app + server) → server tests → lint → typecheck → import check → build → 60+
  Playwright tests → schema integration → **dry-run migration rehearsal on a
  restored `pg_dump` copy** → migrate → recreate → smoke test.
- Secrets live in AWS SSM Parameter Store and are fetched `--with-decryption`.
- Health check is `/api/health/schema`, not `/api/health`, so a container whose
  code and schema disagree fails the deploy rather than being declared healthy.

---

## Findings

| # | Finding | Severity | Evidence |
|---|---|---|---|
| 1 | **No admin 2FA.** A single password protects every order, customer and coupon. Branch `claude/admin-2fa` is written but unmerged, blocked on `SECRET_ENCRYPTION_KEY` not existing in SSM. | High | `sync-ssm-env.sh` key list |
| 2 | **`insurance_claims.owner_id_number` is plain text.** `profiles` stores an Israeli ID as `id_number_last4` + `id_number_encrypted`; `insurance_claims` does not follow that convention. | High | schema |
| 3 | **User uploads keep EXIF, including GPS.** `imagePipeline.js` normalises product images; user media is written byte-for-byte and served from `/uploads/`. Every Moment photo may carry the coordinates it was taken at. | High | `server/src/index.js:7235-7264` |
| 4 | **`content_reports` are never reviewed.** No admin route or screen reads them; `moderation_status` is never set to `hidden` or `review`. | Medium | route list |
| 5 | **CSP has no `script-src` / `default-src`.** | Medium | `Caddyfile:25` |
| 6 | **`ADMIN_API_KEY` is a static full-admin credential** with no rotation and no attribution. | Medium | `server/src/index.js:489` |
| 7 | **`ProtectedRoute` admits guests.** `if (!isAuthenticated && !isGuest) navigate("/auth")` — a guest reaches protected screens. The server still enforces auth on every route, so this is a UX affordance, not a bypass; but it means client-side "protected" is not a security boundary. | Low | `src/components/ProtectedRoute.tsx` |
| 8 | **Rate limiting is per-process and in-memory.** Fine for one container; a second replica halves every limit. | Low | `server/src/security.js:107` |
| 9 | **No account lockout.** `is_active` and `profiles.blocked_at` exist; nothing sets them. Login is rate-limited only. | Low | |
| 10 | **User media has no backup.** `backup-before-migrate.sh` dumps the database; `/opt/mipo/uploads` and `/opt/mipo/private-uploads` are bind mounts on one EC2 instance with no snapshot in the deploy scripts. | High (availability) | `deploy/aws/` |

Findings 1–3 and 10 are the ones worth acting on before new feature work.
