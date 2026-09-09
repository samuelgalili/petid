# 03 — Pet Lifecycle

## Creation

`POST /api/me/pets` (`server/src/index.js:7934`, `requireUser`). Writes one row
to `pets` and emits `EVENT_TYPES.PET_CREATED`.

Two entry points: `src/pages/Onboarding.tsx` (4 fields) and
`src/pages/AddPet.tsx` (the full 1,480-line form). Both hit the same route.

## Read / update / delete

| Operation | Route | Guard |
|---|---|---|
| List | `GET /api/me/pets` | `requireUser`, filters `archived` |
| Read | `GET /api/me/pets/:id` | `requireUser` + `user_id` match |
| Update | `PATCH /api/me/pets/:id` | same |
| Delete | `DELETE /api/me/pets/:id` | same |
| Public | `GET /api/public/pets/:id` | none, rate-limited, privacy-filtered |
| QR scan | `POST /api/public/pets/:id/qr-scan` | none, rate-limited, emits `PET_QR_SCANNED` |

Ownership is enforced by `where user_id = $1` in every query, not by a
middleware. It is applied consistently — I checked each of the `requireUser`
routes — but it is a convention, not a mechanism. See `19-SECURITY-WORKFLOWS.md`.

---

## The 57 columns, grouped

Read from the live schema (`information_schema.columns` after applying all 33
migrations).

**Identity** — `id`, `user_id`, `name`, `type`, `breed`, `secondary_breed`,
`is_mixed`, `breed_confidence`, `color`, `avatar_url`, `theme_color`,
`microchip_number`

**Physical** — `weight`, `weight_unit`, `size`, `birth_date`, `age`, `gender`,
`is_neutered`

**Health** — `medical_conditions[]`, `health_notes`, `last_vet_visit`,
`next_vet_visit`, `current_food`

**Vet contact** — `vet_clinic`, `vet_clinic_name`, `vet_clinic_phone`,
`vet_clinic_address`, `vet_name`, `vet_phone` *(six columns for two facts —
see below)*

**Insurance** — `has_insurance`, `insurance_company`, `insurance_expiry_date`,
`insurance_policy_number`

**Israeli licensing** — `is_dangerous_breed`, `license_number`,
`license_conditions`, `license_expiry_date`, `license_renewal_date`

**Behaviour** — `personality_tags[]`, `favorite_activities[]`, `activities[]`

**Mood** — `current_mood`, `mood_score`, `mood_updated_at`

**Lost poster** — `is_lost`, `lost_since`, `lost_reward_text`,
`lost_temperament`, `lost_medication_note`, `lost_allergy_note`,
`lost_show_phone`, `lost_contact_phone`

**Lifecycle** — `archived`, `archived_at`, `created_at`, `updated_at`

### Normalization problems, stated plainly

| Problem | Evidence | Consequence |
|---|---|---|
| `age` **and** `birth_date` both stored | both columns exist | `age` is stale the day after it is written; two sources for one fact |
| Vet contact spread over 6 columns | `vet_clinic`, `vet_clinic_name`, `vet_clinic_phone`, `vet_clinic_address`, `vet_name`, `vet_phone` | No single clinic entity; `vet_clinic` vs `vet_clinic_name` is ambiguous |
| Three overlapping activity arrays | `personality_tags`, `favorite_activities`, `activities` | Unclear which is canonical |
| `weight` is scalar | one column | No weight trend, which is the single most useful health signal a pet app has |
| `current_mood` is scalar | `mood_score`, `mood_updated_at` | Mood history is overwritten |
| No provenance on any column | — | See `05-PET-KNOWLEDGE.md` |
| `size` stored, not derived | `pets.size` | Drifts from `weight` and `breed` |

None of these are urgent bugs. All of them are why a Pet 360 model cannot be
layered on `pets` without a companion facts table.

---

## Field classification

Format: `field → provenance class (as the brief defines them)`. **Today the
system stores none of these classes** — this column is the target, not the
present.

