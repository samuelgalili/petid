# Onboarding — Current State Audit

Read-only. No code, migration, schema, API or UI was changed to produce this.
Every claim was read out of the repository at commit `901e991b`; anything that
could not be verified statically is marked `UNKNOWN`.

---

## 1. Executive Summary

A new user reaches a working home screen in **eight screens and at least twelve
network requests**, and the pet that exists at the end of it has **four fields**.

Seven findings define the current onboarding:

1. **There are two pet-creation flows and the short one is the one new users
   get.** `SignupForm` and `Auth` both send a new account to `/onboarding`,
   which collects **name, species, breed and a photo**. The seven-step
   `/add-pet` flow — which collects birth date, gender, neuter status,
   personality, activities and medical conditions — is only reachable *after*
   onboarding, for a second pet.

2. **The pet created by onboarding has no birth date.** Age is derived from
   `birth_date`, so a pet created through the real onboarding flow has no age,
   no life stage, no age-adjusted safety score and no puppy vaccine schedule —
   on day one, and until the owner finds the age chip buried in the pet
   dashboard's Info tab.

3. **The create path is narrower than the write allowlist, silently.**
   `normalizePetPayload` accepts 42 columns; `insertUserPet`'s `INSERT`
   statement lists **19**. Twenty-three accepted columns — `current_food`,
   `microchip_number`, the insurance and vet-clinic blocks, `last_vet_visit`,
   and every `lost_*` field — are **dropped without an error** if a client sends
   them at creation. Only `PATCH` can set them.

4. **A profile-completion sheet interrupts onboarding after five seconds.**
   `CompleteProfilePrompt` is mounted globally, fires on authentication, and
   asks for phone and city — **neither of which signup collects, so it is
   missing for every new user**. It also calls
   `navigator.geolocation.getCurrentPosition()`, so the browser's location
   permission dialog appears over the onboarding screen.

5. **Three AI-shaped features in `/add-pet` are stubs.** `detectBreed()` ignores
   its image argument, `searchBreeds()` returns `[]`, and `matchBreedInDB()`
   returns its input. The spinner ("מזהה גזע…"), the failure banner and the
   breed autocomplete are therefore unreachable, and `breed_confidence` is
   **always `null`** on create.

6. **The condition vocabulary written at onboarding is not the vocabulary read
   downstream.** Onboarding writes `gastrointestinal` and `renal`;
   `petSafetyScore` looks for `digestive` and `kidney`; `TopRecommendation`
   looks for `allergy` and never matches `allergies`. Of the nine condition keys
   onboarding can write, **two match the safety score and three light a
   recommendation circle**.

7. **Onboarding writes zero Pet Facts.** `insertUserPet` touches `pets` and
   nothing else. The 0039 backfill ran once against existing rows; a pet created
   today has **no row in `pet_facts` and none in `pet_observations`** — and
   because onboarding never asks for a weight, there would be nothing to write
   even if it did.

---

## 2. Current Onboarding Flow

### Entry points

| From | Code | Goes to |
|---|---|---|
| Signup succeeds | `SignupForm.tsx:97` | `/onboarding` |
| Already logged in, **has pets** | `Auth.tsx:19–21` | `/` (and sets `onboardingCompleted=true`) |
| Already logged in, **no pets**, `onboardingCompleted="true"` | `Auth.tsx:23–25` | `/` — home with no pet |
| Already logged in, **no pets**, flag absent | `Auth.tsx:27` | `/onboarding` |
| `getMyPets()` throws | `Auth.tsx:32` | `/onboarding` |
| Home with no active pet | `MipoHome.tsx:157` | **`/add-pet`**, not `/onboarding` |
| Pet dashboard "הוסף" tile | `Profile.tsx:311` | `/add-pet` |

The same effect exists on both `/auth` and `/signup` (`Signup.tsx:20–39`), so a
logged-in user who navigates back to either is routed onward.

### Is there more than one flow? Yes — three, of which two run.

| Flow | Route | Steps | Fields | Reachable |
|---|---|---|---|---|
| **A. First pet** | `/onboarding` | 5 phases (+ a `creating` overlay) | 4 | **YES — the default for every new account** |
| **B. Additional pet** | `/add-pet` | 7 steps | 13 | **YES — after onboarding** |
| C. `/add-pet?onboarding=true` | `/add-pet` | 8 steps (adds a welcome step and a rewards card) | 13 | **NO — `grep` finds no link that sets the parameter** |

### New user vs returning user

| | New | Returning |
|---|---|---|
| Lands on | `/onboarding` | `/` |
| Pet-type step | defaults to `dog`, no prior value | `petType` is already set from the active pet, so `/add-pet` step 1 passes validation with no interaction |
| Draft restore | none — `/onboarding` keeps no draft | `/add-pet` restores `addPetDraft` from `localStorage` |
| Profile prompt | fires (phone + city missing) | fires until dismissed, once per `sessionStorage` session per user |
| Email banner | shows (`email_verified === false`) | hidden once verified |

---

## 3. User Data

Collected by `SignupForm.tsx` → `useAuth().signUp` → `POST /api/auth/signup` →
`signupUser` (`server/src/index.js:975+`).

