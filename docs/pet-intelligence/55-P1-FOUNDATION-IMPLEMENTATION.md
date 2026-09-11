# 55 — P1 Pet Intelligence Foundation: Implementation

The canonical data layer is built. This is what it is, what it refuses, what it
does not yet do, and the four places where the code deliberately departs from
the contract documents.

The foundation answers one question:

> **What does Mipo actually know about this pet, where did that information come
> from, when was it true, and can we trust it?**

Nothing consumes it yet. `serializePet` and `normalizePetPayload` are untouched,
every existing screen reads exactly what it read before, and the eleven dead
columns are still there. That is the point of a foundation sprint: the layer
exists and is provably correct before anything depends on it.

---

## 1. What was implemented

| # | Scope item | Status |
|---|---|---|
| 1 | Pet Facts | ✅ `public.pet_facts` |
| 2 | Fact Registry | ✅ `public.pet_fact_definitions`, seeded by migration only |
| 3 | Provenance | ✅ nine columns on the fact, seven source types, five confidence levels |
| 4 | Fact lifecycle | ✅ five states + `pet_fact_transitions` audit trail |
| 5 | Temporal validity | ✅ `observed_at` / `effective_from` / `effective_to` / `created_at` |
| 6 | Observations | ✅ `public.pet_observations`, separate table |
| 7 | Pet Events | ✅ existing outbox + `pet_id` + `payload_version`, 7 new types |
| 8 | Canonical write rules | ✅ six gates in a pure module |
| 9 | Read/write domain services | ✅ `petFactService.js` |
| 10 | Migration seam | ✅ additive only; nothing rewritten |
| 11 | Safe backfill | ✅ weight only |
| 12 | Tests | ✅ 84 new unit tests, 46 integration assertions |
| 13 | Documentation | ✅ this document |

**Explicitly not built**, per the brief: no AI reasoning, no rule engine, no
timeline projection, no Store/Social/Activity/Health/CRM changes, no column
drops, no consumer migration.

### Files

```
server/sql/0036_pet_facts_foundation.sql       4 tables, 11 indexes
server/sql/0037_pet_fact_registry_seed.sql     17 fact definitions
server/sql/0038_outbox_pet_scope.sql           outbox pet_id + payload_version
server/sql/0039_backfill_pet_weight.sql        the one backfill

server/src/petFactRegistry.js      pure: the six gates, units, value types
server/src/petFactResolution.js    pure: supersession and conflict planning
server/src/petFactService.js       persistence, transactions, ownership
server/src/events.js               +7 event types, +petId, +payloadVersion
server/src/index.js                7 routes, all behind requireUser

server/test/petFactRegistry.test.js     39 tests
server/test/petFactResolution.test.js   21 tests
server/test/petFactService.test.js      24 tests
server/scripts/petFactsIntegrationCheck.mjs   46 assertions, real PostgreSQL
```

---

## 2. Database schema

### `pet_fact_definitions` — the registry

The single line that separates this from an EAV junk drawer:

> **An unregistered `(namespace, key)` is rejected at write time.**

Rows are inserted by migration. No API creates a definition, no admin screen
adds a key, and nothing in the application can. A new fact key is a reviewed
migration, exactly like a new column — because that is what it is.

Columns follow `46-FACT-REGISTRY.md`: `namespace`, `key`, `value_type`, `unit`,
`allowed_units`, `enum_values`, `ref_entity`, `cardinality`, `allowed_species`,
`min_value`, `max_value`, `regex`, `is_sensitive`, `is_derived`,
`is_time_series`, `volatile`, `requires_source`, `requires_confirmation`,
`decays`, `half_life_days`, `label_he`, `label_en`, `display_unit`, `status`,
`introduced_in`, `deprecated_in`, `rule_version`.

Two CHECK constraints are worth naming, because they enforce contract rules
rather than data types:

```sql
-- A typo in a source name would silently widen the gate it was written to narrow.
requires_source <@ array['VET_CONFIRMED','VET_DOCUMENT','USER_PROVIDED',
                         'SYSTEM_DERIVED','ACTIVITY_DERIVED','PURCHASE_DERIVED',
                         'AI_INFERRED']

-- A derived key has exactly one writer, at the schema level.
is_derived = false or requires_source = array['SYSTEM_DERIVED']
```

