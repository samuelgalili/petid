# 22 — Privacy

## The rule

```
authenticated principal → owns / is granted → pet → pet data
```

Enforced **server-side, in the query**, never in the client. The codebase already
does this consistently: every `/api/me/...` handler carries
`where user_id = $1`, and `listSocialFeed` puts visibility in the SQL rather than
the serializer, so a private post is unreachable by id — not merely hidden from a
list.

That is the pattern Pet Intelligence extends, not replaces.

**`ProtectedRoute` is not a security boundary.** It admits guests
(`if (!isAuthenticated && !isGuest)`), and the server enforces auth on every
route regardless. Client-side "protected" is a UX affordance. Nothing in this
design may rely on it.

---

## Data classification

| Class | Data | Handling |
|---|---|---|
| **Clinical** | `pet_facts` where `is_clinical`, `pet_documents`, `pet_vet_visits`, `pet_vaccinations`, `insurance_claims`, lab observations | explicit consent · never in event payloads · never cross-pet · never in a public surface · staff access logged |
| **Identity** | `app_users.email/phone/birthdate`, `profiles.id_number_*` | encrypted where it is an ID number · never in logs |
| **Location** | `profiles.city/street/postal_code`, `shipping_profiles`, `social_posts.location`, **photo EXIF**, future walk routes | place-not-point · blur controls · never exact home |
| **Financial** | `orders`, `order_items`, `cardcom_events` | retained for accounting · card data never stored (CardCom hosted) |
| **Behavioural** | `usage_events`, `ai_requests`, presence | aggregated |
| **Content** | Moments, comments, uploads | visibility-controlled |
| **Derived** | facts, insights, predictions | **inherits the class of its inputs** |

That last row is the one people forget. An insight computed from clinical facts
is clinical data. A "size band" derived from weight is not. The class travels
with `derived_from`.

---

## Field-level classification for Pet 360

| Namespace | Class | In an event payload? | Visible to a care-team grantee? |
|---|---|---|---|
| `identity.*` (life stage) | low | ✅ | ✅ |
| `physical.weight`, measurements | medium | ✅ value ok | ✅ |
| `physical.body_condition` | **clinical** | key only | ✅ |
| `health.*` | **clinical** | **key only, never the value** | per grant |
| `nutrition.*` | medium; clinical when prescription | key only if clinical | ✅ |
| `behavior.*` | low | ✅ | ✅ |
| `preference.*` | low | ✅ | ❌ commerce-adjacent |
| `activity.*` | medium — location-adjacent | aggregates only, **never points** | per grant |
| `commerce.*` | medium | ids only | ❌ |

**Clinical fact events carry the key, never the value.** `07` states this and
here is the reason: the outbox delivers to an external automation endpoint. A
payload reading "Blue is allergic to chicken" is a health-data disclosure the
owner never agreed to. Consumers that need the value read it back through an
authorized API.

---

## §41 — Access control model

### Today
`pets.user_id = $1`. One owner. No sharing of any kind — a vet, a sitter or a
family member cannot be given access to anything.

### Proposed, prepared in `01`
```
pets.owner_scope_type / owner_scope_id     'user' today, 'organization' later

pet_access_grants
  pet_id, grantee_user_id, granted_by,
  scopes[]        profile | health | documents | activity | commerce | social
  expires_at
  status          ACTIVE | REVOKED | EXPIRED
  created_at, revoked_at
```

Every read becomes: owner **or** an `ACTIVE`, unexpired grant covering the
requested scope.

Design rules, chosen because sharing health data is easy to get catastrophically
wrong:

1. **Scoped.** A vet grant reads health + documents. It does not read commerce.
2. **Expiring.** `expires_at` is required, not optional. A grant that never ends
   is a grant nobody remembers.
3. **Revocable instantly**, with the revocation recorded.
4. **Never transitive.** A grantee cannot grant onward.
5. **Read-only by default.** A write grant is a separate, later decision — a vet
   writing `VET_CONFIRMED` facts is exactly the missing producer in `04`, and it
   needs a vet identity that does not exist yet.
6. **Visible.** The owner sees every active grant on the pet, always.

`OPEN DECISION` in `28`: whether delegation ships at all in this phase. The model
is designed now so that adding it later is a table and a predicate, not a
redesign.

---

## Consent

Primitives that already exist and are correct:

| Signal | Column |
|---|---|
| AI processing | `profiles.ai_consent_given`, `ai_consent_date` |
| Marketing + method + unsubscribe | `profiles.marketing_consent*`, `marketing_opt_out_log` |
| Terms | `app_users.terms_accepted_at`, `terms_version` |
| Photo processing | `pet_characters.consented_at NOT NULL`, and `startPetCharacterGeneration` rejects `consent !== true` |

The pet-character flow is the model: consent is required at the point of
processing, stored with the artefact, and enforced in code.

**The gap:** `ai_consent_given` is stored and, as far as I can find, **never
checked before an AI call**. For document extraction — sending a medical record
to a third-party model — that check is not optional. Requirement:

```
document extraction / any clinical AI call
    └── requires ai_consent_given = true, checked server-side
        └── refused otherwise, with a clear, non-blocking explanation
```

---

## Three privacy properties of this design

1. **Provenance is itself sensitive.** "Source: vet document DOC-123" tells you
   the owner has a vet document. Provenance detail is shown to the owner and to
   authorized staff, never in any public or cross-user surface.
2. **Deletion must reach derived data.** Deleting a document must close the facts
   it produced — with reason `source_deleted` — not orphan them. Otherwise a
   deleted medical record leaves its conclusions behind, which is worse than
   keeping the record.
3. **Pet deletion currently orphans silently.** `pet_documents`,
   `pet_service_bookings`, `insurance_claims` and `social_posts` are all
   `ON DELETE SET NULL` on `pet_id` — verified by executing the delete against a
   migrated database. The documents survive, detached, and nobody is told. Facts
   must not repeat that: `pet_facts.pet_id` is `ON DELETE CASCADE`, and the
   product decision about the rest is an `OPEN DECISION`.

---

## Export and deletion

`deleteMyAccount` is well built — it exports first, deletes document, upload and
character files from disk, then anonymises orders (`user_id = null`,
`customer_name = 'Deleted user'`) rather than deleting financial records.

Two additions this design requires:

- **Export must include** `pet_facts`, `pet_observations`, `pet_document_extractions`,
  insights and the timeline. `exportMyData` today already omits all social data,
  `user_uploads`, `shipping_profiles` and `content_reports` — so the export is
  already incomplete and this makes it more so if not fixed.
- **Deletion must cascade** facts, observations, extractions, insights and
  timeline entries with the pet, and close facts derived from a deleted document.

---

## Never

- A clinical fact in a public response, a feed, a shared insight, or an event
  payload.
- Cross-pet leakage in an AI prompt (`39` — each pet's intelligence is its own).
- Exact coordinates in any response another user can read.
- Health data in an analytics event.
- A "friends only" visibility tier before a relationship model exists — it is a
  promise the query cannot keep.
