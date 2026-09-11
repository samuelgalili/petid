# 20 — Privacy Workflows

## Consent and visibility primitives that exist — `EXISTS`

On `profiles`:

| Column | Purpose |
|---|---|
| `profile_visibility` | `public` \| `private` (normalised in code: anything not `"public"` is private) |
| `show_location` | gates city disclosure |
| `show_email` | |
| `show_activity_status` | gates presence |
| `location_blur_enabled` | |
| `allow_messages_from` | messaging audience (no messaging exists) |
| `quiet_mode_until` | |
| `ai_consent_given`, `ai_consent_date` | AI processing consent |
| `marketing_consent`, `marketing_consent_date`, `consent_method`, `marketing_unsubscribed_at` | marketing, with a `marketing_opt_out_log` audit table |
| `id_number_last4`, `id_number_encrypted` | the encrypted-column precedent |

On `app_users`: `terms_accepted_at`, `terms_version` (migration `0023`).
On `pet_characters`: `consented_at NOT NULL` — photo-processing consent is
required at generation time and `startPetCharacterGeneration` rejects
`consent !== true` with a 400.

That is a genuinely careful consent surface for the features that exist.

## Where privacy is actually enforced

| Surface | Enforcement |
|---|---|
| Public pet page | Owner name only if the pet is lost **or** the profile is public. Phone only if lost **and** `lost_show_phone`. City only if (lost or public) **and** `show_location`. (`server/src/index.js:2040-2062`) |
| Feed | `(post.visibility = 'public' or post.user_id = $1)` in SQL, on both list and single-post reads |
| Presence | `show_activity_status` gates `last_active_at` |
| Documents | Private directory, `0600`, owner-only serve, `sandbox` header |
| Product responses | `toPublicProduct` allowlist hides the supplier origin |

Enforcement is server-side and in the query, which is the right place.

---

## Data classification (PROPOSED — none of this is labelled today)

| Class | Data | Handling required |
|---|---|---|
| **Special / health** | `pet_documents`, `pet_vet_visits`, `pet_vaccinations`, `insurance_claims`, `pets.medical_conditions`, `health_notes` | Explicit consent, minimum retention, no third-party sharing, no AI training use |
| **Identity** | `app_users.email/phone/birthdate`, `profiles.id_number_*` | Encrypted where it is an ID number; never in logs |
| **Location** | `profiles.city/street/house_number/postal_code`, `shipping_profiles`, `social_posts.location`, **photo EXIF** | Blur/precision controls; never exact home |
| **Financial** | `orders`, `order_items`, `cardcom_events` | Retained for accounting; card data never stored (CardCom hosted) |
| **Behavioural** | `usage_events`, `ai_requests`, presence | Aggregated for admin economics; `getTopCostUsers` is documented as data only, "not wired to any" enforcement |
| **Content** | Moments, comments, uploads | Visibility-controlled |

## Findings

### 1. Photo EXIF is the concrete location leak — `MISSING` control
User uploads are stored byte-for-byte (`uploadDataUrlFile`), so GPS EXIF
survives into `/uploads/`, which is served to any viewer of a public Moment.
Meanwhile the profile offers `location_blur_enabled` and `show_location`, and
`Permissions-Policy` restricts `geolocation` to self. The intent is clear and
the images undo it. `imagePipeline.js` already strips and re-encodes for
products; extending it to user media fixes this in one place.

### 2. `location_blur_enabled` and `allow_messages_from` are unread
Both columns exist. Neither appears in any server query. Settings a user can
change that do nothing are worse than absent settings.

### 3. Export is incomplete — `NEEDS EXTENSION`
`exportMyData` omits all social data (`social_posts`, comments, reactions,
saves, poll votes), `user_uploads`, `content_reports`, `shipping_profiles` and
`customer_notes`. A data-subject request answered with this export is
incomplete.

### 4. Deletion is well designed — `EXISTS`
`deleteMyAccount` exports first, deletes document/upload/character files from
disk, then in one transaction **anonymises orders** (`user_id = null`,
`customer_name = 'Deleted user'`, email/phone cleared) rather than deleting
them — the right call, since orders are financial records — and removes
`shop_customers` and `app_users`, cascading 14 tables.

Two gaps: **deleting a pet silently orphans its documents, bookings, claims and
Moments** (`pet_id` is `SET NULL` — see `03`); and `customer_notes.user_id`
cascades, so an admin's own notes about a person vanish with the account, which
may or may not be intended.

### 5. No retention policy — `MISSING`
Nothing expires. No purge job, no TTL on anything. `ai_requests`,
`usage_events`, `cost_events`, `outbox_events`, `admin_audit_log` and
`notifications` all grow without bound on a single host.

### 6. No DPA/processor register — `UNKNOWN`
Personal data leaves Mipo to: Google (Gemini — pet photos, document images,
chat), Resend (email addresses), CardCom (order and contact details),
Firecrawl (product URLs only). Whether agreements exist is not determinable
from this repository. `profiles.ai_consent_given` is the right hook for the
first of those.

### 7. AI consent is not checked — `PARTIALLY IMPLEMENTED`
`ai_consent_given` is stored. I found no read of it before an AI call. Pet
character generation has its own explicit consent gate, which is the pattern
the rest should follow.

---

## Privacy rules for what gets built next

Drawn from `08`–`11`, so they are decided before the code exists:

1. **Location resolves to a place, never a point.** A check-in returns a park;
   a Moment returns a park or a text label. Coordinates are never in a response
   another user can read.
2. **No automatic check-in.** GPS may suggest; the user confirms. Enforced
   server-side, not in the UI.
3. **Routes are private by default.** A walk route is a map of where someone
   lives. Sharing one is a separate, explicit act with its own consent.
4. **Strip EXIF on ingest.** Not on display — on ingest, so the stored file
   never carries it.
5. **`friends` visibility requires a relationship model.** Until `10` has one,
   offering a "friends only" option is a promise the query cannot keep.
6. **Health facts never leave the account.** Not to the feed, not to a
   recommendation another user can see, not into a shared insight.