### `pet_facts` — the values

One row per assertion, append-only for values. Typed value columns
(`value_number`, `value_text`, `value_boolean`, `value_date`, `value_timestamp`,
`value_json`, `value_ref_type` + `value_ref_id`), the canonical `unit`, a
`normalized_value` for comparison, nine provenance columns, three time columns,
`status`, `superseded_by_fact_id`, `derived_from`, `rule_version`,
`ai_request_id`.

Three constraints carry most of the weight:

```sql
-- "Current" is defined as effective_to is null. The status and the period are
-- the same thing said twice and must never disagree.
(status in ('CURRENT','DISPUTED')) = (effective_to is null)

-- Exactly one value column, and it is the one value_type names. Without this a
-- 'number' fact could carry a value_text nobody reads.
pet_facts_value_matches_type   -- a CASE over all eight types

-- A chain only exists where a supersession happened.
superseded_by_fact_id is null or status = 'SUPERSEDED'
```

Indexes:

| Index | Question it answers |
|---|---|
| `(pet_id, namespace, key) where effective_to is null` | what is true right now |
| `(pet_id, namespace, key, effective_from desc)` | the history of one key |
| `(pet_id, observed_at desc)` | the timeline |
| `(source_type, source_id)` | what did DOC-123 assert — and the backfill's reversal |
| `(pet_id, namespace, key) where status = 'DISPUTED'` | the review queue, without a scan |

### `pet_fact_transitions` — the audit trail

`fact_id`, `from_status`, `to_status`, `reason`, `actor_type`, `actor_id`, `at`.
Values audit themselves because they are append-only; status changes are few,
consequential, and worth recording with their actor.

### `pet_observations` — the measurements

Separate from `pet_facts` for a structural reason, not a stylistic one:
observations are dense, none of them are ever "current", and putting them in the
fact table would fill it with permanently historical rows and make the
current-value partial index useless.

Carries `source_value` / `source_unit` alongside the canonical pair, so a vet
document saying "28.2 kg" renders as it was written when the owner reviews the
extraction rather than as "28200 g".

`observation_type` is CHECK-constrained to the sixteen types in `41`. **Calories
are deliberately absent** — storing an estimate here would make it look
measured.

---

## 3. Fact Registry — the seventeen keys

```
physical    weight · target_weight · body_condition · size_band* · wingspan
identity    life_stage*
health      neuter_status · condition · allergy · note
nutrition   current_food · current_food_text
behavior    tag
preference  activity
insurance   provider · policy_active · expiry
```

`*` derived: `SYSTEM_DERIVED` is the only accepted source, and no writer exists
yet. The definitions are registered anyway so that a user attempting to set a
life stage is refused by the registry rather than by a reviewer remembering.

This is the starter set, not the full dictionary. It covers what `51` marks
MOVE_TO_FACT and MOVE_TO_TIME_SERIES. Every other key in `46`'s namespace
listing arrives with the sprint that gives it a writer and a consumer — **an
ACTIVE key nothing writes is a promise the system cannot keep.**

`physical.wingspan` is registered for `bird`, and `pets.type` is
`('dog','cat','other')` today, so nothing can currently satisfy it. That is the
correct state: the key exists and the species gate refuses every write until a
bird can.

---

## 4. Provenance

Seven source types, ranked. `source_channel` is separate, because "SOCIAL" and
"INTEGRATION" describe *how* a value arrived, not *who asserts it*.

| Rank | `source_type` | Default confidence |
|---|---|---|
| 1 | `VET_CONFIRMED` | `VERIFIED` |
| 2 | `VET_DOCUMENT` | `HIGH` |
| 3 | `USER_PROVIDED` | `HIGH` |
| 4 | `SYSTEM_DERIVED` | `HIGH` |
| 5 | `ACTIVITY_DERIVED` | `MEDIUM` |
| 6 | `PURCHASE_DERIVED` | `LOW` |
| 7 | `AI_INFERRED` | `LOW` |

Confidence is a **level, never a number**. A model logprob of 0.91 and an OCR
character confidence of 0.91 are different quantities; they are never averaged
and never compared across sources.

`verification_status` is orthogonal: confidence is how sure the producer was,
verification is who has since looked.

