# 54 — Implementation Readiness & Canonical Reconciliation

**Repository:** `samuelgalili/petid` · **Branch:** `claude/mifo-project-oq44tl` ·
**Base:** `049a8b58`

> **Sections 1–15 are the pre-sprint analysis. Section 16 is the result.**
> The P0 sprint has since run, and it corrected one claim made below: §1 and §6
> state that the breed-midpoint weight fed owner-facing numbers. It did not —
> `breedInfo` in `TopRecommendation` is permanently `null`, so that branch could
> never execute. The `weight × [20,30]` calculation was live via `pet.weight`;
> its breed fallback was dead code. See §16.1. The sprint also found more of
> every category than §1–§15 predicted: five feeding calculations, eight age
> implementations, and a `Math.random()` product score.

---

## 1. Executive Summary

This pass traced the actual code rather than the design documents, and it found
more contradiction than the previous audits reported.

**The headline:** there are **four** feeding calculations in the client, not two.
The fourth is the worst of them — `TopRecommendation.tsx` has a block commented
*"Fetch manufacturer feeding guidelines"* that **fetches nothing** and computes
`weight_kg × [20,30]` grams per day. Its output renders to the owner as
`feedingGuideline`, in the position where manufacturer guidance belongs.
Meanwhile `business_products.feeding_guide` — real per-product guidance,
extracted from the manufacturer's own page — exists, is shipped to the client,
and is displayed **only on the product page**, never on the pet profile.

So Mipo is already doing exactly what DD-02 forbids: presenting a generic
percentage formula as authoritative guidance, while the real guidance sits
unused one API field away.

Four more findings of the same kind:

- **Age is computed six times**, in five different places, with **three
  different month/year constants** (30.44 days, 30 days, 365 days) — while the
  API already returns `age_years`/`age_months` from a single canonical
  `calculatePetAge`.
- **`EnergySheet.getActivityMinutes()` is a live bug.** It matches against
  `pet.breed` — the breed *name* — looking for the string `"high"`. A breed name
  never contains it, so the function **always returns 45 minutes** and
  `getEnergyLevel()` always returns "בינונית". Every pet sees the same answer.
  It was clearly meant to read `breed_information.exercise_needs`, as
  `TopRecommendation` does.
- **`TopRecommendation` reads `pet.size`**, a dead column the API never returns.
  `isSizeFromBreed` is therefore always true whenever breed info loads.
- **`CentralBrainProvider` is mounted globally in `App.tsx:116` and has no live
  consumers.** Its only two (`PetGuardianPanel`, `BrainDebuggerOverlay`) are
  rendered nowhere. It fetches pet, vet visits and documents on every active-pet
  change, and nothing reads the result.

And one thing that is already right, which is the model for all of it:
**`petSafetyScore.ts`**. Extracted into one module with the stated reason —
*"so the drawer and the product page cannot drift apart and show the same pet two
different numbers for the same product"* — used by exactly two consumers,
unit-tested, and returning `null` rather than `0` for "we do not know". That is
the single-writer pattern this document asks for everywhere else.

**Verdict: `IMPLEMENTATION_READY: NO`.** Not because the design is incomplete —
it is complete. Because this pass found four live defects that would be migrated
along with the data, and three of them are producing wrong owner-facing numbers
today. Blockers are listed in §15; all are small and most are decisions, not
analysis.

---

## 2. The Four Blocking Decisions — APPROVED

| # | Decision | Status | Consequence for the plan |
|---|---|---|---|
| **DD-01** | Canonical weight in **grams** | ✅ **APPROVED** | Decimal grams permitted. Conversion at boundaries only. `pets.weight` (numeric kg) → `pet_observations.value_number` (g) × 1000. `pets.weight_unit` was already dead. Bird/rodent precision preserved by construction. |
| **DD-02** | Owner-facing feeding = **manufacturer/catalog guidance only** | ✅ **APPROVED** | Percentage formulas must not survive as owner-facing recommendations. RER/MER survives as internal capability, unlabelled and unshown, until a reviewed Nutrition spec authorises it. Full disposition in §4. |
| **DD-03** | **One canonical writer** per derived value | ✅ **APPROVED** | Age currently has 6 writers, life stage 4, activity minutes 2, size 2. All are `MORE_THAN_ONE_WRITER` P0 migration defects. Registry in §5. |
| **DD-04** | Fact Registry is **schema-controlled** | ✅ **APPROVED** | Migrations only. No runtime key creation, no admin key creation. Unknown keys rejected. Six-gate write path in `46`. |

DD-02's explicit requirement — *"define what happens to RER, MER, the 2–4%
calculation, existing UI, existing API fields, existing product metadata"* — is
answered in §4, per item, with consumers traced.

---

## 3. CentralBrainContext Reconciliation

`src/contexts/CentralBrainContext.tsx`, 280 lines, mounted at `App.tsx:116`
inside `PetPreferenceProvider`.

### Consumer trace

| Consumer | Rendered? |
|---|---|
| `src/components/PetGuardianPanel.tsx` | **No.** `grep -rn "PetGuardianPanel"` returns only its own definition |
| `src/components/admin/BrainDebuggerOverlay.tsx` | **No.** Same |

**The provider runs for every signed-in user on every page and nothing consumes
its output.** On each `activePet` change it issues three requests — `getMyPet`,
`getMyVetVisits`, `getMyDocuments(limit 15)` — and computes NRC and
discrepancies into a snapshot nobody reads.

### Reconciliation matrix

| # | Concept | Implementation | Status | Duplicated? | Canonical future | Action |
|---|---|---|---|---|---|---|
| 1 | `calculateNrc` — RER/MER | `RER = 70 × w^0.75`; `MER = RER × 1.6` neutered / `× 1.8` intact | **Correct formula, unreachable** (no live consumer) | Conceptually vs 3 percentage calcs (§4) | **Server**, `43` derived value, **internal only** under DD-02 | **MOVE_TO_SERVER**, do not surface |
| 2 | `OcrRecord` shape | `{vaccination_type, vaccination_date, vaccination_expiry, treatment_type, treatment_date, diagnosis, chip_number, provider_name}` | **Shape only** — `setOcrRecords([])` hardcoded at line ~140 | The only extraction shape in the repo | **Server**, informs `40` `pet_document_extractions` | **ADOPT AS INPUT** to the extraction schema; delete the client type |
| 3 | `detectDiscrepancies` | Compares `microchip_number` and `vet_name` profile-vs-OCR | **Live code, permanently dead** — returns `[]` because `ocrRecords` is always empty. Also reads `petData.vet_name`, a **dead column** the API never sends | Conceptually vs `45` conflict resolution | **Server**, `45` `petFactResolution.js` | **MOVE_TO_SERVER**; it is the right idea in the wrong tier |
| 4 | `getField` "no-ignorance rule" | Precedence: resolved override → profile → OCR → document text search | **Partially live.** Tiers 1–2 work; tier 3 inert; tier 4 returns a **placeholder string** `"[Found in document: \"…\"]"`, not a value | Conceptually vs `45` source ranking | **Server**, `45` | **MOVE_TO_SERVER**; tier 4 must be deleted, not ported — a placeholder is not a value |
| 5 | `resolveDiscrepancy` | Writes `resolvedFields` React state | **Live but not durable** — lost on reload | — | `pet_facts` confirmation write (`45`) | **REPLACE** with a real write |
| 6 | `BrainSnapshot` + `dataSourceCount` | Composes pet, NRC, visits, documents, discrepancies | **Live, unconsumed** | Overlaps `GET /pets/:id/360` (`25`) | Client **view** over the server Pet 360 | **KEEP AS PRESENTATION**, re-source from `/360` |
| 7 | `PetGuardianPanel` insights | `generateInsights(brainSnapshot, …)` | **Dead component**; would present `snapshot.nrc.mer` as *"לפי התקן המדעי של MIPO"* | vs `20`/`43` insights | Server `pet_insights`, deterministic detection | **DO NOT REVIVE AS-IS** — the MER claim violates DD-02 |
| 8 | `BrainDebuggerOverlay` | Admin snapshot viewer | Dead component | — | Useful once the server Pet 360 exists | **KEEP, re-source** |

