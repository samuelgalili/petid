# 26 — Data Contract

One entry per entity: purpose, owner, source of truth, fields, relationships,
lifecycle, privacy, provenance.

---

## Pet
| | |
|---|---|
| **Purpose** | The stable identity of an animal |
| **Owner** | The account (`owner_scope_id`); future: an organization |
| **Source of truth** | `pets` — **EXISTS** |
| **Required** | `id`, `owner_scope_id`, `name`, `species` |
| **Optional** | breed, secondary_breed, is_mixed, breed_confidence, breed_source, gender, birth_date + precision, color, avatar_url, microchip, licensing, lost block |
| **Relationships** | 1:N facts, observations, documents, health records, Moments, order items |
| **Lifecycle** | `ACTIVE → ARCHIVED` (reversible) · `→ DECEASED` (proposed) · deleted |
| **Privacy** | Owner + grants. `GET /api/public/pets/:id` exposes a filtered subset, and only when lost or the profile is public |
| **Provenance** | Only `breed` has any today (`breed_confidence` + `breed_source`) |

## PetFact
| | |
|---|---|
| **Purpose** | A structured statement true of a pet over a period |
| **Owner** | The pet |
| **Source of truth** | `pet_facts` — **PROPOSED** |
| **Required** | `pet_id`, `namespace`, `key`, one typed value, `source_type`, `confidence`, `verification_status`, `observed_at`, `effective_from`, `status` |
| **Optional** | `source_id`, `unit`, `normalized_value`, `effective_to`, `superseded_by_fact_id`, `derived_from`, `rule_version` |
| **Relationships** | → `pets`; → the source row; → the fact it supersedes |
| **Lifecycle** | `CURRENT → SUPERSEDED \| RESOLVED \| DISPUTED \| REJECTED` (`05`) |
| **Privacy** | Class inherited from the key; `is_clinical` keys are health data |
| **Provenance** | **Mandatory, all nine columns.** This entity exists to carry it |
| **Immutability** | Append-only. Only status, `effective_to`, verification and confidence may change in place |

## PetObservation
| | |
|---|---|
| **Purpose** | A measured value at an instant |
| **Source of truth** | `pet_observations` — **PROPOSED** |
| **Required** | `pet_id`, `observation_type`, `value_number`, `unit`, `measured_at`, `source_type` |
| **Optional** | `source_id`, `method`, `confidence`, `note` |
| **Lifecycle** | Immutable. Corrections are new rows |
| **Privacy** | Clinical for weight/temperature/lab; medium for measurements |
| **Note** | Produces facts; never replaced by them |

## PetEvent
| | |
|---|---|
| **Purpose** | Something happened |
| **Source of truth** | `outbox_events` — **EXISTS**, extended with `pet_id` + `payload_version` |
| **Required** | `event_type`, `entity_type`, `occurred_at`, `origin`, `payload_version` |
| **Lifecycle** | `pending → delivering → delivered \| failed \| skipped` |
| **Privacy** | **Clinical events carry the key, never the value** (`07`, `22`) |
| **Retention** | 90 days after every consumer cursor has passed (`23`) |

## PetPreference
| | |
|---|---|
| **Purpose** | A liking, held with decaying confidence |
| **Source of truth** | `pet_facts`, namespace `preference` — **PROPOSED** |
| **Sources** | USER_PROVIDED · PURCHASE_DERIVED · BEHAVIOR_DERIVED · AI_INFERRED |
| **Lifecycle** | Confidence decays by half-life; expiry closes the fact |
| **Rule** | **Ranks, never excludes** (`12`) |
| **Today** | `localStorage["mipo-favorites"]`, `["mipo-care-plan:<petId>"]`, and the mirrored `favorite_activities`/`activities` pair |

## PetHealthRecord
| | |
|---|---|
| **Purpose** | A clinical encounter with an attached record |
| **Source of truth** | `pet_vet_visits`, `pet_vaccinations`, `insurance_claims` — **EXISTS** |
| **Relationships** | → `pets`; ← facts reference it via `source_id` |
| **Lifecycle** | Records are **corrected**; facts are **superseded**. Not the same thing |
| **Privacy** | Clinical throughout |
| **Gap** | **No update or delete routes.** A mistyped vaccination date is permanent |

