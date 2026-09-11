# 00 — Pet Intelligence Foundation: Master

**Repository:** `samuelgalili/petid`
**Audited commit:** `8a99d0ce` · **Verified again at:** `c66108df` (docs only since)
**Phase:** architecture and domain design. No code, no migrations, no production change.

---

## 1. Audit verification — read §3 of the brief first

The brief said not to trust the previous audit. I re-read the code. **Five of its
findings were wrong or imprecise, and the corrections change the design.**

| Prior finding | Verdict | What the code actually shows |
|---|---|---|
| `pets` has ~57 columns | **CONFIRMED** | exactly 57 |
| `pets.age` and `birth_date` are overlapping concepts | **INCORRECT** | `pets.age` is a **dead column**. `serializePet` computes `age_years`/`age_months` from `birth_date` via `calculatePetAge` (`server/src/index.js:1790`) and never returns `age`. `normalizePetPayload` never writes it. Age is *already* derived correctly. |
| Activity fields are duplicated | **PARTIALLY CONFIRMED** | `favorite_activities` and `activities` are a deliberate mirror — the write path sets **both to the same value** (`index.js:1916`) and the read path falls back either way. One concept, stored twice for compatibility. `personality_tags` is genuinely separate. |
| Veterinarian information is duplicated | **CONFIRMED**, with nuance | Six columns. `vet_clinic_name` falls back to `vet_clinic` in the serializer; `vet_name` and `vet_phone` are **dead** — never read, never written. |
| `orders.pet_name` is a string, not `pet_id` | **CONFIRMED** | No `pet_id` on `orders`. `order_items` has `product_id` + `product_source` but no pet. |
| Two catalogues | **CONFIRMED** | and `order_items.product_source` already records which one a line came from — a useful hook for governance. |
| Compatibility metadata exists but is **not consumed by the Store** | **INCORRECT** | `PUBLIC_PRODUCT_FIELDS` (`index.js:4211`) ships `life_stage`, `dog_size`, `special_diet`, `breed_tags`, `medical_tags`, `kcal_per_kg`, `ingredients`, `feeding_guide`, `safety_score`. `ProductDetailAws.tsx`, `Shop.tsx`, `SmartRecommendations.tsx` and `ProductInfoDrawer.tsx` all read them. |
| Product Matching Engine = MISSING | **PARTIALLY CONFIRMED** | No server-side engine. But `src/lib/petSafetyScore.ts` is a **deterministic, explainable, unit-tested pet-adjusted safety scorer** (`server/test/petSafetyScore.test.js`, 136 lines), and `SmartRecommendations.tsx` scores products against pet age, breed and conditions. Both run **in the browser**. |
| No provenance | **PARTIALLY CONFIRMED** | One field has it: `pets.breed_confidence` plus a `breedSource: 'ai' \| 'user'` state in `AddPet.tsx` that renders "זוהה: {breed} ({confidence}%)". Nothing else in the schema carries a source. |
| Document intelligence = MISSING | **CONFIRMED** | `pet_documents` has 13 columns, none of them a status or an extraction. |
| AI Gateway, outbox, CRM identity, health tables, social | **CONFIRMED** | unchanged |

> **Superseded in part by the data-contract phase (`30`–`53`).** A second
> verification pass corrected one of the findings below and added two more:
> `breed_information` is **not** unused — `TopRecommendation.tsx` reads
> `energy_level`, `exercise_needs`, `weight_range_kg` and
> `life_expectancy_years`; and `src/contexts/CentralBrainContext.tsx` (mounted in
> `App.tsx:116`) already implements RER/MER energy calculation, an OCR record
> shape, and profile-vs-document discrepancy detection — with no server producer.
> There are also **two disagreeing feeding calculations** in the client. See
> `30-DATA-DICTIONARY.md` §1.

### Three findings the previous audit missed entirely

1. **`qr_scan_logs` does not exist.** `logPublicPetQrScan` (`index.js:2120`) inserts
   into `public.qr_scan_logs`. That table is in none of the 33 migrations and none
   of the 53 tables. Every QR scan logs a warning and returns `false`. The
   `pet.qr_scanned` event is still emitted, so the alert works and the log does
   not. Status: `MISSING` table, live code path.
