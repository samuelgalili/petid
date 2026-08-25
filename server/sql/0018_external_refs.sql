-- 0018_external_refs.sql
-- One place to record what an entity is called in every other system.
--
-- MIPO currently persists external identifiers only for CardCom, in purpose-built
-- columns. Any further integration — a CRM, a shipping provider, an accounting
-- system — has nowhere to store its own IDs, which forces matching on email.
-- Email matching is unsafe against systems that do not enforce uniqueness.

create table if not exists public.external_refs (
  id           uuid primary key default gen_random_uuid(),

  system       text not null,          -- 'monday', 'hubspot', ...
  entity_type  text not null,          -- 'customer', 'order', 'product', 'pet'
  entity_id    uuid not null,          -- the MIPO uuid
  external_id  text not null,          -- the identifier in that system

  metadata     jsonb not null default '{}'::jsonb,
  synced_at    timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint external_refs_system_check
    check (system ~ '^[a-z0-9_-]{2,40}$'),
  constraint external_refs_entity_type_check
    check (entity_type ~ '^[a-z0-9_]{2,40}$'),
  constraint external_refs_external_id_check
    check (length(external_id) between 1 and 255),

  -- One MIPO entity maps to at most one record per system...
  constraint external_refs_entity_unique
    unique (system, entity_type, entity_id),

  -- ...and one external record is claimed by at most one MIPO entity.
  constraint external_refs_external_unique
    unique (system, entity_type, external_id)
);

create index if not exists idx_external_refs_lookup
  on public.external_refs (system, entity_type, external_id);

create index if not exists idx_external_refs_entity
  on public.external_refs (entity_type, entity_id);

create index if not exists idx_external_refs_stale
  on public.external_refs (system, synced_at nulls first);

comment on table public.external_refs is
  'Maps MIPO entity uuids to identifiers in external systems. The two unique '
  'constraints are the point: they make a duplicated or crossed mapping '
  'impossible, including against systems that enforce no uniqueness themselves.';
