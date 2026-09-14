# 58 — Data Governance Model

Where each piece of data the system collects should live, decided per entity
against a fixed test rather than per taste.

**Status:** entity 1 of 5 complete — `user`. Remaining: `pet`, `product`,
`supplier`, `order`.

> Every count in this document was produced by a command, and the command is
> named beside it. Column counts come from `information_schema` on a database
> with all 38 migrations applied, never from migration text — that method
> produced three wrong answers for one table earlier in this work.

---

## The test

Four questions per data point:

1. Does its **history** matter to the product?
2. Does it arrive from **sources of differing trust**?
3. Can two sources **disagree**?
4. Does something **reason** over it to reach a decision?

| "yes" count | Where it lives |
|---|---|
| 0–1 | **Column.** Fast, constrained, joinable |
| 2+ | **Fact.** The `pet_facts` pattern, with a registry of its own |
| always, in parallel | **Event.** What happened and when, append-only |

A "no" to a fact layer is a good and expected answer. Generalising the fact
pattern to data that does not need it produces EAV: unreadable queries, no
database-level constraints, and performance that collapses with volume. What
saves the pet layer from that is its registry — every key declares a type, a
unit, a cardinality and its allowed sources. Any extension must carry the same
discipline or it is a junk drawer.

---

## WF-01 · User — inventory

The user surface is split across two tables. `app_users` holds identity and
authentication; `profiles` holds everything else, keyed by the same `id`.

| Table | Columns | Command |
|---|---|---|
| `app_users` | 19 | `select count(*) from information_schema.columns where table_name='app_users'` |
| `profiles` | 39 | same, `table_name='profiles'` |
| **Total** | **58** | |

Classification was produced by stripping comments from `server/src/*.js` and
counting real references per column. Comments matter: an earlier pass counted
the English word "points" in three code comments and reported
`profiles.points` as live. It is not.

| Class | Count |
|---|---|
| Live — written and read | 37 |
| **Dead — zero references anywhere in the server** | **20** |
| Read but never written | 1 |

### F-007 · Twenty dead columns on the user surface

Not written, not read, not serialized. Present in the schema and in every
`select p.*`, absent from `serializeProfile`'s 25 keys.

| Column | What it was for |
|---|---|
| `profiles.points` | gamification |
| `profiles.location_blur_enabled` | privacy |
| `profiles.show_email` | privacy |
| `profiles.allow_messages_from` | privacy |
| `profiles.favorite_breeds` | personalisation |
| `profiles.interests` | personalisation |
| `profiles.blocked_at` | moderation |
| `profiles.blocked_by` | moderation |
| `profiles.blocked_reason` | moderation |
| `profiles.is_online` | presence |
| `profiles.region` | address |
| `profiles.house_number` | address |
| `profiles.apartment_number` | address |
| `profiles.building_code` | address |
| `profiles.postal_code` | address |
| `profiles.id_number_encrypted` | identity verification |
| `profiles.consent_method` | consent provenance |
| `app_users.legacy_auth_provider` | Supabase migration |
| `app_users.legacy_user_id` | Supabase migration |
| `app_users.imported_at` | Supabase migration |

Three clusters are worth separating, because they are not the same problem.

**The four address columns are a second, unused address.** The delivery address
a customer actually uses is normalised by `normalizeShippingAddress` into a
16-key object and stored whole in `orders.shipping_address`. These four are a
structured address on the profile that no screen fills and no order reads.
`profiles.postal_code` is the sharpest case: the only occurrence of that string
in the server is `address.postal_code`, a field read off a **request body** in
`shippingAddress.js` — a different thing that happens to share a name.

**`id_number_encrypted` is worse than unused.** It sits beside
`id_number_last4`, which *is* written — by `MedicalDocumentFAB`, from an ID
number read off a scanned medical document. A column named `_encrypted` that is
permanently empty invites the reading that ID numbers are encrypted at rest
here. They are not stored at all beyond the last four digits.

**`consent_method` is the one that costs something today.** It is the
provenance field for consent, and consent is the one part of the user record
where provenance is a legal question rather than a nicety. See `F-009`.

**Type:** debt, with `id_number_encrypted` bordering on a misleading schema.
**Decision needed:** drop, or fill. Either is fine; leaving them is the option
that keeps costing.

### F-008 · `profiles.show_location` is read and can never be true

Two references, both reads: it is selected in the public pet query and used to
decide whether the owner's city is exposed.

```
city: (isLost || profileIsPublic) && row.show_location === true
        ? row.owner_city || null
        : null
```

Nothing in the server ever writes it, so it is always `NULL`, so the strict
`=== true` never passes, so the city is never shown. The privacy default is the
safe one — this leaks nothing — but the control does not exist. An owner who
wants their city on a lost-pet poster has no way to turn it on.

**Type:** dead feature, not a leak. **Decision needed:** build the control, or
remove the branch and state that city is never public.

---

## WF-01 · User — classification

