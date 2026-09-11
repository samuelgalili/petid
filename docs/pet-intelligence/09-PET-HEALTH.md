# 09 — Pet Health

## What exists — and it is more than the audit implied

| Table | Cols | Notable |
|---|---|---|
| `pet_vet_visits` | 19 | `raw_summary`, `is_recovery_mode`, `recovery_until`, `vaccines` jsonb, `cost`, `next_visit_date` |
| `pet_vaccinations` | 11 | `administered_at`, **`expires_at`**, `veterinarian`, `batch_number` |
| `insurance_claims` | 18 | `diagnosis`, `treatment`, amounts, generated `claim_number` |
| `pet_service_bookings` | 17 | grooming/boarding/etc. |

Two columns deserve attention because they already do what this whole design
generalises:

- **`is_recovery_mode` + `recovery_until`** — a health state with an **end date**.
  This is the only place in the current schema where a condition is temporal.
  `effective_from`/`effective_to` on facts is the generalisation of this pair.
- **`raw_summary`** — free text with no structure. The natural landing site for a
  document extraction *before* it becomes facts (`16`).

And `pet_vaccinations.expires_at` means vaccination expiry is **computable
today**. Nothing computes it: no reminder job, no notification rule. The data
supports a feature that is not built.

---

## Record vs Fact

The distinction that organises this document:

```
   pet_documents        the evidence          (the PDF)
        │
   pet_vet_visits       the encounter         (what happened, when, with whom)
   pet_vaccinations
        │
   pet_facts            the queryable state   (what is true of this animal now)
```

A vet visit is not a fact. It is an *event with an attached record*. It yields
facts: a weight, a diagnosis, a medication. Those facts point back at the visit
via `source_id`, and the visit points back at the document.

**Records are corrected; facts are superseded.** A typo in a visit date is fixed
in place (with an audit row). A weight that turns out to be different is a new
fact that closes the old one. Confusing these is how health history gets
destroyed.

---

## Health domain map

| Entity | Model as | Home | Status |
|---|---|---|---|
| Vet visit | record | `pet_vet_visits` | ✅ EXISTS |
| Vaccination | record + fact | `pet_vaccinations` + `health.vaccination_status` | ✅ / PROPOSED |
| Condition | **fact**, multi, dated | `health.condition` | PROPOSED |
| Allergy | **fact**, multi, clinical | `health.allergy` | PROPOSED — no column today |
| Sensitivity | **fact**, multi, clinical | `health.sensitivity` | PROPOSED |
| Medication | **fact**, multi, with start/end | `health.medication` | PROPOSED |
| Supplement | fact | `nutrition.supplement` | PROPOSED |
| Lab result | **observation** | `pet_observations` | PROPOSED |
| Surgery / dental / procedure | record + fact | `health.procedure` | PROPOSED |
| Preventive care | derived schedule | from vaccinations + species rules | PROPOSED |
| Neuter status | fact, with a date | `health.neuter_status` | today a bare boolean |
| Insurance | fact or small table | `pets.insurance_*` | ✅ partial |

### Why allergy is a fact and not a condition
`pets.medical_conditions text[]` currently holds both, plus anything else the
owner typed. They behave differently:

- A **condition** has an onset, may resolve, and drives care.
- An **allergy** is a hard exclusion in the matching engine (`18`), never
  resolves without clinical evidence, and must carry `normalized_value` so
  `chicken` / `עוף` / `Chicken meal` all match the catalogue's `ingredients`.

Separating them is what makes `18` possible at all.

---

## Medication modelling

The only health entity that genuinely needs a start and an end and can recur:

```
health.medication   value_ref → a product or a free-text name
                    value_json: { dose, unit, frequency, route }
                    effective_from = started
                    effective_to   = ended (null = ongoing)
                    source: VET_DOCUMENT | USER_PROVIDED | VET_CONFIRMED
```

An ended course stays as history — "was on prednisolone in March" is a clinically
relevant sentence. Adherence tracking is explicitly **out of scope**: it needs
scheduled notifications, which need a durable job runner that does not exist
(`docs/system-workflows/25`).

---

## Preventive care — derived, not stored

Vaccination due dates are computed from `pet_vaccinations.expires_at` plus
species rules, not stored as a schedule. Storing a schedule creates a second
source of truth that drifts the moment a vaccination is recorded late.

```
pet_vaccinations.expires_at  +  species/region rules  ──►  due list
                                                            │
                                                     timeline entry (08)
                                                     notification (when 16 exists)
```

Israel-specific: rabies vaccination is legally required for dogs and the schema
already carries the dangerous-breed and licensing columns, so the regulatory
context is partly modelled. Whether Mipo should surface a legal obligation is an
`OPEN DECISION` (`28`) — getting it wrong in either direction has consequences.

---

## Gaps in the existing tables

| Gap | Impact |
|---|---|
| **No update or delete routes** for vet visits or vaccinations — only `GET` and `POST` | A mistyped vaccination date is permanent. This is the most user-visible health defect in the system. |
| `insurance_claims.status` has **no CHECK** | claim states are whatever was written; compare `orders.status`, which is constrained |
| `insurance_claims.owner_id_number` is **plain text** | `profiles` uses `id_number_last4` + `id_number_encrypted`; this table does not follow the convention |
| No vet identity | `vet_name` is a string on three tables; no `VET_CONFIRMED` producer can exist without one |
| No lab results | `raw_summary` is their only home |
| Vaccination expiry unused | data exists, nothing reads it |

---

## Authorization and privacy

Health data is the most sensitive category in the system. Requirements, most of
which the codebase already meets for documents:

1. **Server-side, always.** Every health route is `requireUser` + a `user_id`
   predicate today. That must extend to `owner_scope_id` (`01`) rather than being
   replaced.
2. **Health facts never leave the account.** Not to the feed, not into a
   recommendation another user can see, not into an event payload (`07` — clinical
   fact events carry the key, never the value).
3. **Documents stay owner-only.** `servePublicUpload` already looks a storage key
   up in `pet_documents` and requires ownership plus serves `isPrivate` +
   `sandbox`. Keep exactly this.
4. **Care-team grants are per-domain.** A future vet grant should read health and
   documents, not commerce. Designed in `22`.
5. **`is_clinical` facts are excluded from AI training and from any prompt that
   leaves the account boundary.** They may be sent to a provider in service of
   *this* pet's own request, under `profiles.ai_consent_given` — which is stored
   today and, as far as I can find, never checked before a call.

---

## Health flow, target

```
document / vet visit / owner entry
            │
      record written  ──────────────► event (07)
            │
   extraction (16) for documents
            │
      candidate facts, clinical ⇒ confirmation required (04, 06)
            │
      pet_facts                  ──────────────► timeline (08)
            │                                     │
   ┌────────┴─────────┐                    recompute derived
   │                  │                    (life_stage, size_band)
matching gates (18)  CRM (21)                     │
   │                                        insights (20)
product eligibility
```

Today only the leftmost box exists.
