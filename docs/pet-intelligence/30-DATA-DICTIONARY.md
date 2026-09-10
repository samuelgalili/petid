# 30 — Pet Data Dictionary (master)

**Repository:** `samuelgalili/petid` · **Base:** `10a62658` on
`claude/mifo-project-oq44tl`. Architecture only — no code, no migrations.

This document answers one question: **what does Mipo actually know about a pet,
and where does each thing live?**

---

## 1. Verification first — §37, and what it turned up

The brief asked me to verify three prior findings. Two hold, one does not, and
the check surfaced a fourth thing nobody had looked at.

### §37.1 — the eleven dead `pets` columns · **CONFIRMED, with one nuance**

Searched across **all** of `server/src/` and `src/`, not just the serializer:

| Column | Verdict |
|---|---|
| `age` | **DEAD** — the only server hit is `calculatePetAge`, a local variable |
| `size` | **DEAD** as a pet column — all 694 hits are product size, CSS, or UI |
| `weight_unit` | **DEAD** as a pet column — hits are product/order weight units |
| `current_mood`, `mood_score`, `mood_updated_at` | **DEAD** — zero hits anywhere |
| `vet_phone`, `license_renewal_date` | **DEAD** — zero hits |
| `vet_name` | **DEAD as a pet column.** The hits are `pet_vet_visits.vet_name`, a live column on a different table — plus one read of `petData.vet_name` in `CentralBrainContext` that can only ever be `undefined` |
| `license_number` | **DEAD** — one hit, a Hebrew search-term map in `CentralBrainContext` |
| `insurance_policy_number` | **DEAD, and it is a latent bug.** `InsuranceSheet.tsx` renders `pet.insurance_policy_number` through its own local interface. `serializePet` never returns it and `MipoPet` does not declare it, so that field is always `undefined` and the block never renders |

### §37.2 — `qr_scan_logs` · **CONFIRMED**
`server/src/index.js:2119` inserts into `public.qr_scan_logs`. Zero occurrences
across all 33 migration files. Every QR scan of a lost pet logs a warning and is
discarded. The `pet.qr_scanned` event still fires — the alert works, the trail
does not.

### §37.3 — `breed_information` seeds nothing · **INCORRECT**
It has two live consumers:

- `server/src/index.js:4275` → `GET /api/breeds`
- **`src/components/profile/TopRecommendation.tsx`** reads `energy_level`,
  `exercise_needs`, `weight_range_kg` and `life_expectancy_years` — and uses
  them to compute recommended activity minutes, to display an energy level, and
  to **infer a pet's weight and age when the owner has not supplied them**
  (`isAgeFromBreed`).

So the correct statement is narrower: `breed_information` is used for display
and for client-side inference, and it seeds **no persisted fact about a pet**.

### New finding — a client-side "Central Brain" nobody had audited

`src/contexts/CentralBrainContext.tsx` (280 lines), **mounted in `App.tsx:116`**
and consumed by `PetGuardianPanel.tsx` and `BrainDebuggerOverlay.tsx`. It already
implements, in the browser, four things this design proposes:

| It has | State |
|---|---|
| `calculateNrc` — RER = `70 × weight^0.75`, MER = RER × 1.6 (neutered) / 1.8 | **live** |
| `OcrRecord` — a document-extraction shape (vaccination type/date/expiry, chip number, provider) | **shape only** — `setOcrRecords([])` is hardcoded |
| `detectDiscrepancies` — profile vs document conflict detection on chip number and vet name | **live code, permanently dead** — it returns `[]` because `ocrRecords` is always empty |
| `getField` — a source precedence chain: resolved override → profile → OCR → document text search | **live**, with the OCR tier inert |
| `resolveDiscrepancy` | React state only — lost on reload |

And a conflict this raises immediately: **there are two different, incompatible
feeding calculations in the client.** `CentralBrainContext` uses RER/MER;
`TopRecommendation.tsx` uses 2–4% of body weight by age band. They will disagree
for the same pet.

**What this changes:** the concepts in this design are not new to the codebase —
they exist as client-side scaffolding with no server producer. The work is to
give them a server, a source, and a place to persist. See `43`, `44`, `45`.

---

## 2. §2 — The nine categories, defined

Every piece of pet information belongs to **exactly one**.

| Category | Definition | Storage | Mutable | Provenance | Time |
|---|---|---|---|---|---|
| **CORE_ATTRIBUTE** | Stable identity. Who the animal *is*. | `pets` | rarely, in place | no — it is the anchor | current only |
| **FACT** | A structured statement true over a period. | `pet_facts` | **never edited** — superseded | **always** | `effective_from` → `effective_to` |
| **OBSERVATION** | A measured value at an instant. | `pet_observations` | never | source + method | a point |
| **EVENT** | Something happened. | `outbox_events` | never | producer + `payload_version` | a point |
| **TIME_SERIES** | A dense ordered sequence of observations of one key. | `pet_observations`, queried as a series | never | per point | a range |
| **RELATIONSHIP** | A link between a pet and another entity. | its own table per relationship type | status changes | who created it | a period |
| **DOCUMENT** | Canonical evidence. | `pet_documents` + private disk | never | it *is* the source | uploaded / document date |
| **DERIVED_VALUE** | Computed from other data by a versioned rule. | **not stored**, or stored as a `SYSTEM_DERIVED` fact | recomputed | `derived_from` + `rule_version` | recomputed |
| **AI_INFERENCE** | A model's conclusion with no document behind it. | `pet_facts`, `source_type = AI_INFERRED` | decays | `ai_request_id` | decays, expires |

