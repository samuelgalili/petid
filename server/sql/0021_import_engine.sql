-- The import engine.
--
-- Catalogue files were parsed in the browser, six columns were read out of
-- them, and the other hundred-odd were dropped before anything reached the
-- server. There was no record that an import had happened, no way to see what a
-- row originally said, and nothing to compare a second delivery against.
--
-- This adds the run record, the per-row record with its untouched source data,
-- the supplier profile that says how to read a given file, and a job table so
-- the work happens in the background instead of holding a request open.

-- ---------------------------------------------------------------------------
-- 1. Import profiles
--
-- A profile belongs to a supplier and survives between deliveries, so a mapping
-- corrected once is not re-derived — or re-guessed — next month.
-- ---------------------------------------------------------------------------

create table if not exists public.supplier_import_profiles (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  name text not null,
  source_type text not null default 'file'
    check (source_type in ('file', 'api', 'ftp', 'sftp', 'sheets', 'manual')),
  status text not null default 'active' check (status in ('active', 'draft', 'inactive')),

  -- How to find the header row and where the data starts. Supplier exports are
  -- rarely a clean first-row header.
  sheet_name text,
  header_row integer not null default 1 check (header_row >= 1),

  -- Rules that are not per-field: currency defaults, unit spellings to fold
  -- together, what to do about a product that vanished from the file.
  normalization_rules jsonb not null default '{}'::jsonb,
  pricing_rules jsonb not null default '{}'::jsonb,
  image_rules jsonb not null default '{}'::jsonb,
  variant_rules jsonb not null default '{}'::jsonb,
  validation_rules jsonb not null default '{}'::jsonb,

  -- Applied when the file itself names no supplier, which is the majority of
  -- rows in the reference delivery.
  default_supplier_id uuid references public.suppliers(id) on delete set null,

  last_import_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_import_profiles_supplier
  on public.supplier_import_profiles(supplier_id);

-- One row per source column. Every column in the file gets an entry, including
-- the ones we deliberately ignore: "no silent data loss" is only checkable if
-- the decision is written down.
create table if not exists public.import_field_mappings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.supplier_import_profiles(id) on delete cascade,

  source_field text not null,
  -- Normalised for matching, since the same header arrives with different
  -- quote characters and spacing between exports.
  normalized_source_field text not null,

  -- Where the value goes. 'ignored' is a real decision and carries a reason.
  target_kind text not null default 'unmapped'
    check (target_kind in ('domain', 'attribute', 'identifier', 'price', 'metadata', 'ignored', 'unmapped')),
  target_field text,

  value_type text not null default 'text'
    check (value_type in ('text', 'number', 'integer', 'boolean', 'date', 'currency', 'enum', 'array')),

  transform jsonb not null default '{}'::jsonb,
  is_required boolean not null default false,
  ignore_reason text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_import_field_mappings_unique
  on public.import_field_mappings(profile_id, normalized_source_field);

-- An ignored column has to say why, so a future reader can tell a considered
-- decision from an oversight.
alter table public.import_field_mappings
  drop constraint if exists import_field_mappings_ignore_reason_check;
alter table public.import_field_mappings
  add constraint import_field_mappings_ignore_reason_check
  check (target_kind <> 'ignored' or ignore_reason is not null);

-- ---------------------------------------------------------------------------
-- 2. The run
-- ---------------------------------------------------------------------------

create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id) on delete set null,
  profile_id uuid references public.supplier_import_profiles(id) on delete set null,

  -- Explicit states rather than a pair of booleans, so a run stuck halfway is
  -- distinguishable from one that finished with problems.
  status text not null default 'uploaded' check (status in (
    'uploaded', 'parsing', 'mapped', 'normalized', 'enriching', 'validating',
    'review_required', 'ready', 'publishing', 'completed', 'completed_with_review',
    'failed', 'cancelled'
  )),

  source_type text not null default 'file',
  filename text,
  file_size_bytes integer,
  -- Identifies a redelivery of a byte-identical file.
  file_checksum text,
  sheet_name text,

  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  invalid_rows integer not null default 0,
  created_products integer not null default 0,
  updated_products integer not null default 0,
  unchanged_products integer not null default 0,
  pending_review_rows integer not null default 0,

  -- Column-level accounting for the report the acceptance test asks for.
  mapped_fields integer not null default 0,
  unmapped_fields integer not null default 0,
  ignored_fields integer not null default 0,

  errors jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,

  started_at timestamptz,
  completed_at timestamptz,
  created_by_admin_user_id uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_imports_supplier on public.imports(supplier_id, created_at desc);