**No promotion by request.** `verification_status` is derived from the source on
create and is never taken from the request body — a `VET_DOCUMENT` fact starts
`DOCUMENT_EXTRACTED`, and becoming `USER_CONFIRMED` requires the explicit
`PATCH … {action: "confirm"}`, which writes a transition row naming the actor.
A client cannot ship an inference labelled as a vet's confirmation.

Two further refusals, both tested:

- a clinical key refuses `AI_INFERRED` even if its own `requires_source` were
  misconfigured to allow it;
- **a derived key refuses every source but `SYSTEM_DERIVED`** — the failure that
  killed `pets.age` and `pets.size`.

---

## 5. Lifecycle

```
CURRENT ──┬─► SUPERSEDED   a better source, or a later value
          ├─► RESOLVED     the world changed; the record was right
          ├─► DISPUTED     two sources of equal standing disagree
          └─► RETRACTED    it should never have been recorded
```

`UNKNOWN` is **the absence of a row**, not a state. `HISTORICAL` is the read-side
name for anything with `effective_to` set, exposed as a boolean on the API and
stored nowhere.

`SUPERSEDED` vs `RESOLVED` is the distinction that matters, and the chain is what
tells them apart: a superseded row points at its successor and its period abuts
it; a resolved row keeps its full period and has no successor, because it was
true then.

Nothing is deleted, in any branch. The resolution planner has no `delete`
operation, and a test asserts that.

---

## 6. Temporal model

Three clocks, kept apart:

```
observed_at      when the world was like this
effective_from   when it started being true      effective_to: when it stopped
created_at       when Mipo learned it
```

A March vet document uploaded in September has `observed_at = 2026-03-11` and
`created_at = 2026-09-10`. Getting this wrong makes a six-month-old weight look
like today's, and `45`'s recency tie-break then resolves in the wrong direction.

The planner handles the case directly: a value observed **before** the current
one is `BACKDATED` — inserted as a closed historical row taking the period before
the current fact, which keeps its place. The August document takes August, the
owner keeps September, and the gap becomes a trend rather than a conflict.

**One bug was found here and fixed.** `pg` returns timestamps as `Date` objects,
and `String(date)` drops the milliseconds. Two writes inside the same second
produced a fact whose `effective_to` landed before its own `effective_from`, and
`pet_facts_window` rejected it — the constraint caught the bug the code had. Both
`parseTimestamp` and the planner's `time()` now pass a `Date` through instead of
stringifying it, and there is a regression test.

---

## 7. Observations

An observation is a measured or witnessed value at an instant, attributed to a
source, that has not yet been interpreted. Observations **never conflict** —
three weights from three sources are three readings — which is precisely why only
the derived current value needs a resolution rule.

Sources are restricted to `USER_PROVIDED`, `VET_DOCUMENT`, `VET_CONFIRMED`,
`ACTIVITY_DERIVED` and `SYSTEM_DERIVED`.

> **AI is a transcriber of observations, never an observer.**

A model that reads "28.2 kg" off a page produces a `VET_DOCUMENT` observation
with `method = document_extraction` — the document observed it, the model
transcribed it. A purchase is an event; a photo is content. Both are refused,
before the request reaches the database.

`weight` and `wingspan` produce facts. Everything else does not, and that is not
an oversight: a single chest girth is a fact about the animal but has no
registered key yet, and a single walk distance says nothing on its own — only an
aggregate over a window does, and that window does not exist.

The observation, its fact, and both events are written in **one transaction**. An
observation that silently failed to update the current value is worse than a
rejected request.

---

## 8. Events

**No second event system.** The existing transactional outbox is used as it is:
`emitEvent(client, …)` writes inside the caller's transaction, so no event exists
for a change that rolled back and no committed change silently fails to produce
its event.

Two columns were added to `outbox_events`:

- **`pet_id`** — an event's entity is the walk, the order, the fact. Without this
  column, "everything that happened to Blue" would require knowing every entity
  type that can reference a pet, forever. The AI ledgers already carry `pet_id`
  for the same reason. **Not a foreign key**: an event must survive the deletion
  of the thing it happened to.
- **`payload_version`** — free-form jsonb with no version means a consumer cannot
  tell v1 of `order.paid` from v2. One column now; a breaking change later.

Seven new types, one generic set rather than one per key:

