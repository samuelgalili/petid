-- 0036_pet_facts_foundation.sql
-- The canonical layer for what Mipo knows about an animal, where it came from,
-- and when it was true.
--
-- Today a pet is 57 columns on one row. A weight is a single number with no
-- date, no source and no history; a medical condition is an element in a
-- text[]; eleven columns are dead because two writers competed for them and
-- neither won. There is no way to answer "who says so, and when was that
-- measured" about any of it.
--
-- Four tables, and the discipline is in the first one:
--
--   pet_fact_definitions  the registry. An unregistered (namespace, key) is
--                         rejected at write time. This is the single line that
--                         separates this from an EAV junk drawer, and it is
--                         why the registry is filled by migration (0037) and
--                         never by the application at runtime.
--   pet_facts             the values, each with its provenance and its
--                         effective period. Append-only: a value that changes
--                         closes the old row and inserts a new one.
--   pet_fact_transitions  the audit trail of status changes.
--   pet_observations      measurements at an instant. Kept separate because
--                         observations never conflict and are never "current",
--                         so putting them in pet_facts would fill it with
--                         permanently historical rows and make the
--                         current-value index useless.
--
-- Nothing here is wired into the existing pet read or write path. serializePet
-- and normalizePetPayload are untouched by this migration; the tables are
-- additive and start empty except for the registry seed. See
-- docs/pet-intelligence/55-P1-FOUNDATION-IMPLEMENTATION.md.
--
-- Rollback: drop table pet_fact_transitions, pet_facts, pet_observations,
-- pet_fact_definitions (in that order -- the FKs require it), then delete the
-- four filenames from public.schema_migrations. No existing table is altered,
-- so a rollback loses only data written through the new path.

-- ---------------------------------------------------------------------------
-- The registry
-- ---------------------------------------------------------------------------

create table if not exists public.pet_fact_definitions (
  id uuid primary key default gen_random_uuid(),

  -- A closed set. Adding a namespace is a deliberate decision, not a side
  -- effect of adding a key.
  namespace text not null,
  key text not null,

  -- Shape.
  value_type text not null,
  -- The canonical unit values are stored in. Weight is grams: a budgerigar is
  -- 0.035 kg and 35 g, and only one of those keeps its resolution (DD-01, 47).
  unit text,
  -- What a writer may send. Converted to `unit` once, at write time.
  allowed_units text[] not null default '{}',
  enum_values text[] not null default '{}',
  ref_entity text,
  cardinality text not null default 'single',

  -- Applicability. Empty means every species; otherwise checked against
  -- pets.type, which is ('dog','cat','other') today. A definition scoped to
  -- 'bird' therefore matches nothing yet, and that is the correct behaviour:
  -- the key is defined, and no pet can currently satisfy it.
  allowed_species text[] not null default '{}',

  -- Validation.
  min_value numeric,
  max_value numeric,
  regex text,

  -- Governance. Each flag exists to prevent one specific failure; see
  -- docs/pet-intelligence/46-FACT-REGISTRY.md.
  is_sensitive boolean not null default false,
  is_derived boolean not null default false,
  is_time_series boolean not null default false,
  volatile boolean not null default false,
  requires_source text[] not null default '{}',
  requires_confirmation boolean not null default false,
  decays boolean not null default false,
  half_life_days integer,

  -- Presentation. The API returns canonical values with an explicit unit; the
  -- client formats. A formatted number in a response cannot be recomputed.
  label_he text,
  label_en text,
  display_unit text,

  -- Lifecycle of the definition itself.
  status text not null default 'ACTIVE',
  introduced_in text,
  deprecated_in text,
  rule_version text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pet_fact_definitions_key_unique unique (namespace, key),
  constraint pet_fact_definitions_namespace_check check (namespace in (
    'identity', 'physical', 'health', 'nutrition', 'behavior',
    'preference', 'activity', 'commerce', 'environment', 'insurance'
  )),
  constraint pet_fact_definitions_key_format check (key ~ '^[a-z][a-z0-9_]*$'),
  constraint pet_fact_definitions_value_type_check check (value_type in (
    'number', 'string', 'boolean', 'date', 'datetime', 'enum', 'ref', 'json'
  )),
  constraint pet_fact_definitions_cardinality_check
    check (cardinality in ('single', 'multi')),
  constraint pet_fact_definitions_status_check
    check (status in ('ACTIVE', 'DEPRECATED')),
  -- An enum with no values would accept anything, which is the opposite of
  -- what declaring it an enum was for.
  constraint pet_fact_definitions_enum_values_present
    check (value_type <> 'enum' or coalesce(array_length(enum_values, 1), 0) > 0),
  constraint pet_fact_definitions_ref_entity_present
    check (value_type <> 'ref' or ref_entity is not null),
  constraint pet_fact_definitions_range_order
    check (min_value is null or max_value is null or max_value >= min_value),
  constraint pet_fact_definitions_half_life
    check ((decays = false and half_life_days is null)
        or (decays = true and half_life_days > 0)),
  -- Source names are the seven from 45. A typo here would silently widen the
  -- gate it was written to narrow.
  constraint pet_fact_definitions_requires_source_known
    check (requires_source <@ array[
      'VET_CONFIRMED', 'VET_DOCUMENT', 'USER_PROVIDED', 'SYSTEM_DERIVED',
      'ACTIVITY_DERIVED', 'PURCHASE_DERIVED', 'AI_INFERRED'
    ]::text[]),
  -- A derived key has exactly one writer: the rule engine. Two writers on a
  -- derived value is precisely how pets.age and pets.size became dead columns.
  constraint pet_fact_definitions_derived_source
    check (is_derived = false or requires_source = array['SYSTEM_DERIVED']::text[])
);