2. **Eleven dead columns on `pets`** — never read by `serializePet`, never written
   by `normalizePetPayload`: `age`, `size`, `weight_unit`, `current_mood`,
   `mood_score`, `mood_updated_at`, `vet_name`, `vet_phone`, `license_number`,
   `license_renewal_date`, `insurance_policy_number`. They can be retired with
   zero API impact, which materially simplifies `24-MIGRATION.md`.
3. **`breed_information` is an unused behavioural baseline.** 40 columns
   including `energy_level`, `playfulness`, `trainability`, `barking_level`,
   `mental_needs`, `shedding_level`, `grooming_freq`, `size_category`,
   `weight_range_kg`, `life_expectancy_years`. It is served to the Breeds page and
   never used to seed anything about an actual pet. It is the cheapest source of
   `SYSTEM_DERIVED` priors in the system.

**Net effect on this design:** the foundation is in better shape than the audit
implied. Age is already derived. Compatibility metadata already flows to the
client. A deterministic, explainable scorer already exists and is tested. The
work is less "build Pet Intelligence" and more **"move what exists to the server,
give it provenance, and give it a place to put history."**

---

## 2. The nine concepts, defined precisely

These are not interchangeable. Every later document uses these words this way.

| Concept | Definition | Mutable? | Has provenance? | Time shape |
|---|---|---|---|---|
| **Pet Profile** | The stable identity of the animal. Who it is, not what is true about it. | rarely | no — it *is* the anchor | current only |
| **Pet Fact** | A structured statement asserted to be true of a pet over a period. "Blue weighs 28.2 kg." | never edited — superseded | **always** | `effective_from` → `effective_to` |
| **Pet Event** | Something that happened at an instant. "Blue completed a 4.2 km walk." | never | producer + payload version | a point in time |
| **Pet Observation** | A measured quantity attached to an event. "6.2 km", "38.4 °C". | never | the event that produced it | a point in time |
| **Pet Preference** | A liking, held with a strength that rises and falls with evidence. | decays | always | a period, with confidence |
| **Pet Health Record** | A clinical document-anchored record: visit, vaccination, medication. Already exists as `pet_vet_visits` / `pet_vaccinations`. | corrected, not superseded | source is the record itself | a point or a period |
| **Pet Insight** | An interpretation over facts and events. "Activity up 18% this week." | recomputed | derived-from list | computed at a time |
| **Pet Prediction** | A forward statement with a horizon. "Food due in ~9 days." | recomputed, expires | derived-from list | valid until |
| **Pet Document** | The file. Canonical evidence, never derived. | never | it is the source | uploaded at |

The distinctions that matter most in practice:

- **Fact vs Observation.** A weighing is an *observation*; "Blue weighs 28.2 kg"
  is the *fact* it produces. One observation, one fact. Ten walks are ten events
  and produce **one** fact: activity level.
- **Fact vs Insight.** A fact is asserted; an insight is computed and can always
  be recomputed from its inputs. An insight is never a source for another fact.
- **Preference vs Fact.** "Prefers chew toys" is a preference with decaying
  confidence. "Is allergic to chicken" is a fact. Never store the first as the
  second.
- **Health Record vs Fact.** The vet visit is the record; "has atopic
  dermatitis, effective from 2026-03-11, source DOC-123" is the fact it yields.
  The record is evidence; the fact is queryable.

---

## 3. Target architecture

