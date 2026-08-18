-- Product history, and the ability to undo.
--
-- This lands before anything starts generating content, on purpose. Once an AI
-- writes a description over a product, "what did it say before" has to be a
-- question with an answer, and restoring has to be one action rather than an
-- archaeology exercise.
--
-- History is captured by a trigger rather than by the code that edits products.
-- An import, an admin screen, a bulk approval and a psql session all reach the
-- same table, and a rule that only some of them remember to follow is not a
-- rule.

create table if not exists public.product_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,

  -- Per product, starting at 1, so "version 3" means something to a person.
  version integer not null,

  -- The complete row as it was. Storing the whole state rather than a diff is
  -- what makes restoring a single statement instead of a replay.
  state jsonb not null,

  -- Which columns actually moved. The diff is derived rather than stored as the
  -- source of truth, so it can be recomputed if the rules change.
  changed_fields text[] not null default '{}',

  reason text,
  source text not null default 'system'
    check (source in ('import', 'admin', 'ai', 'rollback', 'system', 'shop')),
  actor_admin_user_id uuid references public.admin_users(id) on delete set null,

  created_at timestamptz not null default now()
);

create unique index if not exists idx_product_versions_unique
  on public.product_versions(product_id, version);
create index if not exists idx_product_versions_product
  on public.product_versions(product_id, version desc);
create index if not exists idx_product_versions_created
  on public.product_versions(created_at desc);

-- Columns whose movement is not history: timestamps the database maintains, and
-- the pointer to the import row that produced the write.
create or replace function public.product_version_ignored_columns()
returns text[]
language sql
immutable
as $$
  select array['updated_at', 'created_at', 'source_import_row_id', 'last_seen_import_id']::text[]
$$;

create or replace function public.record_product_version()
returns trigger
language plpgsql
as $$
declare
  next_version integer;
  old_state jsonb;
  new_state jsonb;
  moved text[];
  ignored text[] := public.product_version_ignored_columns();
begin
  new_state := to_jsonb(new);

  if tg_op = 'UPDATE' then
    old_state := to_jsonb(old);

    select coalesce(array_agg(key), '{}')
    into moved
    from jsonb_each(new_state) as entry(key, value)
    where not (key = any(ignored))
      and value is distinct from (old_state -> key);

    -- Nothing of substance moved. Recording it would bury the versions that
    -- matter under a pile of no-ops.
    if moved = '{}' then
      return new;
    end if;
  else
    moved := array['*']::text[];
  end if;

  select coalesce(max(version), 0) + 1
  into next_version
  from public.product_versions
  where product_id = new.id;

  insert into public.product_versions (
    product_id, version, state, changed_fields, reason, source, actor_admin_user_id
  )
  values (
    new.id,
    next_version,
    new_state,
    moved,
    nullif(current_setting('mipo.change_reason', true), ''),
    coalesce(nullif(current_setting('mipo.change_source', true), ''), 'system'),
    nullif(current_setting('mipo.actor_admin_user_id', true), '')::uuid
  );

  return new;
end;
$$;

drop trigger if exists products_record_version on public.products;
create trigger products_record_version
  after insert or update on public.products
  for each row execute function public.record_product_version();

-- Everything already in the catalogue gets a version 1, so a product that
-- existed before this migration is not a product with no past.
insert into public.product_versions (product_id, version, state, changed_fields, source, reason)
select p.id, 1, to_jsonb(p), array['*']::text[], 'system', 'Baseline captured when versioning was introduced'
from public.products p
where not exists (select 1 from public.product_versions v where v.product_id = p.id);

/**
 * Restores a product to an earlier version.
 *
 * The restore is itself an update, so the trigger records it as a new version.
 * Nothing is erased: after rolling back from 5 to 2 the history reads 1, 2, 3,
 * 4, 5, 6 — where 6 holds what 2 held. Undoing the undo is therefore possible,
 * which is the property that makes rollback safe to reach for.
 */
create or replace function public.rollback_product_to_version(
  p_product_id uuid,
  p_version integer,
  p_actor_admin_user_id uuid default null,
  p_reason text default null
) returns integer
language plpgsql
as $$
declare
  target jsonb;
  new_version integer;
begin
  select state into target
  from public.product_versions
  where product_id = p_product_id and version = p_version;

  if target is null then
    raise exception 'Product % has no version %', p_product_id, p_version;
  end if;

  perform set_config('mipo.change_source', 'rollback', true);
  perform set_config(
    'mipo.change_reason',
    coalesce(p_reason, format('Restored to version %s', p_version)),
    true
  );
  perform set_config('mipo.actor_admin_user_id', coalesce(p_actor_admin_user_id::text, ''), true);

  -- The identity and the audit columns stay as they are; everything else comes
  -- back from the stored state.
  update public.products p
  set
    name = target->>'name',
    description = target->>'description',
    price = (target->>'price')::numeric,
    original_price = nullif(target->>'original_price', '')::numeric,
    sale_price = nullif(target->>'sale_price', '')::numeric,
    image_url = target->>'image_url',
    category = target->>'category',
    sku = target->>'sku',
    brand = target->>'brand',
    status = target->>'status',
    in_stock = (target->>'in_stock')::boolean,
    cost_price = nullif(target->>'cost_price', '')::numeric,
    brand_id = nullif(target->>'brand_id', '')::uuid,
    primary_category_id = nullif(target->>'primary_category_id', '')::uuid,
    primary_supplier_id = nullif(target->>'primary_supplier_id', '')::uuid,
    animal_type_id = nullif(target->>'animal_type_id', '')::uuid,
    size_amount = nullif(target->>'size_amount', '')::numeric,
    size_unit = target->>'size_unit',
    updated_at = now()
  where p.id = p_product_id;

  select max(version) into new_version
  from public.product_versions
  where product_id = p_product_id;

  return new_version;
end;
$$;
