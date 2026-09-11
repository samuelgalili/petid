# 56 — Existing Product: Data & UX Audit

Current state only. Nothing here proposes a change, and no application code was
modified to produce it. Every claim below was read out of the code at commit
`e7cb673f`; where a claim could not be verified it says `UNKNOWN`.

---

## 1. Executive Summary

Mipo today is a **four-surface app** — a pet home, a community feed, an AI chat
and a shop — with a fifth surface, the pet dashboard, reachable only from one
tile on the home screen. There is no bottom-nav entry for the shop and none for
the pet profile.

Six things define the current state, and each is verified in the sections below:

1. **The pet object is one thing on the server and eight things in the client.**
   `serializePet` returns 49 fields. The client re-declares a narrower pet
   **24 separate times** as a local `interface Pet`, plus `MipoPet`,
   `PetProfile`, the public projection and the social projection. Five of those
   local interfaces still declare `size`, a column the API has never returned.

2. **The app can read far more about a pet than it can write.** The write
   allowlist accepts **42 columns**. After creation the user interface can
   change **17** of them — and 10 of those 17 are the lost-pet block and the
   archive pair, leaving **7 ordinary profile fields**, only 5 of which are on
   the screen labelled "edit". Nineteen columns are never writable from the UI
   at all, and thirteen of those are nonetheless read by at least one
   component — `current_food`, `microchip_number`, the three insurance fields
   and the four vet-clinic fields among them. Several feed the health score and
   the home screen's attention line, which therefore cannot fire. `current_food`, `microchip_number`,
   the three insurance fields and the four vet-clinic fields are **read in
   twenty-two places and written in none** — several of them feed the health
   score and the home screen's attention line, which therefore cannot fire.

3. **Activity does not exist.** No walks, no steps, no distance, no GPS, no
   check-ins, no park visits. `dog_parks` is a table with 24 columns that no
   server route and no screen reads. "Dog walker" is a booking form with three
   hard-coded walkers.

4. **Document intelligence does not exist.** Uploading a medical document
   stores the file. There is no OCR and no extraction; the only "extraction" is
   a keyword scan over text the owner typed themselves. The screens that were
   built to review extracted data are unreachable, and one of them shows
   "profile updated ✅" for an update that never happens.

5. **There is no admin pet view.** Zero `/api/admin/*` routes touch pets. The
   customer drawer receives every field of every pet and renders **name, type
   and breed**. An admin cannot see a weight, a condition, a document or a
   vaccination, and cannot edit anything about a pet at all. `BusinessCRM.tsx`
   exists as a file and is not reachable from any route.

6. **The P1 Pet Intelligence foundation has no consumers.** `pet_facts`,
   `pet_observations` and the seven new routes are referenced by exactly three
   files, all of which are the foundation itself. Zero frontend files mention
   them. This is the expected answer and it is stated plainly rather than
   dressed up.

The single most consequential *live* inconsistency found: **life stage is
derived four different ways with different thresholds**, and two of those
derivations run on the same screen. An eight-year-old cat is `בוגר/ת` in the
health breakdown and `סניור` in the panel two tabs away.

---

## 2. Current Product Map

Routes come from `src/routes/index.tsx`. `MainShell` (`src/components/MainShell.tsx`)
switches four pages on path, so `/`, `/feed`, `/chat` and `/shop` are one shell.

### Live surfaces

| Area | Route | Component | Purpose | Current |
|---|---|---|---|---|
| Pet home | `/` | `MipoHome` via `MainShell` | Character, mood, 4-slot orbit, attention line | **ACTIVE** |
| Community feed | `/feed` | `MipoFeed` | Posts, comments, reactions, polls | **ACTIVE** |
| AI chat | `/chat` | `Chat` | Mipo AI assistant | **ACTIVE** |
| Shop | `/shop` | `Shop` | Catalogue, search, safety badge | **ACTIVE** |
| Product detail | `/product/:id` | `ProductDetailAws` | Full product, feeding guidance | **ACTIVE** |
| Cart | `/cart` | `Cart` | — | **ACTIVE** |
| Checkout | `/checkout` | `Checkout` | — | **ACTIVE** |
| Orders | `/order-history`, `/order-tracking/:id` | `OrderHistory`, `OrderTrackingPage` | — | **ACTIVE** |
| Reorder | `/reorder-confirmation` | `ReorderConfirmation` | — | **ACTIVE** |
| Favourites | `/favorites` | `Favorites` | — | **ACTIVE** |
| Onboarding | `/onboarding` | `Onboarding` | First pet: 4 fields | **ACTIVE** |
| Add pet | `/add-pet` | `AddPet` | Subsequent pets: 7 steps | **ACTIVE** |
| **Pet dashboard** | `/pet-profile`, `/pet-profile/:petId` | `Profile` | The pet screen — 4 tabs | **ACTIVE** |
| Edit pet | `/edit-pet/:petId` | `EditPet` | 5 fields | **ACTIVE** |
| Archived pets | `/archived-pets` | `ArchivedPets` | Restore / permanently delete | **ACTIVE** |
| Documents | `/documents` | `Documents` | The medical vault | **ACTIVE** |
| Breeds | `/breeds` | `Breeds` | Breed encyclopaedia | **ACTIVE** |
| Owner profile | `/profile`, `/owner-profile` | `OwnerProfile` | — | **ACTIVE** |
| Settings / notifications | `/settings`, `/notifications` | — | — | **ACTIVE** |
| Found pet | `/found-pet/:petId` | `FoundPet` | Public QR landing | **ACTIVE** |
| Auth | `/auth`, `/signup`, `/reset-password`, `/verify-email` | — | — | **ACTIVE** |

### Bottom navigation — three items only

```
src/components/BottomNav.tsx
  /feed   קהילה
  /chat   Mipo AI
  /       <active pet name>
```

The shop and the pet dashboard are **not** in the bottom nav. The shop is
reached from the orbit's "חנות" slot, from the pet dashboard's sheets
(`HealthScoreBreakdown`, `BreedHealthTips`, `ProductsSheet`,
`RecommendedProducts`) and from the feed's product cards; the pet dashboard only
from the orbit's "בריאות" slot and from `OwnerProfile`.

*(Corrected. An earlier version of this line said the shop is also reached from
`ProductCarousel` on the home screen. `ProductCarousel` is not rendered by
`MipoHome` — `grep` finds no importer at all, so it belongs in the unreferenced
list rather than in a navigation path.)*

### Areas the brief asked about that do not exist

| Asked | Verdict | Evidence |
|---|---|---|
| Activity, Walks, Steps | **DOES NOT EXIST** | no table, no route, no screen |
| Parks, Check-ins | **DOES NOT EXIST as a feature** | `dog_parks` table exists; `grep dog_parks server/src src` → zero hits outside an admin type literal |
| Moments (as a distinct feature) | **DOES NOT EXIST** | social posts are the only user content |
| Follows / friends | **DOES NOT EXIST** | no table, no route |
| Pet switching (as a screen) | partial | `switchPet` in `PetPreferenceContext`; the grid on the pet dashboard |
| Reorder | partial | a confirmation page; no prediction and no source for one |
| Dashboards (owner-level) | `OwnerProfile` only | — |

### Routes that are redirects, not features

`/parks`, `/experiences`, `/guides`, `/training`, `/grooming`, `/insurance`,
`/dog-parks`, `/adoption`, `/breed-detect` → `/chat`.
`/businesses`, `/business/:id`, `/business-crm`, `/ad-campaigns` → `/shop`.
`/reels`, `/explore`, `/post/:id`, `/user/:id` → `/feed`.
`/messages`, `/messages/:userId` → `/chat`.
`/radar`, `/photos`, `/creator-dashboard`, `/live` → `/`.

**The pet dashboard's own navigation map points at two of these**:
`handleCategoryClick` in `Profile.tsx` maps `stories` and `videos` to `/reels`,
which redirects to `/feed`; and the header's message button navigates to
`/messages`, which redirects to `/chat`.

