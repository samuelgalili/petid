-- Product categories: replace the free-text `category` column with a real tree.
--
-- Today the shop filter bar is a hardcoded array in src/pages/Shop.tsx and the
-- filter itself is a substring match against business_products.category. That
-- produces two visible defects: categories that exist in the data are missing
-- from the bar (בריאות has products and no button), and buttons in the bar have
-- no products behind them (טיפוח). This migration introduces the tree, an alias
-- table so free-text imports keep resolving, and a nullable category_id on both
-- product tables. The old `category` column is deliberately kept as an import
-- hint - scrapers keep writing it, the alias table maps it.

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.product_categories(id) on delete restrict,
  slug text not null unique,
  name_he text not null,
  name_en text,
  description text,
  icon text,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_categories_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint product_categories_not_self_parent check (parent_id is null or parent_id <> id)
);

create index if not exists idx_product_categories_parent on public.product_categories(parent_id);
create index if not exists idx_product_categories_active on public.product_categories(is_active, position);

-- A category name must be unique among its siblings, with a separate partial
-- index for the roots because `parent_id is null` never compares equal.
create unique index if not exists idx_product_categories_sibling_name
  on public.product_categories(parent_id, name_he)
  where parent_id is not null;
create unique index if not exists idx_product_categories_root_name
  on public.product_categories(name_he)
  where parent_id is null;

-- Free-text values seen in imports, mapped to a category. `alias` is stored
-- normalized (lower(btrim(...))) so lookups are a plain equality check instead
-- of the substring matching the shop does today.
create table if not exists public.product_category_aliases (
  alias text primary key,
  category_id uuid not null references public.product_categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint product_category_aliases_normalized check (alias = lower(btrim(alias)))
);

create index if not exists idx_product_category_aliases_category
  on public.product_category_aliases(category_id);

alter table public.business_products
  add column if not exists category_id uuid references public.product_categories(id) on delete set null;

alter table public.scraped_products
  add column if not exists category_id uuid references public.product_categories(id) on delete set null;

create index if not exists idx_business_products_category_id on public.business_products(category_id);
create index if not exists idx_scraped_products_category_id on public.scraped_products(category_id);

-- Seed the roots. Positions leave gaps so an admin can insert between them
-- without renumbering the whole bar.
insert into public.product_categories (slug, name_he, name_en, icon, position)
values
  ('food',        'מזון',    'Food',        '🍖', 10),
  ('treats',      'חטיפים',  'Treats',      '🦴', 20),
  ('health',      'בריאות',  'Health',      '💊', 30),
  ('grooming',    'טיפוח',   'Grooming',    '🧴', 40),
  ('toys',        'צעצועים', 'Toys',        '🎾', 50),
  ('beds',        'מיטות',   'Beds',        '🛏️', 60),
  ('accessories', 'אביזרים', 'Accessories', '🎀', 70),
  ('other',       'אחר',     'Other',       '📦', 900)
on conflict (slug) do nothing;

-- Aliases for the values that already exist in the catalogue plus the obvious
-- import variants. Anything not listed stays uncategorised rather than being
-- guessed at.
insert into public.product_category_aliases (alias, category_id)
select alias, c.id
from (values
  ('מזון',          'food'),
  ('אוכל',          'food'),
  ('מזון יבש',      'food'),
  ('מזון רטוב',     'food'),
  ('food',          'food'),
  ('dry food',      'food'),
  ('wet food',      'food'),
  ('חטיפים',        'treats'),
  ('חטיף',          'treats'),
  ('פינוקים',       'treats'),
  ('treats',        'treats'),
  ('בריאות',        'health'),
  ('תוספי תזונה',   'health'),
  ('תרופות',        'health'),
  ('health',        'health'),
  ('supplements',   'health'),
  ('טיפוח',         'grooming'),
  ('היגיינה',       'grooming'),
  ('grooming',      'grooming'),
  ('צעצועים',       'toys'),
  ('צעצוע',         'toys'),
  ('toys',          'toys'),
  ('מיטות',         'beds'),
  ('מיטה',          'beds'),
  ('beds',          'beds'),
  ('אביזרים',       'accessories'),
  ('אביזר',         'accessories'),
  ('רתמות',         'accessories'),
  ('accessories',   'accessories'),
  ('אחר',           'other'),
  ('other',         'other')
) as seed(alias, slug)
join public.product_categories c on c.slug = seed.slug
on conflict (alias) do nothing;

-- Backfill from the free-text column. Products whose category is empty or
-- unrecognised are left with category_id null on purpose: the admin screen can
-- then show "ללא קטגוריה" as a real work queue instead of silently filing them
-- under אחר.
update public.business_products p
set category_id = a.category_id
from public.product_category_aliases a
where p.category_id is null
  and p.category is not null
  and lower(btrim(p.category)) = a.alias;

update public.scraped_products p
set category_id = a.category_id
from public.product_category_aliases a
where p.category_id is null
  and coalesce(nullif(btrim(p.sub_category), ''), p.main_category) is not null
  and lower(btrim(coalesce(nullif(btrim(p.sub_category), ''), p.main_category))) = a.alias;
