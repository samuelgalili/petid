# 33 — Health Data Contract

## What exists

| Table | Cols | Live |
|---|---|---|
| `pet_vet_visits` | 19 | ✅ `raw_summary`, `is_recovery_mode`, `recovery_until`, `vaccines` jsonb, `cost`, `next_visit_date` |
| `pet_vaccinations` | 11 | ✅ `administered_at`, **`expires_at`**, `veterinarian`, `batch_number` |
| `insurance_claims` | 18 | ✅ `diagnosis`, `treatment`, amounts, generated `claim_number` |
| `pet_service_bookings` | 17 | ✅ |
| `pets.medical_conditions[]`, `health_notes` | — | the only "facts", untyped and undated |

`is_recovery_mode` + `recovery_until` is the one temporal health state in the
current schema. `effective_from`/`effective_to` generalises exactly that pair.

`expires_at` means vaccination expiry is **computable today** and nothing
computes it.

---

## §8 — The dictionary

`F` fact · `E` event · `O` observation · `R` record (existing table) ·
`REL` relationship.

| Entity | Cat. | Key | Current/Historical | Sources | Confirmation | Effective dates |
|---|---|---|---|---|---|---|
| Condition | F | `health.condition` | both | VET_CONFIRMED, VET_DOCUMENT, USER_PROVIDED | doc ⇒ **confirm** | onset → resolution |
| **Allergy** | F | `health.allergy` | both | same | **always confirm** | onset → resolution |
| Sensitivity | F | `health.sensitivity` | both | same | **always confirm** | onset → resolution |
| Injury | F | `health.injury` | both | same | doc ⇒ confirm | onset → healed |
| Surgery | F+R | `health.procedure` | historical | VET_DOCUMENT, USER_PROVIDED | doc ⇒ confirm | a date |
| Dental | F+R | `health.procedure` kind=dental | both | same | confirm | date, next due |
| Medication | F | `health.medication` | both | same | **always confirm** | started → ended |
| Supplement | F | `nutrition.supplement` | both | USER_PROVIDED, VET_DOCUMENT | no | started → ended |
| Vaccination | R+F | `pet_vaccinations` + `health.vaccination_status` | both | VET_DOCUMENT, USER_PROVIDED | **confirm** — drives reminders and legal compliance | administered → expires |
| Vet visit | R+E | `pet_vet_visits` | historical | the record itself | no | a date |
| Lab result | **O** | `pet_observations` | historical | VET_DOCUMENT | no — it is a reading | measured_at |
| Preventive care | **DERIVED** | — | current | computed from vaccinations + species rules | — | — |
| Vet recommendation | F | `health.vet_recommendation` | both | VET_DOCUMENT, VET_CONFIRMED | no | issued → superseded |
| Neuter status | F | `health.neuter_status` | current | VET_DOCUMENT, USER_PROVIDED | confirm | date → null |
| Body condition | F | `physical.body_condition` | both | VET_*, USER_PROVIDED | — | observed → superseded |
| Insurance | F | `insurance.*` | both | USER_PROVIDED | no | from → expiry |

### Three classification calls worth stating

**Lab results are observations, not facts.** A creatinine value is a reading at a
time. It may *support* a condition fact, but the number itself belongs in
`pet_observations` with a unit — where it can be trended.

**Preventive care is derived, never stored.** Due dates come from
`pet_vaccinations.expires_at` plus species rules. Storing a schedule creates a
second source of truth that drifts the moment a vaccination is recorded late.

**Allergy is not a condition.** They behave differently: a condition has an
onset and may resolve and drives care; an allergy is a **hard exclusion** in
`52`, never resolves without clinical evidence, and needs `normalized_value` so
`chicken` / `עוף` / `Chicken meal` all match `business_products.ingredients`.
Separating them is what makes matching possible at all.

---

## §9 — Medical data safety

### Source hierarchy for clinical keys
```
VET_CONFIRMED  >  VET_DOCUMENT  >  USER_PROVIDED  >  ✗ everything else
```