### Page components with no route

Eleven files under `src/pages/` are referenced by nothing:

```
Achievements · AdCampaigns · BusinessCRM · BusinessSettings · Deals
Experiences · Explore · PetProfileRedirect · SoundtrackFeed · Tasks · Tracker
```

`BusinessCRM.tsx` (324 lines) is the one that matters for §13.

---

## 3. Current Pet Profile

`src/pages/Profile.tsx` (539 lines) → `PetDashboardTabs` (326 lines) → 20+ child
components.

### Structure

```
Header: back · pet name · message button (→ /chat)

State A — no pet selected
  owner avatar + name + bio
  a ring of pet avatars, plus "הוסף"
  "בחירת חיית מחמד לצפייה"

State B — pet selected (isExpanded)
  avatar (tap → heart rain) · name · "breed · N שנים" · weather · edit · ⋯ menu
  ⋯ menu: edit details / archive / archived pets
  four tabs:
```

| Tab | Components |
|---|---|
| **סקירה** | `PetHealthScore`, `RecoveryBanner`, `DangerousBreedBanner` (conditional), `MemoryCard` |
| **רפואי** | `VaccineCountdown`, `PuppyVaccineScheduler`, `MedicalTimeline`, `MedicalDocumentFAB`, `PreventiveCareEngine` |
| **מידע** | `BreedHealthTips`, `MyClinicCard` (conditional), `ClaimsHistory`, `TopRecommendation`, `PetEssentials` |
| **עוד** | 8-service grid, `PetPhotoGallery`, `PetMiniCalendar`, `VetHistoryPDF` |

Thirteen bottom sheets mount conditionally: insurance, training, grooming, food,
toys, boarding, documents (`PetVaultDrawer`), dog walker, products, memorial,
energy, grooming products, feeding — plus four `ComingSoonSheet`s (יומן, למסירה,
סיפור חיים, מידע על הגזע).

### What the user sees

- **Header**: name, breed *or* species word, `age_years` only ("3 שנים" — the
  months are dropped here), weather alert.
- **Health score ring** 0–100 with a Hebrew sub-label, a profile-completion
  percentage, condition chips, insurance chip, clinic name.
- **Vaccine countdown**, a medical timeline of vet visits, a puppy vaccine
  schedule computed from `birth_date`.
- **Info tab**: an age chip, a size chip, a weight chip, energy bar, grooming
  frequency, life expectancy, a microchip suffix, an insured/not-insured pill,
  breed health tips, essentials products.
- **Empty markers**: `לא צוין` / `לא ידוע` in place of a missing value.

### What the user can edit — the complete list

| Field | Where | Notes |
|---|---|---|
| `name` | `/edit-pet/:id` | |
| `breed` | `/edit-pet/:id` | free text |
| `birth_date` | `/edit-pet/:id`, **and** the age chip in `TopRecommendation` | two entry points |
| `gender` | `/edit-pet/:id` | |
| `is_neutered` | `/edit-pet/:id` | |
| `weight` | the weight chip in `TopRecommendation` **only** | not on the edit screen |
| `avatar_url` | `PetEditSheet`, `ProfileImageEditor` | |
| `archived`, `archived_at` | ⋯ menu, `HamburgerMenu`, `OwnerProfile`, `PetCard`, `ArchivedPets` | five call sites |
| `is_lost` + 5 `lost_*` | `LostModePanel` | |

**Seventeen fields** — and 8 of them are the lost-pet block, 2 the archive
pair. Seven ordinary profile fields remain.

**Six more are set once at creation and are never editable again:**
`type`, `personality_tags`, `favorite_activities`, `medical_conditions`,
`health_notes`, `breed_confidence` (which is always `null` — see §4).

### What the user cannot edit at all — 19 of the 42

`current_food` · `microchip_number` · `color` · `secondary_breed` · `is_mixed` ·
`has_insurance` · `insurance_company` · `insurance_expiry_date` ·
`vet_clinic` · `vet_clinic_name` · `vet_clinic_phone` · `vet_clinic_address` ·
`last_vet_visit` · `next_vet_visit` · `is_dangerous_breed` ·
`license_conditions` · `license_expiry_date` · `theme_color` ·
`activities` (a mirror the write path fills from `favorite_activities`)

17 + 6 + 19 = 42. Every one of these 19 is **read** by at least one component. Several drive scoring
and alerts (§21).

### What is calculated

| Value | Where | Inputs |
|---|---|---|
| `age_years` / `age_months` | **server**, `calculatePetAge` | `birth_date` |
| age display | `src/lib/petAge.ts` | prefers the API's answer (P0) |
| health score 0–100 | `PetHealthScore` | 7 weighted components |
| profile completion % | `PetHealthScore`, `HealthScoreBreakdown` | 9 fields |
| life stage | **four different implementations** (§20) | age, sometimes species |
| pet-adjusted safety score | `src/lib/petSafetyScore.ts` | base score, age, conditions, category |
| energy / activity minutes | `src/lib/petActivity.ts` | breed reference data |
| feeding guidance | `src/lib/feedingGuidance.ts` | **the product**, never the pet (P0) |
| next vaccine due | `PuppyVaccineScheduler`, `useHomeAttention` | `birth_date`, `expires_at` |
| `isVerified` badge | `TopRecommendation` | `microchip_number` && owner name |

### What is fetched

```
Profile.tsx           getCurrentUser() · getMyPets()
PetHealthScore        getMyPetHealthSummary(petId)
HealthScoreBreakdown  getMyPetHealthSummary(petId)
MedicalTimeline       getMyPetHealthSummary(petId)
VaccineCountdown      getMyPetHealthSummary(petId)
RecoveryBanner        getMyPetHealthSummary(petId)
PreventiveCareEngine  getMyPetHealthSummary(petId)
PetMiniCalendar       getMyPetHealthSummary(petId)
VetHistoryPDF         getMyPetHealthSummary(petId)
PetEssentials         getShopProducts() → keyword filter
TopRecommendation     nothing (reads the pet prop)
SmartRecommendation…  getMyPet(petId) + getShopProducts()
ClaimsHistory         getMyInsuranceClaims()
PetVaultDrawer        getMyDocuments({pet_id})
```

**Nine components call `getMyPetHealthSummary` independently**, eight of them on
this screen. There is no shared cache; each is its own `useEffect` + `useState`.
Because the tabs render conditionally, they fire in groups rather than all at
once — two on סקירה (`PetHealthScore`, `RecoveryBanner`), **three together on
רפואי** (`VaccineCountdown`, `MedicalTimeline`, `PreventiveCareEngine`), one on
עוד (`PetMiniCalendar`), one when the breakdown sheet opens, and one more when
the PDF button is pressed. Switching tabs re-fetches.

### What is stored locally

| Key | Scope | Content |
|---|---|---|
| `activePetId` | device | which pet is active |
| `petPreference` | device | `dog` \| `cat` |
| `mipo-care-plan:<petId>` | **per pet** | care-plan products — never sent to the server |
| `mipo-mood-<petId>-<YYYY-MM-DD>` | **per pet, per day** | the mood the owner tapped |
| `addPetDraft` | device | in-progress AddPet form |
| `mipo-cart`, `mipo-favorites`, `mipo-search-history` | device, **not pet-scoped** | |
| `onboardingCompleted`, `mipo-onboarding-complete`, `hasSeenSwipeTutorial` | device | |

Two of these — the care plan and the daily mood — are **pet data that exists
only in one browser**. Nothing on the server knows about either.

---

## 4. Pet Creation

There are **two** creation flows, and the shorter one is the one new users get.

### A. `/onboarding` — the real first-pet flow

`SignupForm` and `Auth` both `navigate("/onboarding")`. Phases:
`welcome → photo → reveal → details → creating → success`.

```
createMyPet({ name, type, pet_type, breed, avatar_url })
```

**Four fields.** No birth date, no gender, no neuter status, no weight.

### B. `/add-pet` — subsequent pets, 7 steps

