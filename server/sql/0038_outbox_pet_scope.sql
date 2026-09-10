-- 0038_outbox_pet_scope.sql
-- Two columns the outbox needs before it has consumers, not after.
--
-- pet_id
--   An event carries entity_type + entity_id today. A walk event's entity is
--   the walk, an order event's is the order, a fact event's is the fact -- so
--   "everything that happened to Blue" would require knowing every entity type
--   that can reference a pet, and updating that list forever. The AI ledgers
--   already solved this the right way: ai_requests, usage_events and
--   cost_events all carry pet_id directly. The outbox should match.
--
-- payload_version
--   payload is free-form jsonb with no version, so a consumer cannot tell v1
--   of order.paid from v2. Adding it now costs one column; adding it after the
--   first external consumer exists is a breaking change. Existing rows are
--   version 1, which is true -- there has only ever been one shape.
--
-- Both are nullable-or-defaulted and no existing writer changes meaning:
-- emitEvent passes pet_id only where a pet is genuinely the subject.
--
-- Rollback: alter table public.outbox_events drop column pet_id, drop column
-- payload_version; then delete the filename from public.schema_migrations.

alter table public.outbox_events
  add column if not exists pet_id uuid,
  add column if not exists payload_version integer not null default 1;

-- No foreign key to pets, deliberately. An event is a record that something
-- happened, and it must survive the deletion of the thing it happened to --
-- "pet.deleted" whose pet_id was nulled out by its own cascade is not a record
-- of anything. The AI ledgers carry pet_id the same way, for the same reason.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'outbox_events_payload_version_check'
  ) then
    alter table public.outbox_events
      add constraint outbox_events_payload_version_check
      check (payload_version >= 1);
  end if;
end $$;

-- "Everything that happened to this pet", in one scan. Partial, because most
-- events -- orders, signups -- have no pet and would only make the index big.
create index if not exists idx_outbox_pet
  on public.outbox_events (pet_id, occurred_at desc)
  where pet_id is not null;

comment on column public.outbox_events.pet_id is
  'The pet an event is about, when there is one. Not a foreign key: an event '
  'outlives the entity it describes.';
comment on column public.outbox_events.payload_version is
  'Schema version of payload. Bump when a payload shape changes incompatibly.';