```
pet_fact.created · pet_fact.superseded · pet_fact.disputed
pet_fact.confirmed · pet_fact.resolved · pet_fact.retracted
pet_observation.recorded
```

> **A fact event carries the namespace and key, never the value.**

The outbox delivers to an external endpoint. A payload reading "Blue is allergic
to chicken" is a health disclosure the owner never agreed to. One generic event
beats forty typed ones precisely because there is then **one place** to get this
right — and an integration assertion greps every emitted fact event for the
values that were written, and requires zero matches.

---

## 9. Domain services

Route handlers do not touch `pet_facts`. `createPetFactService({ pool })` exposes
`writeFact`, `listFacts`, `getFactHistory`, `updateFactLifecycle`,
`recordObservation`, `listObservations`, `listEvents`.

The decisions live in two pure modules with no database and no network, in the
style of `aiAccounting.js`, so every rejection is a unit test:

**`petFactRegistry.js` — six gates, in order:**

```
definition exists?            no ─► UNKNOWN_FACT_KEY            404
status ACTIVE?                no ─► KEY_DEPRECATED              409
species applicable?           no ─► SPECIES_NOT_APPLICABLE      422
source allowed?               no ─► SOURCE_NOT_ALLOWED          403
                                    DERIVED_KEY_SINGLE_WRITER   403
value valid for its type?     no ─► INVALID_FACT_VALUE          400
unit convertible?             no ─► INVALID_UNIT                400
```

**`petFactResolution.js` — is it a conflict at all?**

`volatile` decides. Volatile keys supersede by recency and never dispute. Stable
keys resolve by rank, then `observed_at`, then verification standing — and a
genuine tie becomes `DISPUTED`. **Never a coin-flip.**

A losing assertion is still recorded (`OUTRANKED`), closed and chained to the row
that beat it. Discarding it would lose the evidence that two sources disagreed,
which is exactly what a vet asks about a year later.

`currentValueOf` returns `{disputed: true, fact: null}` for a disputed key rather
than picking a side: returning either one is how a restrictive clinical rule gets
bypassed.

---

## 10. APIs

Seven routes, all behind `requireUser`, all resolving the pet by owner:

```
GET    /api/me/pets/:id/facts?namespace=&key=&history=
POST   /api/me/pets/:id/facts
GET    /api/me/pets/:id/facts/:namespace/:key/history
PATCH  /api/me/pets/:id/facts/:factId        {action: confirm|resolve|retract}
GET    /api/me/pets/:id/observations?type=&limit=
POST   /api/me/pets/:id/observations
GET    /api/me/pets/:id/events?limit=
```

The registry is **not** exposed. Neither are raw rows: the serializers return a
canonical value with an explicit `unit`, never a formatted string — a formatted
number cannot be recomputed, compared or converted, and it breaks the moment a
second locale appears. The app is Hebrew-first with an English fallback, so there
already is one.

`POST /facts` and `POST /observations` **force `source_type: USER_PROVIDED` and
`source_channel: APP`**, overwriting whatever the body said. An owner acting in
the app is an owner. A client cannot claim to be a vet, a document or the rule
engine.

---

## 11. Migration

Four migrations, all additive. No existing table is rewritten, no column is
dropped, no consumer is moved.

| File | What |
|---|---|
| `0036` | 4 tables, 11 indexes |
| `0037` | 17 registry definitions, `on conflict do nothing` |
| `0038` | `outbox_events.pet_id`, `payload_version` |
| `0039` | the weight backfill |

**Verified against a real PostgreSQL 16**, not read:

- 38/38 migrations apply cleanly to an empty database
- re-running applies nothing (`applied=0 skipped=38`)
- the documented rollback executes — four `DROP TABLE` in FK order, the two
  columns dropped, the ledger rows deleted — and the migrations then re-apply
  cleanly
- the backfill's reversal (`delete … where source_id = 'backfill@0039'`) removes
  exactly the rows it wrote

Rollback documentation lives in each migration's header comment.

Nothing here locks a large table: three of the four create new tables, and `0038`
is `add column … default` on a table PostgreSQL 16 rewrites in place.

---

## 12. Backfill

**One backfill: `pets.weight`.** It is a number an owner typed, it is
unambiguous, and `51` names it explicitly.