```
createMyPet({
  name, type, birth_date, gender, breed, breed_confidence,
  is_neutered, avatar_url, personality_tags, favorite_activities,
  medical_conditions, health_notes,
})
```

Steps: type → name → date/gender → personality → activities → health → review.
Steps 3–6 are all optional (`canProceed()` returns `true`).

### Classification

**User explicitly provides**
`name`, `type`, `breed`, `birth_date`, `gender`, `is_neutered`,
`personality_tags[]`, `favorite_activities[]`, `medical_conditions[]`,
`health_notes`, the photo.

**System derives**
`age_years` / `age_months` (server, at read time — never stored).

**System defaults**
`is_mixed=false`, `archived=false`, `is_lost=false`, `is_dangerous_breed=false`,
`created_at`, `updated_at`, `theme_color` (assigned client-side by index in
`PetPreferenceContext`, **not persisted**).

**AI extracts / infers**
**Nothing.** `detectBreed()` in `AddPet.tsx:229` takes the base64 image, ignores
it (`_base64Image`), and resets four state flags:

```ts
const detectBreed = async (_base64Image: string) => {
  if (!petType) return;
  setBreedDetecting(false);
  setBreedDetectionFailed(false);
  setPhotoQualityFeedback(null);
  setDetectedHealthRisks([]);
};
```

Consequences, all verified: `typeMismatch` is never set to a value, so
`breedConfidence` can never be assigned; `breed_confidence` is therefore
**always `null`** on create. `breedSource` can only become `'user'`.
`detectedHealthRisks` is always `[]`. The "מזהה גזע..." spinner and the
"לא הצלחנו לזהות את הגזע" message are unreachable.

**Imported from another source**
Nothing.

### Fields the form collects and does not send

`secondary_breed` and `is_mixed` are captured by the UI and then folded into a
string:

```ts
const breedValue = formData.is_mixed && formData.secondary_breed
  ? `${formData.breed} + ${formData.secondary_breed}`
  : formData.breed || null;
```

The columns exist, `normalizePetPayload` accepts them, and the structured value
is discarded in favour of `"לברדור + פודל"`.

### Not collected at creation, by either flow

`weight` · `current_food` · `microchip_number` · `color` · any insurance field ·
any vet-clinic field · `license_*`.

---

## 5. Pet Editing

```
Pet dashboard → ✏️ → /edit-pet/:petId
   getMyPet(petId)  → GET /api/me/pets/:id → serializePet
   form: name, breed, birth_date, gender, is_neutered
   updateMyPet()    → PATCH /api/me/pets/:id → normalizePetPayload → 42-column allowlist
   toast "הפרטים עודכנו בהצלחה!" → navigate("/")
```

The allowlist is more than eight times wider than the form. That gap is the
substance of §21's "incomplete".

### Second write path — the chips in `TopRecommendation`

The age chip and the weight chip open a modal and `PATCH` one field, then call
`window.location.reload()`.

### UI that looks editable but is not persisted

| Control | What happens |
|---|---|
| `MedicalDocumentFAB` → `handlePetDataConfirm` | builds `petUpdate` from `scanResult`; **every contributing field is hard-coded `null`/`false` by `extractLocalSummary`**, so `Object.keys(petUpdate).length === 0` and `updateMyPet` is never called — then `toast({ title: "פרופיל החיה עודכן ✅" })` fires unconditionally |
| the same component's `petReview` / `profileReview` steps | gated on `hasPetData` / `hasProfileData`, both of which are always false — **unreachable** |
| `AddPet`'s mixed-breed toggle | value discarded into a string (§4) |
| `PetPreferenceContext` theme colour | assigned client-side, never written back |

### Misleading success messages

1. `MedicalDocumentFAB`: "פרופיל החיה עודכן ✅" for zero writes.
2. `PetCard.tsx:109`: `toast.success("${pet.name} הוסר/ה בהצלחה")` — "removed
   successfully" — for `updateMyPet(pet.id, { archived: true })`. It is an
   archive, and this is also the only one of five archive call sites that does
   **not** set `archived_at`.

---

## 6. Current Pet Object

### The canonical serializer — `server/src/index.js:1790`

`serializePet(row)` returns **49 keys** from the 57-column `pets` table:
identity (`id`, `user_id`, `name`, `type`, `pet_type`), breed (4), `avatar_url`,
`weight`, `birth_date`, **`age_years`/`age_months` (derived, never stored)**,
`gender`, `color`, `is_neutered`, `medical_conditions[]`, `health_notes`,
`personality_tags[]`, `favorite_activities[]`, `activities[]`, `theme_color`,
insurance (3), `current_food`, vet (6), `microchip_number`, licence (3),
lost (8), `archived`(2), timestamps (2).

Every consumer of pet data reads this. Every write goes through
`normalizePetPayload` (`:1845`), a **42-column** allowlist — verified by
parsing the function rather than counting by eye.

### The representations

| # | Representation | Where | Fields | Note |
|---|---|---|---|---|
| 1 | `serializePet` | `server/src/index.js` | 49 | canonical |
| 2 | `MipoPet` | `src/lib/mipoApi.ts:361` | 49 | mirrors 1 exactly |
| 3 | `PetProfile` | `PetPreferenceContext` | 12 | the global active pet |
| 4 | local `Pet` | `Profile.tsx:33` | 8 | **declares `size`** |
| 5 | public projection | `server/src/index.js:2069` | ~19 | redacted, lost-aware |
| 6 | social `pet` | `MipoSocialPost` | 5 | id, name, avatar, type, breed |
| 7 | admin | `MipoCustomerDetail.pets` | 49 in, **3 rendered** | §13 |
| 8 | 24 local `interface Pet` | 20 components + 4 pages | 4–12 each | one per sheet/card |

### Fields the API returns and no UI reads

`activities[]` (a verified mirror of `favorite_activities`), `pet_type`
(duplicate of `type`), `lost_show_phone` outside the lost flow.

### Fields the UI expects and the API does not return

| Field | Declared in | Consequence |
|---|---|---|
| `size` | `Profile.tsx`, `PetHealthScore`, `PetEssentials`, `PetRecommendationsInline`, `HealthScoreBreakdown` | dangling type only — P0 removed every read |
| `insurance_policy_number` | `InsuranceSheet.tsx:25,38,86,192` | the policy-number block **can never render** |

### Dead columns — still 11, as instructed

`age` · `size` · `weight_unit` · `current_mood` · `mood_score` ·
`mood_updated_at` · `vet_name` · `vet_phone` · `license_number` ·
`license_renewal_date` · `insurance_policy_number`

### Derived fields

`age_years`, `age_months` — server, per read. Nothing else is derived on the
server; every other derivation is in a component.

### Legacy fields

`activities[]` (kept as a dual-write mirror), `pet_type` (alias), `vet_clinic`
(superseded by `vet_clinic_name`, still coalesced).

---

## 7. Data Consumption Matrix