## PetDocument
| | |
|---|---|
| **Purpose** | Canonical evidence |
| **Source of truth** | `pet_documents` + the private upload directory — **EXISTS** |
| **Required** | `user_id`, `title`, `file_url`, `file_name`, `storage_key` |
| **Proposed** | `status`, `content_hash`, `classified_type`, `document_date`, `ai_request_id` |
| **Lifecycle** | `UPLOADED → PROCESSING → PROCESSED \| FAILED \| REVIEW_REQUIRED → ARCHIVED` |
| **Privacy** | Owner-only. Magic-byte validated, `0600` in a `0700` directory, served `isPrivate` + `sandbox` |
| **Rule** | The file is **never** modified or replaced by its extraction, and stays downloadable even when extraction fails |

## PetInsight / PetPrediction
| | |
|---|---|
| **Purpose** | An interpretation (insight) or a forward statement (prediction) |
| **Source of truth** | `pet_insights` — **PROPOSED**, a **projection** |
| **Required** | `pet_id`, `insight_type`, `derived_from`, `computed_at`, `status` |
| **Prediction adds** | `valid_until` |
| **Lifecycle** | `ACTIVE → STALE \| DISMISSED`; recomputed, never corrected |
| **Rule** | **Never a source for a fact.** Detection is deterministic; AI phrases the result (`20`) |
| **Severity** | `INFO` or `ATTENTION` only. There is no `URGENT` tier |
| **Retention** | 90 days or `valid_until` — then deleted |

## ProductMatch
| | |
|---|---|
| **Purpose** | Whether a product suits a pet, and why |
| **Source of truth** | **Computed, never stored** — `productMatching.js`, pure |
| **Inputs** | current facts + a `PUBLISHED` product row + `rules_version` |
| **Outputs** | `match_status`, `matched_rules`, `failed_rules`, `warnings`, `missing_data`, `evidence` |
| **Rule** | Steps 0–4 are gates; 5–10 rank. No score without a versioned weights row (`18`) |
| **Why not stored** | A cached match goes stale the moment a fact changes, and a stale health exclusion is the worst possible cache miss |

---

## Cross-entity invariants

These are the properties a test suite should assert, and they are what the whole
design reduces to:

1. **Every fact has a source.** No exceptions, no nullable `source_type`.
2. **A fact's value is never edited.** Corrections supersede.
3. **A clinical fact is never `AI_INFERRED`.** Enforced by `is_clinical` at write
   time.
4. **A projection can be dropped and rebuilt identically.** True for the timeline
   and for insights. If it stops being true, that projection has become a second
   source of truth.
5. **A derived fact names its inputs and its rule version.**
6. **Absence is explicit** — `INSUFFICIENT_DATA` / `NOT_AVAILABLE`, never a zero
   and never an empty array standing in for "unknown".
7. **Deleting a source closes its facts** with reason `source_deleted`; it does
   not orphan them.
8. **No cross-pet leakage.** Facts, prompts, insights and recommendations are
   scoped to one pet (`39` of the brief).

## Ownership matrix

| Entity | Creates | Updates | Deletes | Reads |
|---|---|---|---|---|
| Pet | owner | owner | owner | owner, grantees, admin; filtered public if lost |
| PetFact | owner (USER_PROVIDED), extraction pipeline, rule engine, commerce | **status only** | cascade with pet | owner, grantees by scope, admin |
| PetObservation | owner, extraction | never | cascade | as facts |
| PetEvent | the system | never | retention | internal consumers, admin |
| PetPreference | owner, commerce | confidence decay | cascade | owner, admin |
| PetHealthRecord | owner | **owner — route missing** | **route missing** | owner, health grantees, admin |
| PetDocument | owner | metadata only | owner | owner, document grantees, admin |
| PetInsight | the system | recompute | retention | owner, admin |
| ProductMatch | computed | — | — | anyone who can see the pet and the product |

Two gaps are visible in that table and both are listed in `29`: health records
cannot be corrected, and there is no delegation model, so a vet, a sitter or a
family member can be given access to nothing.