Everything else that could become a fact needs a judgement the data cannot
support: `medical_conditions text[]` would need each element split into its own
condition with an onset nobody recorded; `personality_tags` would need
"energetic" turned into an ordinal, which is an invented number; `current_food`
would need a text name matched to a catalogue product, and a near match is how a
recommendation ends up about a food the animal does not eat.

The honesty rules from `51`, applied:

| Rule | How |
|---|---|
| Never invent an `observed_at` | `updated_at` stands in, and **confidence is `MEDIUM`, not `HIGH`** |
| Never infer a source | everything from `pets` is `USER_PROVIDED` |
| Never fuzzy-match | nothing is matched to anything |
| Idempotent | guarded on `source_id = 'backfill@0039'`; two runs produce one row |
| Reversible | one `DELETE` by `source_id` |

Out-of-range weights (`<= 0`, `> 120 kg`) are **skipped, not clamped**. A 900 kg
dog is a data-entry error, and importing it would give it a provenance it has not
earned. It stays on `pets.weight` for a human to look at.

Verified: `28.2` → `28200 g`; `0.09` → `90 g` with full resolution.

---

## 13. Security

Every entry point takes `userId` and resolves the pet with:

```sql
select id, type, name from public.pets where id = $1 and user_id = $2
```

A `pet_id` in a request is an **assertion**, never an authorization. There is no
code path that reads or writes a fact without this query first, and a unit test
asserts it for all seven entry points.

| Control | Implementation |
|---|---|
| IDOR / BOLA | ownership predicate on every route; 7/7 tested |
| Enumeration | another owner's pet is **404, not 403** — a 403 confirms it exists |
| Malformed ids | rejected before any query runs |
| SQL injection | every filter is a bound parameter; asserted in tests |
| Unbounded reads | `limit` clamped to 500 server-side |
| Source spoofing | routes force `USER_PROVIDED` / `APP` |
| Privilege escalation | `verification_status` is never read from a request body |
| Health disclosure | fact events carry the key, never the value |
| Partial state | one transaction per write; rollback tested |

Not addressed, and listed rather than hidden: `pet_facts` has no row-level
security — enforcement is in the service, which is the same posture as every
other table in this codebase. `is_sensitive` is carried and enforced on write,
but no read path filters on it yet, because no read path has a second audience
yet.

---

## 14. Tests

**84 new unit tests**, in the default `npm test` run:

| File | Tests | Covers |
|---|---|---|
| `petFactRegistry.test.js` | 39 | six gates, all eight value types, units, confidence, promotion refusal |
| `petFactResolution.test.js` | 21 | created / unchanged / superseded / backdated / outranked / disputed, cardinality, reading |
| `petFactService.test.js` | 24 | ownership on every entry point, pre-database rejections, rollback, serialization |

Server suite: **257/257 pass** (was 173 after P0).

**46 integration assertions** against a real PostgreSQL 16, via
`npm run test:integration:pet-facts` — the things a unit test cannot show: that
the CHECK constraints hold the invariants the pure modules assume, that a
supersession chain is consistent after the writes have been through the database,
that periods abut, that ownership is a predicate rather than a convention, and
that no fact event carries a value out to a subscriber.

Specific cases the brief asked for:

| Asked | Where |
|---|---|
| `28.2kg → 28200g` | registry test + integration |
| birds and rodents with small weights | `0.035 / 0.09 / 0.12 / 0.4 kg` → `35 / 90 / 120 / 400 g` |
| unknown fact rejected | `favorite_blue_number` → `UNKNOWN_FACT_KEY` |
| invalid species rejected | `wingspan` on a dog, `size_band` on a non-dog |
| AI cannot become confirmed without explicit action | verification never read from the body |
| conflicting sources preserved | `OUTRANKED` writes the losing row and chains it |
| unresolved conflicts not silently resolved | `DISPUTED`, both rows open |
| unauthorized user cannot access another pet's facts | 7 entry points, 404 |
| migration reruns safely | `applied=0 skipped=38` |
| rollback strategy verified | executed, then re-applied |

---

## 15. Known limitations

1. **Nothing reads the facts yet.** No screen, no API consumer, no AI prompt.
   `serializePet` is unchanged. This is deliberate — the migration strategy is
   ADD → VALIDATE → BACKFILL → DUAL WRITE → DUAL READ → CUTOVER, and this sprint
   is the first three.