| Screen | Data | Source | API | Derived? | Pet Facts used? |
|---|---|---|---|---|---|
| Home (`MipoHome`) | active pet name, avatar | `PetPreferenceContext` | `GET /api/me/pets` | no | **no** |
| Home attention line | vaccine/visit/insurance/licence dates | `useHomeAttention` | `GET /api/me/pets/:id/health-summary` | yes — days-until | **no** |
| Home mood | mood label | `localStorage` | none | no | **no** |
| Home character | 3D avatar | `usePetCharacter` | `GET /api/me/pets/:id/character` | no | **no** |
| Pet dashboard header | name, breed, `age_years` | `getMyPets()` | `GET /api/me/pets` | age: server | **no** |
| Health score | score, completion | `getMyPetHealthSummary` | `…/health-summary` | yes — 7 components | **no** |
| Health breakdown | life stage, nutrition text | same | same | yes — own life stage | **no** |
| Medical timeline | vet visits | same | same | no | **no** |
| Vaccine countdown | next expiry | same | same | yes — days | **no** |
| Preventive care | due items | same | same | yes | **no** |
| Puppy scheduler | vaccine dates | prop `birth_date` | — | yes | **no** |
| Info tab (`TopRecommendation`) | age, size, weight, energy, chips | the pet prop | — | yes — **`breedInfo` is permanently `null`** | **no** |
| Essentials | products | `getShopProducts` | `GET /api/products` | keyword filter | **no** |
| Smart recommendation sheet | products | `getMyPet` + `getShopProducts` | both | pet **type** + keywords only | **no** |
| Energy sheet | energy level | `getBreedInfo` | `GET /api/breeds` | `src/lib/petActivity.ts` | **no** |
| Feeding sheet | food products | `fetchRecommendedProductGroups` | `GET /api/products` | **no amount is derived** (P0) | **no** |
| Insurance sheet | insurance fields | the pet prop | — | no | **no** |
| Vault drawer | documents | `getMyDocuments` | `GET /api/me/documents` | no | **no** |
| Claims history | claims | `getMyInsuranceClaims` | `GET /api/me/insurance-claims` | no | **no** |
| Vet history PDF | everything | `getMyPetHealthSummary` | `…/health-summary` | no | **no** |
| Documents page | documents | `getMyDocuments` + `getMyPets` | two calls | no | **no** |
| Shop list | safety badge | `checkProductSafety(text, activePet)` | `GET /api/products` | yes | **no** |
| Product detail | adjusted safety, feeding guidance | `petSafetyScore` + `feedingGuidance` | `GET /api/products/:id` | yes | **no** |
| Cart / Checkout | — | — | — | — | **no** — no pet is attached |
| Feed | post's pet name/avatar | `getSocialFeed` | `GET /api/feed` | no | **no** |
| Chat | pet + health context | server-side | `POST /api/ai/chat` | no | **no** |
| Found pet (public) | redacted pet | `getPublicPet` | `GET /api/public/pets/:id` | no | **no** |
| Admin customers | name, type, breed | `getAdminCustomer` | `GET /api/admin/customers/:id` | no | **no** |

**Pet Facts column: `no` in every row.**

---

## 8. Health

### What exists

| Item | UI | API | DB | Classification |
|---|---|---|---|---|
| Health score | `PetHealthScore` | `…/health-summary` | — | **Derived**, client-side, unversioned |
| Profile completion | same | same | — | **Derived**, 9 fields |
| Medical conditions | read-only chips | `serializePet` | `pets.medical_conditions text[]` | **Pet Core** (should be Fact) |
| Allergies | — | — | — | **DOES NOT EXIST** as a concept |
| Medications | — | — | — | **DOES NOT EXIST** — `MipoVetVisit` has no medication field the UI writes |
| Vaccinations | `VaccineCountdown` | `GET/POST …/vaccinations` | `pet_vaccinations` (11 col) | **Event** + expiry |
| Vet visits | `MedicalTimeline`, `VetVisitInput` | `GET/POST …/vet-visits` | `pet_vet_visits` (19 col) | **Event** |
| Medical documents | `PetVaultDrawer`, `/documents` | `GET/POST /api/me/documents` | `pet_documents` (13 col) | **Document** |
| **OCR / extraction** | — | — | — | **DOES NOT EXIST** |
| Insurance (on the pet) | `InsuranceSheet` read-only | `serializePet` | 3 `pets` columns | **Pet Core**, no writer |
| Insurance claims | `ClaimsHistory`, `LibraClaimForm` | `GET/POST /api/me/insurance-claims` | `insurance_claims` (18 col) | **Event** |
| Recovery mode | `RecoveryBanner` | `…/health-summary` | `pet_vet_visits.is_recovery_mode` | **Fact-like**, on the visit |
| Preventive care | `PreventiveCareEngine` | `…/health-summary` | — | **Derived**, read-time |
| Health-related AI | chat only | `POST /api/ai/chat` | — | see §13 |

### The health score, exactly

`PetHealthScore.tsx:158–195`:

```
vaccines      min(count × 8, 30)   count = recent vet-visit vaccines + pet_vaccinations rows, ≤12 months
weight        15                   if pet.weight is truthy
parasites     12                   keyword scan for תילוע/deworm/milbemax/drontal in visit free text
profile       completion% × 0.10   9 fields
last visit    13 / 10 / 5 / 2      ≤3 / ≤6 / ≤12 / >12 months
clinic        10                   vet_clinic_name OR any visit's clinic_name
owner         10                   full_name && city && phone
recovery      −8
```

Two things follow from reading it:

- The variable is called `hasRecentWeight` and is `!!summary.pet.weight`. There
  is no weight history, so a weight entered three years ago scores the same 15
  points as one entered today.
- Two of the nine profile-completion fields (`current_food`, `has_insurance`)
  have **no writer in the UI**, so completion is capped below 100% for anyone
  who did not have those set by some other means.

### Document upload — what actually happens

`MedicalDocumentFAB.processFile`:

```ts
// AWS upload without document OCR. Full AI extraction will be migrated separately.
setStep('scanning');
await createMyDocument({ pet_id, document_type: "medical", title: file.name, file });
toast({ title: "המסמך הועלה ✅" });
```

The step is named `scanning`; nothing is scanned. `extractLocalSummary` — the
keyword matcher for `כלבת`, `משושה`, `תילוע`, `fvrcp`, `rabies` — runs **only**
on `manualSummary`, text the owner typed. It returns `weight: null`,
`microchipNumber: null`, `petBirthDate: null` and every other identity field as
`null`, by construction.

---

## 9. Nutrition

### What the user sees today, after P0

| Surface | Content |
|---|---|
| Product detail → "הוראות האכלה" | the product's own `feeding_guide` lines, verbatim, followed by a provenance line: **"הנחיות יצרן"** only when `feeding_guide_source = manufacturer_confirmed`, otherwise **"מידע שחולץ מדף המוצר"** |
| `FeedingSheet` | product cards + one generic sentence: *"חלקו לשתי ארוחות במהלך היום. לכמות המדויקת — ראו את הנחיות המוצר."* |
| `FoodSheet`, `PetEssentials` | keyword-matched catalogue products |
| Health breakdown | a nutrition *paragraph* referencing life stage and breed — text, not an amount |

**Mipo derives no owner-facing feeding amount.** Verified: the only consumers of
`src/lib/feedingGuidance.ts` are `ProductDetailAws.tsx:221` and `:529`. The four
body-weight-percentage calculations are gone, and `RER`/`MER` survives only in
`CentralBrainContext.calculateNrc`, which has no rendered consumer.

### The rest of the nutrition surface

| Item | Status |
|---|---|
| Food profile | `pets.current_food` — **read in 5 places, written in 0** |
| Ingredients | `business_products.ingredients`, shown as free text on the product page |
| Calories | `business_products.kcal_per_kg` — a product attribute; no per-pet number is shown |
| Dietary preferences | `business_products.special_diet[]` badges; nothing pet-side |
| Allergies | **do not exist** |
| Food purchase history | `orders`/`order_items` exist; **no pet is attached to either** |

---

## 10. Activity

**Nothing in this domain exists.**

| Asked | Verdict |
|---|---|
| Walks | no table, no route, no screen |
| Steps, distance, calories | none |
| Activity level | derived from **breed reference data** in `src/lib/petActivity.ts`; never measured |
| Parks | `dog_parks` (24 columns) exists in migration `0011`; **no server route and no screen reads it** |
| Check-ins | none |
| Activity history | none |
| Activity events | none |

`favorite_activities[]` on the pet is a set of tags the owner picked at
creation, not activity.

`DogWalkerSheet` is a **booking form** — three hard-coded walkers, three
durations — writing to `pet_service_bookings`. It records an intent to walk, not
a walk.

---

## 11. Store

### Store home (`Shop.tsx`, 1023 lines)

Sections, category chips, search, sort, a product grid, an info drawer and a
quick-view sheet. Personalisation is **one thing**: `useActivePet()` supplies a
pet to `checkProductSafety(text, activePet)`, which renders a `SafetyBadge`.

