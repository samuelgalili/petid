-- M5 · product_variants - the sellable unit.
--
-- The variant, not the product, is what a customer buys. "Blue / S" and
-- "Blue / M" are different things with different stock and possibly different
-- prices, and the flat model could not say so: it had one row with one price
-- and a flavors text[] that nothing could reference. A cart line pointing at a
-- product is ambiguous; a cart line pointing at a variant is not.
--
-- option_signature is a canonical serialisation of options, and it exists
-- purely so the database can refuse duplicates. jsonb equality would not do it:
-- {"size":"L","color":"blue"} and {"color":"blue","size":"L"} are equal as
-- jsonb but a unique index over jsonb compares the stored form. The signature
-- is computed once, by the application, in a fixed key order.
--
-- label is derived for display and is NEVER parsed back for meaning. The moment
-- code reads meaning out of a display string, renaming a label changes
-- behaviour.
--
-- No SKU column here, deliberately. A SKU is a Seller's own code for something
-- they sell, so it belongs on the offer: two Sellers offering this same variant
-- have different SKUs, and a SKU on the variant would force them to share one.
--
-- barcode is optional and NOT unique. The same GTIN legitimately appears under
-- many Sellers and many products; a unique constraint here would reject honest
-- data.

create table if not exists public.product_variants (
  -- The stable purchase identity. Cart and order lines carry this.
  id uuid primary key default gen_random_uuid(),

  catalog_product_id uuid not null
    references public.catalog_products(id)
    on delete restrict,

  options jsonb not null default '{}'::jsonb,
  -- Canonical form of options, for duplicate prevention. See the note above.
  option_signature text not null,
  -- Display only. Never parsed.
  label text,

  barcode text,
  weight numeric(10, 3),
  weight_unit text,

  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  is_default boolean not null default false,

  created_by uuid not null references public.admin_users(id) on delete restrict,
  updated_by uuid references public.admin_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  archived_at timestamptz,
  archived_by uuid references public.admin_users(id) on delete restrict,

  constraint product_variants_archived_status
    check (status <> 'ARCHIVED' or archived_at is not null),

  -- An archived variant must not remain the default; the fallback chain would
  -- otherwise resolve to something withdrawn.
  constraint product_variants_archived_not_default
    check (archived_at is null or is_default = false)
);

-- No two live variants of one product may describe the same combination. This
-- is the constraint that stops an import creating "Blue / S" four times.
create unique index if not exists uq_product_variants_options
  on public.product_variants (catalog_product_id, option_signature)
  where archived_at is null;

-- At most one default per product.
create unique index if not exists uq_product_variants_default
  on public.product_variants (catalog_product_id)
  where is_default and archived_at is null;

create index if not exists idx_product_variants_product_status
  on public.product_variants (catalog_product_id, status);

create index if not exists idx_product_variants_barcode
  on public.product_variants (barcode)
  where barcode is not null;

-- catalog_product_id is immutable.
--
-- Moving a variant to another product would move whatever offers, stock and
-- order history hang off it, silently. If a variant belongs elsewhere, the
-- honest action is to archive it and create the right one.
create or replace function public.product_variants_product_frozen()
returns trigger
language plpgsql
as $$
begin
  if new.catalog_product_id is distinct from old.catalog_product_id then
    raise exception
      'product_variants.catalog_product_id is immutable; archive the variant and create the correct one'
      using errcode = 'restrict_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists product_variants_product_frozen on public.product_variants;
create trigger product_variants_product_frozen
  before update on public.product_variants
  for each row execute function public.product_variants_product_frozen();

comment on table public.product_variants is
  'The sellable unit: the thing a customer actually buys, and the unit of stock. No SKU here - a SKU is a Seller code and belongs on seller_offers.';

comment on column public.product_variants.option_signature is
  'Canonical serialisation of options, in fixed key order, so the unique index can refuse duplicate combinations. jsonb equality cannot do this.';

comment on column public.product_variants.label is
  'Display only. Never parsed for meaning.';

comment on column public.product_variants.barcode is
  'Optional and deliberately not unique: the same GTIN legitimately appears under many Sellers.';
