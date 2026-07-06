create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'business_type') then
    create type public.business_type as enum ('vet', 'trainer', 'groomer', 'shop', 'pet_sitter', 'other');
  end if;

  if not exists (select 1 from pg_type where typname = 'pet_type') then
    create type public.pet_type as enum ('dog', 'cat', 'other', 'all');
  end if;

  if not exists (select 1 from pg_type where typname = 'stock_status') then
    create type public.stock_status as enum ('in_stock', 'out_of_stock', 'limited', 'unknown');
  end if;
end $$;

create table if not exists public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  business_name text not null,
  business_type public.business_type not null,
  description text,
  phone text,
  email text,
  website text,
  address text,
  city text,
  logo_url text,
  cover_image_url text,
  working_hours jsonb default '{}'::jsonb,
  services text[] default '{}',
  price_range text,
  is_verified boolean default false,
  is_featured boolean default false,
  rating numeric(2,1) default 0,
  total_reviews integer default 0,
  view_count integer default 0,
  verification_requested_at timestamptz,
  verification_notes text,
  verified_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null,
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
  supplier_id uuid,
  supplier_link text,
  auto_restock boolean default false,
  restock_interval_days integer,
  api_sync_enabled boolean default false,
  breed_tags text[],
  medical_tags text[],
  kcal_per_kg numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scraped_products (
  id uuid primary key default gen_random_uuid(),
  product_name text not null,
  product_url text not null,
  canonical_url text,
  short_description text,
  long_description text,
  long_description_html text,
  final_price numeric,
  regular_price numeric,
  sale_price numeric,
  currency text,
  main_image_url text,
  main_category text,
  sub_category text,
  category_path text,
  sku text,
  brand text,
  pet_type text,
  stock_status public.stock_status,
  stock_badge text,
  weight text,
  weight_unit text,
  flavors text[],
  sizes text[],
  colors text[],
  badges text[],
  bullet_points text[],
  ingredients text,
  usage_instructions text,
  warnings text,
  shipping_info text,
  return_info text,
  rating numeric,
  review_count integer,
  sample_review text,
  meta_title text,
  meta_description text,
  h1_title text,
  discount_text text,
  nutrition_info jsonb,
  technical_details jsonb,
  data_attributes jsonb,
  json_ld_data jsonb,
  variants jsonb,
  product_id uuid,
  is_flagged boolean default false,
  flagged_reason text,
  flagged_at timestamptz,
  scraped_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  content_id text,
  reason text not null,
  description text,
  reporter_id uuid,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  action_type text not null,
  entity_type text,
  entity_id text,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);

insert into public.business_profiles (
  id,
  business_name,
  business_type,
  description,
  email,
  website,
  city,
  is_verified,
  is_featured
) values (
  'cf941cc4-e1d1-4d7c-8122-a5df81a1e53c',
  'Mipo Shop',
  'shop',
  'Default Mipo shop business profile for product catalog management.',
  'shop@mipo.pet',
  'https://mipo.pet',
  'Israel',
  true,
  true
) on conflict (id) do nothing;

create index if not exists idx_business_profiles_type on public.business_profiles(business_type);
create index if not exists idx_business_profiles_city on public.business_profiles(city);
create index if not exists idx_business_products_business on public.business_products(business_id);
create index if not exists idx_business_products_category on public.business_products(category);
create index if not exists idx_business_products_sku on public.business_products(sku);
create index if not exists idx_business_products_pet_type on public.business_products(pet_type);
create index if not exists idx_scraped_products_category on public.scraped_products(main_category, sub_category);
create index if not exists idx_scraped_products_price on public.scraped_products(final_price);
create index if not exists idx_scraped_products_stock on public.scraped_products(stock_status);
