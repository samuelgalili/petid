-- M2 · raw_import_records - what the outside world actually said, frozen.
--
-- The failure this exists to end: a scraped record became a sellable product in
-- one step, and the moment anybody corrected a field the original was gone. So
-- there was no way to answer "what did the supplier actually send" or "which of
-- these fields did a human change". The raw record is now stored once and never
-- edited; every correction happens in product_drafts and stays traceable back
-- to this row.
--
-- business_id is NOT NULL with no default and no fallback. This is the single
-- most important line in the file. The legacy path called
-- ensureDefaultBusinessProfile() when no business_id was supplied, which
-- assigned ownership without recording that it had - and that is precisely why
-- legacy ownership is now unreconstructible. An import that does not name its
-- Seller fails here rather than guessing.
--
-- source_url is provenance of CONTENT, never of ownership. That two different
-- things were read off one field is the other half of the legacy problem.

create table if not exists public.raw_import_records (
  id uuid primary key default gen_random_uuid(),

  -- The importing Seller. No default, no fallback, ever.
  business_id uuid not null
    references public.business_profiles(id)
    on delete restrict,

  source_system text not null
    check (source_system in ('url', 'scrape', 'csv', 'xlsx', 'manual', 'api')),
  source_record_id text,
  source_url text,
  -- Derived, so a record can be displayed without exposing paths, query
  -- strings or anything else the URL may carry.
  source_host text,

  -- IMMUTABLE. Enforced below by a trigger, because "we agreed not to edit it"
  -- is not enforcement.
  payload jsonb not null,
  payload_hash text not null,
  content_type text,

  imported_at timestamptz not null default now(),
  -- Groups one spreadsheet or one crawl.
  import_batch_id uuid,

  created_by uuid not null references public.admin_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Never hard-deleted. An audit trail with holes is not an audit trail.
  archived_at timestamptz,
  archived_by uuid references public.admin_users(id) on delete restrict
);

-- One Seller cannot import the same external record twice. A DIFFERENT Seller
-- can, and must be able to: two shops legitimately sell the supplier's item
-- 12345. There is no global uniqueness on source_record_id and none may be
-- added - that would make the second Seller's import fail for no reason.
create unique index if not exists uq_raw_import_records_source
  on public.raw_import_records (business_id, source_system, source_record_id)
  where source_record_id is not null;

create index if not exists idx_raw_import_records_business_imported
  on public.raw_import_records (business_id, imported_at desc);

create index if not exists idx_raw_import_records_batch
  on public.raw_import_records (import_batch_id)
  where import_batch_id is not null;

create index if not exists idx_raw_import_records_payload_hash
  on public.raw_import_records (payload_hash);

create index if not exists idx_raw_import_records_business_hash
  on public.raw_import_records (business_id, payload_hash);

-- Immutability, enforced by the database.
--
-- The listed columns cannot change after insert. archived_at/archived_by and
-- updated_at remain writable, because soft delete is the only permitted
-- mutation. A trigger rather than a rule: it reports which column was touched,
-- which is what makes the failure diagnosable.
create or replace function public.raw_import_records_immutable()
returns trigger
language plpgsql
as $$
declare
  frozen text;
begin
  frozen := case
    when new.payload        is distinct from old.payload        then 'payload'
    when new.payload_hash   is distinct from old.payload_hash   then 'payload_hash'
    when new.business_id    is distinct from old.business_id    then 'business_id'
    when new.source_system  is distinct from old.source_system  then 'source_system'
    when new.source_record_id is distinct from old.source_record_id then 'source_record_id'
    when new.source_url     is distinct from old.source_url     then 'source_url'
    when new.source_host    is distinct from old.source_host    then 'source_host'
    when new.imported_at    is distinct from old.imported_at    then 'imported_at'
    when new.created_by     is distinct from old.created_by     then 'created_by'
    when new.id             is distinct from old.id             then 'id'
    else null
  end;

  if frozen is not null then
    raise exception
      'raw_import_records.% is immutable; corrections belong in product_drafts', frozen
      using errcode = 'restrict_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists raw_import_records_immutable on public.raw_import_records;
create trigger raw_import_records_immutable
  before update on public.raw_import_records
  for each row execute function public.raw_import_records_immutable();

comment on table public.raw_import_records is
  'The external source record, stored verbatim and never edited. Corrections live in product_drafts. business_id has no default: an import that does not name its Seller fails rather than guessing.';

comment on column public.raw_import_records.source_url is
  'Provenance of content, never of ownership. Ownership is business_id.';