Applying the four questions to the 37 live columns. Only the ones that score
2 or more are listed; everything else scores 0–1 and stays a column, which is
the correct and unremarkable answer for identity, contact details, address,
presence timestamps and authentication state.

| Data point | History | Mixed trust | Can conflict | Reasoned over | Verdict |
|---|---|---|---|---|---|
| `marketing_consent` | **yes** — must be provable for a past send | **yes** — signup checkbox, profile toggle, Supabase import | **yes** | **yes** — gates sending | **FACT** |
| `ai_consent_given` | **yes** — same argument | no — one writer | no | **yes** — gates AI features | column + date is adequate |
| `id_number_last4` | no | **yes** — typed by the owner, or read off a document by a model | **yes** | no — nothing consumes it | see `F-010` |

Everything else — `email`, `phone`, `full_name`, `first_name`, `last_name`,
`birthdate`, `bio`, `avatar_url`, `street`, `city`, `whatsapp_number`,
`profile_visibility`, `show_activity_status`, `quiet_mode_until`,
`last_active_at`, `last_seen_at`, `terms_accepted_at`, `terms_version`,
`email_verified_at`, `last_login_at`, `is_active`, `password_*` — scores 0 or 1
and belongs in a column.

### F-009 · Consent has no provenance, and the column for it is empty

`marketing_consent` is a boolean with two timestamps beside it
(`marketing_consent_date`, `marketing_unsubscribed_at`) and a provenance column
(`consent_method`) that nothing writes. Three things follow:

- The system can say *whether* someone consents and *when* it last changed. It
  cannot say **how** consent was obtained — a signup checkbox, a profile
  toggle, or an import from Supabase that carried a flag nobody can now audit.
- Only the current state and the last transition survive. A consent given,
  withdrawn and given again leaves no record of the middle.
- `app_users.imported_at`, `legacy_auth_provider` and `legacy_user_id` — the
  three columns that would identify an imported row — are all dead, so an
  imported consent cannot even be distinguished from a native one.

This is the one place on the user record where the pet fact pattern earns its
cost: provenance, a time window, and a history that survives supersession are
exactly what a consent record needs.

**Type:** bug, in the compliance sense rather than the crash sense.
**Decision needed:** whether consent moves to facts, or whether filling
`consent_method` and keeping an append-only consent event is enough. The second
is cheaper and probably sufficient.

### F-010 · The identity-verification story is incoherent across three columns

| Column | State |
|---|---|
| `profiles.id_number_last4` | written by `MedicalDocumentFAB` from a scanned document; read by `serializeProfile` |
| `profiles.id_number_encrypted` | exists, never touched |
| `id_verified` | **not a column at all** — `serializeProfile` emits `row.id_verified \|\| false` for a field that does not exist, so it is always `false` |

`OwnerProfile` renders that permanently-false value as an `if/else`, so every
user is shown the badge **"ת״ז לא מאומת"** — including a user whose ID was read
off a document and whose last four digits are on file. The system makes a
negative claim about a person that it has no mechanism to ever retract.

**Type:** bug, user-visible. **Decision needed:** this is a product question
before it is a technical one — is ID verification a real feature? If yes, it
needs a column, a writer and a verification path. If no, the badge and the
`id_verified` key should go.

---

## WF-01 · User — decision

**`user` does not need a fact layer.**

One cluster justifies provenance and history — consent — and it is better
served by filling the provenance column that already exists and recording
consent changes as events than by standing up a second registry. The pet fact
layer costs four tables, a registry, six validation gates and a resolution
engine; that price is worth paying for data that is contested, multi-sourced
and reasoned over across time. Consent is contested and multi-sourced, but it
is three fields, not thirty.

Everything else on the user record is single-source current state, which is
what columns are for.

**If consent later needs the full treatment**, the registry shape is already
settled by `pet_fact_definitions` and should be copied rather than reinvented:
`namespace`, `key`, `value_type`, `unit`, `cardinality`, `requires_source`,
`is_derived`. A user registry would need a `scope` column where the pet one has
`allowed_species`.

---

## Findings opened here

| ID | Finding | Type | Status |
|---|---|---|---|
| `F-007` | Twenty dead columns on the user surface, including four that duplicate an address the orders table already stores properly | debt | open |
| `F-008` | `show_location` is read by the public pet view and written by nothing, so the city is never shown and the control does not exist | dead feature | open |
| `F-009` | Consent has no provenance: `consent_method` is empty, history is limited to the last transition, and imported consent cannot be distinguished | bug (compliance) | open |
| `F-010` | `id_verified` is not a column, is always false, and is rendered to every user as "ת״ז לא מאומת" | bug (user-visible) | open |

---

```
DATA_GOVERNANCE: IN PROGRESS
entities: 1/5 (user)
columns examined: 58 · recommended as facts: 0 · gaps: a=20 b=1 c=4
```

`a` = collected and unused · `b` = used and not collected · `c` = collected
twice (the four address columns, against `orders.shipping_address`).
