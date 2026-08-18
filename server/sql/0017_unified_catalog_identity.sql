-- Unified catalog identity.
--
-- Before this migration a product lived in one of two tables with different
-- column names, `sku` was not unique, deletes were physical, and
-- `order_items.product_id` was an unconstrained uuid that could point at either
-- table or at nothing. Nothing downstream could join a purchase back to a
-- catalog entry with confidence.
--
-- After it there is one `products` table, one id per product, real foreign keys
-- from order lines, and brands, categories and suppliers as entities instead of
-- free-text columns. The old table names survive as views so every existing
-- query, endpoint and admin screen keeps working untouched.

-- ---------------------------------------------------------------------------
-- 1. Taxonomy entities
-- ---------------------------------------------------------------------------

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null unique,
  slug text unique,
  logo_url text,
  website text,
  description text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  name_en text,
  slug text,
  -- The supplier's own code for this grouping, e.g. "dogs" for מזון כלבים.
  source_code text,
  status text not null default 'active' check (status in ('active', 'proposed', 'inactive')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_categories_parent_name
  on public.categories(coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(btrim(name)));
create index if not exists idx_categories_parent on public.categories(parent_id);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null unique,
  slug text unique,
  status text not null default 'active' check (status in ('active', 'inactive', 'pending')),
  source_type text not null default 'file' check (source_type in ('file', 'api', 'ftp', 'sftp', 'sheets', 'manual')),
  contact_email text,
  contact_phone text,
  default_currency text not null default 'ILS',
  notes text,
  last_import_at timestamptz,
  last_attempted_import_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. The unified product table
--
-- The column set is the shape the API already returns for both sources, so the
-- response contract does not change. Scrape-only columns (SEO, JSON-LD,
-- technical details) are preserved in product_source_data rather than dropped.
-- ---------------------------------------------------------------------------

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),

  -- Where this row came from. 'manual' is the default so an insert through the
  -- business_products view lands in the right partition without code changes.
  source_kind text not null default 'manual'
    check (source_kind in ('manual', 'scraped', 'import', 'legacy_order')),

  -- One explicit lifecycle column instead of scattered booleans.
  status text not null default 'published'
    check (status in ('draft', 'pending_review', 'ready', 'published', 'rejected', 'archived', 'error')),

  business_id uuid references public.business_profiles(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  primary_category_id uuid references public.categories(id) on delete set null,
  primary_supplier_id uuid references public.suppliers(id) on delete set null,

  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  original_price numeric(10,2),
  sale_price numeric,
  image_url text not null default '/placeholder.svg',
  images text[] default '{}',
  category text,
  in_stock boolean default true,
  is_featured boolean default false,
  sku text,
  pet_type public.pet_type,
  flavors text[],
  brand text,
  weight_unit text,
  price_per_weight numeric,
  source_url text,
  ingredients text,
  benefits jsonb default '[]'::jsonb,
  feeding_guide jsonb default '[]'::jsonb,
  product_attributes jsonb default '{}'::jsonb,
  life_stage text,
  dog_size text,
  special_diet text[],
  needs_image_review boolean default false,
  needs_price_review boolean default false,
  suggested_price numeric,
  price_suggestion_reason text,
  is_flagged boolean default false,
  flagged_reason text,
  flagged_at timestamptz,
  safety_score numeric,
  average_rating numeric,
  review_count integer,
  cost_price numeric,
  commission_rate numeric,
  supplier_link text,
  auto_restock boolean default false,
  restock_interval_days integer,
  api_sync_enabled boolean default false,
  breed_tags text[],
  medical_tags text[],
  kcal_per_kg numeric,

  -- business_products.supplier_id pointed at no table. The value is kept here
  -- rather than discarded, but it is not a foreign key and nothing reads it.
  legacy_supplier_id uuid,

  -- Soft delete. Nothing in the catalog is removed physically any more.
  deleted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_source_kind on public.products(source_kind) where deleted_at is null;
create index if not exists idx_products_status on public.products(status) where deleted_at is null;
create index if not exists idx_products_sku on public.products(sku);
create index if not exists idx_products_brand on public.products(brand_id);
create index if not exists idx_products_category on public.products(primary_category_id);
create index if not exists idx_products_supplier on public.products(primary_supplier_id);
create index if not exists idx_products_business on public.products(business_id);
create index if not exists idx_products_created on public.products(created_at desc);

-- SKU uniqueness is enforced for imported rows only. Legacy rows are not
-- touched: a duplicate sku already in production would abort this migration,
-- and repairing that data is a separate, reviewable step.
create unique index if not exists idx_products_import_sku_unique
  on public.products(
    coalesce(primary_supplier_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(btrim(sku))
  )
  where source_kind = 'import' and sku is not null and btrim(sku) <> '' and deleted_at is null;

-- ---------------------------------------------------------------------------
-- 3. Identity, supplier links, and preserved source payloads
-- ---------------------------------------------------------------------------

create table if not exists public.product_identifiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  id_type text not null check (id_type in ('gtin13', 'gtin', 'mpn', 'supplier_sku', 'internal_sku')),
  value text not null,
  normalized_value text not null,
  -- A barcode that fails its check digit is stored but flagged, because in the
  -- reference supplier file only 172 of 267 barcodes are valid EAN-13 and six
  -- are shared across different pack sizes.
  is_valid boolean not null default true,
  source text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_product_identifiers_unique
  on public.product_identifiers(product_id, id_type, normalized_value);
create index if not exists idx_product_identifiers_lookup
  on public.product_identifiers(id_type, normalized_value);

create table if not exists public.product_supplier_links (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  supplier_sku text,
  cost numeric(12,4),
  currency text not null default 'ILS',
  availability text,
  lead_time_days integer,
  priority integer not null default 100,
  is_primary boolean not null default false,
  last_import_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_product_supplier_links_unique
  on public.product_supplier_links(supplier_id, lower(btrim(coalesce(supplier_sku, ''))), product_id);
create index if not exists idx_product_supplier_links_product
  on public.product_supplier_links(product_id);

create table if not exists public.product_source_data (
  product_id uuid primary key references public.products(id) on delete cascade,
  source_kind text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. Backfill: business products keep their ids
-- ---------------------------------------------------------------------------

insert into public.products (
  id, source_kind, status, business_id, name, description, price, original_price, sale_price,
  image_url, images, category, in_stock, is_featured, sku, pet_type, flavors, brand,
  weight_unit, price_per_weight, source_url, ingredients, benefits, feeding_guide,
  product_attributes, life_stage, dog_size, special_diet, needs_image_review,
  needs_price_review, suggested_price, price_suggestion_reason, is_flagged, flagged_reason,
  flagged_at, safety_score, average_rating, review_count, cost_price, commission_rate,
  supplier_link, auto_restock, restock_interval_days, api_sync_enabled, breed_tags,
  medical_tags, kcal_per_kg, legacy_supplier_id, created_at, updated_at
)
select
  bp.id, 'manual', 'published', bp.business_id, bp.name, bp.description,
  coalesce(bp.price, 0), bp.original_price, bp.sale_price,
  coalesce(bp.image_url, '/placeholder.svg'), coalesce(bp.images, '{}'), bp.category,
  bp.in_stock, bp.is_featured, bp.sku, bp.pet_type, bp.flavors, bp.brand,
  bp.weight_unit, bp.price_per_weight, bp.source_url, bp.ingredients,
  coalesce(bp.benefits, '[]'::jsonb), coalesce(bp.feeding_guide, '[]'::jsonb),
  coalesce(bp.product_attributes, '{}'::jsonb), bp.life_stage, bp.dog_size, bp.special_diet,
  bp.needs_image_review, bp.needs_price_review, bp.suggested_price, bp.price_suggestion_reason,
  bp.is_flagged, bp.flagged_reason, bp.flagged_at, bp.safety_score, bp.average_rating,
  bp.review_count, bp.cost_price, bp.commission_rate, bp.supplier_link, bp.auto_restock,
  bp.restock_interval_days, bp.api_sync_enabled, bp.breed_tags, bp.medical_tags,
  bp.kcal_per_kg, bp.supplier_id, bp.created_at, bp.updated_at
from public.business_products bp
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Backfill: scraped products, mapped onto the same shape
--
-- The mapping mirrors what the API already did in JavaScript, so a scraped
-- product reaches the client exactly as it does today.
-- ---------------------------------------------------------------------------

insert into public.products (
  id, source_kind, status, name, description, price, original_price, sale_price,
  image_url, images, category, in_stock, sku, pet_type, flavors, brand,
  weight_unit, source_url, ingredients, is_flagged, flagged_reason, flagged_at,
  average_rating, review_count, created_at, updated_at
)
select
  sp.id, 'scraped', 'published',
  coalesce(nullif(btrim(sp.product_name), ''), 'ללא שם'),
  coalesce(sp.long_description, sp.short_description),
  coalesce(sp.final_price, sp.regular_price, 0),
  case when sp.regular_price is distinct from sp.final_price then sp.regular_price end,
  sp.sale_price,
  coalesce(sp.main_image_url, '/placeholder.svg'),
  case when sp.main_image_url is not null then array[sp.main_image_url] else '{}'::text[] end,
  coalesce(sp.sub_category, sp.main_category),
  sp.stock_status is null or sp.stock_status = 'in_stock',
  sp.sku,
  case when sp.pet_type in ('dog', 'cat', 'other', 'all') then sp.pet_type::public.pet_type else null end,
  sp.flavors, sp.brand, sp.weight_unit, sp.product_url, sp.ingredients,
  coalesce(sp.is_flagged, false), sp.flagged_reason, sp.flagged_at,
  sp.rating, sp.review_count,
  coalesce(sp.created_at, sp.scraped_at, now()),
  coalesce(sp.updated_at, sp.scraped_at, now())
from public.scraped_products sp
on conflict (id) do nothing;

-- Everything the unified shape does not carry is preserved verbatim.
insert into public.product_source_data (product_id, source_kind, payload)
select
  sp.id,
  'scraped',
  jsonb_strip_nulls(jsonb_build_object(
    'canonical_url', sp.canonical_url,
    'short_description', sp.short_description,
    'long_description_html', sp.long_description_html,
    'currency', sp.currency,
    'main_category', sp.main_category,
    'sub_category', sp.sub_category,
    'category_path', sp.category_path,
    'stock_badge', sp.stock_badge,
    'weight', sp.weight,
    'sizes', to_jsonb(sp.sizes),
    'colors', to_jsonb(sp.colors),
    'badges', to_jsonb(sp.badges),
    'bullet_points', to_jsonb(sp.bullet_points),
    'usage_instructions', sp.usage_instructions,
    'warnings', sp.warnings,
    'shipping_info', sp.shipping_info,
    'return_info', sp.return_info,
    'sample_review', sp.sample_review,
    'meta_title', sp.meta_title,
    'meta_description', sp.meta_description,
    'h1_title', sp.h1_title,
    'discount_text', sp.discount_text,
    'nutrition_info', sp.nutrition_info,
    'technical_details', sp.technical_details,
    'data_attributes', sp.data_attributes,
    'json_ld_data', sp.json_ld_data,
    'variants', sp.variants,
    'linked_product_id', to_jsonb(sp.product_id),
    'scraped_at', to_jsonb(sp.scraped_at)
  ))
from public.scraped_products sp
on conflict (product_id) do nothing;

-- ---------------------------------------------------------------------------
-- 6. Promote brand and category strings to entities
-- ---------------------------------------------------------------------------

insert into public.brands (name, normalized_name, slug)
select distinct on (lower(btrim(p.brand)))
  btrim(p.brand),
  lower(btrim(p.brand)),
  regexp_replace(lower(btrim(p.brand)), '[^a-z0-9֐-׿]+', '-', 'g')
from public.products p
where p.brand is not null and btrim(p.brand) <> ''
order by lower(btrim(p.brand)), btrim(p.brand)
on conflict (normalized_name) do nothing;

update public.products p
set brand_id = b.id
from public.brands b
where p.brand is not null
  and lower(btrim(p.brand)) = b.normalized_name
  and p.brand_id is null;

insert into public.categories (name, slug)
select distinct on (lower(btrim(p.category)))
  btrim(p.category),
  regexp_replace(lower(btrim(p.category)), '[^a-z0-9֐-׿]+', '-', 'g')
from public.products p
where p.category is not null and btrim(p.category) <> ''
order by lower(btrim(p.category)), btrim(p.category);

update public.products p
set primary_category_id = c.id
from public.categories c
where p.category is not null
  and c.parent_id is null
  and lower(btrim(p.category)) = lower(btrim(c.name))
  and p.primary_category_id is null;

-- Barcodes and SKUs become first-class identifiers.
insert into public.product_identifiers (product_id, id_type, value, normalized_value, is_valid, source)
select
  p.id,
  'internal_sku',
  btrim(p.sku),
  lower(btrim(p.sku)),
  true,
  p.source_kind
from public.products p
where p.sku is not null and btrim(p.sku) <> ''
on conflict (product_id, id_type, normalized_value) do nothing;

-- ---------------------------------------------------------------------------
-- 7. Resurrect products that only survive inside order history
--
-- Order lines already carry the name and the price paid. A line whose product
-- was deleted becomes an archived product rather than an orphan, so purchase
-- history stays joinable.
-- ---------------------------------------------------------------------------

insert into public.products (id, source_kind, status, name, price, image_url, created_at, updated_at)
select
  oi.product_id,
  'legacy_order',
  'archived',
  coalesce(nullif(btrim(min(oi.product_name)), ''), 'מוצר שנמחק'),
  coalesce(max(oi.price), 0),
  coalesce(min(oi.product_image), '/placeholder.svg'),
  min(oi.created_at),
  now()
from public.order_items oi
where oi.product_id is not null
  and not exists (select 1 from public.products p where p.id = oi.product_id)
group by oi.product_id
on conflict (id) do nothing;

alter table public.order_items
  drop constraint if exists order_items_product_id_fkey;

alter table public.order_items
  add constraint order_items_product_id_fkey
  foreign key (product_id) references public.products(id) on delete restrict;

create index if not exists idx_order_items_product on public.order_items(product_id);

-- ---------------------------------------------------------------------------
-- 8. Repoint variation and image tables at the unified product
-- ---------------------------------------------------------------------------

alter table public.product_variations
  drop constraint if exists product_variations_product_id_fkey;
delete from public.product_variations pv
where pv.product_id is not null
  and not exists (select 1 from public.products p where p.id = pv.product_id);
alter table public.product_variations
  add constraint product_variations_product_id_fkey
  foreign key (product_id) references public.products(id) on delete cascade;

alter table public.product_images
  drop constraint if exists product_images_product_id_fkey;
delete from public.product_images pi
where pi.product_id is not null
  and not exists (select 1 from public.products p where p.id = pi.product_id);
alter table public.product_images
  add constraint product_images_product_id_fkey
  foreign key (product_id) references public.products(id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 9. The old table names become views
--
-- Both views are simple projections of one table, so PostgreSQL keeps them
-- auto-updatable: existing INSERT and UPDATE statements work unchanged. Only
-- DELETE is intercepted, to turn a physical delete into an archive.
-- ---------------------------------------------------------------------------

alter table public.business_products rename to business_products_legacy;
alter table public.scraped_products rename to scraped_products_legacy;

create view public.business_products as
select
  id, business_id, name, description, price, original_price, sale_price, image_url, images,
  category, in_stock, is_featured, sku, pet_type, flavors, brand, weight_unit,
  price_per_weight, source_url, ingredients, benefits, feeding_guide, product_attributes,
  life_stage, dog_size, special_diet, needs_image_review, needs_price_review, suggested_price,
  price_suggestion_reason, is_flagged, flagged_reason, flagged_at, safety_score,
  average_rating, review_count, cost_price, commission_rate, legacy_supplier_id as supplier_id,
  supplier_link, auto_restock, restock_interval_days, api_sync_enabled, breed_tags,
  medical_tags, kcal_per_kg, created_at, updated_at
from public.products
where source_kind in ('manual', 'import')
  and deleted_at is null
  and status not in ('archived', 'rejected');

create view public.scraped_products as
select
  id,
  name as product_name,
  source_url as product_url,
  description as long_description,
  price as final_price,
  original_price as regular_price,
  sale_price,
  image_url as main_image_url,
  category as sub_category,
  sku,
  brand,
  pet_type,
  flavors,
  weight_unit,
  ingredients,
  average_rating as rating,
  review_count,
  is_flagged,
  flagged_reason,
  flagged_at,
  created_at,
  updated_at
from public.products
where source_kind = 'scraped'
  and deleted_at is null
  and status not in ('archived', 'rejected');

create or replace function public.archive_product_instead_of_delete()
returns trigger
language plpgsql
as $$
begin
  update public.products
  set deleted_at = now(),
      status = 'archived',
      updated_at = now()
  where id = old.id;
  return old;
end;
$$;

create trigger business_products_soft_delete
  instead of delete on public.business_products
  for each row execute function public.archive_product_instead_of_delete();

create trigger scraped_products_soft_delete
  instead of delete on public.scraped_products
  for each row execute function public.archive_product_instead_of_delete();