create index if not exists idx_imports_status on public.imports(status);
create index if not exists idx_imports_checksum on public.imports(file_checksum)
  where file_checksum is not null;

-- The uploaded bytes, kept separately so listing imports never drags megabytes
-- along with it. Held until the run is parsed and reviewed, which is what makes
-- a re-parse under a corrected profile possible without asking the supplier for
-- the file again.
create table if not exists public.import_files (
  import_id uuid primary key references public.imports(id) on delete cascade,
  content bytea not null,
  content_type text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. The row
--
-- raw is the whole source row, exactly as it arrived. Everything else in the
-- pipeline is derived from it, so a mapping fixed later can be replayed without
-- asking the supplier for the file again.
-- ---------------------------------------------------------------------------

create table if not exists public.import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.imports(id) on delete cascade,
  row_number integer not null,

  raw jsonb not null,
  -- Hash of raw, so an unchanged row in the next delivery is recognised
  -- without comparing a hundred fields.
  raw_hash text not null,

  mapped jsonb not null default '{}'::jsonb,
  normalized jsonb not null default '{}'::jsonb,

  status text not null default 'parsed' check (status in (
    'parsed', 'mapped', 'normalized', 'valid', 'pending_review', 'ready',
    'published', 'rejected', 'error', 'unchanged'
  )),

  -- Per-stage state, so a failed image lookup does not block a row whose other
  -- stages succeeded.
  stage_states jsonb not null default '{}'::jsonb,

  product_id uuid references public.products(id) on delete set null,
  action text check (action in ('create', 'update', 'unchanged', 'skip', 'error')),

  errors jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_import_rows_unique
  on public.import_rows(import_id, row_number);
create index if not exists idx_import_rows_status on public.import_rows(import_id, status);
create index if not exists idx_import_rows_hash on public.import_rows(raw_hash);
create index if not exists idx_import_rows_product on public.import_rows(product_id)
  where product_id is not null;

-- ---------------------------------------------------------------------------
-- 4. Background work
--
-- A queue in the database rather than a broker: this API is a single Node
-- process behind Caddy, and adding Redis to run one import would be a new piece
-- of infrastructure to operate for no benefit at this size. `for update skip
-- locked` gives safe hand-off if a second process is ever added.
-- ---------------------------------------------------------------------------

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'succeeded', 'failed', 'cancelled')),

  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  last_error text,

  attempts integer not null default 0,
  max_attempts integer not null default 3,

  run_after timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,

  -- Stops the same import being queued twice by a double-clicked upload.
  idempotency_key text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_jobs_idempotency
  on public.jobs(idempotency_key) where idempotency_key is not null;

-- The claim query reads only this: pending work whose time has come.
create index if not exists idx_jobs_claimable
  on public.jobs(run_after)
  where status = 'pending';

create index if not exists idx_jobs_type_status on public.jobs(job_type, status);

-- Claims one job atomically. skip locked means a second worker takes the next
-- row instead of blocking on this one.
create or replace function public.claim_next_job(p_job_types text[])
returns setof public.jobs
language plpgsql
as $$
begin
  return query
  update public.jobs j
  set status = 'running',
      attempts = j.attempts + 1,
      started_at = now(),
      updated_at = now()
  where j.id = (
    select candidate.id
    from public.jobs candidate
    where candidate.status = 'pending'
      and candidate.run_after <= now()
      and (p_job_types is null or candidate.job_type = any(p_job_types))
    order by candidate.run_after
    for update skip locked
    limit 1
  )
  returning j.*;
end;
$$;