2. **No rule engine.** `identity.life_stage` and `physical.size_band` are
   registered as derived with no writer. Nothing computes them, and no fact of
   either key can exist until something does.
3. **No decay at read time.** `preference.activity` declares
   `decays / half_life_days = 365`; nothing applies it yet. Decay is specified as
   a read-time computation and belongs with the first reader.
4. **`health.allergy` is a string, not an enum.** `46` specifies an enum over
   `ingredient_terms.canonical_key`. That table does not exist, and an enum with
   no values would accept everything. It carries `normalized_value` in the
   meantime — see §16.
5. **`normalized_value` is shallow.** Case and whitespace only. Mapping "עוף",
   "chicken" and "Chicken meal" onto one key needs the ingredient vocabulary; a
   half-built one would produce confident wrong matches.
6. **No `event_consumers` cursor table.** `42` proposes one for internal
   consumers. There are no internal consumers yet, and a cursor with nothing
   reading it is a table to keep in sync for no benefit.
7. **No retention job.** `48`'s retention table needs a durable scheduler, which
   this system does not have. `outbox_events` and `pet_observations` accumulate
   knowingly. Listed as debt, not quietly ignored.
8. **No admin or vet write path.** Only `USER_PROVIDED` through the app can write
   today. `VET_CONFIRMED` has no producer because there is no vet identity in the
   system; `VET_DOCUMENT` waits on document intelligence.
9. **No `precision` column.** `45`'s third tie-break (`EXACT` beats `ESTIMATED`)
   is not implemented; the chain runs rank → `observed_at` → verification →
   `DISPUTED`. Adding it is one column and one comparison when birth-date
   precision arrives.
10. **`pet_facts` has no row-level security.** Enforcement is in the service,
    the same posture as every other table here.
11. **The dead columns are still there.** All eleven, as instructed.

---

## 16. Conflicts with the Data Contract, and how each was resolved

The brief says: if code conflicts with the Data Contract, **stop and document the
conflict** rather than silently inventing a schema. Four conflicts surfaced. All
four are between documents, not between a document and existing code.

### 16.1 `physical.weight` unit — kg vs grams

`46`'s worked definition says `unit: kg`. `47` says canonical weight is **grams**
and explains why. DD-01 was approved as grams.

**Resolved: grams.** `46`'s own comment on that line already says "grams for
birds — see 47 §species", so the two documents were reaching for the same rule.
`47` and DD-01 are the later and more specific statements, and a per-species
canonical unit is exactly what `47` argues against.

### 16.2 Registry column names — `03` vs `46`

`03-PET-FACTS.md` sketches `species_applicability`, `is_clinical`,
`privacy_class`, `min_source_rank`. `46-FACT-REGISTRY.md` specifies
`allowed_species`, `is_sensitive`, `requires_source` and the full column set.

**Resolved: `46`.** It is the data-contract document for this table, it is later,
and it is complete where `03` is a sketch. `min_source_rank` is subsumed by
`requires_source`, which is strictly more expressive: a list can exclude
`PURCHASE_DERIVED` while allowing `ACTIVITY_DERIVED`, and a rank threshold
cannot.

### 16.3 `RETRACTED` vs `REJECTED`

`03` and `05` call the fifth state `REJECTED`; `48` calls it `RETRACTED` and
notes explicitly that they are the same state. `45` separately uses `REJECTED` as
a **`verification_status`** value.

**Resolved: `RETRACTED` for the fact status, `REJECTED` for the verification
status.** The same token meaning two different things in two adjacent columns is
how a query gets written against the wrong one. The brief's own list in §9 uses
`RETRACTED`.

### 16.4 `health.allergy` as an enum

`46` specifies `value_type: enum` with values from
`ingredient_terms.canonical_key`. **That table does not exist** — verified across
all of `server/sql/` and `server/src/`. A CHECK constraint requires an enum to
have at least one value, and an enum with an empty list would accept everything,
which is the opposite of what declaring it an enum was for.

**Resolved: registered as `string` with `normalized_value`, and recorded as
limitation 4.** Converting it to an enum later is a migration that adds the
values and converts existing rows — the same discipline as an `ALTER COLUMN
TYPE`, which is what `46` already requires for this kind of change.

### 16.5 A fifth, smaller one