### Product cards

Name, image, price, category, stock, `safety_score` — and, when a pet is active,
a safety level and reason. The pet inputs to that are `birth_date`/`age_*`,
`breed` and `medical_conditions` (`PetSafetyContext`).

### Product detail (`ProductDetailAws.tsx`)

- pet-adjusted safety score with an `explainAdjustment` line;
- ingredients as free text;
- **feeding guidance with provenance** (§9);
- `special_diet` badges;
- a fixed "backbone" of attributes that says so when a value is missing;
- the pet used is `?petId=` if present, else the active pet.

No variants. `product_variations` exists for `scraped_products` only; the
canonical catalogue has no variant model.

### Checkout, orders, purchase history

**No pet is associated with an order at any point.** `orders.pet_name` is
accepted by the server (`index.js:3729`) and read by
`OrderLabelGenerator.tsx`, and **no client ever sends it**. `order_items` has no
`pet_id`. Purchase history is therefore owner-level, and nothing pet-facing can
read it.

### Recommendations

`fetchRecommendedProducts` filters the catalogue by `in_stock`, `pet_type` and a
keyword list. `SmartRecommendationSheet` adds `age_years` for a label only. No
allergy, condition, weight or preference enters product selection anywhere.

---

## 12. Social

| Item | Status |
|---|---|
| Feed | `MipoFeed` → `GET /api/feed` |
| Posts | image/video + caption + optional poll; `pet_id` optional |
| Comments, reactions, saves, poll votes | exist |
| Moments (as a separate concept) | **do not exist** |
| Follows / friends | **do not exist** |
| Activity-generated content | **does not exist** |
| Pet profiles in social | a 5-field projection: `id`, `name`, `avatar_url`, `type`, `breed` |

The composer lets the author attach one of their pets (`pet_id`), defaulting to
the active pet. `social_posts.pet_id` is `ON DELETE SET NULL`, so deleting a pet
silently orphans its posts — the post survives with no pet.

`social_posts.location` is free text and is not a park reference.

---

## 13. AI

### Entry points

| Entry point | UI | API | Feature slug | Provider |
|---|---|---|---|---|
| Mipo AI chat | `/chat` | `POST /api/ai/chat` | `ai_chat` | Gemini via `aiGateway` |
| Chat with an attachment | same | same | `document_analysis` (`capability: vision`) | same |
| Pet character generation | `PetCharacterStudio` | `POST /api/me/pets/:id/character` | `pet_character` | Google SDK, metered via `recordExternalUsage` |
| Product intelligence | admin only | `/api/product-intel/*` | `ingredient_analysis` | Gemini |
| Breed detection | `AddPet` | — | — | **stub, no call** (§4) |
| Document OCR | — | — | — | **does not exist** |
| AI insights | — | — | — | **do not exist** |

### The chat context, exactly

`buildPetAiPrompt` (`server/src/index.js:3500`) sends:

```jsonc
{
  "user":  { "name": "…" },
  "pets":  [ { id, name, type, breed } ],                     // compactPetForAi
  "selected_pet": { id, name, type, breed, age_years, age_months,
                    gender, weight, medical_conditions,
                    current_food, last_vet_visit, next_vet_visit,
                    has_insurance },                          // compactSelectedPetForAi
  "selected_pet_health": {                                    // compactHealthSummaryForAi
    "recent_vet_visits":  [ …5, incl. diagnosis, treatment, notes ],
    "vaccinations":       [ …8, name + dates ],
    "documents":          [ …8, TITLE and TYPE only ],
    "active_recovery":    { … }
  },
  "attachments": [ … ]
}
```

### What the AI receives, by domain

| Domain | Received |
|---|---|
| Pet Core | ✅ 13 fields for the selected pet, 4 for the others |
| **Pet Facts** | ❌ **nothing** |
| Health | ✅ visits, vaccinations, recovery |
| Documents | ⚠️ **metadata only** — title, type, date. Never content |
| Activity | ❌ does not exist |
| Store / commerce | ❌ nothing. The prompt says so explicitly: *"You do not have the Mipo Store catalogue…"* |
| Social | ❌ nothing |
| Provenance | ❌ nothing — every value arrives unattributed |

The model returns a `products` array of **search phrases**, resolved against the
real catalogue by `resolveCatalogProducts`; anything that does not match a real
in-stock row is dropped. The model never sees a price or a SKU.

Every AI call carries `userId` and `petId` into `ai_requests` → `usage_events` →
`cost_events`, so spend is already attributable per pet in the ledgers.

---

## 14. Admin / CRM

### Admin screens that exist

| Route | Screen | Pet-related? |
|---|---|---|
| `/admin/products` | `AdminProducts` | no |
| `/admin/orders` | `AdminOrders` | only `orders.pet_name`, which is never written |
| `/admin/customers` | `AdminCustomers` | **the only pet surface** |
| `/admin/analytics` | `AdminAnalytics` | no |
| `/admin/ai-economics` | `AdminEconomics` | no pet dimension in the UI |
| `/admin/categories`, `/coupons`, `/settings`, `/notifications`, `/quick-import`, `/smart-editor` | — | no |

### The only admin pet view

`AdminCustomers.tsx:519–537`, inside the customer drawer:

```tsx
<h4>🐾 חיות מחמד</h4>
{pets.length === 0 ? <p>אין חיות רשומות</p> :
  pets.map(pet => (
    <div>
      <span>{pet.name}</span>
      <span>{PET_TYPE_LABELS[pet.type]}{pet.breed ? ` · ${pet.breed}` : ""}</span>
    </div>
  ))}
```

**Three fields.** `GET /api/admin/customers/:id` calls
`listUserPets(customer.user_id, "all")` and returns the **full 49-field
`serializePet` output for every pet, including archived ones**. The UI renders
name, type and breed and discards the rest.

- source / provenance shown: **no**
- history shown: **no**
- current vs historical: **no such distinction exists**
- admin can edit a pet: **no** — there is no admin pet route of any method

### Verdicts the brief asked for

| Question | Answer |
|---|---|
| Does an Admin Pet 360 exist? | **NO** |
| Does a CRM pet view exist? | **NO** — `BusinessCRM.tsx` exists as a file and is reachable from no route; `/business-crm` redirects to `/shop` |
| Can an admin see health data? | **NO** |
| Can an admin see documents? | **NO** |
| Can an admin edit pet data? | **NO** |

---

## 15. User vs Admin vs System

```
USER
  sees   name · species · breed · age · gender · neuter · weight · conditions ·
         health notes · personality tags · favourite activities · avatar ·
         theme · insurance flags · vet clinic · microchip suffix · licence ·
         vaccinations · vet visits · documents · claims · health score
  controls  13 fields (§3), archive/restore, lost mode, documents,
            vet visits, vaccinations, claims, bookings, posts

ADMIN / CRM
  sees   pet NAME · TYPE · BREED, and a count. Nothing else.
  manages  nothing about a pet

SYSTEM (exists, exposed to nobody)
  pet_facts · pet_fact_definitions · pet_observations · pet_fact_transitions
  outbox_events (incl. pet_id, payload_version)
  ai_requests / usage_events / cost_events  — per-pet AI spend
  qr_scan_logs                              — written by index.js:2125, absent from all 38 migrations
  dog_parks                                 — 24 columns, zero readers
  breed_information                         — read by 2 screens only
  11 dead pets columns
  localStorage: mipo-care-plan:<petId>, mipo-mood-<petId>-<date>
```

The asymmetry is the finding: **the user is the only party with a pet view, and
the system holds materially more than either the user or the admin can see.**

---

## 16. Data Visibility Matrix

`stored` = a column or table exists · `user` = visible in the app ·
`admin` = visible in admin · `edit-U/A` = editable by user/admin ·
`derived` · `source` = provenance shown · `history` = history shown.

