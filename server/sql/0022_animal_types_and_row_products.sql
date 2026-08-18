-- Animal types as an entity, and the link from an import row to what it became.
--
-- public.pet_type is ('dog','cat','other','all'). The reference delivery holds
-- eight animals, so six of them — parrots, rodents, poultry, sheep and cattle,
-- horses, laying hens — would all collapse into 'other'. That is 141 products
-- losing the one attribute a shopper filters on.
--
-- The enum stays exactly as it is, because the storefront, the API and the
-- existing catalogue all speak it. The table sits beside it and carries the
-- distinction the enum cannot.

create table if not exists public.animal_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null unique,
  slug text unique,

  -- What this animal answers when something asks in the old vocabulary.
  pet_type_fallback public.pet_type not null default 'other',

  display_order integer not null default 0,
  status text not null default 'active' check (status in ('active', 'proposed', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.animal_types (name, normalized_name, slug, pet_type_fallback, display_order)
values
  ('כלב', 'כלב', 'dog', 'dog', 1),
  ('חתול', 'חתול', 'cat', 'cat', 2),
  ('תוכים', 'תוכים', 'parrots', 'other', 3),
  ('מכרסם', 'מכרסם', 'rodents', 'other', 4),
  ('עופות', 'עופות', 'poultry', 'other', 5),
  ('מטילות', 'מטילות', 'laying-hens', 'other', 6),
  ('צאן ובקר', 'צאן ובקר', 'livestock', 'other', 7),
  ('סוסים', 'סוסים', 'horses', 'other', 8)
on conflict (normalized_name) do nothing;

alter table public.products
  add column if not exists animal_type_id uuid references public.animal_types(id) on delete set null;

create index if not exists idx_products_animal_type on public.products(animal_type_id);

-- Existing products only ever had the enum, so the two are lined up where the
-- enum is specific enough to say which animal it meant.
update public.products p
set animal_type_id = a.id
from public.animal_types a
where p.animal_type_id is null
  and p.pet_type in ('dog', 'cat')
  and a.pet_type_fallback = p.pet_type
  and a.normalized_name in ('כלב', 'חתול');

-- A product built by an import knows which row it came from, and the row knows
-- what it became. Without both directions a value in the catalogue cannot be
-- traced back to the cell it came from.
alter table public.products
  add column if not exists source_import_row_id uuid references public.import_rows(id) on delete set null;

create index if not exists idx_products_source_row on public.products(source_import_row_id);

-- Variant grouping is derived from the product name and brand rather than the
-- barcode, because six barcodes in the reference file are shared across pack
-- sizes and grouping by them would merge a 1.5kg bag with a 20kg one.
alter table public.products
  add column if not exists variant_group_key text,
  add column if not exists size_amount numeric,
  add column if not exists size_unit text;

create index if not exists idx_products_variant_group
  on public.products(variant_group_key)
  where variant_group_key is not null;