`46`'s `preference.toy_type` example lists `BEHAVIOR_DERIVED` in
`requires_source`. That is not one of `45`'s seven source types. The seeded
`preference.activity` uses `USER_PROVIDED`, `PURCHASE_DERIVED` and `AI_INFERRED`.
If a behaviour-derived source is genuinely wanted, it is an eighth source type
and a change to `45`, not a value that can be smuggled in through a definition.

---

## 17. Deviations from the brief, stated plainly

Two, both narrowing rather than widening:

1. **`INTEGRATION` is a channel, not a source type.** The brief's §8 lists it
   among the provenance values. `45` is explicit that it describes *how* a value
   arrived, not *who asserts it*, and the same reasoning applies to `SOCIAL`.
   Both are `source_channel` values. Treating them as sources would put an
   integration above or below a vet in a ranking where it does not belong.
2. **`HISTORICAL` and `UNKNOWN` are not statuses.** The brief's §9 lists them
   among the lifecycle states. `48` is explicit: `UNKNOWN` is the absence of a
   row — never write a fact whose value is "we do not know" — and `HISTORICAL` is
   the read-side name for anything with `effective_to` set. Both are represented:
   `historical` is a computed boolean on the API, and a missing fact is how the
   system says it does not know.

---

## 18. P2 / P3 integration points

| Consumer | What it will read | What it needs first |
|---|---|---|
| Rule engine | writes `identity.life_stage`, `physical.size_band` | `life_stage_rules` as data; `breed_information.weight_range_kg` as two numerics |
| Pet 360 | `listFacts` current + `listObservations` trend | a read model over the current-value index |
| Document intelligence | writes `VET_DOCUMENT` facts + observations | `pet_documents.document_date`, an extraction review flow |
| Product matching | `health.allergy`, `nutrition.*`, `physical.size_band` as gates | the ingredient vocabulary (16.4) |
| Timeline | `outbox_events` by `pet_id` | the `event_consumers` cursor |
| CRM | facts with provenance, disputes | the disputed-review queue index, which exists |
| AI | canonical facts as context | nothing new — it reads the same API |

The seam that makes each of these safe is unchanged and deliberate: **one read
seam (`serializePet`), one write seam (`normalizePetPayload`)**. When a consumer
moves to facts, it moves behind those, not around them.

---

## 19. Quality gates — actual results

Every command below was run. None of these results is inferred.

```
TYPECHECK    PASS   tsc -p tsconfig.active.json --pretty false
LINT         PASS   eslint . --quiet
UNIT TESTS   PASS   257/257   (cd server && node --test)
IMPORTS      PASS   check-imports (60 pre-existing gaps, unchanged)
BUILD        PASS   vite build
MIGRATIONS   PASS   38/38 on real PostgreSQL 16; re-run clean; rollback executed
INTEGRATION  PASS   46/46 assertions against real PostgreSQL 16
E2E          NOT RUN — Playwright needs a preview server and a browser. Not claimed.
```

```
P1 FOUNDATION RESULT

Pet Facts:          PASS
Fact Registry:      PASS
Provenance:         PASS
Lifecycle:          PASS
Temporal Model:     PASS
Observations:       PASS
Events:             PASS
Domain Services:    PASS
Security:           PASS
Migration:          PASS
Tests:              PASS
Typecheck:          PASS
Lint:               PASS
Build:              PASS

P1_FOUNDATION_READY: YES
```

Against the brief's conditions for `YES`:

| Condition | Evidence |
|---|---|
| registry rejects unknown keys | `UNKNOWN_FACT_KEY`, unit + integration |
| fact values are validated | eight types, enum, range, regex, unit |
| provenance is enforced | `requires_source`, derived single-writer, no promotion by request |
| temporal/lifecycle rules work | supersession chain, backdating, five states, transitions |
| observations distinct from facts | separate table, separate source rules, own event |
| events have stable identity | uuid PK, `pet_id`, `payload_version` |
| ownership is enforced | 7/7 entry points, 404 not 403 |
| no duplicate canonical writers | derived keys accept `SYSTEM_DERIVED` only, at schema and code level |
| existing Pet behaviour intact | `serializePet` untouched; `pets.weight` unchanged after the full integration run |
| migrations are safe | additive, idempotent, rollback executed and re-applied |
| tests / typecheck / lint / build pass | above |

Not merged. Not deployed.