| Data | stored | user | admin | edit-U | edit-A | derived | source | history |
|---|---|---|---|---|---|---|---|---|
| name | ✅ | ✅ | ✅ | ✅ | ❌ | — | ❌ | ❌ |
| species | ✅ | ✅ | ✅ | ❌ | ❌ | — | ❌ | ❌ |
| breed | ✅ | ✅ | ✅ | ✅ | ❌ | — | ❌ | ❌ |
| age | derived | ✅ | ❌ | via birth date | ❌ | **✅ server** | ❌ | ❌ |
| birth date | ✅ | ✅ | ❌ | ✅ (2 places) | ❌ | — | ❌ | ❌ |
| sex | ✅ | ✅ | ❌ | ✅ | ❌ | — | ❌ | ❌ |
| neutered | ✅ | ✅ | ❌ | ✅ | ❌ | — | ❌ | ❌ |
| **weight** | ✅ + `pet_facts` | ✅ | ❌ | ✅ (1 place) | ❌ | — | ❌ | **in `pet_facts` only, unread** |
| target weight | registry only | ❌ | ❌ | ❌ | ❌ | — | — | — |
| size | dead column | ❌ | ❌ | ❌ | ❌ | registry: derived, no writer | — | — |
| **allergies** | registry only | ❌ | ❌ | ❌ | ❌ | — | — | — |
| medical conditions | ✅ `text[]` | ✅ | ❌ | **creation only** | ❌ | — | ❌ | ❌ |
| medications | ❌ | ❌ | ❌ | ❌ | ❌ | — | — | — |
| vaccinations | ✅ | ✅ | ❌ | ✅ | ❌ | expiry derived | ❌ | ✅ list |
| vet visits | ✅ | ✅ | ❌ | ✅ | ❌ | — | ❌ | ✅ timeline |
| nutrition (`current_food`) | ✅ | ✅ | ❌ | **❌ no writer** | ❌ | — | ❌ | ❌ |
| behaviour (`personality_tags`) | ✅ | ✅ | ❌ | creation only | ❌ | — | ❌ | ❌ |
| preferences (`favorite_activities`) | ✅ | ✅ | ❌ | creation only | ❌ | — | ❌ | ❌ |
| preferences (care plan) | **localStorage** | ✅ | ❌ | ✅ | ❌ | — | ❌ | ❌ |
| mood | **localStorage** | ✅ | ❌ | ✅ | ❌ | — | ❌ | ❌ |
| activity | ❌ | ❌ | ❌ | ❌ | ❌ | breed prior only | — | — |
| walks | ❌ | ❌ | ❌ | ❌ | ❌ | — | — | — |
| documents | ✅ | ✅ | ❌ | ✅ | ❌ | — | ❌ | ✅ list |
| purchases | ✅ owner-level | ✅ owner-level | ✅ | — | ❌ | — | ❌ | ✅ |
| recommendations | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ keyword | ❌ | ❌ |
| AI-derived info | ❌ | ❌ | ❌ | ❌ | ❌ | — | — | — |
| microchip | ✅ | ✅ suffix | ❌ | **❌ no writer** | ❌ | — | ❌ | ❌ |
| insurance | ✅ ×3 | ✅ | ❌ | **❌ no writer** | ❌ | — | ❌ | ❌ |
| vet clinic | ✅ ×4 | ✅ | ❌ | **❌ no writer** | ❌ | — | ❌ | ❌ |
| lost mode | ✅ ×8 | ✅ | ❌ | ✅ | ❌ | — | ❌ | ❌ |
| **provenance** | `pet_facts` only | ❌ | ❌ | ❌ | ❌ | — | ❌ | ❌ |

Reading down the `source` column: **provenance is displayed nowhere in the
product today.** The one exception in the whole app is the feeding-guidance
label on the product page, which is about a *product*, not a pet.

---

## 17. Empty States

| Missing | Actual behaviour |
|---|---|
| no weight | `TopRecommendation` chip → `לא צוין`; health score loses 15 points; `FelineDashboard` → `{status: 'unknown', label: 'לא צוין'}` |
| no birth date | age chip → `לא צוין`; `petAge()` returns `null`, so the age band is skipped rather than defaulted; `PuppyVaccineScheduler` renders nothing |
| no breed | header falls back to `כלב`/`חתול`; PDF prints `לא ידוע` |
| no medical conditions | condition chips omitted; no empty message |
| no documents | vault shows an empty list; the documents attention slot stays silent |
| no vaccinations | `VaccineCountdown` renders nothing |
| no vet visits | `MedicalTimeline` renders nothing |
| no clinic | `MyClinicCard` is not rendered at all (`{selectedPet.vet_clinic_name && …}`) |
| no purchases | order history empty state |
| no preferences / behaviour | tags simply absent |
| no activity | **no surface exists to be empty** |
| no pets at all | pet dashboard shows one dashed circle: *"הוסף חיית מחמד ראשונה"* |
| no breed reference data | `EnergySheet` → `רמת אנרגיה: לא ידועה` (P0 — it no longer defaults to "בינונית") |
| no product safety score | `computePetAdjustedScore` returns `null`, and the badge is omitted rather than showing 0 |

Two patterns stand out and both are deliberate P0 outcomes: **unknown renders as
`לא צוין`, never as `0`**, and a missing derivation is skipped rather than
defaulted.

---

## 18. Current Data Flow

```
                              USER
                               │
        ┌──────────────────────┼──────────────────────┐
        ↓                      ↓                      ↓
   BottomNav(3)          MipoHome orbit(4)      OwnerProfile
   /feed /chat /              │                      │
        │              health│documents│shop│chat     │
        ↓                    ↓         ↓    ↓  ↓      ↓
   ┌─────────┐        ┌──────────────┐ │    │  │  ┌──────────┐
   │ MipoFeed│        │ /pet-profile │ │    │  │  │/edit-pet │
   └────┬────┘        │  Profile.tsx │ │    │  │  └────┬─────┘
        │             └──────┬───────┘ │    │  │       │
        │            ┌───────┴────────┐│    │  │       │
        │            ↓                ↓│    │  │       │
        │      PetDashboardTabs   13 sheets │  │       │
        │      ┌────┬────┬────┬────┐        │  │       │
        │      ▼    ▼    ▼    ▼    ▼        ▼  ▼       │
        │   score medical info services  Shop Chat     │
        │      │    │    │                │  │        │
        ├──────┴────┴────┴────────────────┴──┴────────┤
        ↓                                              ↓
  ┌───────────────────────────────────────────────────────┐
  │  CLIENT STATE                                          │
  │   PetPreferenceContext  activePet + pets (12 fields)   │
  │   CentralBrainContext   mounted, ZERO consumers         │
  │   CartContext · GuestContext · ChatContext              │
  │   localStorage  activePetId · mipo-care-plan:<pet>      │
  │                 mipo-mood-<pet>-<date> · mipo-cart      │
  └────────────────────────┬──────────────────────────────┘
                           ↓  src/lib/mipoApi.ts
  ┌───────────────────────────────────────────────────────┐
  │  API — server/src/index.js                             │
  │   requireUser  →  getUserPet(userId, petId)            │
  │   READ   serializePet(row)        :1790   49 fields    │
  │   WRITE  normalizePetPayload()    :1845   42 columns   │
  │   GET  /api/me/pets · /:id · /health-summary           │
  │        /vet-visits · /vaccinations · /character         │
  │   GET  /api/me/documents · /insurance-claims           │
  │   POST /api/ai/chat  →  aiGateway  →  Gemini           │
  │   GET  /api/products · /breeds · /feed                 │
  │   GET  /api/admin/customers/:id  (pets: full, UI: 3)   │
  └────────────────────────┬──────────────────────────────┘
                           ↓
  ┌───────────────────────────────────────────────────────┐
  │  POSTGRESQL 16                                         │
  │   pets(57) · pet_vet_visits(19) · pet_vaccinations(11) │
  │   pet_documents(13) · insurance_claims(18)             │
  │   pet_service_bookings(17) · social_posts · orders      │
  │   business_products · breed_information · dog_parks*    │
  │   ai_requests → usage_events → cost_events  (pet_id ✅) │
  │   outbox_events (+ pet_id, payload_version)            │
  │                                                        │
  │   ┌── P1 FOUNDATION — NO READERS, NO WRITERS ────────┐ │
  │   │  pet_fact_definitions (17 keys)                   │ │
  │   │  pet_facts          ← only the 0039 backfill      │ │
  │   │  pet_fact_transitions                             │ │
  │   │  pet_observations   ← only the 0039 backfill      │ │
  │   └───────────────────────────────────────────────────┘ │
  │   * dog_parks: 24 columns, zero readers                │
  └───────────────────────────────────────────────────────┘
```