### Verdict

| Category | Items |
|---|---|
| Already correct | The **RER/MER formula** (1) and the **precedence concept** (4) are sound |
| Dead / unreachable | 2, 3, tier 3–4 of 4, and both consumers (7, 8) |
| Duplicated elsewhere | 1 conflicts with three percentage calcs; 3 and 4 pre-empt `45` |
| Should become server logic | 1, 2, 3, 4, 5 |
| Should be removed | `getField` tier 4 (the placeholder), `petData.vet_name` read (dead column) |
| Stays client-side | 6, 8 — as a **view**, not a computation |

**Do not delete this file in P0.** It is the only place in the repository where
extraction shape, discrepancy detection and source precedence were thought
through. It is a specification that was written in the wrong tier. Port it, then
retire it.

---

## 4. Feeding Logic Reconciliation

### The four calculations

| # | Logic | Location | Current behaviour | Consumers | Canonical future | Action |
|---|---|---|---|---|---|---|
| **F1** | **RER/MER** | `CentralBrainContext.tsx:88-94` | `RER = round(70 × w^0.75)`; `MER = round(RER × 1.6\|1.8)` | **None live.** `PetGuardianPanel` (dead) would show it as *"MIPO's Scientific Standard"* | Server, `43` derived, **internal only** | **MOVE_TO_SERVER, DO NOT SURFACE** |
| **F2** | **2–4% by age band** | `TopRecommendation.tsx:295-316` | `4%` <1y · `3%` <2y · `2.5%` adult · `2%` >7y → `dailyGrams` | `PetDashboardTabs:253` → `Profile.tsx:423` — **LIVE** | — | **RETIRE** |
| **F3** | **`[20,30]` g/kg mislabelled as manufacturer guidance** | `TopRecommendation.tsx:162-190` | Comment says *"Fetch manufacturer feeding guidelines"*; **fetches nothing**. `puppy/junior [30,45]` · `senior [18,25]` · `adult [20,30]` × weight | Rendered at lines 1202, 1213-1214, 1299, 1305-1313 as `feedingGuideline` — **LIVE, and the most prominent** | Replaced by real `feeding_guide` | **RETIRE — P0** |
| **F4** | **2–3% flat range** | `FeedingSheet.tsx:33-34` | `min = w × 20`, `max = w × 30` grams | `Profile.tsx:503` — **LIVE** | Replaced by real `feeding_guide` | **RETIRE** |

Plus one that is **not** a feeding calculation and must not be swept up with
them: `FelineObesityCare.tsx:57` — `weight × 0.02` is a **weekly weight-loss
target**, a clinical concept of its own. Leave it; classify it separately.

And two **display-only** surfaces with no calculation:
`ChatActionCards.NrcPlanCard` (defined, **never rendered** — dead), and
`BusinessCRM.tsx:37,40` (hardcoded mock strings in a demo dataset, not computed).

### F3 is the finding that matters

```js
// Fetch manufacturer feeding guidelines based on pet weight and age
const fetchFeedingGuidelines = async () => {
  let weightKg = pet.weight || null;
  if (!weightKg && breedInfo?.weight_range_kg) { …breed midpoint… }
  …
  const multiplier = ageGroup === 'puppy' || ageGroup === 'junior' ? [30, 45]
                   : ageGroup === 'senior' ? [18, 25] : [20, 30];
  setFeedingGuideline({ min: Math.round(weightKg * multiplier[0]), … });
};
```

Three things are wrong at once: it is named and commented as manufacturer
guidance, it is Mipo's own generic formula, and when the owner has not given a
weight it falls back to the **breed midpoint** — so the number shown can be
derived from a breed average and presented as this animal's feeding guidance.

That is simultaneously a DD-02 violation and a §5 breed-boundary violation.

### The catalogue already has the real thing

| Question | Answer |
|---|---|
| Does the catalogue contain feeding guidance? | **Yes.** `business_products.feeding_guide`, jsonb, shape `[{range, amount}]` (`productIntel.js:783`) |
| Is it shipped to the client? | **Yes**, in `PUBLIC_PRODUCT_FIELDS` |
| Where is it displayed? | **Only** `ProductDetailAws.tsx:211`, as a text list. Never on the pet profile |
| Does it have provenance? | **No — and this is a real gap.** It is extracted by AI from a product page via the Gateway. It is *the manufacturer's number as read by a model*, which is not the same as the manufacturer's number. It needs `source = VET_DOCUMENT`-equivalent handling: attributable, and correctable |
| Species / life-stage applicability? | **Indirectly.** The product carries `pet_type`, `life_stage`, `dog_size`; `feeding_guide.range` is free text (e.g. "10-20 kg") and is **not parsed** anywhere |
| Does it vary by variant? | **Unknown.** `product_variations` exists only for `scraped_products`; the canonical catalogue has no variant model (`53` DD-12) |
| Safe to display today? | **On the product page, yes** — it is presented as the product's own text. **As a pet-specific amount, no** — nothing parses `range` against the pet's weight |
| Can the UI distinguish manufacturer from Mipo-derived? | **No.** There is no flag, and F3 actively blurs it |

### Canonical V1

```
ONE owner-facing path:

  business_products.feeding_guide  →  parse `range` against physical.weight
                                   →  display the matching row
                                   →  labelled "לפי היצרן", with the product named
                                   →  no match, or no guide  →  show nothing

RER/MER (F1)   → server, internal, feeds nothing owner-facing
F2, F3, F4     → retired
```

**"Show nothing" is a required outcome, not a failure.** A missing feeding
guideline is honest; a generic percentage presented as guidance is not.

### Disposition, per DD-02's list

| Item | Disposition |
|---|---|
| **RER** | Keep the formula. Move to `server/src/petEnergy.js`, pure. Internal only |
| **MER** | Same. **Never rendered** until a reviewed Nutrition spec authorises it |
| **2–4% body weight** | Retire F2, F3, F4. Delete the code paths only after their UI is repointed |
| **Existing UI** | `TopRecommendation` lines 1202–1313 and `FeedingSheet` lines 33–34 repoint to catalogue guidance, or render nothing. `PetGuardianPanel`'s MER string must not ship |
| **Existing API fields** | **None removed.** `business_products.feeding_guide` and `kcal_per_kg` stay and become the source. No pet API field currently carries a feeding amount, so nothing to deprecate |
| **Existing product metadata** | `feeding_guide` gains a parsed form and provenance; `kcal_per_kg` becomes an input to the internal RER/MER path |

---

## 5. Derived Value Registry

`MORE_THAN_ONE_WRITER` = P0 migration defect under DD-03.

