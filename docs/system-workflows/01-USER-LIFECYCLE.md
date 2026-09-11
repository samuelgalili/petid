# 01 — User Lifecycle

## The lifecycle as built

```
DISCOVERY  →  SIGN UP  →  EMAIL VERIFY  →  ONBOARDING  →  PET  →  HOME
                                                            │
                            ┌───────────────────────────────┼──────────────┐
                            │                               │              │
                        DOCUMENTS                        SOCIAL          STORE
                        HEALTH                           MOMENTS         ORDERS
                            │                               │              │
                            └───────────────┬───────────────┘              │
                                            │                              │
                                     outbox_events ──────────────────────► (webhook)
                                            │
                                       MIPO AI (chat)
```

`CREATE / JOIN ORGANIZATION` is not in that chain. See §Tenancy below.

---

## Stage by stage

### DISCOVERY — `UNKNOWN`
Nothing in the repository records acquisition. There is no attribution
parameter, no referral table, no analytics event. `/install` exists as a PWA
install-prompt page (`src/pages/Install.tsx`).

### SIGN UP — `EXISTS`
`POST /api/auth/signup` (`server/src/index.js:7608`), rate-limited, public.
Creates `app_users` + `profiles` in one transaction, emits
`EVENT_TYPES.USER_REGISTERED` into `outbox_events`.

Fields captured: email, password, and optionally full name / phone. Terms
acceptance is stored on `app_users.terms_accepted_at` + `terms_version`
(migration `0023`).

Password: hashed by `server/src/passwords.js`. Sessions: an opaque 32-byte
token, SHA-256 hashed into `user_sessions`, delivered as an httpOnly cookie.

### AUTHENTICATION — `EXISTS`
`POST /api/auth/login` → cookie. `GET /api/auth/me` returns the user, the
profile, and `is_admin` (a second, independent admin cookie is checked so the
app can show the panel shortcut without a second round trip —
`server/src/index.js:7685`).

Two identity systems coexist deliberately: `app_users` (customers) and
`admin_users` (staff). They are separate tables, separate cookies, separate
session tables. This is a strength, not a duplication.

`app_users.legacy_auth_provider` / `legacy_user_id` and the table
`profiles_identity_snapshot` are the remains of a Supabase→AWS identity
migration (`0011`, `0018`, `0019`). Status: `EXISTS`, migration complete.

### EMAIL VERIFICATION — `EXISTS`
`email_verification_otps` (migration `0024`), Resend delivery, 24-hour window,
60-second resend throttle. `/verify-email` is deliberately an unauthenticated
route because the link is opened wherever the mail is read
(`src/routes/index.tsx:70`).

**Enforced at exactly one point, deliberately.** `createOrder`
(`server/src/index.js:5648`) rejects an order from a signed-in user whose
`email_verified_at` is null, with `403 email_verification_required`. The code
says why: an order sends a confirmation, an invoice and delivery updates to the
account's address, so that is the point where the address has to be proven.
Guest checkout is untouched — it has no account to protect and enters its
address per order.

No other route requires verification. That is a defensible choice, not an
oversight, but it does mean a user can sign up, add pets, upload documents and
post Moments on an unverified address.

### ONBOARDING — `EXISTS`, minimal
See `02-ONBOARDING.md`. Five steps, four questions.

### CREATE / JOIN ORGANIZATION — `MISSING`
There is no tenant model. Specifically:

- No `organizations` table, no `memberships`, no `tenant_id` on any table.
- `business_profiles` (25 columns) exists and `business_products.business_id`
  points at it — but the API only ever uses one, via `DEFAULT_BUSINESS_ID`
  (`deploy/aws/sync-ssm-env.sh` REQUIRED_KEYS). It is a single-tenant catalogue
  with a multi-tenant-shaped key.
- Every client route about businesses is a redirect:
  `/businesses`, `/business/:id`, `/convert-to-business`, `/business-crm`,
  `/creator-dashboard` (`src/routes/index.tsx:165-180`).

**Isolation model today: per-user, not per-tenant.** Every ownership check is
`where user_id = $1`. That is correct for what exists and would have to change
wholesale to support organizations.

### CREATE PET → PET PROFILE → PET DATA → HOME
See `03-PET-LIFECYCLE.md` and `04-PET-360.md`.

### CONTINUOUS PET LIFECYCLE — `PARTIALLY IMPLEMENTED`
Pets can be archived (`pets.archived`, `archived_at`) and marked lost
(`is_lost`, `lost_since`, plus five lost-poster fields). There is **no
`deceased` state** — the string does not appear anywhere in `src/` or
`server/src/`. See `22-STATE-MACHINES.md`.

### MIPO INTELLIGENCE — `PARTIALLY IMPLEMENTED`
The chat assistant (`POST /api/ai/chat`) is the only user-facing intelligence.
It is pet-aware in the prompt and resolves product suggestions against the
catalogue. There is no insight store, no pattern detection, no prediction.

---

## Account termination

### Export — `NEEDS EXTENSION`
`GET /api/me/export` → `exportMyData` (`server/src/index.js:5876`) returns
profile, pets (including archived), documents, insurance claims, service
bookings, notifications, orders, vet visits, vaccinations, and pet-character
metadata.

**It omits:** `social_posts`, `social_post_comments`, `social_post_reactions`,
`social_post_saves`, `social_poll_votes`, `user_uploads`, `content_reports`,
`shipping_profiles`, `customer_notes`. For a data-subject request that is
incomplete.

### Deletion — `EXISTS`
`DELETE /api/me/account` → `deleteMyAccount` (`server/src/index.js:5937`):
exports first, then deletes document files, upload files and character files
from disk, then in one transaction **anonymises orders** (`user_id = null`,
`customer_name = 'Deleted user'`, email cleared) rather than deleting them —
correct, because orders are financial records — and deletes `shop_customers`.
The `app_users` row goes, and 14 tables cascade from it.

Retention policy beyond this: `UNKNOWN`. No scheduled purge exists.

---

## Failure paths

| Failure | Behaviour | Status |
|---|---|---|
| Duplicate email at signup | Rejected | `EXISTS` |
| Wrong password | Generic 401, rate-limited per IP | `EXISTS` |
| Session expired | 401; client redirects to `/auth` via `ProtectedRoute` | `EXISTS` |
| Email provider down | `sendEmail` returns `{sent:false, reason:"not_configured"}` and the signup still succeeds (`server/src/index.js:1194`) | `EXISTS` |
| Password reset for unknown email | Same response as a known one | `EXISTS` |
| Account locked / suspended | `app_users.is_active` + `profiles.blocked_at/blocked_by/blocked_reason` exist. No admin route sets them. | `PARTIALLY IMPLEMENTED` |
