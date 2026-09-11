# 49 — Data Ownership Matrix

Sensitivity classes are defined in `50`.
"Writer" means the **only** code path permitted to write. Where a row names one
writer, a second writer is a design error.

## Identity

| Data | Owner | Source of truth | Writer | Readers | Sensitive |
|---|---|---|---|---|---|
| Pet identity | the account | `pets` | owner via `normalizePetPayload` | owner, grantees, admin; filtered public if lost | PRIVATE |
| Breed + confidence + source | the account | `pets` | owner; AI **proposes** | as above | PRIVATE |
| Birth date + precision | the account | `pets` | owner; document extraction proposes | as above | PRIVATE |
| Lost poster block | the account | `pets` | owner | **public when `is_lost`** | SOCIAL while lost |
| Microchip | the account | `pets` | owner; document proposes | owner, grantees, admin | PRIVATE |
| `life_stage`, `size_band` | the system | `pet_facts` | **the rule engine, alone** | everyone who can read the pet | PRIVATE |

## Physical

| Data | Owner | Source of truth | Writer | Readers | Sensitive |
|---|---|---|---|---|---|
| Weight observations | the account | `pet_observations` | owner, document extraction, activity device | owner, health grantees, admin | **SENSITIVE** |
| Current weight | the account | `pet_facts` | the observation→fact deriver | as above | SENSITIVE |
| Weight trend | — | **derived, not stored** | — | as above | SENSITIVE |
| Target weight | the account | `pet_facts` | owner, vet | as above | SENSITIVE |
| Body condition | the account | `pet_facts` | owner, vet, document — **never AI, never derived** | as above | SENSITIVE |
| Measurements | the account | `pet_observations` | owner | owner, admin | PRIVATE |

## Health

| Data | Owner | Source of truth | Writer | Readers | Sensitive |
|---|---|---|---|---|---|
| Conditions, allergies, sensitivities | the account | `pet_facts` | owner, document extraction (confirmed), vet | owner, **health grantees only**, admin with `customers.health.read` | **SENSITIVE** |
| Medications | the account | `pet_facts` | same | same | SENSITIVE |
| Vet visits | the account | `pet_vet_visits` | owner — **no update or delete route exists** | same | SENSITIVE |
| Vaccinations | the account | `pet_vaccinations` | owner — **no update or delete route exists** | same | SENSITIVE |
| Lab results | the account | `pet_observations` | document extraction | same | SENSITIVE |
| Insurance | the account | `pets` + `insurance_claims` | owner | owner, admin | SENSITIVE |
| Vet recommendation | the account | `pet_facts` | document, vet | owner, health grantees | SENSITIVE |

## Nutrition, behaviour, preferences

| Data | Owner | Source of truth | Writer | Readers | Sensitive |
|---|---|---|---|---|---|
| Current food | the account | `pet_facts` | owner; commerce proposes | owner, grantees, admin | PRIVATE |
| Ingredient avoidance | the account | `pet_facts` | owner | as above | PRIVATE |
| Observed reaction | the account | `pet_facts` | owner | owner, health grantees | **SENSITIVE** |
| Behaviour | the account | `pet_facts` | owner; activity deriver; breed prior (LOW) | owner, grantees, admin | PRIVATE |
| Preferences | the account | `pet_facts` | owner; commerce deriver; AI (LOW) | owner, admin | PRIVATE |

## Activity, social, commerce

| Data | Owner | Source of truth | Writer | Readers | Sensitive |
|---|---|---|---|---|---|
| Walk sessions | the account | `walk_sessions` (`MISSING`) | the activity service | owner, activity grantees | PRIVATE |
| **GPS points** | the account | `walk_points` (`MISSING`) | the activity service | **owner only — never leaves the account** | **SENSITIVE** |
| Activity aggregates | the system | derived | the aggregator | owner, grantees, admin | PRIVATE |
| Check-ins | the account | `park_checkins` (`MISSING`) | owner, **confirmed only** | per visibility | PRIVATE |
| Moments | the account | `social_posts` | owner | per `visibility`, enforced in SQL | SOCIAL / PRIVATE |
| Reactions, comments, saves | each actor | `social_post_*` | each actor | per post visibility | SOCIAL |
| Pet friendships | both accounts | `pet_friendships` (`MISSING`) | **both owners** | both owners | SOCIAL |
| Encounters | both accounts | `pet_encounters` (`MISSING`) | owner confirmation | **both owners only** | PRIVATE |
| Orders | **Mipo** (financial record) | `orders`, `order_items` | customer creates; **admin updates** | customer, admin | PRIVATE |
| Pet attribution on a line | the account | `order_items.pet_id` (`MISSING`) | buyer; inference for the unambiguous case | customer, admin | PRIVATE |