| Key | Current writers | Storage | Canonical writer | Inputs | Trigger | UI consumers | Flag |
|---|---|---|---|---|---|---|---|
| **age_years / age_months** | **6:** `server/index.js:1779` `calculatePetAge`; `petSafetyScore.ts:38` (30.44 d/mo); `TopRecommendation:200`; `PetHealthScore:200` (365 d/y); `HealthScoreBreakdown:169` (30 d/mo); `PetCard:93` | not stored | **`calculatePetAge` (server)** | `birth_date` | every read | 6+ screens | **MORE_THAN_ONE_WRITER — and they disagree.** Three different constants |
| **life_stage** | **4+:** `TopRecommendation:174-181` (0.5/1.5/7 y); `SmartRecommendations` keyword lists; `HealthScoreBreakdown:168`; `petSafetyScore` age bands (6/12/120 mo) | not stored | **rule engine → `identity.life_stage` fact** | species, age, size_band, `life_stage_rules` | on weight/birth-date change; future `effective_to` | profile, shop, badges | **MORE_THAN_ONE_WRITER** |
| **size / size_band** | **2:** `TopRecommendation:196,245` (from `breedInfo.size_category`, gated on the **dead** `pet.size`); `SmartRecommendations:114` `sizeMap[product.dog_size]` | `pets.size` — **DEAD column** | **rule engine → `physical.size_band` fact** | weight, `breed_information.weight_range_kg` | on weight change | profile, shop | **MORE_THAN_ONE_WRITER + reads a dead column** |
| **activity minutes** | **2:** `TopRecommendation:321-336` (from `breedInfo.energy_level` 1–5 → 20/30/45/60/90, falling back to `exercise_needs` text); `EnergySheet:74-82` (matches **`pet.breed`** — **always returns 45**) | not stored | **rule engine**, once `37` exists | breed prior; later measured activity | breed load; weekly once measured | profile, energy sheet | **MORE_THAN_ONE_WRITER + one is a live bug** |
| **energy level (display)** | **2:** `TopRecommendation:337+`; `EnergySheet:84-91` (**always "בינונית"**) | not stored | `behavior.energy` fact | breed prior (LOW), later activity | as above | profile | **MORE_THAN_ONE_WRITER + live bug** |
| **feeding amount** | **3 live** (F2, F3, F4) + 1 internal (F1) | not stored | **catalogue `feeding_guide`** | product guide, weight | on weight/food change | profile ×2 | **MORE_THAN_ONE_WRITER — P0, §4** |
| **pet-adjusted safety score** | **1** — `petSafetyScore.ts` | not stored | ✅ **already canonical** | `safety_score`, birth date, conditions, category | every read | `ProductInfoDrawer`, `ProductDetailAws` | ✅ **CORRECT — the model to copy** |
| **relevance score** | 1 — `SmartRecommendations.scoreProduct` | not stored | `productMatching.js` (server) | keyword maps today; metadata in target | every read | shop top row | **MOVE_TO_SERVER** |
| **health score** | `PetHealthScore`, `HealthScoreBreakdown` | not stored | **UNKNOWN** — not covered by the data contract | age, conditions, visits | read | profile | **UNKNOWN — needs a decision** |
| **weight from breed** | 1 — `TopRecommendation:167-170` breed midpoint | not stored | **must not exist as a pet fact** (§6) | `weight_range_kg` regex | read | profile, and **feeds F3** | **BOUNDARY VIOLATION** |
| **age from breed** | 1 — `TopRecommendation:195` `isAgeFromBreed` | not stored | **must not exist as a pet fact** | `life_expectancy_years` | read | profile | **BOUNDARY VIOLATION** |
| **target weight, body condition, calories, distance, pace** | none | — | `13`, `37`, `43` | — | — | — | not implemented — no conflict |

### Consolidation rule

Every row flagged above collapses to: **one server-side pure function, one
canonical output, one read path.** `petSafetyScore.ts` is the existence proof
that this works in this codebase — including its `null`-not-zero discipline and
its `explainAdjustment` companion.

---

## 6. Breed Information Boundary

`breed_information` (40 columns) is consumed by `GET /api/breeds` and by
`TopRecommendation.tsx`, which reads `energy_level`, `exercise_needs`,
`weight_range_kg`, `size_category` and `life_expectancy_years`.

### Classification

| Value | Class | May seed a prior? | May become a pet fact? |
|---|---|---|---|
| `breed_name`, `breed_name_he`, `origin_country`, `description` | **genuine breed knowledge** | n/a | n/a — reference data |
| `energy_level`, `playfulness`, `trainability`, `barking_level`, `mental_needs`, `temperament[]` | **useful priors** | ✅ `behavior.*`, `SYSTEM_DERIVED`, **LOW** | ❌ never as owner-provided |
| `shedding_level`, `grooming_freq`, `drooling_level` | useful priors | ✅ grooming ranking | ❌ |
| `size_category` | prior | ✅ `physical.size_band` fallback when weight is unknown, LOW | ❌ |
| `weight_range_kg` | **breed population statistic** | ✅ as a **sanity range** and a size-band input | ❌ **NEVER as `physical.weight`** |
| `life_expectancy_years` | **breed population statistic** | ✅ senior-threshold context | ❌ **NEVER as age, never as birth date** |
| `kids_friendly`, `dog_friendly`, `stranger_openness`, `watchdog_nature` | priors | ✅ ranking | ❌ |

### The two violations, in the code today

```js
// TopRecommendation.tsx:167-170
if (!weightKg && breedInfo?.weight_range_kg) {
  const match = breedInfo.weight_range_kg.match(/(\d+)-(\d+)/);
  if (match) weightKg = (parseInt(match[1]) + parseInt(match[2])) / 2;
}
// → this weightKg then produces the "feeding guideline" the owner sees (F3)

// TopRecommendation.tsx:195
const isAgeFromBreed = !hasUserBirthDate && breedInfo?.life_expectancy_years;
```

Neither writes to the database — both are render-time. But both **feed a number
the owner is shown**, with no indication it came from a breed average. That is
the boundary the brief names, crossed in the display layer rather than the
storage layer.

### The rule

> A breed baseline such as `weight_range_kg = 20–30` must never become
> `Blue.weight = 25kg`. `life_expectancy_years` is not the pet's age.

**Enforcement:**

1. Breed priors are written only as `SYSTEM_DERIVED` facts with
   `confidence = LOW` and `derived_from = [breed_information.<id>]`.
2. **Any** owner-provided or measured value supersedes a prior immediately.
3. Priors are **excluded from every hard gate** in `52`. A prior that can exclude
   a product is a stereotype with consequences.
4. The UI states priors as being about the **breed**, never the animal:
   *"לברדורים בדרך כלל אנרגטיים"*, not *"בלו אנרגטי"*.
5. A prior **may not** be an input to a number presented as specific to the pet —
   which is precisely what F3 does today.

Yes, breed priors need provenance. They are the clearest case for it: without a
source, a breed average and a vet measurement look identical on screen.

**Related defect:** `weight_range_kg` is free text parsed with `/(\d+)-(\d+)/`.
If `size_band` becomes a gate, this column must become two numerics first
(`53` DD-15).

---

## 7. Provenance Reconciliation

Every path by which data enters the pet model today, with what it may do.