`SYSTEM_DERIVED`, `ACTIVITY_DERIVED`, `PURCHASE_DERIVED` and `AI_INFERRED` are
**structurally excluded** from clinical keys. Enforced by
`pet_fact_definitions.is_sensitive`/`requires_source`, checked at write time —
not by a reviewer remembering.

`VET_CONFIRMED` has **no producer today**: there is no vet identity in the
system. It is defined now so the ranking does not have to change when one
arrives (`53`, and OD-04/OD-14 in `28`).

### What requires what

| Value | Requirement |
|---|---|
| Allergy, sensitivity | `USER_CONFIRMATION` if extracted; `DOCUMENT_EVIDENCE` or user entry to originate |
| Diagnosis / condition | `USER_CONFIRMATION` if extracted |
| Medication, dose, schedule | `USER_CONFIRMATION` — always |
| Vaccination type + date | `USER_CONFIRMATION` — legal and reminder consequences |
| Neuter status | `USER_CONFIRMATION` |
| Body condition driving diet | `VET_CONFIRMATION` or `USER_PROVIDED`; **never AI, never derived** |
| Weight, temperature, lab value | none — a reading, and volatile |
| Visit date, clinic, vet name | none — record metadata |

### The rule that must not bend

> An `AI_INFERRED` value never becomes a clinical fact. Not by promotion, not by
> a confidence threshold, not by an admin toggle.

A model **may read** a document — that produces `VET_DOCUMENT` facts, because the
document is the source and the model is the reader. `ai_request_id` records which
model read it, so a misreading is traceable to both the document and the call.

### `DISPUTED` reads restrictively
While a clinical fact is disputed, the **restrictive** interpretation applies. A
disputed chicken allergy keeps chicken excluded until it is settled. Enforced in
the rule engine, not left to whoever writes the query. Ambiguity resolves toward
not harming the animal.

---

## Medication — the one entity that genuinely needs start and end

```
health.medication
  value_ref → product, or value_text
  value_json { dose, unit, frequency, route }
  effective_from = started · effective_to = ended (null = ongoing)
  source: VET_DOCUMENT | USER_PROVIDED | VET_CONFIRMED
  requires_confirmation: true
```

An ended course stays as history — "was on prednisolone in March" is clinically
relevant. **Adherence tracking is out of scope**: it needs scheduled
notifications, which need a durable job runner that does not exist.

---

## Privacy

Everything in this document is `SENSITIVE` (`50`).

1. **Server-side always.** Every health route is `requireUser` + a `user_id`
   predicate today; that extends to `owner_scope_id`, it does not get replaced.
2. **Clinical fact events carry the key, never the value** (`42`). The outbox
   delivers to an external endpoint; a payload reading "Blue is allergic to
   chicken" is a disclosure nobody agreed to.
3. **Documents stay owner-only.** `servePublicUpload` already looks the key up in
   `pet_documents` and requires ownership, serving `isPrivate` + `sandbox`. Keep
   exactly this.
4. **Care-team grants are per-domain** — a vet grant reads health and documents,
   not commerce (`49`).
5. **Staff reads of clinical data are logged** to `admin_audit_log`, which
   already exists.
6. **`ai_consent_given` must be checked** before any clinical AI call. It is
   stored and, as far as I can find, read nowhere.

---

## Gaps

| Gap | Severity |
|---|---|
| **No update or delete routes** for vet visits or vaccinations — only `GET` and `POST` | **High.** A mistyped vaccination date is permanent. The most user-visible health defect in the system. |
| No allergy model — folded into `medical_conditions[]` | High — blocks `52` |
| `insurance_claims.status` has **no CHECK** | Medium — states are whatever was written; compare `orders.status`, which is constrained |
| `insurance_claims.owner_id_number` is **plain text** | High — `profiles` uses `id_number_last4` + `id_number_encrypted`; this table ignores the convention |
| No vet identity | blocks `VET_CONFIRMED` entirely |
| Vaccination expiry unused | data exists, nothing reads it |
| No lab result model | `raw_summary` is their only home |
| `detectDiscrepancies` in `CentralBrainContext` is permanently dead | it checks chip number and vet name against OCR records that are hardcoded empty |
