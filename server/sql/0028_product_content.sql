-- Written content, versioned.
--
-- A supplier file gives a product a terse internal name — "קוואטרו חתול סניור
-- ללא דגן דג לבן וקריל 7 ק"ג" — and nothing else. What a shopper reads has to
-- be written, and once something writes it the question "what did it say
-- before, and where did that come from" has to have an answer.
--
-- Content is never overwritten. A new version is added and the old one stays,
-- which is what makes regenerating safe to do.

create table if not exists public.product_content (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,

  version integer not null,
  -- Only one version is live. The rest are history.
  is_current boolean not null default false,

  title text,
  short_description text,
  long_description text,
  key_benefits jsonb not null default '[]'::jsonb,
  specifications jsonb not null default '{}'::jsonb,
  usage_instructions text,

  -- Hash of the source values the text was written from. If the source moves,
  -- the content is stale and can say so instead of quietly drifting out of date.
  source_hash text,
  -- The facts the generator was given, kept so a claim in the text can be
  -- traced back to where it came from.
  source_facts jsonb not null default '{}'::jsonb,

  generator text not null default 'ai' check (generator in ('ai', 'admin', 'supplier', 'import')),
  model text,
  reason text,

  status text not null default 'draft'
    check (status in ('draft', 'review', 'approved', 'rejected')),

  -- Which of the mandatory checks passed, and which did not.
  quality_checks jsonb not null default '{}'::jsonb,

  created_by_admin_user_id uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_product_content_version
  on public.product_content(product_id, version);

-- One live version per product, enforced rather than assumed.
create unique index if not exists idx_product_content_current
  on public.product_content(product_id)
  where is_current;

create index if not exists idx_product_content_status
  on public.product_content(status)
  where status in ('draft', 'review');

create table if not exists public.product_seo (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  content_id uuid references public.product_content(id) on delete set null,

  version integer not null,
  is_current boolean not null default false,

  seo_title text,
  meta_description text,
  h1 text,
  slug text,
  image_alt text,
  keywords text[] not null default '{}',

  generator text not null default 'ai' check (generator in ('ai', 'admin')),
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_product_seo_version
  on public.product_seo(product_id, version);
create unique index if not exists idx_product_seo_current
  on public.product_seo(product_id)
  where is_current;

-- A slug is an address. Two products cannot share one, and a collision has to
-- fail loudly rather than quietly send shoppers to the wrong page.
create unique index if not exists idx_product_seo_slug
  on public.product_seo(slug)
  where slug is not null and is_current;

-- Publishing needs content that passed its checks. Recorded on the product so
-- the gate is one column rather than a join every time.
alter table public.products
  add column if not exists content_status text not null default 'missing'
    check (content_status in ('missing', 'draft', 'review', 'approved'));

create index if not exists idx_products_content_status
  on public.products(content_status)
  where content_status <> 'approved';