| Entry path | Source | Confidence | Canonical? | May overwrite? | Observation only? | Confirmation? |
|---|---|---|---|---|---|---|
| `POST/PATCH /api/me/pets` | `USER_PROVIDED` | HIGH | ✅ | yes, except derived keys | no | no |
| Onboarding / `AddPet` | `USER_PROVIDED` | HIGH | ✅ | yes | no | no |
| `AddPet` breed detection | `AI_INFERRED` (`breedSource='ai'`) — **`detectBreed()` is a stub** | LOW–MED | ❌ | no | **proposal** | **yes** |
| Vet visit / vaccination entry | `USER_PROVIDED` | HIGH | ✅ record | records corrected, not superseded | no | no |
| **Document upload** | `DOCUMENT` = **evidence** | n/a | ✅ **the document is canonical** | never | n/a | n/a |
| **Document extraction** | `VET_DOCUMENT` — the document is the source, the model is the reader | HIGH/MED | ✅ **after confirmation** for clinical | by rank (`45`) | proposal first | **clinical: always** |
| Chat / Moment inference | `AI_INFERRED` | LOW | ❌ | **never** | ✅ observation/proposal only | yes if profile-visible |
| Purchase | `PURCHASE_DERIVED` | LOW–MED | ❌ for clinical | preference ranking only | ✅ | no |
| Activity (`37`) | `ACTIVITY_DERIVED` | MED | ✅ for `activity.*` | supersedes its own key | ✅ | no |
| Rule engine | `SYSTEM_DERIVED` | HIGH | ✅ **sole writer** (DD-03) | yes, for derived keys | no | no |
| **Breed prior** | `SYSTEM_DERIVED` from `breed_information` | **LOW** | ❌ | **never** | ✅ prior only | n/a |
| Integration | `INTEGRATION` | per source | future | future | ✅ | per source |

### The OCR / document chain, stated once

```
original document        =  EVIDENCE          canonical, immutable, always downloadable
extracted value          =  DERIVED           VET_DOCUMENT, page+bbox, PROPOSED
confirmed extraction     =  FACT              verification USER_CONFIRMED
model conclusion         =  INFERENCE         AI_INFERRED, LOW, decaying, never clinical
```

**An extraction is not an inference.** The document observed the weight; the
model transcribed it. That is why extraction may produce clinical facts (pending
confirmation) and inference never may.

### Gaps found in this pass

| # | Gap | Severity |
|---|---|---|
| P1 | `business_products.feeding_guide` is **AI-extracted from a product page with no provenance**, and is about to become the single owner-facing feeding source. It needs a source flag and a correction path | **High** |
| P2 | Breed priors reach owner-facing numbers with no provenance (§6) | High |
| P3 | `detectBreed()` is a stub — the provenance UI exists, the producer does not | Low |
| P4 | `ai_consent_given` is stored and **read nowhere** before any AI call | High |
| P5 | `CentralBrainContext.getField` tier 4 returns a **placeholder string** where a value is expected | Medium |

---

## 8. Fact / Observation / Event Boundary

The proposed boundary is validated. Restated with the repository's own examples:

| Category | Definition | Repository example |
|---|---|---|
| **Observation** | a measurement at a point in time | "28.2 kg was read at the clinic on 9 Sep" — today: nowhere to put it |
| **Fact** | a canonical statement over a period | `physical.weight = 28200 g` from 9 Sep — today: `pets.weight`, a scalar with no time |
| **Event** | something happened | `pet.qr_scanned` — **exists**, and correctly emitted before its (missing) log write |
| **Derived** | a deterministic computation | `age_years` — **exists** in `calculatePetAge`, and is recomputed five more times elsewhere |

### Paths that currently mix the categories

| # | Path | Mixing | Fix |
|---|---|---|---|
| B1 | `pets.weight` | a **fact** with no period, no source, and no observation behind it | split: observations + a current fact (`41`) |
| B2 | `pets.medical_conditions[]` | many **facts** flattened into one array — no dates, no sources, no per-item resolution | one fact per element (`33`) |
| B3 | `pets.current_mood` + `mood_updated_at` | a **fact** shaped like an observation, with one slot | dead column; return as a fact with history if wanted |
| B4 | `pets.last_vet_visit` / `next_vet_visit` | **derived** values stored as columns | derive from `pet_vet_visits` |
| B5 | `favorite_activities` / `activities` | one **fact** stored twice | collapse |
| B6 | `CentralBrainContext.getField` tier 4 | returns a **placeholder** where a fact belongs | delete, do not port |
| B7 | `PetGuardianPanel.generateInsights` | **derived** presented as authoritative ("MIPO's Scientific Standard") | insights are projections; detection deterministic (`43`) |

No proposed path mixes them. Every existing violation is in the legacy `pets`
table or in unreachable client code, and each has a named fix.

---

## 9. Product Matching Reconciliation

### What survives

| Logic | Location | Verdict |
|---|---|---|
| `computePetAdjustedScore`, `safetyLevelFor`, `explainAdjustment` | `petSafetyScore.ts` (124 lines, unit-tested) | **SURVIVES — move to server.** Keep `null`-not-zero, keep the Hebrew explanation, keep `DIET_SENSITIVE_CONDITIONS` as the controlled list |
| `catalogRecommendations.js` | server | **SURVIVES UNCHANGED.** It already treats model output as a search, not data |
| `SmartRecommendations.scoreProduct` | client, 275 lines | **REPLACE the keyword maps** with metadata gates; **keep** the top-row placement and the `relevanceReason` string |
| `productRecommendations.matchesPetType` | client | absorbed into gate 1 |

### Browser → server

Everything that **excludes**. A health exclusion the client computes is one the
client can drop, and it cannot be audited. Ranking may stay client-side once the
gates are server-authoritative.

### Catalogue fields needing normalization

| Field | Problem |
|---|---|
| `ingredients` | free text, two languages — needs `ingredient_terms` with `is_derivative` |
| `feeding_guide.range` | free text ("10-20 kg"), **never parsed** — must be parsed to gate on weight |
| `life_stage`, `dog_size` | free text, unvalidated — need enums |
| `medical_tags[]`, `special_diet[]`, `breed_tags[]` | free text arrays, no controlled vocabulary |
| `pet_type` | 4-value enum — **blocks bird/rabbit/rodent matching entirely** |

### Dimensions

| Available now | Missing |
|---|---|
| species (dog/cat/other), breed, age, sex, `safety_score`, `medical_conditions[]` (untyped), `in_stock` | life stage, size band, **allergies**, sensitivities, target weight, body condition, diet type, activity, measurements, attributed purchase history |

### Hard vs soft vs confirmed

| Hard constraints (gates) | Soft signals (ranking) | Require confirmation |
|---|---|---|
| sellable · species · life_stage · dog_size · **allergens** · medical contraindications · diet type · accessory measurements | breed tags · behaviour · activity · preferences · purchase history · brand · flavour | allergy/sensitivity before it gates · ingredient avoidance waiver · body condition affecting diet |

**No fake percentages.** Six explainable statuses, `evidence` required in the
contract (`52`).

---

## 10. Source of Truth Matrix

