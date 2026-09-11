# 50 — Data Classification

## §35 — The four classes

| Class | Definition | Default exposure |
|---|---|---|
| **PUBLIC** | Safe for anyone, signed in or not | anyone |
| **SOCIAL** | Shared by an explicit act of the owner, to an audience they chose | per visibility rule |
| **PRIVATE** | The owner's, and Mipo's for operating the service | owner + admin |
| **SENSITIVE** | Health, precise location, identity documents. Extra controls | owner + scoped grant + logged staff access |

**Derived data inherits the class of its inputs.** An insight computed from
clinical facts is clinical. A size band derived from weight is not clinical, even
though weight is — because the output does not disclose the input. The test is
what the *value* reveals, and the class travels with `derived_from`.

---

## Classification by domain

### PUBLIC
| Data | Note |
|---|---|
| `pet_fact_definitions` (the registry) | it is a schema |
| `breed_information` | reference data |
| `product_categories`, published products | the catalogue |
| `dog_parks` | places, if it is ever used |

### SOCIAL
| Data | Note |
|---|---|
| Public Moments — media, caption, `location` text | the owner chose to post |
| Pet name, species, breed, avatar **on a Moment** | the identity the owner attached |
| Reactions, comments, poll results | |
| Pet friendships | visible to both owners, not public |
| **Lost-pet poster while `is_lost`** | deliberately public — the point of the feature |

The lost poster is the one place PRIVATE becomes SOCIAL by a flag, and the code
already handles it carefully: owner name only if lost or the profile is public;
phone only if lost **and** `lost_show_phone`; city only if that **and**
`show_location`.

### PRIVATE
| Data |
|---|
| Pet identity outside a Moment; microchip; licensing |
| Behaviour, preferences, nutrition (non-clinical) |
| Body measurements |
| Orders, order items, cart, favourites, wishlist |
| Activity aggregates, walk sessions (not points) |
| Timeline, insights (non-clinical) |
| Owner profile, addresses, `shipping_profiles` |
| AI ledgers |

### SENSITIVE
| Data | Why |
|---|---|
| `health.*` facts — conditions, allergies, medications, procedures | clinical |
| `pet_documents` and every extraction | clinical evidence |
| `pet_vet_visits`, `pet_vaccinations`, `insurance_claims` | clinical |
| Weight, temperature, lab observations | clinical readings |
| `physical.body_condition` | drives dietary recommendation |
| `nutrition.observed_reaction` | a clinical signal |
| **Raw GPS points, walk routes** | a map of where someone lives |
| Check-in history | routine and home area, over time |
| `profiles.id_number_encrypted`, `insurance_claims.owner_id_number` | identity document |
| **Purchase history** | reveals health by inference — a renal diet says something clinical |

---

## The special attention list

The brief names six. Each with what is actually true today.

### Health — `SENSITIVE`
Server-side ownership on every route. Correct today via `where user_id = $1`.
**Gaps:** no per-domain grant model; no `customers.health.read` split, so any
`admin` sees diagnoses; staff clinical reads are not logged even though
`admin_audit_log` exists; `ai_consent_given` is stored and never checked before
sending a record to a model.

### Medical documents — `SENSITIVE`
**Handled well.** `servePublicUpload` looks the storage key up in
`pet_documents`, requires authentication **and** ownership, and serves
`isPrivate` + `sandbox`. Files are `0600` in a `0700` directory, validated by
magic bytes. Keep exactly this.

### Medications — `SENSITIVE`
Not modelled yet. When they are: never in an event payload, never in a
recommendation another user can see, never in a prompt without consent.

### Insurance — `SENSITIVE`
**`insurance_claims.owner_id_number` is plain text.** `profiles` stores an
Israeli ID as `id_number_last4` + `id_number_encrypted`; this table ignores the
convention. That is a real finding, not a theoretical one.

### Owner-associated data — `PRIVATE`, some `SENSITIVE`
A pet fact can identify an owner. A rare breed plus a city plus a park routine is
identifying. So: pet data is owner data, and no pet-level aggregate is exposed
across accounts.

### Location — `SENSITIVE`
The concrete leak: **user uploads keep their EXIF, including GPS**, and are
served publicly on Moments. `uploadDataUrlFile` writes bytes verbatim.
Meanwhile `profiles` offers `location_blur_enabled` and `show_location`, and
Caddy sets `Permissions-Policy: geolocation=(self)`. The intent is clear and the
images undo it. `imagePipeline.js` already strips and re-encodes — for product
images only.

Also: `location_blur_enabled` and `allow_messages_from` are stored and **read
nowhere**. Settings a user can change that do nothing are worse than absent ones.

### Purchase history — `PRIVATE`, escalating
Ordinary purchases are PRIVATE. A purchase that implies a clinical fact — a
prescription diet — makes the derived preference clinical context. So
`PURCHASE_DERIVED` facts inherit sensitivity from what they imply, and commerce
is **not** in a care-team grant's default scope.

---

## Controls per class

| Control | PUBLIC | SOCIAL | PRIVATE | SENSITIVE |
|---|---|---|---|---|
| Auth required | ✗ | ✓ | ✓ | ✓ |
| Owner-scoped query | ✗ | visibility rule | ✓ | ✓ |
| In an event payload | ✓ | ids only | ids only | **key only, never the value** |
| In an AI prompt | ✓ | ✓ | ✓ | **only with `ai_consent_given`, own pet only** |
| Care-team grant | n/a | n/a | per scope | **per scope, expiring** |
| Staff access | any | any | any admin | **`customers.health.read` + audit log** |
| In an analytics event | ✓ | ids | ids | **never** |
| In an export | ✓ | ✓ | ✓ | ✓ (it is the owner's) |
| Retention | indefinite | with the post | 3 y – life | life + 7 y |
| Encrypted at rest | — | — | — | **required for identity documents** |

### Two rules that follow

**Clinical fact events carry the key, never the value.** The outbox delivers to
an external endpoint; a payload reading "Blue is allergic to chicken" is a
disclosure nobody agreed to. Consumers read the value back through an authorized
API. This is why `42` has one generic fact event rather than forty typed ones —
one place to get it right.

**Never a health fact in an analytics event.** Not hashed, not bucketed, not as a
count. Product analytics does not need it.

---

## Findings

| # | Finding | Class | Severity |
|---|---|---|---|
| 1 | **EXIF with GPS on every user photo**, served publicly | SENSITIVE leaking as SOCIAL | High |
| 2 | **`insurance_claims.owner_id_number` in plain text**, against the codebase's own convention | SENSITIVE unprotected | High |
| 3 | **`ai_consent_given` never checked** before an AI call | SENSITIVE, consent | High |
| 4 | `location_blur_enabled`, `allow_messages_from` stored and never read | PRIVATE, dead controls | Medium |
| 5 | No `customers.health.read` split — any admin sees diagnoses | SENSITIVE, staff | Medium |
| 6 | Clinical staff reads not logged, though `admin_audit_log` exists | SENSITIVE, audit | Medium |
| 7 | `exportMyData` omits social, uploads, shipping profiles, reports — and would omit facts | all | Medium |
| 8 | Pet deletion **silently orphans** documents, bookings, claims and Moments (`SET NULL`, verified) | SENSITIVE | Medium |
| 9 | No grant model — a vet or sitter can be given access to nothing | — | Product gap |
| 10 | No retention policy anywhere; nothing expires | all | Medium |

Findings 1–3 are the ones to act on before any new data category is added,
because each of them would apply to the new data too.
