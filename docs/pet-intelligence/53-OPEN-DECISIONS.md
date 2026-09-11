# 53 — Open Decisions (data contract phase)

New decisions raised by this phase. Decisions from `28` still stand and are
cross-referenced, not repeated.

Format: question · evidence · options · recommendation · what it blocks.

---

## Blocking

### DD-01 · Canonical weight unit — grams or kilograms?
**Evidence:** `pets.weight` is `numeric` with kilograms assumed;
`pets.weight_unit` is a **dead column**. A budgerigar is 0.035 kg.
**Options:** (a) grams canonical, display kg above 1000 g; (b) kg canonical with
more decimals; (c) unit per species.
**Recommendation:** (a). A gram is meaningful for a bird and meaningless for a
Great Dane — the canonical unit must be the small one. (c) is the worst option:
it is (b) with a species branch in every consumer.
**Blocks:** `41`, `47`, every weight-derived gate.

### DD-02 · One feeding calculation, and which?
**Evidence:** **two exist in the client and disagree.**
`CentralBrainContext.calculateNrc` uses RER/MER (`70 × w^0.75`, × 1.6/1.8);
`TopRecommendation` uses 2–4% of body weight by age band. Both are shown to
owners; neither cites a source.
**Options:** (a) quote `business_products.feeding_guide` only; (b) RER/MER,
labelled an estimate with the vet caveat; (c) keep both.
**Recommendation:** (a) for v1, with (b) as a clearly-labelled secondary. Retire
the % -of-body-weight version. **Never** compute for a `PRESCRIPTION` diet or a
diet-managed condition — reuse the existing `DIET_SENSITIVE_CONDITIONS` list
rather than inventing a second one.
**Blocks:** `34`, `43`, part of gate 6 in `52`.

### DD-03 · Does `SYSTEM_DERIVED` outrank `USER_PROVIDED` for derived keys?
**Evidence:** the brief's hierarchy puts `SYSTEM_DERIVED` below `USER_PROVIDED`.
**Recommendation:** **yes for derived keys only** — one writer, the rule engine.
A user disagreeing with a life stage is disagreeing with the birth date, and the
UI routes them there.
**The argument:** two writers on a derived value is exactly how `pets.age` and
`pets.size` became dead columns.
**Blocks:** `43`, `45`.

### DD-04 · Is the fact registry code-controlled?
**Evidence:** the brief says it must not become a dynamic schema.
**Recommendation:** **migrations only.** No API creates a definition, no admin
screen adds a key. A new fact key is a reviewed migration, because that is what
it is. `DEPRECATED` stops writes and keeps reads.
**Blocks:** `46`, and the integrity of everything downstream.

---

## Model decisions — recommendation given, confirm or overrule

### DD-05 · Life-stage thresholds
Size-banded for dogs, fixed for cats, a neutral `JUVENILE/ADULT/SENIOR` triple
for birds, rabbits and rodents — stored as versioned `life_stage_rules` rows.
**These are a starting point, not veterinary consensus.** They want a vet's
review before they gate anything.

### DD-06 · Rabbit separate from rodent
Lagomorph, hay-first, GI stasis rather than wet tail, no vitamin-C requirement,
common in Israel. Filing rabbits under `rodent` gives a large group the wrong
nutrition rules. **Recommendation: separate.** (Extends OD-01 in `28`.)

### DD-07 · Confidence only where meaningful
Not on `pets.name`, not on `species`, not on a deterministic derivation, not on a
scale reading. Adding it everywhere makes it noise, and noise is ignored on the
one screen where it matters.

### DD-08 · `RETRACTED` vs `REJECTED`
Same state, two names across these documents. **Recommendation: `RETRACTED`** —
it describes the record, not a judgement of the person.

### DD-09 · Does a Moment survive its pet?
**Evidence:** `social_posts.pet_id` is `ON DELETE SET NULL`. The Moment lives on,
detached; the feed handles it, but what the card should say is undefined.
**Recommendation:** snapshot the pet's name and avatar onto the post at creation
and render the snapshot. A memorial that says nothing is worse than one that says
a name.

### DD-10 · Should `AI_INFERRED` facts appear on the pet profile?
**Recommendation:** anything shown on the profile is **proposed, not applied**.
Silent writes are for ranking-only signals. An owner opening their pet's page and
finding a trait they never entered is the experience this prevents.
`AddPet.tsx` already has the UI pattern — `breedSource` + a confidence display.