| Field | Type | Req | Target provenance | Editable | Historical? | Derived? |
|---|---|---|---|---|---|---|
| `name` | text | ✓ | USER_PROVIDED | ✓ | no | no |
| `type` | text (CHECK) | ✓ | USER_PROVIDED | ✓ | no | no |
| `breed` | text | | USER_PROVIDED / AI_INFERRED | ✓ | no | no |
| `breed_confidence` | int | | AI_INFERRED | system | no | ✓ |
| `birth_date` | date | | USER_PROVIDED / VET_DOCUMENT | ✓ | no | no |
| `age` | int | | **SYSTEM_DERIVED** | should not be stored | no | ✓ |
| life stage | *missing* | | SYSTEM_DERIVED | — | no | ✓ |
| `weight` | numeric | | USER_PROVIDED / VET_CONFIRMED | ✓ | **should be** | no |
| `size` | text | | SYSTEM_DERIVED | ✓ today | no | ✓ |
| `gender` | text | | USER_PROVIDED | ✓ | no | no |
| `is_neutered` | bool | | USER_PROVIDED / VET_DOCUMENT | ✓ | ✓ (has a date) | no |
| `medical_conditions[]` | text[] | | VET_DOCUMENT / USER_PROVIDED | ✓ | **should be** | no |
| allergies | *missing* | | VET_DOCUMENT / USER_PROVIDED | — | ✓ | no |
| `current_food` | text | | USER_PROVIDED / PURCHASE_DERIVED | ✓ | ✓ | no |
| activity level | *missing* | | ACTIVITY_DERIVED | — | ✓ | ✓ |
| preferences | *missing* | | PURCHASE_DERIVED / USER_PROVIDED | — | ✓ | ✓ |
| `microchip_number` | text | | USER_PROVIDED | ✓ | no | no |
| `is_lost` | bool | | USER_PROVIDED | ✓ | ✓ (`lost_since`) | no |

Privacy classification for each of these is in `20-PRIVACY-WORKFLOWS.md`.

---

## States

```
        ┌──────────┐   archive    ┌──────────┐
   ────►│  ACTIVE  │─────────────►│ ARCHIVED │
        └────┬─────┘◄─────────────└──────────┘
             │  restore
             │ mark lost / found
             ▼
        ┌──────────┐
        │   LOST   │   (a flag on ACTIVE, not a separate state)
        └──────────┘
             │ DELETE /api/me/pets/:id
             ▼
          (row gone, cascades)
```

`DECEASED` is `MISSING` — the word appears nowhere in `src/` or `server/src/`.
Recommendation and its consequences are in `22-STATE-MACHINES.md`.

## Deletion cascade

`deleteUserPet` (`server/src/index.js:2228`) is a bare
`delete from public.pets where id = $1 and user_id = $2`, plus removal of the
character image files from disk. No child rows are touched in application code,
so the database decides everything. Read from `pg_constraint` on the built
schema, and then **executed against it** to confirm:

| Child | On pet delete |
|---|---|
| `pet_characters` → `pet_character_assets` | `CASCADE` — gone |
| `pet_vaccinations` | `CASCADE` — gone |
| `pet_vet_visits` | `CASCADE` — gone |
| `pet_documents` | **`SET NULL`** — the document survives, detached |
| `pet_service_bookings` | **`SET NULL`** — survives, detached |
| `insurance_claims` | **`SET NULL`** — survives, detached |
| `social_posts` | **`SET NULL`** — the Moment survives, detached |

Confirmed empirically: inserting a user, a pet and a `pet_documents` row into
the migrated database and deleting the pet returns `DELETE 1` and leaves the
document with `pet_id = NULL`.

Status: `CONFLICTING`, and it is a real product question, not a bug report.
Deleting a pet today silently orphans that pet's medical documents, vet
bookings, insurance claims and Moments. They remain owned by the user and
readable through `GET /api/me/documents`, but nothing says which animal they
belong to any more, and nothing tells the owner that happened. Whether that is
"keep the records" or "the owner asked for it to be gone" has never been
decided. Journey P in `21-ERROR-RECOVERY.md` depends on the answer; it is
listed as a required product decision in `DECISIONS.md`.