| Domain | Canonical source | Read model | Writer | Derived? | Provenance |
|---|---|---|---|---|---|
| Identity | `pets` | `serializePet` | owner | no | — |
| Species | `pets.species` | `serializePet` | owner | no | — |
| Breed | `pets.breed` + `breed_confidence` + `breed_source` | `serializePet` | owner; AI **proposes** | no | ✅ the only one today |
| Birth date | `pets.birth_date` + precision | `serializePet` | owner; document proposes | no | precision flag |
| **Age** | **derived** | `serializePet` (`age_years`/`age_months`) | **`calculatePetAge` — server, sole** | ✅ | inherits birth date |
| **Life stage** | `identity.life_stage` fact | Pet 360 | **rule engine, sole** | ✅ | `SYSTEM_DERIVED` + `rule_version` |
| Sex | `pets.gender` | `serializePet` | owner | no | — |
| Sterilization | `health.neuter_status` | Pet 360 | owner, document | no | ✅ |
| **Weight** | `pet_observations` (g) → `physical.weight` | Pet 360 | observation→fact deriver | current value ✅ | ✅ per observation |
| Target weight | `physical.target_weight` | Pet 360 | owner, vet | no | ✅ |
| Body condition | `physical.body_condition` | Pet 360 | owner, vet, document — **never AI** | no | ✅ |
| Allergies / sensitivities | `health.allergy` / `.sensitivity` | Pet 360 | owner, document (confirmed), vet | no | ✅ required |
| Medical conditions | `health.condition` | Pet 360 | same | no | ✅ |
| Medications | `health.medication` | Pet 360 | same | no | ✅ |
| Vaccinations | `pet_vaccinations` | health summary | owner — **no update route** | no | record |
| Vet visits | `pet_vet_visits` | health summary | owner — **no update route** | no | record |
| **Nutrition — current food** | `nutrition.current_food` (ref) | Pet 360 | owner; commerce proposes | no | ✅ |
| **Nutrition — feeding amount** | **`business_products.feeding_guide`** | product + profile | catalogue (AI-extracted) | ❌ **not Mipo-derived** | ⚠️ **needs provenance (P1)** |
| Preferences | `preference.*` | Pet 360 | owner; commerce; AI (LOW) | partly | ✅ + decay |
| Behavior | `behavior.*` | Pet 360 | owner; activity; breed prior (LOW) | partly | ✅ |
| **Activity level** | `activity.activity_level` | Pet 360 | **aggregator, sole** | ✅ | `ACTIVITY_DERIVED` |
| Walks | `walk_sessions` (MISSING) | timeline | activity service | no | ✅ |
| Parks | `dog_parks` + `park_checkins` (MISSING) | — | owner, confirmed | no | ✅ |
| Social | `social_posts` | feed | owner | no | — |
| Moments | `social_posts` | feed | owner | no | — |
| Purchases | `order_items` **+ `pet_id` (MISSING)** | Pet 360 | customer; admin updates | no | `pet_attribution` |
| Orders | `orders` | order history | customer; admin | no | — |
| Documents | `pet_documents` + private disk | Pet 360 | owner | no | **evidence** |
| OCR | `pet_document_extractions` (MISSING) | review queue | extraction pipeline | ✅ from evidence | `VET_DOCUMENT` + `ai_request_id` |
| **Product matching** | **computed, never stored** | product page, shop | `productMatching.js` | ✅ | `rules_version` + `evidence` |
| AI inference | `pet_facts` where `AI_INFERRED` | Pet 360 | AI, via proposal | ✅ | `ai_request_id` + `evidence` |

**Unresolved competing sources after this pass: one.**
*Nutrition — feeding amount* has four writers today (§4) and one canonical
target, but the canonical target itself carries no provenance. That is P1, not a
design gap.

---

## 11. Migration Readiness

| # | Migration | Source → Dest | Backfill rule | Null behaviour | Conflict | Validation | Rollback | Observability | Delete when |
|---|---|---|---|---|---|---|---|---|---|
| M1 | **11 dead columns** | `pets` → ∅ | none | n/a | none | grep proves zero readers; `serializePet` diff | trivial — re-add nullable | column-usage check in CI | immediately after M12 proves the diff |
| M2 | **`qr_scan_logs`** | ∅ → new table | none | scans before this are lost, permanently | none | insert succeeds; warning stops | drop table | scan-count metric | n/a — pure add |
| M3 | **`order_items.pet_id`** | `orders.pet_name` → `order_items` | **exact single match only**; else `UNATTRIBUTED` | null = unattributed, a valid state | never fuzzy-match | attributed count = expected; no `pet_id` outside the order's owner | drop column; `pet_name` untouched | attribution-rate dashboard | **never** — `pet_name` is kept as history |
| M4 | **`outbox_events.pet_id` + `payload_version`** | ∅ → columns | null for historical events | null accepted | none | new events carry both | drop | consumer lag | n/a |
| M5 | **`pet_fact_definitions`** | ∅ → new | seed from migration | n/a | none | every seeded key parses | drop | key count | n/a |
| M6 | **`pet_facts`** | `pets` cols → facts | `USER_PROVIDED`, `observed_at = updated_at`, **confidence MEDIUM** | absent column ⇒ **no fact** | idempotent on `(pet_id,ns,key,source_id)` | one CURRENT per key; no unknown key; no clinical AI | `DELETE WHERE source_id LIKE 'backfill@%'` | fact count by source | after M12 |
| M7 | **`pet_observations`** | `pets.weight` → one observation | `× 1000` to grams | no weight ⇒ no row | none | count = pets with weight | delete backfilled | observation count | after M12 |
| M8 | **Derived consolidation** | 6 age / 4 life-stage / 2 size / 2 activity writers → 1 each | none — code only | derived from null ⇒ null, **never a default** | n/a | before/after snapshot per pet | revert the commit | per-screen diff harness | when all callers are repointed |
| M9 | **Feeding logic** | F2/F3/F4 → catalogue `feeding_guide` | none | **no guide ⇒ render nothing** | n/a | no screen shows a percentage-derived amount | revert; the formulas are pure functions | "screens showing a feeding amount" count | after UI repoint |
| M10 | **Product matching → server** | `petSafetyScore` + `SmartRecommendations` → `productMatching.js` | none | missing fact ⇒ `INSUFFICIENT_DATA` | n/a | server and client agree during dual-read | client keeps working | status distribution | after dual-read |
| M11 | **CentralBrain port** | client concepts → server | none | — | n/a | `/360` covers every field the snapshot had | provider still mounted | — | when the panel re-sources |
| M12 | **`serializePet` invariance** | — | — | — | — | **byte-identical output for every pet, before and after** | — | the gate itself | this is the gate |

### The gate

**M12 gates M1, M6 and M7.** Dump `serializePet` output for every pet before and
after; any diff stops the migration. It is cheap, it is total, and it works
precisely because there is exactly one read seam.

**Nothing is deleted until reads and writes are proven migrated.** M1 is the only
deletion in the plan and it runs last, after M12 passes.

---

## 12. Implementation Order

### P0 — Correctness / Data Integrity
*Things producing wrong, contradictory or lost data **today**.*

| # | Item | Why P0 |
|---|---|---|
| 0.1 | **Retire F3** — the fake "manufacturer feeding guidelines" | shows a generic formula as manufacturer guidance, from a breed-average weight |
| 0.2 | **Retire F2 and F4**; one owner-facing feeding path | three calculations, three answers |
| 0.3 | **Fix `EnergySheet`** — reads `pet.breed` for exercise level; always returns 45 min / "בינונית" | every pet gets the same answer |
| 0.4 | **Fix `TopRecommendation` reading `pet.size`** (dead column) | `isSizeFromBreed` always true |
| 0.5 | **Consolidate age to `calculatePetAge`** | 6 writers, 3 different constants |
| 0.6 | **Create `qr_scan_logs`** | every lost-pet scan is discarded |
| 0.7 | **Encrypt `insurance_claims.owner_id_number`**; **check `ai_consent_given`** | security; needs `SECRET_ENCRYPTION_KEY`, which also unblocks 2FA and Connectors |
| 0.8 | **Fix `InsuranceSheet`** — renders a field the API never sends | dead UI branch |