---

## 19. Pet Facts Consumption

Searches run across the whole repository:

```
grep -rn "pet_facts|petFactService|petFactRegistry|/facts|/observations" src/
  → 0 results

grep -rln "petFactService|pet_facts" server/src/ server/scripts/
  → server/src/index.js                        (the 7 routes)
  → server/src/petFactService.js               (the service itself)
  → server/scripts/petFactsIntegrationCheck.mjs (the test harness)
```

| Question | Answer |
|---|---|
| Who writes Pet Facts? | migration `0039` (the weight backfill), and the seven API routes — which no client calls |
| Who reads Pet Facts? | `petFactsIntegrationCheck.mjs` only |
| Which UI reads Pet Facts? | **nobody** |
| Which AI reads Pet Facts? | **nobody** — `compactSelectedPetForAi` reads `serializePet` |
| Which CRM reads Pet Facts? | **nobody** — and there is no CRM |

**Nobody yet.** That is the truthful answer and it is the expected one: P1 was
explicitly an ADD → VALIDATE → BACKFILL sprint with no consumer migration.

The one live effect the foundation has today: every pet with a weight has a
`physical.weight` fact and a `pet_observations` row carrying
`source_type = USER_PROVIDED`, `confidence = MEDIUM`, `source_id =
'backfill@0039'` — and `pets.weight` is unchanged and still the only value any
screen reads.

---

## 20. Duplicate Data Paths

Ten, in rough order of consequence.

### 1. Life stage — four implementations, different thresholds

```
TopRecommendation.tsx:393     <6m גור · <12m גור צעיר · <24m צעיר · years>7 סניור   (no species branch)
HealthScoreBreakdown.tsx:170  same, but cats: senior at years>10
SmartRecommendationSheet:125  age_years>=8 → senior · age_years<1 → puppy
FelineDashboard.tsx:89        ageYears>=7 → senior
(+ PuppyVaccineScheduler / BreedHealthTips use totalMonths<=6)
```

An 8-year-old cat is `בוגר/ת` in one panel and `סניור` in another, on the same
pet, in the same session. `identity.life_stage` is registered in `pet_fact_definitions`
as derived — with no writer.

### 2. The pet object — 8 representations, 24 local interfaces

§6. Five local interfaces still declare `size`; one declares
`insurance_policy_number`.

### 3. Weight

```
pets.weight                      ← the only value any screen reads
pet_facts physical.weight (g)    ← backfilled, read by nobody
pet_observations weight (g)      ← backfilled, read by nobody
TopRecommendation weightValue    ← local editor state
```

### 4. Health summary — 9 independent fetchers

Eight of the nine live on the pet dashboard, firing in groups as tabs mount —
three at once on the רפואי tab. No shared cache, no deduplication; each has its
own `useState`/`useEffect`, and switching tabs re-fetches.

### 5. Vaccination count — two sources summed

`PetHealthScore` adds `pet_vaccinations` rows to `pet_vet_visits.vaccines[]`
entries. A vaccine recorded both ways is counted twice, and each is worth 8
points.

### 6. Clinic name — three sources, coalesced differently

```
serializePet          vet_clinic_name || vet_clinic
health-summary        vet_clinic_name || vet_clinic || first visit's clinic_name
PetHealthScore        vet_clinic_name || first visit's clinic_name       (drops vet_clinic)
HealthScoreBreakdown  vet_clinic_name only                              (drops both)
```

### 7. `last_vet_visit` / `next_vet_visit` — column and derivation

`pets.last_vet_visit` is a column; `health-summary` overrides it with the newest
`pet_vet_visits.visit_date` and overrides `next_vet_visit` with the earliest
future date across visits and vaccinations. Two screens read the column
directly, so they can disagree with the summary.

### 8. Breed — a string and two unused columns

`AddPet` writes `"לברדור + פודל"` into `breed`; `secondary_breed` and `is_mixed`
are collected by the form, accepted by the API, and never sent.

### 9. Care plan and mood — browser-only pet data

`mipo-care-plan:<petId>` and `mipo-mood-<petId>-<date>` are per-pet state the
server never sees and a second device never gets.

### 10. Age — canonical, with residue

P0 made `calculatePetAge` the single derivation and `src/lib/petAge.ts` the
single client reader. `PetPreferenceContext` still carries `age_years`/`age_months`
into a third shape, and `petSafetyScore` re-derives months from that shape —
correctly, via `petAge`, but through one more hop than necessary.

---

## 21. Working / Confusing / Incomplete / Contradictory / Broken

### Working well — preserve

- **One read seam, one write seam.** `serializePet` / `normalizePetPayload`.
  Every screen is downstream of them.
- **Ownership is a query predicate.** `getUserPet(userId, petId)` — `where id =
  $1 and user_id = $2` — everywhere, with 404 rather than 403.
- **Unknown renders as unknown.** `לא צוין` / `null`, never `0`. Consistent
  across age, weight, safety score and energy after P0.
- **The public pet projection is properly redacted** — phone only when lost and
  the owner opted in, city only when the profile is public *and* location
  sharing is on.
- **Honest feeding provenance.** The product page distinguishes
  "הנחיות יצרן" from "מידע שחולץ מדף המוצר".
- **The AI prompt refuses to invent products.** It emits search phrases that are
  resolved against the real catalogue, and unmatched ones are dropped.
- **The attention line marks its own gaps** — `TODO(api)` for the shop and chat
  slots rather than inventing content.
- **Archiving preserves medical history**, and the confirm dialog says so.

### Confusing

- The screen called **"עריכת פרופיל"** edits 5 of 42 writable columns; weight and
  age live on chips two tabs away, on a different screen.
- **Two creation flows** with different field sets. Which one you get depends on
  whether it is your first pet.
- `hasRecentWeight` **is not recent** — it is `!!pet.weight`, with no date.
- The pet dashboard's menu offers **"מסמכים"** (a drawer) while the orbit offers
  **"מסמכים"** (a page); they are different surfaces over the same data.
- **`activities` and `favorite_activities`** are both returned and both mean the
  same thing.
- Tapping **"stories"/"videos"** on the pet dashboard lands on the feed, and the
  header's message icon lands on the chat.

### Incomplete — the backend supports it, the UI does not expose it

| Column(s) | Read in | Writable |
|---|---|---|
| `current_food` | 4 files, incl. the health score and the vet PDF | **no** |
| `microchip_number` | 8 files, drives the `isVerified` badge | **no** |
| `has_insurance`, `insurance_company`, `insurance_expiry_date` | health score, chips, sheet, **and the home attention line** | **no** |
| `vet_clinic*` (4) | health score, `MyClinicCard`, `OwnerProfile` | **no** |
| `license_expiry_date` | the home attention line | **no** |
| `color`, `secondary_breed`, `is_mixed` | PDF, public pet | **no** |
| `medical_conditions`, `personality_tags`, `favorite_activities`, `health_notes` | many | **creation only** |

The consequence worth stating: **the documents slot of the home attention line
can never fire for a user of this app**, because both of its inputs
(`insurance_expiry_date`, `license_expiry_date`) have no writer.

The whole P1 foundation is also in this category — see §19.

### Contradictory