### DD-11 · What to do with `CentralBrainContext`
**Evidence:** 280 lines, mounted in `App.tsx:116`, consumed by
`PetGuardianPanel` and `BrainDebuggerOverlay`. `calculateNrc` is live;
`OcrRecord`, `detectDiscrepancies` and the OCR tier of `getField` are **live code
that can never fire** (`setOcrRecords([])` is hardcoded); `resolveDiscrepancy`
writes React state that is lost on reload.
**Options:** (a) keep as the client view over a server Pet 360; (b) retire it
into the server; (c) leave it.
**Recommendation:** (a) — it is a well-shaped view. Its `OcrRecord` and
`DiscrepancyAlert` shapes should inform `40` and `45` rather than be duplicated.
The computations move to the server; the panel keeps rendering.

### DD-12 · `product_variations` on the canonical catalogue
**Evidence:** it exists for `scraped_products` **only**. `business_products`
becomes canonical (`39`) and has no variant model, so size and flavour selection
on a published product has no home.
**Recommendation:** resolve together with OD-02 in `28` — it is the same schema
decision.

---

## Operational

### DD-13 · Create `qr_scan_logs`, or remove the write?
**Evidence:** `server/src/index.js:2119` inserts into it; it is in none of the 33
migrations. Every QR scan of a lost pet logs a warning and is discarded. The
`pet.qr_scanned` event still fires, so the alert works and the trail does not.
**Recommendation:** **create the table.** A scan trail is exactly what an owner
asks for after the fact.

### DD-14 · Fix `InsuranceSheet.tsx`
**Evidence:** it renders `pet.insurance_policy_number` through its own local
interface. `serializePet` never returns it; `MipoPet` does not declare it. The
block can never appear.
**Recommendation:** decide whether the field should exist. If yes, add it to the
serializer and the write allowlist; if no, remove the component's dead branch.
Dropping the dead column is correct either way.

### DD-15 · `breed_information.weight_range_kg` is free text
**Evidence:** stored as `"25-36"` and parsed with `/(\d+)-(\d+)/` in
`TopRecommendation.tsx`. It is an input to `size_band` and therefore to life
stage.
**Recommendation:** if `size_band` becomes a gate in `52`, convert to two
numerics first. A regex over free text is not a foundation for a product gate.

### DD-16 · Encrypt `insurance_claims.owner_id_number`
Plain text, against the codebase's own convention (`profiles.id_number_last4` +
`id_number_encrypted`). Needs `SECRET_ENCRYPTION_KEY`, which is also what blocks
admin 2FA and the Connectors page. **One SSM parameter unblocks three things.**

### DD-17 · Add `customers.health.read`
So support can see orders and pets without seeing a diagnosis, and every clinical
staff read writes to `admin_audit_log`. The RBAC mechanism already supports it —
the catalogue routes use five permissions individually.

### DD-18 · Check `ai_consent_given`
Stored today, read **nowhere**. Document extraction sends a medical record to a
third-party model. **Recommendation:** required, server-side, before any
pet-scoped clinical AI call.

---

## Deferred to `28`

| Question | Ref |
|---|---|
| Which species (the full set) | OD-01 |
| Unreviewed `scraped_products` on sale | OD-02 |
| Delegation / care-team grants | OD-04 |
| `DECEASED` state | OD-07 |
| What pet deletion does | OD-08 |
| Preference decay half-lives | OD-10 |
| Clinical retention period | OD-12 |
| `care_providers` entity | OD-14 |
| Native vs web (gates Activity) | `system-workflows/DECISIONS.md` D-21 |
| Organizations | D-26 |

---

## Unknown from this repository

| # | Question |
|---|---|
| U-10 | Israeli requirements for veterinary records held by a **non-clinical platform** |
| U-11 | Whether `product_variations` is used by any live screen |
| U-12 | Whether `BrainDebuggerOverlay` is reachable in production or admin-gated |
| U-13 | Who owns the `breed_information` data and whether it is licensed |
| U-14 | Whether `TopRecommendation` is on a live route or orphaned |

Plus U-01 … U-09 in `28`, still open.