**Dependencies:** 0.1–0.2 need the catalogue `feeding_guide` parser. 0.5 is
independent. 0.7 needs one SSM parameter and unblocks three things.

### P1 — Foundation
`pet_fact_definitions` → `pet_facts` → `pet_observations` → provenance columns →
`outbox_events.pet_id` + `payload_version` → `order_items.pet_id` → backfill →
validate → dual-write → dual-read.
**Depends on:** P0.5 (one age writer) — otherwise the backfill inherits the
disagreement.

### P2 — Domain Integration
Health routes (`PATCH`/`DELETE` — currently a mistyped vaccination is permanent)
· document status + extractions · `business_products.publication_state` ·
`ingredient_terms` · server cart and pet-scoped favourites · CRM pet context.
**Depends on:** P1 for facts; P0.7 for consent.

### P3 — Intelligence
`productMatching.js` (gates only) · `petSafetyScore` moved server-side ·
deterministic insights · RER/MER as an internal capability · breed priors as
LOW-confidence facts · AI proposals.
**Depends on:** P1, P2 catalogue governance, and `ingredient_terms`.

### P4 — Cleanup
Drop the 11 dead columns · retire `CentralBrainContext` computations · delete the
retired feeding formulas · remove `SmartRecommendations` keyword maps · deprecate
`pets` columns superseded by facts.
**Depends on:** M12 passing, and every consumer repointed.

---

## 13. Remaining Open Decisions

| # | Decision | Blocks |
|---|---|---|
| **R-01** | Does `business_products.feeding_guide` need a provenance flag before it becomes the sole owner-facing source? *(Recommendation: yes — it is AI-extracted from a product page.)* | P0.1 |
| **R-02** | What renders when a product has no `feeding_guide`? *(Recommendation: nothing.)* | P0.1 |
| **R-03** | Who owns "health score" (`PetHealthScore`, `HealthScoreBreakdown`)? Not covered by the data contract | P1 scope |
| **R-04** | Retire or re-source `PetGuardianPanel` / `BrainDebuggerOverlay` (both dead)? | P4 |
| **R-05** | Keep `CentralBrainProvider` mounted while it has no consumers? *(It costs 3 requests per pet switch.)* | P0 or P4 |
| **R-06** | Is `TopRecommendation`'s breed-inferred weight acceptable as a **labelled** estimate, or removed? | P0.1 |
| R-07 … R-24 | Carried forward: `28` OD-01…OD-16 and `53` DD-05…DD-18 | various |

---

## 14. Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | **A wrong feeding amount reaches an owner** — happening now | **Certain** | High | P0.1–0.2 |
| 2 | Backfill invents provenance | Medium | High | MEDIUM confidence, `source_id='backfill@…'`, one-`DELETE` rollback |
| 3 | A sixth age implementation appears after consolidation | Medium | Medium | lint/test that fails on a second `birth_date` arithmetic site |
| 4 | Removing a "dead" column that a component reads through a local interface | **Realised once** — `InsuranceSheet` | Medium | grep local interfaces, not just `MipoPet`; M12 diff |
| 5 | Client and server matching disagree during dual-read | Medium | High | shadow-compare before switching |
| 6 | `feeding_guide.range` parsing fails on real strings | High | Medium | parse defensively; no parse ⇒ show the raw text as the manufacturer wrote it |
| 7 | Fact registry becomes a de-facto EAV via a permissive migration | Low | High | DD-04; migration review |
| 8 | Enum widening breaks the migration runner (`ALTER TYPE` outside a transaction) | Medium | Medium | own migration; the deploy's dry-run rehearsal catches it |
| 9 | `CentralBrainContext` deleted before its concepts are ported | Medium | Medium | port first, retire in P4 |
| 10 | Health data reaches an unauthorised reader | Low | **Severe** | `50`; `customers.health.read`; audit logging |

---

## 15. Verdict — superseded by §16

The verdict below was written **before** the P0 sprint. It said
`IMPLEMENTATION_READY: NO` and listed five blockers. Those blockers have been
worked; §16 records what was actually done, what was found along the way, and
the current answer. The original text is kept because the reasoning still
explains why the sprint happened.

### The pre-sprint verdict, as written

### Conditions

| Condition | Met? | Note |
|---|---|---|
| All four blocking decisions resolved | ✅ | DD-01…DD-04 approved |
| No unresolved source-of-truth conflicts | ⚠️ | One: feeding amount — canonical target chosen, but it carries **no provenance** (R-01) |
| No unresolved duplicate derived writers | ❌ | **Age ×6, life stage ×4, size ×2, activity ×2, feeding ×3.** Identified and specified, **not yet consolidated** |
| Feeding logic has one owner-facing path | ❌ | **Three live paths today**, one of them mislabelled as manufacturer guidance |
| Provenance boundaries explicit | ✅ | §7, with five named gaps |
| Migration dependencies understood | ✅ | §11, M1–M12, with M12 as the gate |
| Rollback strategy exists | ✅ | per migration; backfill is one `DELETE` |
| No critical ambiguity | ⚠️ | R-01, R-02, R-03 are open and cheap to close |

### Blockers

1. **F3 — the fake manufacturer feeding guideline.** `TopRecommendation.tsx:162-190`
   computes `weight × [20,30]` under a comment claiming to fetch manufacturer
   guidance, falls back to a **breed-average weight**, and renders it as
   `feedingGuideline`. Live. Must be retired before any nutrition data is
   migrated on top of it.
2. **Three live owner-facing feeding paths** (F2, F3, F4) where DD-02 requires
   one.
3. **Duplicate derived writers not yet consolidated** — six age implementations
   with three different month/year constants, all still live.
4. **Two live bugs producing wrong output** — `EnergySheet` always returns 45
   minutes / "בינונית"; `TopRecommendation` gates on the dead `pet.size`.
5. **R-01 unanswered** — whether the catalogue's AI-extracted `feeding_guide`
   needs provenance before becoming the only owner-facing source. It is about to
   carry the weight the retired formulas carried.

### Assessment

The **design** is ready. The four blocking decisions are approved, the data
contract is complete, the migration is sequenced with a real gate, and rollback
exists at every step.

The **codebase** is not, and it is better to know that now. Every blocker above
is a defect that exists today and would be carried into the new model — a wrong
number becomes a wrong fact with provenance attached, which is worse than a wrong
number.

All five blockers are small. Four are P0 fixes measured in hours; one is a
question the product owner can answer in a sentence. None requires further
analysis.

```
IMPLEMENTATION_READY: NO
```

**Path to YES:** complete P0.1–P0.5 and answer R-01 and R-02. Then this
document's conditions are met and P1 can begin on data that is correct rather
than merely modelled.


---

# 16. P0 Implementation Result

Implemented on `claude/mifo-project-oq44tl`. Analysis was correct on the
substance and **incomplete on the count**: the sprint found more of every
category than §1–§15 predicted.

## 16.1 What the sprint found that this document had missed