```
                         ┌──────────────────────────────┐
                         │          pets                │   PET CORE
                         │  identity only               │   (identity, ~18 cols)
                         │  id, user_id, name, species, │
                         │  breed, sex, birth_date +    │
                         │  precision, status, media    │
                         └───────────────┬──────────────┘
                                         │
        ┌────────────────┬───────────────┼────────────────┬──────────────────┐
        │                │               │                │                  │
┌───────▼──────┐ ┌───────▼──────┐ ┌──────▼───────┐ ┌──────▼───────┐ ┌────────▼───────┐
│  pet_facts   │ │pet_observa-  │ │pet_documents │ │ pet_vet_     │ │ pet_species_   │
│              │ │  tions       │ │  (exists)    │ │  visits      │ │  <ext>         │
│ + provenance │ │              │ │ + status     │ │ vaccinations │ │ dog / cat /    │
│ + effective_ │ │ measured     │ │ + extraction │ │ (exist)      │ │ bird / rodent  │
│   from / to  │ │ quantities   │ │              │ │              │ │                │
└───────┬──────┘ └───────┬──────┘ └──────┬───────┘ └──────┬───────┘ └────────────────┘
        │                │               │                │
        └────────────────┴───────┬───────┴────────────────┘
                                 │
                     ┌───────────▼────────────┐
                     │     outbox_events      │  ← EXISTS. Not replaced.
                     │  + pet_id + payload_   │     Extended with pet types.
                     │    version             │
                     └───────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
     ┌────────▼───────┐ ┌────────▼────────┐ ┌───────▼────────┐
     │  pet_timeline  │ │  pet_insights   │ │ product_match  │
     │  PROJECTION    │ │  PROJECTION     │ │  DETERMINISTIC │
     │  never a source│ │  recomputable   │ │  rules, server │
     └────────────────┘ └─────────────────┘ └───────┬────────┘
                                                    │
                           ┌────────────────────────┼──────────────┐
                           │                        │              │
                       ┌───▼────┐            ┌──────▼─────┐  ┌─────▼─────┐
                       │ STORE  │            │  MIPO AI   │  │    CRM    │
                       │        │            │ explains,  │  │ Pet 360   │
                       │        │            │ never      │  │ with      │
                       │        │            │ decides    │  │ provenance│
                       └────────┘            └────────────┘  └───────────┘
```

**Three rules encoded in that diagram:**

1. `pets` shrinks to identity. Everything with a history moves to `pet_facts`.
   Nothing is dropped on day one — see `24-MIGRATION.md`.
2. Timeline and insights are **projections**, never sources. Deleting the
   timeline and rebuilding it from facts + events must produce the same result.
3. AI sits *after* deterministic rules, not before. It explains a match; it never
   computes one.

---

## 4. What this design does NOT create

Verified against the repository, per §53 of the brief:

| Not creating | Because it exists |
|---|---|
| A second pet database | `pets` stays canonical for identity |
| A second health database | `pet_vet_visits` / `pet_vaccinations` stay; facts *reference* them |
| A second product catalogue | `business_products` canonical, `scraped_products` staged |
| A second social system | `social_posts` + 5 satellites |
| A second event bus | `outbox_events` — extended, not replaced |
| A second AI gateway | `aiGateway.js` — every new AI call routes or meters through it |
| A second media system | `user_uploads` + `imagePipeline.js` |
| A second CRM | `customer_identities` |
| A second document store | `pet_documents` + the private upload directory |

## 5. Document index

| # | Document |
|---|---|
| 01 | Pet domain model |
| 02 | Pet 360 |
| 03 | Pet facts |
| 04 | Provenance |
| 05 | Fact lifecycle |
| 06 | Conflict resolution |
| 07 | Pet events |
| 08 | Pet timeline |
| 09 | Pet health |
| 10 | Pet nutrition |
| 11 | Pet behavior |
| 12 | Pet preferences |
| 13 | Pet measurements |
| 14 | Activity integration |
| 15 | Pet commerce |
| 16 | Document intelligence |
| 17 | Species model |
| 18 | Product matching |
| 19 | Store integration |
| 20 | AI integration |
| 21 | CRM integration |
| 22 | Privacy |
| 23 | Data retention |
| 24 | Migration |
| 25 | API contract |
| 26 | Data contract |
| 27 | Source of truth |
| 28 | Open decisions |
| 29 | Implementation roadmap |

### Data-contract phase (30–53)

Documents 00–29 are the architecture. **30–53 are the canonical data contract**
— what Mipo knows about a pet, where each thing lives, and under what rules.

| # | Document |
|---|---|
| 30 | Data dictionary master — verification, the nine categories |
| 31 | Pet core contract — all 57 columns classified |
| 32 | Species · 33 Health · 34 Nutrition · 35 Behavior · 36 Preferences |
| 37 | Activity · 38 Social · 39 Commerce · 40 Documents |
| 41 | Observations · 42 Events · 43 Derived · 44 AI inference |
| 45 | Provenance · 46 Fact registry · 47 Units · 48 Temporal model |
| 49 | Ownership matrix · 50 Classification · 51 Existing→target mapping |
| 52 | Product matching data contract · 53 Open decisions |
