# 02 — Onboarding

## What exists today — `EXISTS`, and it is already simple

`src/pages/Onboarding.tsx` (246 lines). Five steps, and only **four** pieces of
information are asked for:

```
welcome ──► photo ──► reveal ──► details ──► creating ──► success
  (1)        (2)        (3)         (4)         (4)         (5)
   │          │          │           │
 dog|cat    photo     preview    name + breed
```

```ts
type Phase = "welcome" | "photo" | "reveal" | "details" | "creating" | "success";
const stepForPhase = { welcome:1, photo:2, reveal:3, details:4, creating:4, success:5 };
```

Calls: `uploadMyImage()` then `createMyPet()`. Species choice also sets the
app-wide `PetPreferenceContext`, which drives theming and shop filtering.

**This already follows "keep it simple".** The long questionnaire in the brief
would be a regression against what is shipped.

### Species at onboarding — `NEEDS EXTENSION`
The picker offers **dog and cat only** (`chooseType(type: "dog" | "cat")`,
imported icons `Dog`, `Cat`). The database agrees:

```sql
pets_type_check CHECK (type = ANY (ARRAY['dog','cat','other']))
```

A bird or a rodent cannot be onboarded as itself. See `27-SPECIES-DIFFERENCES.md`.

---

## The rest of the fields: where they actually live

`src/pages/AddPet.tsx` is 1,480 lines and is the full form. `pets` has 57
columns. So the system already implements progressive disclosure — the
questionnaire exists, it just is not in onboarding. That is the right shape.

## Field classification

Recommendation for what onboarding should ever ask, based on what the schema
already supports. `PROPOSED` throughout — none of this is enforced today.

| Field | Column | When | Why |
|---|---|---|---|
| Species | `pets.type` | **Required, onboarding** | Determines every downstream branch |
| Name | `pets.name` | **Required, onboarding** | `NOT NULL` |
| Photo | `pets.avatar_url` | **Onboarding, skippable** | Highest emotional payoff per tap |
| Breed | `pets.breed` | Onboarding, optional | Already optional in the form |
| Sex | `pets.gender` | Defer to first health context | |
| Birth date | `pets.birth_date` | Defer | Enables life stage; ask when it buys something |
| Neutered | `pets.is_neutered` | Defer | Nutrition/behaviour relevance only |
| Weight | `pets.weight` | Defer | Should become a time series first — see `04` |
| Size | `pets.size` | **Derive** | From breed + weight, not a question |
| Age | `pets.age` | **Never ask** | Derivable from `birth_date`; storing both is the bug in `04` |
| Life stage | — | **Derive** | No column exists |
| Medical conditions | `pets.medical_conditions[]` | Defer to Documents/Health | |
| Allergies | *no column* | `MISSING` | Currently forced into `medical_conditions` |
| Target weight | *no column* | `MISSING` | |
| Body condition | *no column* | `MISSING` | |
| Feeding schedule/amount | *no column* | `MISSING` | `current_food` is a free-text string |
| Measurements | *no column* | `MISSING` | Needed for accessories sizing |
| Activity level | *no column* | `MISSING` | Would be activity-derived — and there is no activity |
| Documents | `pet_documents` | Always later | Separate page |
| Microchip / licence | `pets.microchip_number`, `license_*` | Defer | Israeli licensing fields already exist |

## The seven questions, applied

For each onboarding screen the brief asks seven questions. Applied to what is
shipped:

1. **Primary action?** Step 2 is "give me a photo". Everything else supports it.
2. **Can we remove a step?** `reveal` (step 3) is a preview, not an input. It
   earns its place as the emotional beat before asking for text.
3. **Can Mipo infer this?** Breed from the photo — `/breed-detect` exists as a
   route but redirects to `/chat` (`src/routes/index.tsx:143`). The capability
   is `MISSING`; the AI Gateway makes it cheap to add.
4. **Can we defer it?** Everything except species and name already is.
5. **Existing pet fact?** N/A on first pet. For a second pet, owner-level facts
   (address, phone) are already on `profiles`/`shipping_profiles` and must not
   be re-asked. See Journey B in `27`.
6. **Prefill?** Species preference persists in `PetPreferenceContext`.
7. **Does the user need to see it?** `creating` shares step 4's number so the
   progress bar does not jump — a deliberate, good detail.

---

## Gaps

| Gap | Status | Impact |
|---|---|---|
| Bird / rodent cannot be onboarded | `NEEDS EXTENSION` | Blocks the multi-pet platform premise |
| No breed inference from the onboarding photo | `MISSING` | One question that could be zero |
| Onboarding is not resumable | `MISSING` | Phase is React state; a refresh restarts it |
| No `ONBOARDING_STARTED` / `COMPLETED` event | `MISSING` | Funnel is unmeasurable — see `26` |
| Onboarding not enforced | `PARTIALLY IMPLEMENTED` | A user can reach `/` with zero pets; `useOnboarding.ts` exists but the route is not gated |