| # | Finding | How it was found |
|---|---|---|
| 1 | **`breedInfo` in `TopRecommendation` is permanently `null`** — `setBreedInfo(null)` at line 110 is the only call, and nothing fetches breeds | grep for every `setBreedInfo` |
| 2 | So the **breed-midpoint weight path could never fire**. §1 and §6 said it fed owner-facing numbers. It does not, and did not. **That was wrong and is corrected here.** The `weight × [20,30]` calculation was still live via `pet.weight` | as above |
| 3 | **Five feeding calculations, not four.** `FelineDiabeticCare` computes `weight × 40` kcal/day and shows it to the owner of a **diabetic cat** as "צריכת קלוריות יומית מומלצת" — and it **is** rendered, through `HealthScoreBreakdown` | search for `weight * <n>` |
| 4 | **Eight age implementations, not six.** `PreventiveCareEngine` and `MedicalDocumentFAB` each had their own, both on a flat 30-day month | search for `Date.now() - …birth` |
| 5 | **`getFoodScore` returned `Math.random()`** — a "food suitability" score between 70 and 95. Never called | reading the file |
| 6 | **`asTextList` could not read `feeding_guide`.** The import pipeline writes `[{range, amount}]`; the reader looked only for `text`/`title`/`label`/`value`, so every entry collapsed to `""` and the product page's feeding section **never rendered** | tracing the catalogue path |
| 7 | **`profileCompletion` could never reach 100%** — `pet.size` counted toward a total of 6 and is a column the API never returns, so it capped at 83% and the celebration could not fire | tracing `pet.size` |
| 8 | **The size editor silently discarded its input** — it PATCHed `{size}`, which `normalizePetPayload` does not allowlist, then showed "הנתונים עודכנו בהצלחה ✓" and reloaded. Its entry point (`openEditModal('size')`) is never called | tracing the write path |
| 9 | **`PetGuardianPanel` presents MER as "לפי התקן המדעי של MIPO"**, and `NrcPlanCard` renders a `MER:` badge. Neither is rendered today — both would violate DD-02 the moment they were | final validation search |

## 16.2 Status

```
P0.1 Feeding        COMPLETE
P0.2 Age            COMPLETE
P0.3 Activity       COMPLETE
P0.4 Size           COMPLETE
P0.5 Central Brain  COMPLETE
P0.6 Breed Boundary COMPLETE
P0.7 Tests          COMPLETE
P0.8 Quality Gates  COMPLETE
```

### P0.1 — Feeding
Five calculations retired from the owner-facing path; one source remains.

| Logic | Location | Action |
|---|---|---|
| `weight × [20,30]` under "Fetch manufacturer feeding guidelines" | `TopRecommendation` | **removed** |
| 2–4% by age band → `recommendedGrams` | `TopRecommendation` | **removed** |
| 2–3% flat → `dailyAmount` | `FeedingSheet` | **removed** |
| `weight × 40` kcal for a diabetic cat | `FelineDiabeticCare` | **removed**, replaced with "decide with your vet, and by the food's own guidance" |
| `Math.random()` food score | `TopRecommendation` | **removed** |
| RER/MER | `CentralBrainContext` | **kept, internal.** Not rendered; the two places that would have rendered it are neutralised with the reason recorded |

New: `src/lib/feedingGuidance.ts` — the single resolver. Takes a **product**,
never a pet weight. Reads all three shapes the column actually holds. Returns
`null` when there is no guidance, and the UI then shows nothing.

**Provenance:** migration `0035_feeding_guide_source.sql` adds
`business_products.feeding_guide_source` (`ai_extracted` | `manufacturer_confirmed`
| `unknown`, CHECK-constrained, default `unknown`), backfills rows that already
hold a guide to `ai_extracted` — which is how every one of them got there — and
is idempotent. `productIntel` sets it on write. The API allowlists the value, so
a caller cannot claim `manufacturer_confirmed` by sending a string.

**Labels:** only `manufacturer_confirmed` renders "הנחיות יצרן". Everything else,
including `unknown`, renders "מידע שחולץ מדף המוצר". Enum names are never shown.

### P0.2 — Age
One derivation. `src/lib/petAge.ts` prefers the API's `age_years`/`age_months`
and falls back to the server's own constant (30.4375 days) when a caller has
only a birth date. Eight implementations migrated: `petSafetyScore`,
`TopRecommendation` (×3), `PetHealthScore`, `HealthScoreBreakdown`, `PetCard`,
`PreventiveCareEngine`, `MedicalDocumentFAB`. `PetProfile` now carries the API's
age so the safety score can use it.

### P0.3 — Activity
`src/lib/petActivity.ts` — one derivation from `breed_information`, shared by
`TopRecommendation` and `EnergySheet`. The bug is fixed: `EnergySheet` now reads
the breed record rather than searching the breed's *name* for "high", and
returns **null** when the breed is unknown instead of defaulting every pet to
45 minutes and "בינונית".

### P0.4 — Size
Every read of the dead `pet.size` removed (5 sites, plus 2 in the health
scores). No column restored, no duplicate field introduced. The unreachable size
editor — which silently discarded what it was given — is gone. Completion is now
out of 5 and can reach 100%. Display falls back to the breed's `size_category`,
labelled as the breed's.

### P0.5 — Central Brain
The provider no longer fetches on mount. `useCentralBrain` triggers the load, so
with no mounted consumer — which is the case today — **nothing is fetched**.
`getField`'s fourth tier, which returned the literal string
`[Found in document: "…"]` where a value belongs, is removed. The dead
`petData.vet_name` comparison is removed. Everything else is kept, with a header
recording the per-capability disposition for P1.

### P0.6 — Breed boundary
The weight editor no longer pre-fills from the breed midpoint — an owner could
previously press save and turn a breed average into their animal's recorded
weight as `USER_PROVIDED`. Breed weight now displays as
`"20-30 ק"ג טיפוסי לגזע"`. No breed value is persisted as a pet fact anywhere.

### P0.7 — Tests
Four new suites, 43 tests, following the repository's existing convention (a
faithful JS port of the TS module, so `npm test` covers the arithmetic without
adding a TypeScript runner — the same approach `petSafetyScore.test.js` uses).

```
server/test/petAge.test.js           14  API-wins, birthday boundaries, leap day,
                                         future date, missing date, null-not-zero,
                                         client/server agreement
server/test/feedingGuidance.test.js  13  no invention, all three column shapes,
                                         AI never labelled as manufacturer,
                                         unknown treated conservatively
server/test/petActivity.test.js      11  the breed-NAME regression, all levels,
                                         "very high" before "high", bad input
server/test/breedBoundary.test.js     5  range ≠ weight, life expectancy ≠ age
```

### P0.8 — Quality gates

```
TYPECHECK:          PASS   tsc -p tsconfig.active.json
LINT:               PASS   eslint . --quiet
UNIT TESTS:         PASS   173/173 (server, node --test)
INTEGRATION TESTS:  NOT AFFECTED   requires a live AI provider credential
IMPORT CHECK:       PASS   every import under src/ resolves
BUILD:              PASS   vite build
MIGRATION:          PASS   34/34 applied to a real PostgreSQL 16; backfill,
                           CHECK rejection and re-runnability all verified
```

Playwright e2e was **not run**: it needs a built preview server and a browser,
and none of the changed surfaces has an e2e spec. Not claimed as passing.

## 16.3 Remaining occurrences — all reviewed, all intentional