| # | Field | Screen | Required | Validation | API field | DB table.column |
|---|---|---|---|---|---|---|
| 1 | שם מלא | `/signup` | **yes** | zod: 2–100 chars, trimmed; server: ≥2 | `full_name` | `app_users.full_name` **and** split into `profiles.first_name` / `profiles.last_name` |
| 2 | תאריך לידה | `/signup` | **yes** | zod: a date, **≥13 years old**; input `min=1920-01-01`, `max=today` | `birthdate` | `app_users.birthdate` |
| 3 | אימייל | `/signup` | **yes** | zod email; server requires `@`; unique → 409 | `email` | `app_users.email` (unique) |
| 4 | סיסמה | `/signup` | **yes** | zod ≥8; server 8–256 | `password` | `app_users.password_hash` (hashed, `passwords.js`) |
| 5 | אימות סיסמה | `/signup` | **yes** | must equal password | — | **not sent, not stored** |
| 6 | תנאי שימוש (checkbox) | `/signup` | **yes** | server rejects 400 unless `accept_terms === true` | `accept_terms` | `app_users.terms_accepted_at = now()`, `app_users.terms_version = TERMS_VERSION` |
| — | טלפון | **not collected** | — | — | `phone` (accepted by `signUp` and the server) | would go to `app_users.phone` + `profiles.whatsapp_number` — **always `null`** |

**Six inputs, five stored.** `confirmPassword` is a client-side check only.

### Also written at signup, without the user typing it

`app_users.id` (uuid) · `is_active = true` · `created_at` · `updated_at` ·
`profiles.id` (= user id) · `profiles.first_name` / `last_name` (from
`splitFullName`) · `profiles.whatsapp_number` (= `phone` → null) ·
a `user_sessions` row (`createUserSession`) · an email-verification OTP
(`issueEmailVerification`, after commit, never allowed to fail the signup) ·
an outbox event `user.registered` with `marketing_consent: false`.

Signup also **claims guest commerce history**: any `shop_customers` row with the
same email and `user_id is null` is attached to the new account.

### `profiles` columns that stay empty after signup

`bio` · `avatar_url` · `street` · `city` · `id_number_last4` · `points` ·
`profile_visibility` · `show_location` · `show_email` · `allow_messages_from` ·
`favorite_breeds` · `location_blur_enabled`

`phone` and `city` being empty is what makes `CompleteProfilePrompt` fire (§11).
`profiles.points` is never read or written by any code in this repository.

---

## 4. Pet Data

### Flow A — `/onboarding`, the flow new users actually get

| UI label | Field | Type | Req. | API | DB table | DB column | Direct on `pets`? | Elsewhere | Becomes a Pet Fact? | Used later? |
|---|---|---|---|---|---|---|---|---|---|---|
| כלב / חתול | `petType` | `"dog" \| "cat"` | implicit — **defaults to `dog`** | `POST /api/me/pets` `type` + `pet_type` | `pets` | `type` | ✅ | `localStorage.petPreference` | **no** | everywhere |
| (camera tile) | `file` | `File` | no — "המשך בלי תמונה" | `POST /api/me/uploads` then `avatar_url` | `user_uploads` + disk, then `pets` | `avatar_url` | ✅ (the URL) | `user_uploads` row, id discarded | **no** | home, dashboard, feed |
| שם חיית המחמד | `name` | `string` (max 80) | **yes** — button disabled while empty | `POST /api/me/pets` `name` | `pets` | `name` | ✅ | — | **no** | everywhere |
| גזע | `breed` | `string` (max 120) | no | `POST /api/me/pets` `breed` | `pets` | `breed` | ✅ | — | **no** | dashboard, safety score, breed tips |

**Four fields. All four are stored. Nothing else is collected.**

Not collected by Flow A: birth date, gender, neuter status, weight,
personality, activities, medical conditions, health notes, `secondary_breed`,
`is_mixed`, microchip, insurance, vet clinic, food, colour.

### Flow B — `/add-pet`, the seven-step flow

| Step | UI label | Field | Type | Req. | Sent as | DB column | Direct on `pets`? | Pet Fact? | Used later? |
|---|---|---|---|---|---|---|---|---|---|
| 1 | חתול / כלב | `petType` (from `usePetPreference`) | `"dog"\|"cat"` | yes* | `type` | `type` | ✅ | no | everywhere |
| 2 | תמונת פרופיל | `imageFile` | `File` | no | `avatar_url` | `avatar_url` | ✅ | no | everywhere |
| 2 | שם חיית המחמד * | `formData.name` | `string` | **yes** | `name` | `name` | ✅ | no | everywhere |
| 2 | גזע | `formData.breed` | `string` | no | `breed` (merged) | `breed` | ✅ | no | dashboard, tips |
| 2 | מעורב? | `formData.is_mixed` | `boolean` | no | **not sent** | `is_mixed` | ❌ **discarded** | no | — |
| 2 | גזע משני | `formData.secondary_breed` | `string` | no | **not sent** — folded into `breed` as `"X + Y"` | `secondary_breed` | ❌ **discarded** | no | — |
| 3 | תאריך לידה | `formData.birthDate` | `Date` | no | `birth_date` | `birth_date` | ✅ | no | **age, life stage, safety score, vaccine schedule** |
| 3 | מין | `formData.gender` | `"male"\|"female"` | no | `gender` | `gender` | ✅ | no | Hebrew verb agreement on the home screen |
| 3 | מעוקר/מסורס? | `formData.is_neutered` | `"true"\|"false"` string → boolean | no — **defaults to `"false"`** | `is_neutered` | `is_neutered` | ✅ | no | health score, `calculateNrc` (unreachable) |
| 4 | אופי ואישיות | `personalityTags[]` | `string[]` (8 options) | no | `personality_tags` | `personality_tags text[]` | ✅ | no | dashboard chips, public pet |
| 5 | פעילויות / רמת פעילות | `activities[]` | `string[]` (6 dog / 5 cat) | no | `favorite_activities` | `favorite_activities` **and** `activities` | ✅ (both) | no | `serializePet` only |
| 6 | בעיה רפואית | `medicalConditions[]` | `string[]` (9 keys) | no | `medical_conditions` | `medical_conditions text[]` | ✅ | no | health score, safety score, recommendations |
| 6 | פרט/י את הבעיה | `otherConditionText` | `string` | no | `health_notes` | `health_notes` | ✅ | no | health score completion, vet PDF |
| — | (no UI) | `healthNotes` | `string` | — | `health_notes` (loses to `otherConditionText`) | — | — | no | — |
| — | (stub) | `breedConfidence` | `number \| null` | — | `breed_confidence` — **always `null`** | `breed_confidence` | ✅ but always null | no | `AddPet` badge only |