## Documents, events, intelligence

| Data | Owner | Source of truth | Writer | Readers | Sensitive |
|---|---|---|---|---|---|
| Documents (the files) | the account | `pet_documents` + private disk | owner | **owner + document grantees only** | **SENSITIVE** |
| Extractions | the account | `pet_document_extractions` (`MISSING`) | the extraction pipeline | owner, admin review queue | SENSITIVE |
| Events | the system | `outbox_events` | the API, in-transaction | internal consumers, admin | varies — **clinical events carry the key, never the value** |
| Timeline | the system | projection | the projector | per entry visibility | inherits |
| Insights / predictions | the system | projection | the insight engine | owner, admin | inherits its inputs |
| AI ledgers | Mipo | `ai_requests`/`usage_events`/`cost_events` | the gateway | admin | PRIVATE |
| Fact registry | Mipo | `pet_fact_definitions` | **migrations only** | everyone | PUBLIC |

---

## §31 — Who can share, and who can derive

| Question | Answer |
|---|---|
| **Who can share pet data?** | Only the owner, and only through `pet_access_grants` — scoped, expiring, revocable, **never transitive**. No grantee can grant onward. |
| **Who can derive from it?** | The rule engine (derived facts), the extraction pipeline (document facts), the commerce deriver (preferences), the activity aggregator. **All server-side. All named.** |
| **Can a grantee derive?** | No. A grant is read-only in v1. Write grants require a vet identity, which does not exist. |
| **Can Mipo derive for its own purposes?** | Yes for the owner's benefit — matching, insights, reminders. **No** for training a model on clinical data, and no for any cross-account aggregate that could re-identify an animal. |

### Proposed grant model
```
pet_access_grants
  pet_id, grantee_user_id, granted_by,
  scopes[]      profile | health | documents | activity | commerce | social
  expires_at    REQUIRED — a grant that never ends is one nobody remembers
  status        ACTIVE | REVOKED | EXPIRED
```

Rules: scoped · expiring · instantly revocable, with the revocation recorded ·
never transitive · read-only in v1 · **always visible to the owner**.

Nothing like this exists today: `pets.user_id = $1` everywhere, no sharing of any
kind. A vet, a sitter or a family member can be given access to nothing.

---

## Staff access

Today: every `/api/admin/customers*` route requires `FULL_ACCESS`, and the two
roles are `admin` (`*`) and `product_manager` (which cannot reach customers at
all). That is correct as far as it goes.

**Proposed:** a distinct `customers.health.read` permission so support can see
orders and pets without seeing a diagnosis. The RBAC system already supports
fine-grained permissions — the catalogue routes use five individually — so this
is a new constant and a route guard, not a new mechanism.

**Every staff read of clinical data writes to `admin_audit_log`** (11 columns,
already exists). Health access that is not logged is health access nobody can
answer for.

---

## Ownership invariants

1. **The account owns every fact about its pets.** Mipo is the processor.
2. **One writer per derived key** — the rule engine. Two writers is how
   `pets.age` and `pets.size` died.
3. **Orders are Mipo's record.** Anonymised on account deletion, never deleted.
   `deleteMyAccount` already does this correctly.
4. **A grant never outlives its `expires_at`**, and never grants onward.
5. **Deleting a source closes its derived facts** with reason `source_deleted` —
   it does not orphan them.
6. **Health data never crosses an account boundary** except through an explicit,
   scoped, expiring grant.
