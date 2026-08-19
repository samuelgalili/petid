-- Pricing.
--
-- More than half this catalogue arrives with a zero in the selling price column
-- while carrying a real cost, so a price has to be worked out rather than
-- copied. But the decision taken here is that nothing prices itself: the engine
-- proposes, a person applies. A number that reaches the shop without anyone
-- looking at it is the one mistake that costs money on every sale.
--
-- The formula is configuration, not code. "Cheapest" and "most expensive" are
-- both the wrong target, and where between them a category sits is a business
-- question that changes without a deployment.

create table if not exists public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,

  -- Narrower scopes win. A rule for one brand beats a rule for its category,
  -- which beats the catalogue-wide default.
  scope text not null default 'global'
    check (scope in ('global', 'category', 'brand', 'supplier', 'product')),
  category_id uuid references public.categories(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,

  strategy text not null default 'cost_plus_margin' check (strategy in (
    'cost_plus_margin',      -- cost, plus a margin
    'market_median',         -- the middle of what competitors charge
    'market_percentile',     -- a chosen position among competitors
    'keystone',              -- a multiple of cost
    'manual'                 -- no automatic proposal at all
  )),

  margin_percent numeric(6,2),
  markup_multiplier numeric(6,3),
  market_percentile integer check (market_percentile between 0 and 100),

  -- Guard rails. A proposal outside them is still produced, and marked, so a
  -- rule that is quietly wrong shows up rather than silently capping.
  min_margin_percent numeric(6,2),
  max_margin_percent numeric(6,2),

  -- 17% VAT in Israel. Held per rule because it changes by law, not by code.
  vat_percent numeric(5,2) not null default 17,
  price_includes_vat boolean not null default true,

  -- Prices ending in .90 read as considered rather than computed.
  rounding text not null default 'none'
    check (rounding in ('none', 'nearest_shekel', 'ends_90', 'ends_99')),

  priority integer not null default 100,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pricing_rules_scope
  on public.pricing_rules(scope, priority)
  where is_active;
create index if not exists idx_pricing_rules_category on public.pricing_rules(category_id) where category_id is not null;
create index if not exists idx_pricing_rules_brand on public.pricing_rules(brand_id) where brand_id is not null;

-- A scope has to name what it scopes to.
alter table public.pricing_rules
  drop constraint if exists pricing_rules_scope_target_check;
alter table public.pricing_rules
  add constraint pricing_rules_scope_target_check check (
    (scope = 'global')
    or (scope = 'category' and category_id is not null)
    or (scope = 'brand' and brand_id is not null)
    or (scope = 'supplier' and supplier_id is not null)
    or (scope = 'product' and product_id is not null)
  );

-- What suppliers charge us, over time. Kept separately from the shop price so
-- an import can refresh cost freely without touching what a shopper pays.
create table if not exists public.supplier_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  import_id uuid references public.imports(id) on delete set null,

  cost numeric(12,4),
  list_price numeric(12,4),
  currency text not null default 'ILS',

  effective_from timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_supplier_prices_product
  on public.supplier_prices(product_id, effective_from desc);

-- What other shops charge. Every observation says where it came from and when,
-- because a competitor price with no date is not evidence of anything.
create table if not exists public.market_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,

  source text not null,
  competitor text,
  url text,
  price numeric(12,4) not null,
  currency text not null default 'ILS',
  availability text,

  -- How sure we are this observation is the same product. An uncertain match
  -- is kept and discounted rather than trusted or thrown away.
  match_confidence integer check (match_confidence between 0 and 100),

  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_market_prices_product
  on public.market_prices(product_id, captured_at desc);

-- A proposal, waiting for a person. This is the table that keeps the promise
-- that nothing prices itself.
create table if not exists public.price_proposals (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  rule_id uuid references public.pricing_rules(id) on delete set null,

  current_price numeric(12,2),
  proposed_price numeric(12,2) not null,
  cost numeric(12,4),

  -- Every input and step, so a person can see how the number was reached
  -- rather than being asked to trust it.
  calculation jsonb not null default '{}'::jsonb,
  margin_percent numeric(6,2),

  -- Set when the proposal fell outside the rule's own guard rails.
  warnings jsonb not null default '[]'::jsonb,

  status text not null default 'pending'
    check (status in ('pending', 'applied', 'rejected', 'superseded')),

  decided_by_admin_user_id uuid references public.admin_users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_price_proposals_pending
  on public.price_proposals(created_at)
  where status = 'pending';
create index if not exists idx_price_proposals_product
  on public.price_proposals(product_id, created_at desc);

-- One open proposal per product. A second run supersedes the first rather than
-- leaving two different answers waiting for the same decision.
create unique index if not exists idx_price_proposals_one_pending
  on public.price_proposals(product_id)
  where status = 'pending';

-- The catalogue-wide default.
--
-- 70% is not a guess. The products in this catalogue that already carry a price
-- sit at a median margin of 70.8%, so this matches what the business does
-- rather than imposing a number on it. An earlier draft used 45%, which would
-- have proposed cutting 120 of 123 priced products by an average of 43% — a
-- default that runs and is wrong is worse than no default at all.
--
-- It is a row rather than a constant precisely so it can be argued with.
insert into public.pricing_rules (name, scope, strategy, margin_percent, min_margin_percent, max_margin_percent, rounding, priority)
select 'ברירת מחדל — מרווח 70%', 'global', 'cost_plus_margin', 70, 35, 120, 'ends_90', 1000
where not exists (select 1 from public.pricing_rules where scope = 'global');