`*` step 1's guard is `petType !== null`, and `petType` comes from the **global**
`PetPreferenceContext`. For a returning user it is already set, so the step can
be swiped past without a choice and the previous pet's species is used.

### The nine medical-condition keys

`gastrointestinal` · `urinary` · `allergies` · `diabetic` · `renal` ·
`obesity` · `dermatosis` · `hairball` (cats only) · `other`

These are the values written to `pets.medical_conditions`. See §8 for what reads
them.

---

## 5. Step-by-Step Flow

### Flow A — the real new-user path

```
/signup                    SignupForm
   name · birthdate · email · password · confirm · accept terms
   POST /api/auth/signup
   → app_users + profiles + user_sessions + verification OTP + user.registered
   localStorage.removeItem("onboardingCompleted")
        ↓
/onboarding  phase "welcome"          (progress 1/5)
   sees:  logo, "תמונה אחת. חיים שלמים של דאגה."
   enters: nothing
   saves:  nothing
        ↓ "מתחילים"
/onboarding  phase "photo"            (2/5)
   sees:  dog/cat segmented control, a camera frame, "המשך בלי תמונה"
   enters: species (defaults to dog), optionally a photo
   saves:  localStorage.petPreference  ← chooseType() → setPetType()
   API:    none yet — the file is held in memory as a blob URL
        ↓ picking a file jumps straight to "reveal"
/onboarding  phase "reveal"           (3/5)
   sees:  the photo in a gradient ring, "כבר יש ביניכם חיבור"
   enters: nothing
        ↓ "המשך"
/onboarding  phase "details"          (4/5)
   sees:  the avatar, "איך קוראים לך?"
   enters: name (required, ≤80), breed (optional, ≤120)
        ↓ "יצירת הפרופיל"
/onboarding  phase "creating"         (4/5, pulsing)
   API 1:  POST /api/me/uploads      (only if a photo was chosen)
   API 2:  POST /api/me/pets         { name, type, pet_type, breed, avatar_url }
   saves:  localStorage.onboardingCompleted = "true"
           localStorage.activePetId = pet.id
   API 3:  refresh() → GET /api/auth/me + GET /api/me/pets
           (createMyPet has already dispatched "mipo:pets-changed", which
            triggers the same pair again — see §11)
        ↓
/onboarding  phase "success"          (5/5)
   sees:  the avatar with a tick, "ברוכים הבאים, <name>", confetti
        ↓ "כניסה לעולם של Mipo"  → navigate("/", { replace: true })
/            MipoHome
   API:    GET /api/me/pets/:id/health-summary   (useHomeAttention)
           GET /api/me/pets/:id/character        (usePetCharacter)
```

### Flow B — `/add-pet`

| Step | Title | User sees | User enters | Saved | API |
|---|---|---|---|---|---|
| 1 | מי מצטרף אלינו? | two species cards | species | `localStorage.petPreference`, `addPetDraft` | — |
| 2 | ספרו לנו על חיית המחמד | avatar circle, name, mixed toggle, breed field with a (dead) autocomplete | photo, name*, breed, mixed, secondary breed | draft | — |
| 3 | פרטים בסיסיים | calendar, gender select, neuter select | birth date, gender, neuter | draft | — |
| 4 | אופי ואישיות | 8 tag tiles | tags | draft | — |
| 5 | פעילויות אהובות | 6 dog / 5 cat options | activities | draft | — |
| 6 | מידע בריאותי | 8–9 condition chips + a textarea for "אחר" | conditions, free text | draft | — |
| 7 | הפרופיל מוכן | photo, name, **type, breed, gender, personality only** | — | — | `POST /me/uploads`, `POST /me/pets` |

The review screen at step 7 **does not show** the birth date, the neuter status,
the activities or the medical conditions. The owner confirms a summary that
omits everything clinical they just entered.

Draft autosave runs 1s after any change and writes the whole form —
**including `imagePreview`, a base64 data URL of the photo** — into
`localStorage.addPetDraft`.

---

## 6. Pet Creation

### Where

`createMyPet` (`src/lib/mipoApi.ts:884`) → `POST /api/me/pets`
(`server/src/index.js:8046`) → `insertUserPet` (`:1936`).

The route is `requireUser` only: **no rate limit, no cap on the number of pets,
and no email-verification requirement** (unlike `createOrder`, which returns
`403 email_verification_required`).

### Payload — Flow A

```json
{ "name": "…", "type": "dog", "pet_type": "dog", "breed": "…|null",
  "avatar_url": "…|null" }
```

### Payload — Flow B

```json
{ "name": "…", "type": "dog", "birth_date": "YYYY-MM-DD|null",
  "gender": "male|female|null", "breed": "…|null",
  "breed_confidence": null, "is_neutered": true|false,
  "avatar_url": "…", "personality_tags": [...]|null,
  "favorite_activities": [...]|null, "medical_conditions": [...]|null,
  "health_notes": "…|null" }
```