| File | Occurrence | Owner-facing? | Canonical? | Why it stays |
|---|---|---|---|---|
| `AdoptionPostCard.tsx:123` | `pet.size` | yes | n/a | A **different type** — `AdoptionPet`, an adoption listing with its own `size: string`. Unrelated to the pet profile |
| `CentralBrainContext.tsx:110-113` | `rer`, `mer` | **no** | internal | Kept per DD-02 as internal intelligence. No consumer renders it |
| `PetGuardianPanel.tsx` | MER insight | **no** | — | Removed. The component is not rendered; the comment records why it must not come back |
| `ChatActionCards.tsx:132` | `MER:` badge | **no** | — | Removed. Comment retains the reason |
| `BusinessCRM.tsx:37,40` | "MER מחושב: 1,320 kcal/יום" | yes, in a demo | no | **Hardcoded mock strings** in a demo customer dataset. Not a calculation, not pet data |
| `FelineObesityCare.tsx:56-59` | `weight * 0.01`, `* 0.02` | yes | — | A **weekly weight-loss rate** (1–2%/week), not a feeding amount. Different concept, outside DD-02. Flagged for the Nutrition spec |
| `PetHealthScore.tsx`, `HealthScoreBreakdown.tsx` | `Date.now() - vDate` ÷ 30 days | yes | — | **Vet-visit recency**, not pet age. A different derived value; out of P0.2's scope |
| `PetHealthScore.tsx:260`, `VaccineCountdown`, `RecoveryBanner` | `Date.now()` day counts | yes | — | Countdowns to a future date. Not age |
| `petAge.ts:7`, `54` | "30.44", "365" | no | — | Prose describing the constants that were removed |
| `sidebar.tsx:539` | `Math.random() * 40` | no | — | A skeleton-loader width. Not data |

## 16.4 Result

```
P0 IMPLEMENTATION RESULT

P0.1 Feeding:       PASS
P0.2 Age:           PASS
P0.3 Activity:      PASS
P0.4 Size:          PASS
P0.5 Central Brain: PASS
P0.6 Breed:         PASS
P0.7 Tests:         PASS
P0.8 Quality Gates: PASS
```

Against the fourteen conditions:

| # | Condition | |
|---|---|---|
| 1 | Owner-facing feeding guidance has exactly one canonical path | ✅ `feedingGuidance.ts`, product-sourced |
| 2 | Feeding does not use invented generic percentages | ✅ five removed |
| 3 | Breed midpoint cannot become actual pet weight | ✅ path removed, test pins it |
| 4 | Age has one canonical calculation | ✅ eight consolidated |
| 5 | Duplicate derived writers removed for the affected values | ✅ age, activity, energy, feeding, size |
| 6 | Activity uses the correct source | ✅ `breed_information`, not the breed name |
| 7 | Dead `pet.size` is no longer a dependency | ✅ |
| 8 | CentralBrain has no unnecessary global runtime behaviour | ✅ lazy; zero fetches with zero consumers |
| 9 | Provenance sufficient for owner-facing feeding guidance | ✅ three-state column, CHECK-constrained, honest labels |
| 10 | Tests pass | ✅ 173/173 |
| 11 | Typecheck passes | ✅ |
| 12 | Lint passes | ✅ |
| 13 | Build passes | ✅ |
| 14 | No critical P0 correctness issue remains | ✅ |

```
IMPLEMENTATION_READY_FOR_P1: YES
```

### Carried into P1, not blocking

- **R-01 is answered in code, not by decision.** `feeding_guide` now declares
  its provenance and is labelled honestly. Whether an admin flow should let a
  human promote a guide to `manufacturer_confirmed` is a P1 product call — no
  writer sets that value today.
- **R-03 health score** still has no owner in the data contract. Out of P0 scope.
- `FelineObesityCare`'s weight-loss rate wants a look from whoever writes the
  Nutrition specification.
- `PetGuardianPanel` and `BrainDebuggerOverlay` remain unrendered. Retiring or
  re-sourcing them is P4 (`53` DD-11).

---

# 17. P1 Foundation Status

Built. Full record in `55-P1-FOUNDATION-IMPLEMENTATION.md`.

## 17.1 What P1 changed about this document's conclusions

Nothing was found to be wrong. Two things were found to be **incomplete**, and
both are recorded in `55`:

- **§7 Provenance Reconciliation** treated the seven source types as settled.
  Building the registry showed that `46`'s worked example for
  `preference.toy_type` lists an eighth, `BEHAVIOR_DERIVED`, which `45` never
  defines. It is not implemented; adding it is a change to `45`, not a value a
  definition can introduce.
- **§8 Fact / Observation / Event Boundary** said observations and facts need
  separate tables. It did not say what an observation's *source* list is, and it
  differs from a fact's: `PURCHASE_DERIVED` and `AI_INFERRED` cannot make an
  observation at all. That is now a CHECK constraint.

Four document-vs-document conflicts surfaced while implementing, each resolved
in writing rather than silently: the weight unit (`46` vs `47`/DD-01 → grams),
the registry column names (`03` vs `46` → `46`), `RETRACTED` vs `REJECTED` (→
`RETRACTED` for the status, `REJECTED` for the verification), and
`health.allergy` as an enum over a table that does not exist (→ string with
`normalized_value`). `55` §16.

## 17.2 The one real bug the sprint found

`pg` returns timestamps as `Date` objects and `String(date)` drops the
milliseconds. Two writes inside the same second produced a fact whose
`effective_to` landed before its own `effective_from`. The
`pet_facts_window` CHECK constraint rejected it — the schema caught what the code
had got wrong, which is the argument for putting the invariant in both places.
Fixed in `petFactRegistry.js` and `petFactResolution.js`, with a regression test.

## 17.3 Status

| # | Condition | Result |
|---|---|---|
| 1 | Registry rejects unknown keys | ✅ `UNKNOWN_FACT_KEY` |
| 2 | Fact values validated against the definition | ✅ eight types, enum, range, unit |
| 3 | Provenance enforced, no silent promotion | ✅ verification never read from a request |
| 4 | Temporal and lifecycle rules work | ✅ supersession, backdating, five states, audit trail |
| 5 | Observations distinct from facts | ✅ separate table and source rules |
| 6 | Events have stable identity and the right pet | ✅ `outbox_events.pet_id` |
| 7 | Ownership enforced | ✅ 7/7 entry points, 404 not 403 |
| 8 | No duplicate canonical writers introduced | ✅ derived keys accept `SYSTEM_DERIVED` only |
| 9 | Existing Pet behaviour intact | ✅ `serializePet` untouched |
| 10 | Migrations safe and reversible | ✅ 38/38, re-run clean, rollback executed |
| 11 | Tests pass | ✅ 257/257 unit, 46/46 integration |
| 12 | Typecheck passes | ✅ |
| 13 | Lint passes | ✅ |
| 14 | Build passes | ✅ |

```
P1_FOUNDATION_READY: YES
```

## 17.4 What P1 deliberately did not do

The foundation has no consumers. `serializePet` and `normalizePetPayload` are
byte-identical, every screen reads what it read before, the eleven dead columns
are untouched, and no existing feature was migrated onto facts. The migration
strategy is ADD → VALIDATE → BACKFILL → DUAL WRITE → DUAL READ → CUTOVER, and
this sprint is the first three. There is no rule engine, no decay, no timeline
projection, and no AI reasoning — `55` §15 lists all eleven limitations.
