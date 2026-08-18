-- Change detection between deliveries.
--
-- Until now a second delivery would simply overwrite what the first one built.
-- A price moving from 99 to 109, a product vanishing from the file, a barcode
-- being corrected — all of it would land silently, and the first anyone would
-- know is a shopper seeing a different number.
--
-- Each difference becomes a row here, waiting for a decision. Nothing touches a
-- live product until someone approves it.

create table if not exists public.import_changes (
  id uuid primary key default gen_random_uuid(),

  import_id uuid not null references public.imports(id) on delete cascade,
  -- The delivery this one is being compared against. Null on a first import,
  -- where everything is new by definition.
  previous_import_id uuid references public.imports(id) on delete set null,

  import_row_id uuid references public.import_rows(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,

  change_type text not null check (change_type in (
    'product_added', 'product_removed', 'field_changed'
  )),

  -- Null for added and removed, which are about the product rather than a field.
  field_name text,
  old_value jsonb,
  new_value jsonb,

  -- A price change is not a barcode correction. Ranking them lets the review
  -- screen put money first without hard-coding a list of field names into it.
  severity text not null default 'normal' check (severity in ('critical', 'normal', 'minor')),

  status text not null default 'pending' check (status in (
    'pending', 'approved', 'rejected', 'applied', 'superseded'
  )),

  decided_by_admin_user_id uuid references public.admin_users(id) on delete set null,
  decided_at timestamptz,
  applied_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_import_changes_import
  on public.import_changes(import_id, status);
create index if not exists idx_import_changes_pending
  on public.import_changes(severity, created_at)
  where status = 'pending';
create index if not exists idx_import_changes_product
  on public.import_changes(product_id)
  where product_id is not null;

-- The same field of the same product changing twice in one delivery is one
-- decision, not two.
create unique index if not exists idx_import_changes_unique
  on public.import_changes(
    import_id,
    coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid),
    change_type,
    coalesce(field_name, '')
  );

-- A product that stopped appearing in the supplier file is marked, never
-- deleted. Whether that should hide it from the shop is a supplier policy
-- decision, and until someone makes it the product stays exactly as it was.
alter table public.products
  add column if not exists missing_from_import_at timestamptz,
  add column if not exists last_seen_import_id uuid references public.imports(id) on delete set null;

create index if not exists idx_products_missing_from_import
  on public.products(missing_from_import_at)
  where missing_from_import_at is not null;

-- Whether a delivery may publish without asking. Off for a first import, and
-- turned on once the mapping has been confirmed against a real run.
alter table public.supplier_import_profiles
  add column if not exists auto_publish_enabled boolean not null default false,
  add column if not exists completed_import_count integer not null default 0;