create index if not exists idx_pet_fact_definitions_active
  on public.pet_fact_definitions (namespace, key)
  where status = 'ACTIVE';

comment on table public.pet_fact_definitions is
  'The fact registry. An unregistered (namespace, key) is rejected at write '
  'time. Rows are inserted by migration only -- no API and no admin screen '
  'creates a definition, because a new fact key is a reviewed schema change.';

-- ---------------------------------------------------------------------------
-- The facts
-- ---------------------------------------------------------------------------

create table if not exists public.pet_facts (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  -- restrict, not cascade: a definition is never deleted while facts reference
  -- it. Deprecation stops writes and keeps reads working.
  definition_id uuid not null references public.pet_fact_definitions(id) on delete restrict,

  -- Denormalised from the definition so the hot read path -- "the current
  -- facts for this pet" -- is one index scan with no join.
  namespace text not null,
  key text not null,
  value_type text not null,

  -- One of these is populated, chosen by value_type.
  value_text text,
  value_number numeric,
  value_boolean boolean,
  value_date date,
  value_timestamp timestamptz,
  value_json jsonb,
  value_ref_type text,
  value_ref_id uuid,

  -- Canonical unit for value_number. Null for every other type.
  unit text,
  -- The comparison form, kept apart from what the source said. "עוף",
  -- "chicken" and "Chicken meal" all normalize to chicken; value_text keeps
  -- the original for display and audit.
  normalized_value text,

  -- Provenance. All of it on the fact: a separate table would be a nullable
  -- 1:1 join on the hottest read path, which means a fact could exist without
  -- provenance, and that must be impossible.
  source_type text not null,
  -- Free text, not a FK: it points into whichever table asserted this --
  -- pet_documents.id, pet_vet_visits.id, or 'backfill@0038' for a backfill.
  source_id text,
  source_channel text not null default 'APP',
  source_timestamp timestamptz,
  -- A level, never a number. A model logprob of 0.91 and an OCR confidence of
  -- 0.91 are different quantities and must never be compared or averaged.
  confidence text,
  -- Orthogonal to confidence: confidence is how sure the producer was,
  -- verification is who has since looked.
  verification_status text not null default 'UNVERIFIED',

  -- Time. Three clocks, and confusing them is the most common temporal bug:
  --   observed_at     when the world was like this
  --   effective_from  when it started being true
  --   created_at      when Mipo learned it
  -- A March document uploaded in September describes March.
  observed_at timestamptz,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,

  status text not null default 'CURRENT',
  superseded_by_fact_id uuid references public.pet_facts(id) on delete set null,

  -- What this was derived from: fact ids, observation ids, column names.
  derived_from jsonb not null default '[]'::jsonb,
  rule_version text,
  ai_request_id uuid references public.ai_requests(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pet_facts_namespace_check check (namespace in (
    'identity', 'physical', 'health', 'nutrition', 'behavior',
    'preference', 'activity', 'commerce', 'environment', 'insurance'
  )),
  constraint pet_facts_value_type_check check (value_type in (
    'number', 'string', 'boolean', 'date', 'datetime', 'enum', 'ref', 'json'
  )),
  constraint pet_facts_source_type_check check (source_type in (
    'VET_CONFIRMED', 'VET_DOCUMENT', 'USER_PROVIDED', 'SYSTEM_DERIVED',
    'ACTIVITY_DERIVED', 'PURCHASE_DERIVED', 'AI_INFERRED'
  )),
  -- How the value arrived, as opposed to who asserts it.
  constraint pet_facts_source_channel_check check (source_channel in (
    'APP', 'ADMIN', 'DOCUMENT', 'INTEGRATION', 'SOCIAL', 'ACTIVITY', 'SYSTEM'
  )),
  constraint pet_facts_confidence_check
    check (confidence is null or confidence in ('VERIFIED', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN')),
  constraint pet_facts_verification_check check (verification_status in (
    'UNVERIFIED', 'USER_CONFIRMED', 'VET_CONFIRMED', 'DOCUMENT_EXTRACTED',
    'DISPUTED', 'REJECTED'
  )),
  -- UNKNOWN is the absence of a row, not a status. HISTORICAL is the read-side
  -- name for anything with effective_to set, not a status either.
  constraint pet_facts_status_check check (status in (
    'CURRENT', 'SUPERSEDED', 'RESOLVED', 'DISPUTED', 'RETRACTED'
  )),
  constraint pet_facts_window
    check (effective_to is null or effective_to >= effective_from),
  -- The open statuses and the open period are the same thing said twice, and
  -- they must never disagree: "current" is defined as effective_to is null.
  constraint pet_facts_open_status_has_open_window
    check ((status in ('CURRENT', 'DISPUTED')) = (effective_to is null)),
  constraint pet_facts_superseded_by_only_when_superseded
    check (superseded_by_fact_id is null or status = 'SUPERSEDED'),
  constraint pet_facts_no_self_supersede
    check (superseded_by_fact_id is null or superseded_by_fact_id <> id),
  -- Exactly one value column, and it is the one value_type names. Without this
  -- a 'number' fact could carry a value_text nobody reads.
  constraint pet_facts_value_matches_type check (
    case value_type
      when 'number' then value_number is not null
        and value_text is null and value_boolean is null and value_date is null
        and value_timestamp is null and value_json is null and value_ref_id is null
      when 'string' then value_text is not null
        and value_number is null and value_boolean is null and value_date is null
        and value_timestamp is null and value_json is null and value_ref_id is null
      when 'enum' then value_text is not null
        and value_number is null and value_boolean is null and value_date is null
        and value_timestamp is null and value_json is null and value_ref_id is null
      when 'boolean' then value_boolean is not null
        and value_text is null and value_number is null and value_date is null
        and value_timestamp is null and value_json is null and value_ref_id is null
      when 'date' then value_date is not null
        and value_text is null and value_number is null and value_boolean is null
        and value_timestamp is null and value_json is null and value_ref_id is null
      when 'datetime' then value_timestamp is not null
        and value_text is null and value_number is null and value_boolean is null
        and value_date is null and value_json is null and value_ref_id is null
      when 'json' then value_json is not null
        and value_text is null and value_number is null and value_boolean is null
        and value_date is null and value_timestamp is null and value_ref_id is null
      when 'ref' then value_ref_id is not null and value_ref_type is not null
        and value_text is null and value_number is null and value_boolean is null
        and value_date is null and value_timestamp is null and value_json is null
      else false
    end
  ),
  constraint pet_facts_unit_only_for_numbers
    check (unit is null or value_type = 'number')
);

-- "What is true about this pet right now?" -- one scan, and the reason
-- observations live in their own table.
create index if not exists idx_pet_facts_current
  on public.pet_facts (pet_id, namespace, key)
  where effective_to is null;

-- The history of one key.
create index if not exists idx_pet_facts_key_history
  on public.pet_facts (pet_id, namespace, key, effective_from desc);

-- The timeline.
create index if not exists idx_pet_facts_observed
  on public.pet_facts (pet_id, observed_at desc);

-- "What did document DOC-123 assert?" -- and the backfill's reversal path.
create index if not exists idx_pet_facts_source
  on public.pet_facts (source_type, source_id);

-- The review queue, without a scan.
create index if not exists idx_pet_facts_disputed
  on public.pet_facts (pet_id, namespace, key)
  where status = 'DISPUTED';

comment on table public.pet_facts is
  'Canonical statements about a pet, each with provenance and an effective '
  'period. Append-only for values: a change closes the old row (effective_to, '
  'status SUPERSEDED, superseded_by_fact_id) and inserts a new one. Nothing '
  'is ever deleted.';

-- ---------------------------------------------------------------------------
-- The audit trail
-- ---------------------------------------------------------------------------

-- Values are append-only, so they audit themselves. Status changes are few,
-- consequential, and worth recording with their actor: a year later the
-- question "who retracted the chicken allergy, and when" has an answer.
create table if not exists public.pet_fact_transitions (
  id uuid primary key default gen_random_uuid(),
  fact_id uuid not null references public.pet_facts(id) on delete cascade,
  from_status text not null,
  to_status text not null,
  reason text,
  actor_type text not null default 'system',
  actor_id uuid,
  at timestamptz not null default now(),

  constraint pet_fact_transitions_from_check check (from_status in (
    'CURRENT', 'SUPERSEDED', 'RESOLVED', 'DISPUTED', 'RETRACTED'
  )),
  constraint pet_fact_transitions_to_check check (to_status in (
    'CURRENT', 'SUPERSEDED', 'RESOLVED', 'DISPUTED', 'RETRACTED'
  )),
  constraint pet_fact_transitions_actor_check
    check (actor_type in ('user', 'admin', 'vet', 'system'))
);

create index if not exists idx_pet_fact_transitions_fact
  on public.pet_fact_transitions (fact_id, at desc);

-- ---------------------------------------------------------------------------
-- The observations
-- ---------------------------------------------------------------------------

-- An observation is a measured or witnessed value at an instant, attributed to
-- a source, that has not yet been interpreted. Three weights from three
-- sources are three readings, not a conflict -- which is exactly why they are
-- not facts. Only the derived current value needs a resolution rule.
create table if not exists public.pet_observations (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,

  observation_type text not null,

  -- Canonical value and unit, converted once at write time.
  value_number numeric,
  unit text,
  value_text text,
  -- What the source actually said. A vet document reading "28.2 kg" must
  -- render as it was written when the owner reviews the extraction, not as
  -- "28200 g".
  source_value numeric,
  source_unit text,

  measured_at timestamptz not null,
  recorded_at timestamptz not null default now(),

  source_type text not null,
  source_id text,
  -- Clinically material: a bathroom scale and a clinic scale are not
  -- interchangeable for a 400 g bird.
  method text not null default 'manual',
  confidence text,
  -- What else was true: fasted, post-walk.
  context jsonb not null default '{}'::jsonb,
  note text,

  created_at timestamptz not null default now(),

  -- Registry-controlled, like fact keys: adding a type is a migration. The
  -- list is 41's table; calories are deliberately absent, because storing an
  -- estimate here would make it look measured.
  constraint pet_observations_type_check check (observation_type in (
    'weight', 'temperature',
    'neck_girth', 'chest_girth', 'back_length', 'height_withers',
    'body_length', 'wingspan',
    'enclosure_width', 'enclosure_depth', 'enclosure_height',
    'walk_distance', 'walk_duration', 'step_count', 'enrichment_duration',
    'encounter'
  )),
  -- AI is a transcriber of observations, never an observer: a model that reads
  -- "28.2 kg" off a page produces a VET_DOCUMENT observation with
  -- method = document_extraction. A purchase is an event, not a reading.
  constraint pet_observations_source_type_check check (source_type in (
    'USER_PROVIDED', 'VET_DOCUMENT', 'VET_CONFIRMED', 'ACTIVITY_DERIVED', 'SYSTEM_DERIVED'
  )),
  constraint pet_observations_method_check check (method in (
    'manual', 'scale', 'tape', 'document_extraction', 'device'
  )),
  constraint pet_observations_confidence_check
    check (confidence is null or confidence in ('VERIFIED', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN')),
  constraint pet_observations_value_present
    check (value_number is not null or value_text is not null),
  constraint pet_observations_unit_with_number
    check (value_number is null or unit is not null)
);

create index if not exists idx_pet_observations_series
  on public.pet_observations (pet_id, observation_type, measured_at desc);

create index if not exists idx_pet_observations_pet
  on public.pet_observations (pet_id, measured_at desc);

create index if not exists idx_pet_observations_source
  on public.pet_observations (source_type, source_id);

comment on table public.pet_observations is
  'Measurements at an instant, immutable. A correction is a new row. Separate '
  'from pet_facts because observations never conflict and are never current, '
  'and mixing them would fill the fact table with permanently historical rows.';