### The boundaries that actually matter

**OBSERVATION vs TIME_SERIES.** Not different storage — different *access*. One
weighing is an observation; the sequence of weighings is a time series. A key is
marked `is_time_series` in the registry when the sequence itself carries meaning
(weight, distance, temperature). Measurements taken once are observations that
happen to have one point.

**FACT vs OBSERVATION.** A weighing is the observation; "Blue weighs 28.2 kg" is
the fact it produces. Ten walks are ten events and produce **one** fact:
activity level.

**FACT vs DERIVED_VALUE.** A fact is asserted by a source. A derived value is
computed and can always be recomputed. Storing a derivation as a plain fact makes
it un-recomputable and eventually stale — which is exactly how `pets.age` and
`pets.size` became dead columns.

**EVENT vs FACT.** An event says a fact was created. It does not carry the fact's
authority, and a consumer must never treat an event payload as truth.

**RELATIONSHIP vs FACT.** "Blue's vet is Dr. Cohen" is a relationship to an
entity, not a string fact. Modelling it as a fact is how six vet columns ended up
on `pets` with two of them dead.

### The three rules the brief states, restated as constraints

> **Do not let everything become a Pet Fact.**
> Identity is not a fact. A file is not a fact. A computation is not a fact.
> `pet_fact_definitions` is the gate: an unregistered key is **rejected at write
> time** (`46`).

> **Do not let everything become an event.**
> An event is a *change worth telling someone about*. Reading a page is not one.
> Correcting a typo is not one.

> **Do not use JSON as a dumping ground.**
> Anything the matching engine reads must be typed and constrained. JSON is for
> things people read, never for things rules evaluate (`46` §Value types).

---

## 3. §38 — The answers, in one table

| Question | Answer |
|---|---|
| **What belongs in `pets`?** | Identity that does not change or whose change *is* an identity change: id, owner scope, name, species, breed, sex, birth date + precision, colour, microchip, avatar, licensing, status, lost block. ~28 columns. `31` |
| **What belongs in `pet_facts`?** | Anything with a source and a period: weight, conditions, allergies, medications, nutrition, behaviour, preferences, derived life stage and size band. `46` |
| **What belongs in `pet_observations`?** | Measured values at instants: weight, measurements, temperature, lab values, walk distances. `41` |
| **What belongs in events?** | State changes worth telling a consumer about. `42` |
| **What belongs in time series?** | Registry keys marked `is_time_series` — weight, activity, temperature. `48` |
| **What belongs in species extensions?** | Every key whose `allowed_species` is a strict subset. Not separate tables. `32` |
| **What is derived?** | age, life stage, size band, weight trend, activity level, reorder due, energy need. Never hand-maintained. `43` |
| **What is AI-inferred?** | Non-clinical suggestions only. Never a medical fact. `44` |
| **What requires provenance?** | Every fact and every observation. Core attributes carry it only where a source is genuinely ambiguous (breed). `45` |
| **What requires confirmation?** | Every `is_clinical` key extracted from a document; identity contradictions. `33`, `44` |
| **What expires?** | Preferences, AI inferences, activity-derived characteristics, insights, predictions. Never clinical facts. `48` |
| **What is historical?** | Everything with `effective_to` set. Superseded facts are never deleted while the pet exists. `48` |
| **What is sensitive?** | `50` — health, documents, medications, insurance, location, purchases |
| **What does Store need?** | `52` |
| **What does Activity need?** | `37` |
| **What does Social need?** | `38` |
| **What does CRM need?** | `29` of the earlier set, extended here |

---

## 4. Document index for this phase

| # | Document |
|---|---|
| 30 | **This** — dictionary master, verification, categories |
| 31 | Pet core contract, and every `pets` column classified |
| 32 | Species data contract |
| 33 | Health · 34 Nutrition · 35 Behavior · 36 Preferences |
| 37 | Activity · 38 Social · 39 Commerce · 40 Documents |
| 41 | Observations · 42 Events · 43 Derived · 44 AI inference |
| 45 | Provenance · 46 Fact registry · 47 Units · 48 Temporal model |
| 49 | Ownership matrix · 50 Classification · 51 Existing→target mapping |
| 52 | Product matching data contract · 53 Open decisions |

Documents 00–29 remain the architecture; 30–53 are the contract.