### Validation, in order

1. `normalizePetPayload(body)` — `name` non-empty after trim, else **400**;
   `type` ∈ `dog|cat|other`, else **400**. Everything else is optional.
2. `normalizeDateOnly` — any parseable date, **including a future one**.
   `AddPet`'s `<Calendar>` has no `disabled` prop, so a future birth date is
   selectable, accepted and stored. `calculatePetAge` then clamps to
   `0y 0m`. (The signup form validates the *human's* birthdate and rejects
   under-13; the pet's is unvalidated.)
3. `normalizeTextArray` — arrays of trimmed non-empty strings; **no element cap
   and no length cap**.
4. Database: `pets.type CHECK IN ('dog','cat','other')`, `name NOT NULL`,
   `user_id` FK. No uniqueness on `(user_id, name)` — duplicate pet names are
   allowed.

### Which columns the INSERT actually writes — 19 of 42

```
user_id · name · type · breed · secondary_breed · is_mixed · breed_confidence
avatar_url · weight · birth_date · gender · is_neutered · medical_conditions
health_notes · personality_tags · favorite_activities · activities
theme_color · archived · archived_at
```

### Which allowlisted columns the INSERT ignores — 23

```
color · current_food · microchip_number · has_insurance · insurance_company
insurance_expiry_date · vet_clinic · vet_clinic_name · vet_clinic_phone
vet_clinic_address · last_vet_visit · next_vet_visit · license_conditions
license_expiry_date · is_dangerous_breed · is_lost · lost_since
lost_reward_text · lost_temperament · lost_medication_note · lost_allergy_note
lost_show_phone · lost_contact_phone
```

`normalizePetPayload` builds these into `payload`, and the `INSERT` never
references them. A client that sends `current_food` at creation gets **201
Created** and the value is gone. Nothing logs it.

### Defaults applied at insert

| Column | Default | Where |
|---|---|---|
| `id` | `gen_random_uuid()` | database |
| `is_mixed` | `false` | `payload.is_mixed \|\| false` |
| `archived` | `false` | `payload.archived \|\| false` |
| `archived_at` | `null` | — |
| `created_at`, `updated_at` | `now()` | database |
| `is_neutered` | `null` if absent; **`false`** from `/add-pet`, whose select defaults to `"false"` | |
| `weight`, `breed_confidence` | `payload.x \|\| null` — **a `0` becomes `null`** | |
| `activities` | mirrored from `favorite_activities` in `normalizePetPayload` | |

### The event

```js
await emitEvent(pool, {                       // ← the pool, not a transaction client
  type: "pet.created", entityType: "pet", entityId: pet.id,
  payload: { owner_user_id, name, type, breed, birth_date, microchip_number },
});
```

Two things worth recording. The insert is a bare `pool.query`, so the event is
**not** written inside the transaction the outbox pattern assumes — there is no
transaction here at all. And the payload carries the pet's **name and breed**
out to whatever endpoint the outbox is pointed at; `microchip_number` is in the
payload and is always `null`, because the insert never writes it.
(`docs/pet-intelligence/42` describes this payload as "species, has_photo,
has_breed". That was the proposal; the code sends the values above.)

### The response

`serializePet(pet)` — all 49 keys, including `age_years`/`age_months` derived on
the spot from `birth_date`.

---

## 7. Data Flow Matrix

| User input | Frontend field | API | DB table | DB column | Used by |
|---|---|---|---|---|---|
| שם מלא | `formData.fullName` | `POST /api/auth/signup` | `app_users` | `full_name` | header, health score (owner completeness), orders |
| — | (split) | same | `profiles` | `first_name`, `last_name` | `CompleteProfilePrompt`, admin CRM |
| תאריך לידה (המשתמש) | `birthdate` | same | `app_users` | `birthdate` | age gate only — **nothing else reads it** |
| אימייל | `formData.email` | same | `app_users` | `email` | login, verification, guest-order claiming |
| סיסמה | `formData.password` | same | `app_users` | `password_hash` | login |
| אימות סיסמה | `formData.confirmPassword` | — | — | — | **nothing — never leaves the browser** |
| תנאי שימוש | `acceptedTerms` | same | `app_users` | `terms_accepted_at`, `terms_version` | legal record |
| כלב/חתול | `petType` | `POST /api/me/pets` | `pets` | `type` | every screen; product `pet_type` filter |
| כלב/חתול | `petType` | — | — | `localStorage.petPreference` | shop filter, feed |
| תמונה | `file` / `imageFile` | `POST /api/me/uploads` | `user_uploads` + disk | `storage_key`, `content_type`, `file_size` | the file itself |
| תמונה (URL) | — | `POST /api/me/pets` | `pets` | `avatar_url` | home, dashboard, feed, public pet |
| שם | `name` | `POST /api/me/pets` | `pets` | `name` | everywhere |
| גזע | `breed` | same | `pets` | `breed` | dashboard, `BreedHealthTips`, insurance pitch, safety score context |
| מעורב | `is_mixed` | **not sent** | — | — | **nothing** |
| גזע משני | `secondary_breed` | **not sent** (concatenated into `breed`) | — | — | **nothing** |
| תאריך לידה (החיה) | `birthDate` | `POST /api/me/pets` | `pets` | `birth_date` | `calculatePetAge` → `age_years`/`age_months`; life stage ×4; `petSafetyScore`; `PuppyVaccineScheduler`; `PreventiveCareEngine` |
| מין | `gender` | same | `pets` | `gender` | `petVerbSuffix` on the home screen; public pet; vet PDF |
| מעוקר | `is_neutered` | same | `pets` | `is_neutered` | health-score profile completion; `calculateNrc` (unreachable) |
| אישיות | `personalityTags` | same | `pets` | `personality_tags` | dashboard chips, public pet |
| פעילויות | `activities` | same | `pets` | `favorite_activities` **and** `activities` | `serializePet` only — no screen renders them |
| בעיות רפואיות | `medicalConditions` | same | `pets` | `medical_conditions` | health score (`isHighRisk`), `petSafetyScore`, `TopRecommendation` circles, `HealthScoreBreakdown` |
| "אחר" (טקסט) | `otherConditionText` | same as `health_notes` | `pets` | `health_notes` | health-score completion, vet PDF |

---

## 8. Data Loss / Dead Fields

### Collected and never sent

| Field | What happens |
|---|---|
| `is_mixed` | the toggle sets state and pre-fills `breed` with `"מעורב"`; the boolean is never sent, and the column defaults to `false` |
| `secondary_breed` | folded into `breed` as `"לברדור + פודל"`; the structured column stays `null` |
| `confirmPassword` | a client-side equality check |

### Sent and always empty

| Field | Why |
|---|---|
| `breed_confidence` | only `handleTypeMismatchSwitch` sets it, and it reads `typeMismatch`, which nothing ever sets to a value — because `detectBreed()` is a stub |

### Collected into the wrong shape

| What the user did | Where it landed |
|---|---|
| ticked "אחר" and described the problem | `medical_conditions` gets the literal string `"other"`; the description goes to `health_notes` — a different column with a different meaning |
| ticked a condition **and** "אחר" | the array carries a real key plus `"other"`; downstream matchers see `"other"` and ignore it |

### Stored and read by nothing

| Field | Note |
|---|---|
| `favorite_activities` / `activities` | returned by `serializePet`; **no screen renders them**. `activities` is a verified duplicate of `favorite_activities` |
| `app_users.birthdate` | used for the ≥13 gate at signup and never read again |
| `profiles.points` | never read or written by any code here — and the (unreachable) `/add-pet?onboarding=true` review screen promises "קיבלת 50 נקודות התחלתיות" |
| `user_uploads.id` | returned by the upload API; both flows use only `.url`, so the file row and the pet are linked by a string |

### Stored and read against a different vocabulary

`medical_conditions` is the clearest case in the whole flow.

| Onboarding writes | `petSafetyScore` looks for | Match? |
|---|---|---|
| `gastrointestinal` | `digestive` | **no** |
| `urinary` | `urinary` | ✅ |
| `allergies` | `allergies` | ✅ |
| `diabetic` | — | no |
| `renal` | `kidney` | **no** |
| `obesity` | — | no |
| `dermatosis` | — | no |
| `hairball` | — | no |
| `other` | — | no |

`TopRecommendation`'s keyword map is a substring search:

| Onboarding writes | Lights a circle? |
|---|---|
| `gastrointestinal` | ✅ `gastro` → digestion |
| `dermatosis` | ✅ `derma` → coat |
| `obesity` | ✅ `obesity` → feeding |
| `allergies` | **no** — the keyword is `allergy`, and `"allergies"` does not contain `"allergy"` |
| `urinary`, `diabetic`, `renal`, `hairball`, `other` | no |

`HealthScoreBreakdown` matches `urinary` correctly (substring, with `struvite`,
`flutd`, `שתן`, `אבני`).

So of nine keys an owner can tick during onboarding, **two reach the safety
score and three reach the recommendation circles**. A declared kidney problem
reaches neither.

### UI that promises something it does not do

| Element | Reality |
|---|---|
| "מזהה גזע…" spinner (`AddPet:737`) | `detectBreed()` sets `breedDetecting = false` immediately; unreachable |
| "לא הצלחנו לזהות את הגזע" (`:847`) | `breedDetectionFailed` is never set true; unreachable |
| breed autocomplete dropdown (`:930`) | `searchBreeds()` sets `[]`; the list never renders |
| "זוהה אוטומטית" badge (`:876`) | `breedSource` can only become `'user'` |
| "קיבלת 50 נקודות התחלתיות" + "באדג׳ ברוך הבא" | only in the unreachable `?onboarding=true` branch; no points column is written and `awardBadge` is not called |
| `// Award badge for first pet / onboarding` (`:354`) | the line under the comment sets a `localStorage` flag |

---

## 9. Derived Data

Created during onboarding without the user entering it.

### Stored on the pet

| Value | Created by | Stored in |
|---|---|---|
| `id` | PostgreSQL `gen_random_uuid()` | `pets.id` |
| `user_id` | the server, from the session | `pets.user_id` |
| `created_at`, `updated_at` | PostgreSQL `now()` | `pets.*` |
| `archived = false`, `archived_at = null` | `insertUserPet` | `pets.*` |
| `is_mixed = false` | `insertUserPet` (`payload.is_mixed \|\| false`) | `pets.is_mixed` |
| `activities` | `normalizePetPayload` mirrors `favorite_activities` | `pets.activities` |

### Derived at read time, never stored

| Value | Created by | Note |
|---|---|---|
| `age_years`, `age_months` | `calculatePetAge` in `serializePet` | `null` for a Flow-A pet, which has no birth date |
| profile completion % | `PetHealthScore` / `HealthScoreBreakdown` | 9 fields; a Flow-A pet starts at **3/9 ≈ 33%** (breed, avatar, and nothing else) |
| health score | `PetHealthScore` | a Flow-A pet with no vaccines, no visits, no weight and no clinic scores **profile × 0.10 ≈ 3**, plus 10 if the owner profile is complete |
| life stage | four separate components | `null` / "לא ידוע" with no birth date |
| `theme_color` | `PetPreferenceContext` assigns by index | **client-side only, never persisted** |

### Created for the user

`app_users.id` · `is_active = true` · `terms_accepted_at` · `terms_version` ·
`profiles.first_name` / `last_name` (split from `full_name`) ·
a `user_sessions` row with a hashed token · an email-verification OTP.

---

## 10. Pet Facts Integration

### Does onboarding write to `pet_facts`?

**No.** `insertUserPet` executes one `INSERT` into `public.pets` and one
`emitEvent`. It does not import `petFactService`, and `grep` finds no reference
to `pet_facts`, `pet_observations`, `/facts` or `/observations` anywhere under
`src/`.

A pet created today therefore has:

```
pets                  1 row
pet_facts             0 rows
pet_observations      0 rows
pet_fact_transitions  0 rows
outbox_events         1 row  (pet.created — with pet_id NULL, because
                              emitEvent is called without petId here)
```

### Which onboarding data would map to a registered fact key

Against the 17 definitions seeded by migration `0037`:

| Onboarding field | Registered key | Would fit? |
|---|---|---|
| `is_neutered` | `health.neuter_status` (boolean) | ✅ directly |
| `medical_conditions[]` | `health.condition` (string, **multi**) | ✅ one row per element — which is the point of `cardinality = multi` |
| `health_notes` | `health.note` (string) | ✅ directly |
| `favorite_activities[]` | `preference.activity` (string, multi, decays) | ✅ one row per element |
| `personality_tags[]` | `behavior.tag` (string, multi) | ✅ one row per element |
| `weight` | `physical.weight` (number, grams) | ✅ — **but neither flow collects a weight** |
| `birth_date` | — | ❌ Core, not a fact; `identity.life_stage` derives from it and has no writer |
| `name`, `type`, `breed`, `avatar_url`, `gender` | — | ❌ Core attributes; `45` says not to attach confidence to them |
| `is_mixed`, `secondary_breed` | — | ❌ no registered key, and neither is sent today |

Under the contract these would all be `source_type = USER_PROVIDED`,
`source_channel = APP`, `confidence = HIGH`, `observed_at = now()` — the owner
is asserting them directly, in the app, at the moment of creation.

### Is there duplicate storage?

**Not today.** `pets` is the only writer and the only reader. The single overlap
that exists anywhere is `physical.weight`, written once by the `0039` backfill
for pets that already had a `pets.weight`; onboarding creates neither.

### Are there contradictions between the two sources?

**No** — because for any pet created after `0039` ran, one of the two sources is
empty. The contradiction risk begins the moment a second writer appears, and the
registry already prevents the sharpest version of it: `physical.weight` is
`volatile` (later supersedes, never disputes) and `health.neuter_status` is not
(a disagreement is a real conflict).

---

## 11. Post-Onboarding Flow

### Immediately after "יצירת הפרופיל"

```
localStorage.onboardingCompleted = "true"
localStorage.activePetId         = <new pet id>
localStorage.petPreference       = "dog" | "cat"     (set earlier, at the photo step)
```

`createMyPet` dispatches `mipo:pets-changed`; `Onboarding` then also calls
`refresh()`. Both do the same thing, so the identity and pet-list pair is
fetched **twice, back to back**:

```
createMyPet → dispatch "mipo:pets-changed"
      → PetPreferenceContext.fetchPets → GET /api/auth/me + GET /api/me/pets
await refresh()
      → PetPreferenceContext.fetchPets → GET /api/auth/me + GET /api/me/pets
```

### Which pet becomes active

`PetPreferenceContext.fetchPets` reads `localStorage.activePetId`, finds the
match, and falls back to `list[0]`. Onboarding has just written the new id, so
the new pet is active. `switchPet` is not called, so the cross-pet safety event
(`mipo:fleet-safety`) does not fire — which changes nothing, because that event
has no listener anywhere in the app.

### The home screen a new user lands on

| Element | With a Flow-A pet |
|---|---|
| Greeting | "בוקר טוב" + `איך <name> מרגיש<suffix> היום?` — the suffix is the slashed `מרגיש/ה`, because Flow A never collected a gender |
| Avatar | the uploaded photo, or `defaultPetAvatar` |
| Orbit | 4 slots: בריאות → `/pet-profile` · מסמכים → `/documents` · חנות → `/shop` · Mipo AI → `/chat` |
| Attention line | `useHomeAttention` returns nothing — there are no vaccinations, no visits, no insurance date and no licence date — so the line falls through to *"הקישו על `<name>` לעדכון מצב הרוח"* |
| Email banner | **shown** — `email_verified === false` until the OTP is used |
| Profile prompt | **shown after 5 seconds** (see below) |

API calls on arrival: `GET /api/me/pets/:id/health-summary` and
`GET /api/me/pets/:id/character`.

### The interruption

`CompleteProfilePrompt` is mounted globally in `App.tsx`, outside the router. It
fires as soon as `isAuthenticated` is true — **including while the user is still
on `/onboarding`**:

1. calls `getCurrentUser()` itself (a fourth identity request);
2. computes `missing` from `first_name`, `last_name`, `phone`, `city`. Signup
   fills the first two by splitting `full_name`; **`phone` and `city` are always
   missing**, because signup collects neither;
3. `setTimeout(() => setShow(true), 5000)`;
4. when shown with `city` missing, calls
   `navigator.geolocation.getCurrentPosition()` — the browser's location
   permission dialog.

Dismissal is stored in `sessionStorage` per user, so it returns in the next
session until phone and city are filled.

### Which onboarding data is visible on the home screen

| Collected | Visible at `/` |
|---|---|
| name | ✅ in the greeting and under the orbit |
| photo | ✅ as the orbit avatar |
| species | indirectly — the default avatar and the shop filter |
| breed | ❌ **not shown anywhere on the home screen** |

Breed first appears on the pet dashboard, which is two taps away
(orbit → בריאות).

### Collected and shown nowhere at all

`favorite_activities` / `activities` — stored, serialized, rendered by no
component.

---

## 12. Edge Cases

| Case | Actual behaviour |
|---|---|
| **Leaves mid-`/onboarding`** | everything is lost. There is no draft, no `sessionStorage`, no server-side partial. Only `petPreference` survives, because `chooseType` writes it immediately |
| **Refresh mid-`/onboarding`** | the component remounts at `phase: "welcome"`. The photo — a `blob:` URL — is gone |
| **Leaves mid-`/add-pet`** | the draft is autosaved 1s after each change and restored on return, with a toast "טיוטה שוחזרה" — but only if `draft.currentStep > 1 && draft.formData?.name`; otherwise the draft is deleted as "stale" |
| **Refresh mid-`/add-pet`** | same restore. The photo survives, because `imagePreview` is a base64 data URL saved into `localStorage` — which is also how this draft can approach the ~5 MB `localStorage` quota. A `QuotaExceededError` from `setItem` is **not caught**; the write is inside a `setTimeout` with no `try` |
| **No pet, `onboardingCompleted="true"`** | `Auth.tsx:25` sends the user to `/`, where `MipoHome` shows only "הוספת חיית המחמד הראשונה" → **`/add-pet`**, so the 4-field flow is never seen again |
| **No pet, flag absent** | `/onboarding` |
| **More than one pet** | `PetPreferenceContext` restores `activePetId`, else `list[0]`. `/add-pet` inherits the previous pet's species as the pre-selected type |
| **`POST /api/me/pets` fails** | Flow A: toast "לא הצלחנו ליצור את הפרופיל" + the message, phase returns to `details`, all input preserved. Flow B: toast + step 7, the draft is **not** cleared (the `removeItem` is after the success path) |
| **Upload succeeds, pet creation fails** | the `user_uploads` row and the file on disk stay behind, referenced by nothing. Both flows. Retrying uploads the image again |
| **Upload fails** | Flow A: the same generic error toast, phase → `details`. Flow B: caught by `handleSubmit`'s catch |
| **Guest reaches `/onboarding`** | `Protected` lets a guest through (`isGuest` counts as authorized). `createPet` checks `!user` **before** uploading and redirects to `/auth` with `replace: true` — the form state is destroyed. `/add-pet` handles the same case with an explicit toast ("מצב אורח") |
| **Guest session expires (24 h)** | `validateGuestSession` clears the keys; `ProtectedRoute` then redirects to `/auth` |
| **Returns to `/onboarding` with a pet already** | nothing stops them. The screen renders from `welcome` and creating a second pet works — `/onboarding` has no "you already have a pet" check |
| **Skips every optional field (Flow B)** | `canProceed()` returns `true` for steps 3–6. Result: `birth_date`, `gender`, `personality_tags`, `favorite_activities`, `medical_conditions`, `health_notes` all `null` — except `is_neutered`, which the select defaults to `"false"` and therefore stores **`false`, not `null`**. The pet is recorded as not neutered because nobody said otherwise |
| **Future birth date** | selectable (no `disabled` on the calendar), accepted by `normalizeDateOnly`, stored. `calculatePetAge` clamps to `0y 0m`; `src/lib/petAge.ts` returns `null` for a future date, so the API and the client disagree about the same pet |
| **Duplicate pet name** | allowed — no unique constraint |
| **Very long arrays** | `normalizeTextArray` has no cap; the UI limits the choice to 8–9 fixed options, but the API does not |
| **Unverified email** | does not block pet creation. It blocks `createOrder` (`403 email_verification_required`) |
| **Two devices** | `activePetId`, `petPreference`, `addPetDraft`, `onboardingCompleted` are all `localStorage` — per device. A user who onboards on a phone and opens the web app sees `onboardingCompleted` absent, and `Auth` routes them by whether they have pets |

---

## 13. Problems Found

Ordered by how much they cost. Every one is a statement about the current code,
not a proposal.

1. **The default flow collects no birth date**, so a new pet has no age, no life
   stage, no age-adjusted product safety and no vaccine schedule. Everything
   downstream that is "age-aware" is inert for a Flow-A pet.
2. **A Flow-A pet starts at ~33% profile completion and a health score near 3**,
   through no fault of the owner — two of the nine completion fields
   (`current_food`, `has_insurance`) have no writer anywhere in the app.
3. **23 of the 42 allowlisted columns are silently dropped at creation.** No
   error, no log, `201 Created`.
4. **`CompleteProfilePrompt` interrupts onboarding after five seconds** and
   triggers a GPS permission dialog, asking for two fields signup never
   collected.
5. **The medical-condition vocabulary does not match its readers.** Seven of
   nine keys miss the safety score; six of nine light no recommendation circle.
   A declared kidney problem (`renal`) affects nothing.
6. **`is_mixed` and `secondary_breed` are collected and discarded**, with the
   secondary breed concatenated into a free-text `breed` string that
   `BreedHealthTips` and the insurance pitch then keyword-match against.
7. **Three breed features are stubs with live UI** — spinner, failure banner and
   autocomplete — and `breed_confidence` is therefore always `null`.
8. **The `/add-pet` review screen omits the medical section** the owner just
   filled in, so the last thing they confirm is not what they entered.
9. **`is_neutered` defaults to `false`, not `null`.** "We did not ask" is stored
   as "no".
10. **A future birth date is accepted**, and the server and client then disagree
    about the resulting age (`0y 0m` vs `null`).
11. **Identity and pet-list requests are duplicated** — `createMyPet` dispatches
    `mipo:pets-changed` *and* the caller awaits `refresh()`; separately,
    `useAuth` is a plain hook (not a context) called from **31 files**, each
    instance re-running `GET /api/auth/me` on every `mipo:auth-changed`.
12. **Failed pet creation orphans the uploaded file** — the `user_uploads` row
    and the file on disk survive with nothing referencing them.
13. **`/onboarding` has no draft**, so a refresh or a background kill loses
    everything; `/add-pet` has one and stores a base64 image in `localStorage`
    with no quota handling.
14. **The `pet.created` event carries the pet's name and breed** to an external
    endpoint and sets no `pet_id` column, so the new pet-scoped index does not
    see it.
15. **`profiles.points` is a real column that nothing writes**, and an
    unreachable screen promises the user 50 of them.
16. **Nothing from onboarding reaches the Pet Facts foundation**, including the
    six fields that map cleanly onto registered keys.

---

## 14. Recommendations

None. This document is an audit, and the request was explicitly to establish the
current state before any product or architectural decision. The material for
those decisions is in §13 and the questions in §15.

---

## 15. Open Decisions

1. **Which flow is the onboarding flow?** Two exist, they differ by nine fields,
   and the shorter one is the one every new account gets. Keeping both means
   deciding what each is for.
2. **Should the default flow ask for a birth date?** It is the single input that
   unlocks age, life stage, age-adjusted safety and the vaccine schedule.
3. **Should it ask for a weight?** It is the one onboarding field that maps
   directly onto an already-registered fact key (`physical.weight`), and it is
   worth 15 points of the health score.
4. **What is the correct condition vocabulary**, and which side moves — the
   onboarding keys, or the four matchers that read them?
5. **`is_neutered` when nobody answered** — `null` or `false`? The column is
   nullable and the UI cannot express "unknown".
6. **Should onboarding write Pet Facts**, or should `pets` remain the only
   writer until a read path exists? Writing facts with no reader creates the
   duplicate-source problem the foundation was built to avoid.
7. **If it writes facts, in the same transaction as the pet?** `insertUserPet`
   currently has no transaction at all.
8. **Where should `CompleteProfilePrompt` be allowed to appear?** It has no
   route exclusions today.
9. **Should `/onboarding` keep a draft**, and should a partially-created pet
   exist server-side before the flow completes?
10. **Should `secondary_breed` / `is_mixed` be sent**, and should `breed` stop
    being a concatenated string?
11. **Restore breed detection or remove its UI?** The spinner and the failure
    banner currently describe a feature that does not run.
12. **Should a pet be attachable to an order at checkout?** The account claims
    guest `shop_customers` rows at signup, so the commerce identity is already
    joined at exactly this moment — and no pet is ever attached.

---

```
ONBOARDING_CURRENT_STATE: COMPLETE

Screens
  Flow A (new user, /signup → /onboarding → /)          8
    (/auth, /signup, welcome, photo, reveal, details, success, home)
  Flow B (/add-pet, additional pets)                    7
  Unreachable (/add-pet?onboarding=true welcome step)   1
  Total distinct                                       15

Routes
  In the new-user path                                  4   /auth · /signup · /onboarding · /
  Alternate + side paths                                2   /add-pet · /verify-email
  Total                                                 6

API calls (Flow A, new user, with a photo, to the home screen)
  POST /api/auth/signup                                 1
  POST /api/me/uploads                                  1
  POST /api/me/pets                                     1
  GET  /api/auth/me                                     4+  (auth-changed, pets-changed,
                                                             explicit refresh, CompleteProfilePrompt;
                                                             multiplies per mounted useAuth() — 31 callers)
  GET  /api/me/pets                                     3   (auth-changed, pets-changed, refresh)
  GET  /api/me/pets/:id/health-summary                  1
  GET  /api/me/pets/:id/character                       1
  Minimum total                                        12   (of which 4 are duplicate identity fetches)

User fields
  Collected at signup                                   6
  Stored                                                5   (confirmPassword is a check only)
  Not collected but accepted by the API                 1   (phone)

Pet fields
  Flow A collects                                       4
  Flow B collects                                      13
  Distinct across the product                          13

Fields stored
  Flow A                                                4 / 4
  Flow B                                               11 / 13
  Always-null despite being sent                        1   (breed_confidence)

Fields NOT stored
  Discarded by the client                               2   (is_mixed, secondary_breed)
  Accepted by normalizePetPayload, ignored by INSERT   23
  Stored but read by no screen                          2   (favorite_activities, activities)

Derived fields
  Stored on the pet without user input                  6   (id, user_id, created_at, updated_at,
                                                             archived/archived_at, is_mixed, activities)
  Derived at read time, never stored                    5   (age_years, age_months, profile completion,
                                                             health score, life stage)
  Client-only, never persisted                          1   (theme_color)
  Created for the user at signup                        7

Pet Facts actually written by onboarding                0
Pet Observations actually written by onboarding         0
Onboarding fields that map to a registered fact key     6   (is_neutered, medical_conditions,
                                                             health_notes, favorite_activities,
                                                             personality_tags, weight — which
                                                             neither flow collects)
```
