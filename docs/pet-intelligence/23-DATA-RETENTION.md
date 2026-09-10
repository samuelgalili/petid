# 23 — Data Retention

## Today: nothing expires

There is no retention policy anywhere in the system, no purge job, and no TTL on
any table. `ai_requests`, `usage_events`, `cost_events`, `outbox_events`,
`admin_audit_log` and `notifications` all grow without bound — on a single EC2
instance whose disk is also holding every user's photos and medical documents.

That is a capacity problem before it is a compliance one.

---

## The governing rule

> **A superseded fact is not stale data. It is history.**
>
> A current value changing is never a reason to delete what came before.

The whole provenance model depends on this. "Blue was recorded as
chicken-allergic from November to September" is exactly the kind of question a
vet asks, and it exists only if the superseded row survived.

---

## Retention by category

| Data | Retain | Then | Why |
|---|---|---|---|
| **`pet_facts` — clinical, any status** | life of the pet + 7 years | archive, never hard-delete while the owner's account lives | medical history has a long tail; 7 years mirrors common clinical record practice |
| `pet_facts` — non-clinical, `CURRENT` | life of the pet | with the pet | |
| `pet_facts` — non-clinical, `SUPERSEDED`/`RESOLVED` | 3 years | archive | trend value decays |
| `pet_facts` — `REJECTED` | 1 year | delete | audit of a dismissal; short shelf life |
| **`pet_documents` (the files)** | life of the pet + 7 years | **owner deletes on request; otherwise archive** | canonical evidence — `16` |
| `pet_document_extractions` | with the document | | |
| `pet_observations` — weight, clinical | with the clinical facts | | the trend is the value |
| `pet_observations` — measurements | 3 years | archive | a chest girth from 2021 is not useful |
| `pet_vet_visits`, `pet_vaccinations` | life of the pet + 7 years | | already the practice for the tables that exist |
| `insurance_claims` | 7 years | | financial + clinical |
| **`pet_insights` / predictions** | 90 days, or until `valid_until` | **delete** | projections — recomputable, and a stale insight is worse than none |
| `pet_timeline_entries` | as long as its sources | **rebuild, never restore** | a projection (`08`) |
| **`outbox_events`** | 90 days **after every internal consumer cursor has passed** | archive | the cursor is what makes it safe (`07`) |
| `ai_requests` / `usage_events` / `cost_events` | 24 months | aggregate, then delete detail | financial reconciliation window; already carry `pet_id` |
| `admin_audit_log` | 7 years | | staff access to clinical data must stay answerable (`21`) |
| `notifications` | 12 months | delete | |
| `orders` / `order_items` | 7 years, anonymised on account deletion | | already the behaviour |
| **Activity points (future)** | raw points 90 days; aggregates indefinitely | delete points | `14` — a route is a map of where someone lives |

The activity row is a deliberate asymmetry: the aggregate ("4.2 km on 8 Sept")
is a memory; the point trail is a surveillance record. Keep the first, expire the
second.

---

## Lifecycle transitions

### Pet archived
Nothing is deleted. Facts stop being recomputed. Insights are marked `STALE` and
no new ones are generated. Reminders stop.

### Pet deceased
`DECEASED` does not exist today — the word appears nowhere in `src/` or
`server/src/`, and `ARCHIVED` is currently doing duty for hidden, rehomed and
deceased. What matters here is the **retention behaviour**, and it is why the
state is worth adding:

- Records are **retained**, in full. Bereaved owners come back for them.
- Insights, predictions, reminders and reorder prompts **stop immediately**.
- Nothing in the system tries to sell food to a dead pet. That single sentence
  is the strongest argument for the state existing.

### Pet deleted
Facts, observations, extractions, insights and timeline entries cascade with the
pet — `pet_facts.pet_id` is `ON DELETE CASCADE`.

**Note what already happens and must not be copied:** `pet_documents`,
`pet_service_bookings`, `insurance_claims` and `social_posts` are all
`ON DELETE SET NULL` on `pet_id`. Deleting a pet today leaves its medical
documents alive and detached, with no notice to the owner. Verified by running
the delete against a migrated database. Whether that is right is an
`OPEN DECISION` (`28`) — but the new tables should not inherit it by default.

### Document deleted
The facts it produced are **closed with reason `source_deleted`**, not orphaned.
A deleted medical record must not leave its conclusions behind — that is worse
than keeping the record.

### Account deleted
`deleteMyAccount` already exports first, removes files from disk, and anonymises
orders rather than deleting them. Pet intelligence follows the pets, which
cascade from `app_users`.

---

## Archive, not delete

"Archive" means: moved out of the operational table, still retrievable for a data
request, no longer joined in any query path.

For a single-host deployment the honest options are a cold table in the same
database or a compressed export to object storage — and there is no object store
today, which is itself flagged as a risk in the system audit. So: **cold tables
first**, object storage when it exists. Do not design a tiering system for a
volume that does not exist yet.

---

## Purge needs a job runner it does not have

Every policy above needs a scheduled job, and the only background machinery in
the system is two `setInterval` loops in the API process — one of which
(the outbox dispatcher) is not even running in production. There is no durable
queue, no dead letter, no sweeper.

So retention is **blocked on the durable job runner** (`29`, and
`docs/system-workflows/25`). Until it exists:

- Read-time expiry where possible — preference decay is computed from
  `observed_at` and a half-life, not by a nightly pass (`05`, `12`). A read-time
  computation cannot silently stop working.
- Everything else accumulates, knowingly, and is listed as debt rather than
  quietly ignored.

---

## Open questions for the product owner

Collected in `28`:

- Clinical retention period — 7 years is a reasonable default, not a legal
  finding. Israeli requirements for veterinary records held by a non-clinical
  platform are `UNKNOWN` from this repository.
- Does an owner get to hard-delete a medical document, or only archive it?
- What survives a pet deletion, given that documents currently do?
- Do bereaved owners keep access indefinitely, and under what state?
