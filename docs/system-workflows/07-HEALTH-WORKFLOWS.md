# 07 — Health Workflows

## What exists — `EXISTS`, manual entry only

Four tables, all user-owned, all reachable through `/api/me/...` routes with
`requireUser` plus a `user_id` predicate.

| Table | Cols | Routes |
|---|---|---|
| `pet_vet_visits` | 19 | `GET/POST /api/me/pets/:id/vet-visits` |
| `pet_vaccinations` | 11 | `GET/POST /api/me/pets/:id/vaccinations` |
| `insurance_claims` | 18 | `GET/POST /api/me/insurance-claims` |
| `pet_service_bookings` | 17 | `GET/POST /api/me/service-bookings` |

Plus a composed read: `GET /api/me/pets/:id/health-summary`
(`server/src/index.js:8069`).

### `pet_vet_visits` is better modelled than `pets`
`visit_date`, `clinic_name`, `vet_name`, `reason`, `diagnosis`, `treatment`,
`notes`, `vaccines` (jsonb), `visit_type`, `next_visit_date`,
`is_recovery_mode`, `recovery_until`, `raw_summary`, `cost`.

Two columns are worth calling out:

- **`raw_summary`** — a place for unstructured text. This is the natural
  landing site for a document extraction (`06`) before it becomes facts.
- **`is_recovery_mode` / `recovery_until`** — a *temporal health state* on the
  pet. This is the only place in the schema where a health condition has an
  end date. Everything in `05` about `effective_from`/`effective_to` is a
  generalisation of what this pair already does.

### `pet_vaccinations` has `expires_at`
So vaccination expiry is computable today. Nothing computes it: there is no
reminder job (`25`) and no notification rule (`16`). The data supports a
feature that is not built.

---

## Gaps

| Gap | Status | Note |
|---|---|---|
| No update or delete | `NEEDS EXTENSION` | Only `GET` and `POST` exist for vet visits and vaccinations. A typo in a vaccination date is permanent. |
| No allergy model | `MISSING` | Forced into `pets.medical_conditions[]` |
| No medication model | `MISSING` | No dose, no schedule, no adherence |
| No weight history | `MISSING` | The single most useful longitudinal health signal |
| No lab results | `MISSING` | `raw_summary` is the only home for them |
| No vaccination reminders | `MISSING` | `expires_at` exists; nothing reads it |
| No vet identity | `MISSING` | `vet_name` is a string on three different tables |
| No provenance | `MISSING` | Everything here is `USER_PROVIDED` by construction |
| Health data classified? | `PARTIALLY IMPLEMENTED` | Stored per-user with correct isolation, but with no special handling versus other columns — see `20` |

## Insurance

`insurance_claims` carries `owner_id_number` in plain text alongside a
generated `claim_number`. Note that `profiles` has both `id_number_last4` and
`id_number_encrypted`, so the codebase already has a convention for handling an
Israeli ID number — and `insurance_claims` does not follow it. Flagged in
`19-SECURITY-WORKFLOWS.md`.

Claim states: `status` defaults to `'pending'` with a free-text `status_note`
and **no CHECK constraint** — so the set of claim states is whatever has been
written. Compare `orders.status`, which is constrained. See `22`.

## Health event flow (target)

```
vet visit / vaccination / document
              │
        insert row  ──────────────► emit event (18)
              │                            │
       promote to pet_facts (05)     timeline entry (04)
              │                            │
     recompute derived facts          notification rule (16)
     (life stage, activity target)         │
              │                      reminder scheduled
     product matching refresh (13)
```

Of that diagram, only the leftmost box is built. `outbox_events` declares no
health event types at all — the 16 declared types cover users, orders, pets,
claims, bookings and content reports, but not a vet visit or a vaccination
(`server/src/events.js:22-37`).

## Medical safety rule

The chat's system prompt already states the right posture and should stay the
model for everything else:

> "You are not a veterinarian. For urgent symptoms […] tell the user to contact
> an emergency veterinarian immediately. For medical images/documents,
> summarize and triage. Do not diagnose with certainty."

Any health feature added later inherits this: Mipo records, reminds, and
surfaces. It does not diagnose, and it never writes a clinical fact that no
human confirmed.