1. **Life stage** — §20.1. Two panels, one pet, different answers.
2. **Clinic name** — four different coalesce orders (§20.6).
3. **`last_vet_visit`** — the column and the summary disagree by design (§20.7).
4. **Archive semantics** — four call sites set `archived_at`, one does not
   (`PetCard.tsx:108`), and that one calls it "removed".
5. **`isSizeFromBreed` / `isWeightFromBreed` / `isAgeFromBreed`** in
   `TopRecommendation` are computed from `breedInfo`, which is permanently
   `null` — the flags exist, are false forever, and the UI still branches on
   them.

### Hidden — exists, nobody can reach it

- **Everything in `pet_facts` / `pet_observations`** (§19).
- **Per-pet AI spend** — `ai_requests.pet_id` is populated on every call; no
  screen, user or admin, shows it.
- **`dog_parks`** — 24 columns, zero readers.
- **`breed_information`** — 40 columns, read by two screens; the pet dashboard's
  breed section never fetches it.
- **`CentralBrainContext`** — mounted app-wide, zero rendered consumers, and
  documented as such in its own header.
- **`qr_scan_logs`** — `index.js:2125` inserts into a table that appears in none
  of the 38 migration files.
- **`mipo:fleet-safety`** — `PetPreferenceContext` dispatches this event when
  switching to a healthy pet while another pet has conditions. **No listener
  exists anywhere in the app.**
- The full pet object the **admin API already returns** and the admin UI drops.

### Broken — the UI claims something the backend did not do

1. **`MedicalDocumentFAB.handlePetDataConfirm`** — toasts
   "פרופיל החיה עודכן ✅" while `updateMyPet` is provably never called, because
   every field feeding `petUpdate` is hard-coded `null`/`false` upstream.
2. **`petReview` and `profileReview` steps** in the same component are
   unreachable: `hasPetData` and `hasProfileData` are always false.
3. **`detectBreed`** is a stub. The spinner ("מזהה גזע…"), the failure banner and
   the health-risk display are all unreachable, and `breed_confidence` is always
   `null` on create.
4. **`PetCard`'s "הוסר/ה בהצלחה"** for an archive that also omits `archived_at`.
5. **`AddPet?onboarding=true`** — the `isOnboarding` branch (welcome step,
   extra step count, badge) is never linked from anywhere.
6. **Eleven page components with no route**, including `BusinessCRM.tsx`.

---

## 22. Known Gaps

| # | Gap | Status |
|---|---|---|
| 1 | No admin pet view beyond name/type/breed | **CONFIRMED** |
| 2 | No CRM at all | **CONFIRMED** — file exists, no route |
| 3 | No activity domain | **CONFIRMED** |
| 4 | No document OCR or extraction | **CONFIRMED** |
| 5 | No allergy or medication model | **CONFIRMED** |
| 6 | No pet↔order attribution | **CONFIRMED** |
| 7 | No provenance visible anywhere in the product | **CONFIRMED** |
| 8 | No history visible for any pet value | **CONFIRMED** |
| 9 | Pet Facts have no consumers | **CONFIRMED** (§19) |
| 10 | Nine fields readable and unwritable | **CONFIRMED** |
| 11 | `qr_scan_logs` written to a non-existent table | **CONFIRMED** — every QR scan of a lost pet is discarded |
| 12 | Health score is client-side, unversioned, unexplained | **CONFIRMED** |
| 13 | No shared fetch cache — 8 identical requests per screen | **CONFIRMED** |
| 14 | Does the health score match any published rubric? | **UNKNOWN** — no source is cited in code or docs |
| 15 | Was `detectBreed` stubbed deliberately or during the AWS migration? | **UNKNOWN** — the comment on `processFile` says "will be migrated separately", which suggests the latter |
| 16 | Are the 11 unreferenced pages retired or pending? | **UNKNOWN** — no marker either way |

---

## 23. Exact Next-Step Questions

These are the decisions the next task cannot be started without. They are
questions, not proposals.

**On the foundation's first consumer**

1. Which value should read from `pet_facts` first — weight, or something with
   less UI attached? Weight has exactly one editor and five readers.
2. When a screen reads a fact, should it show the provenance and the date, or
   only the value? Nothing in the product shows provenance today.
3. Should `serializePet` start returning fact-backed values behind the existing
   keys (invisible to consumers), or should facts arrive on a new key?

**On the fields nobody can write**

4. `current_food`, `microchip_number`, insurance, vet clinic — should these get
   editors, or be retired from the health score and the attention line? They
   currently penalise every user for data no user can supply.
5. Should `medical_conditions`, `personality_tags` and `favorite_activities`
   become editable after creation before they move to facts, or wait?

**On life stage**

6. Which of the four thresholds is correct, per species? A single answer is
   needed before `identity.life_stage` gets its writer.
7. Does life stage belong on the server (as a derived fact) or stay a display
   concern?

**On admin**

8. Should the admin see pet health data at all? This is a privacy decision, not
   a technical one — the data is clinical and the admin is a shop operator.
9. If yes: read-only, or editable? And does an admin edit count as
   `USER_PROVIDED`, `ADMIN` channel, or something else? The provenance model
   needs an answer before an admin write path exists.

**On the broken flows**

10. Should `detectBreed` be restored, or should the breed-detection UI be
    removed? It currently promises a capability that does not run.
11. `MedicalDocumentFAB`'s unreachable review steps — do they wait for real
    extraction, or come out now?
12. The 11 unreferenced pages, `BusinessCRM.tsx` in particular — retire or
    restore?

**On scope**

13. Is Activity in scope at all in the next phase? Half the Pet Intelligence
    design assumes it, and none of it exists.
14. Should `order_items.pet_id` land before or after the first fact consumer?
    Commerce is the largest un-attributed data source in the system.

---

```
CURRENT_SYSTEM_AUDIT: COMPLETE
Pet Facts currently consumed:                NO
Pet Facts currently written by existing UI:  NO
Pet Facts currently consumed by Admin:       NO
Pet Facts currently consumed by AI:          NO
Existing Pet Profile:                        FOUND   (src/pages/Profile.tsx + PetDashboardTabs, 4 tabs, 13 sheets)
Existing Admin Pet View:                     FOUND   (AdminCustomers drawer — name, type, breed only)
Existing CRM Pet View:                       NOT_FOUND
Major duplicate data paths:                  10
Major UI/data mismatches:                    11
Major broken flows:                          6
```

### What we now know about the existing product

1. **The product is four surfaces plus a pet dashboard**, and the dashboard is
   reachable from exactly one tile. The shop is not in the bottom nav.
2. **The server is one pet object; the client is eight.** 24 files — 20
   components and 4 pages — declare their own `interface Pet`.
3. **Reads outnumber writes by a wide margin.** 42 writable columns; 17 the UI
   can change after creation, 6 more only at creation, **19 never**; 5 on the
   screen called "edit".
4. **Nineteen columns have no UI writer**, thirteen of them are read anyway,
   and two — `insurance_expiry_date` and `license_expiry_date` — are the only
   inputs to a home-screen alert that therefore never fires.
5. **Activity does not exist.** Not partially — at all.
6. **Document intelligence does not exist.** The upload is a file upload, the
   "scan" is a keyword match over text the owner typed, and the review screens
   built for extracted data are unreachable.
7. **AI breed detection does not run.** The function is a stub; the UI still
   contains its spinner and its failure message.
8. **There is no admin pet view and no CRM.** The admin API returns everything
   and the UI renders three fields. No admin route can write to a pet.
9. **Provenance and history are invisible everywhere in the product**, for both
   user and admin. The one provenance label in the whole app is about a product.
10. **Life stage is the live inconsistency**: four derivations, two of them on
    the same screen, disagreeing about the same animal.
11. **The health score is a client-side, unversioned, unexplained number** built
    from seven weighted inputs, two of which the user cannot supply.
12. **The P1 foundation is complete, correct, backfilled — and connected to
    nothing.** That is exactly what it was scoped to be, and it is the fact the
    integration phase starts from.
