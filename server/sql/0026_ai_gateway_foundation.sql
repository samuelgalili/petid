-- AI Gateway foundation: provider/model catalogue, versioned pricing, and the
-- append-only usage and cost ledgers.
--
-- Today every AI call goes straight to Gemini from the feature that needs it,
-- and the usageMetadata the provider returns is discarded. There is no way to
-- answer "what did AI cost us last month, and which feature spent it". These
-- tables are the record; server/src/aiGateway.js is the single write path.
--
-- Three quantities are deliberately kept apart and must never be conflated:
--   * technical tokens   - what the provider reports
--   * mipo credits       - a product abstraction, configurable per model
--   * provider cost      - money, derived from a pinned pricing version
--
-- organization_id is added nullable on the ledgers only. Threading an
-- organization through users and pets is a separate decision and is not made
-- here; carrying the column now means the ledgers do not need a rewrite later.

create table if not exists public.ai_providers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_providers_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table if not exists public.ai_models (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.ai_providers(id) on delete restrict,
  slug text not null,
  provider_model_name text not null,
  display_name text,
  -- Capabilities a feature can ask for instead of naming a model.
  capabilities text[] not null default '{}',
  -- How many Mipo credits 1000 technical tokens costs. Configurable per model
  -- so the product abstraction can move without touching token accounting.
  credits_per_1k_tokens numeric(12, 4) not null default 4,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_models_slug_unique unique (slug),
  constraint ai_models_credits_non_negative check (credits_per_1k_tokens >= 0)
);

create index if not exists idx_ai_models_provider on public.ai_models(provider_id);
create index if not exists idx_ai_models_capabilities on public.ai_models using gin (capabilities);

-- Provider prices change. A cost event pins the version it was priced with so
-- historical numbers stay reproducible after a price change.
create table if not exists public.ai_pricing_versions (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.ai_models(id) on delete cascade,
  currency text not null default 'USD',
  input_price_per_1m numeric(14, 6),
  output_price_per_1m numeric(14, 6),
  cached_input_price_per_1m numeric(14, 6),
  -- For models billed per unit rather than per token (image generation).
  unit_price numeric(14, 6),
  unit text,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  source text,
  created_at timestamptz not null default now(),
  constraint ai_pricing_versions_window check (effective_to is null or effective_to > effective_from)
);

create index if not exists idx_ai_pricing_versions_lookup
  on public.ai_pricing_versions(model_id, effective_from desc);

-- Only one open-ended price per model, so "the price right now" is unambiguous.
create unique index if not exists idx_ai_pricing_versions_one_current
  on public.ai_pricing_versions(model_id)
  where effective_to is null;

create table if not exists public.ai_features (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint ai_features_slug_format check (slug ~ '^[a-z0-9]+(_[a-z0-9]+)*$')
);

-- Execution metadata only. Prompts and responses are NOT stored here - the
-- conversation content stays wherever the feature already keeps it.
create table if not exists public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  -- Caller-supplied and unique: this is what makes a retry safe.
  request_id text not null unique,
  trace_id text not null,

  user_id uuid references public.app_users(id) on delete set null,
  organization_id uuid,
  pet_id uuid,

  feature_id uuid references public.ai_features(id) on delete set null,
  provider_id uuid references public.ai_providers(id) on delete set null,
  model_id uuid references public.ai_models(id) on delete set null,

  status text not null default 'pending',

  attempt integer not null default 1,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  latency_ms integer,

  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cached_tokens integer not null default 0,
  total_tokens integer not null default 0,

  error_code text,
  -- Sanitised at the gateway. Raw provider payloads can carry prompt content.
  safe_error_message text,

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ai_requests_status check (
    status in ('pending', 'running', 'succeeded', 'failed', 'fallback', 'cancelled', 'timed_out')
  ),
  constraint ai_requests_tokens_non_negative check (
    input_tokens >= 0 and output_tokens >= 0 and cached_tokens >= 0 and total_tokens >= 0
  )
);

create index if not exists idx_ai_requests_trace on public.ai_requests(trace_id);
create index if not exists idx_ai_requests_user_time on public.ai_requests(user_id, created_at desc);
create index if not exists idx_ai_requests_feature_time on public.ai_requests(feature_id, created_at desc);
create index if not exists idx_ai_requests_status_time on public.ai_requests(status, created_at desc);

-- Deliberately not AI-only: category plus quantity/unit lets WhatsApp messages,
-- OCR pages, storage GB and voice seconds land in the same ledger later.
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  -- One usage event per AI request. This constraint is the idempotency.
  ai_request_id uuid unique references public.ai_requests(id) on delete cascade,
  trace_id text,

  user_id uuid references public.app_users(id) on delete set null,
  organization_id uuid,
  pet_id uuid,

  feature_id uuid references public.ai_features(id) on delete set null,
  category text not null,
  provider_id uuid references public.ai_providers(id) on delete set null,
  model_id uuid references public.ai_models(id) on delete set null,

  quantity numeric(18, 6) not null,
  unit text not null,

  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cached_tokens integer not null default 0,
  total_tokens integer not null default 0,

  mipo_credits_consumed numeric(14, 4) not null default 0,

  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint usage_events_category check (
    category in ('ai', 'whatsapp', 'sms', 'email', 'ocr', 'storage', 'voice', 'image', 'search', 'maps', 'other')
  ),
  constraint usage_events_quantity_non_negative check (quantity >= 0),
  constraint usage_events_credits_non_negative check (mipo_credits_consumed >= 0)
);

create index if not exists idx_usage_events_user_time on public.usage_events(user_id, occurred_at desc);
create index if not exists idx_usage_events_org_time on public.usage_events(organization_id, occurred_at desc);
create index if not exists idx_usage_events_feature_time on public.usage_events(feature_id, occurred_at desc);
create index if not exists idx_usage_events_provider_time on public.usage_events(provider_id, occurred_at desc);
create index if not exists idx_usage_events_model_time on public.usage_events(model_id, occurred_at desc);
create index if not exists idx_usage_events_category_time on public.usage_events(category, occurred_at desc);
create index if not exists idx_usage_events_trace on public.usage_events(trace_id);

-- The financial record for variable external spend.
create table if not exists public.cost_events (
  id uuid primary key default gen_random_uuid(),
  -- One cost event per usage event, enforced rather than assumed.
  usage_event_id uuid not null unique references public.usage_events(id) on delete cascade,

  user_id uuid references public.app_users(id) on delete set null,
  organization_id uuid,
  pet_id uuid,

  feature_id uuid references public.ai_features(id) on delete set null,
  provider_id uuid references public.ai_providers(id) on delete set null,
  model_id uuid references public.ai_models(id) on delete set null,
  service text not null default 'ai',

  pricing_version_id uuid references public.ai_pricing_versions(id) on delete set null,

  quantity numeric(18, 6) not null default 0,
  unit text,

  provider_cost numeric(18, 8) not null default 0,
  currency text not null default 'USD',

  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint cost_events_cost_non_negative check (provider_cost >= 0)
);

create index if not exists idx_cost_events_user_time on public.cost_events(user_id, occurred_at desc);
create index if not exists idx_cost_events_org_time on public.cost_events(organization_id, occurred_at desc);
create index if not exists idx_cost_events_provider_time on public.cost_events(provider_id, occurred_at desc);
create index if not exists idx_cost_events_model_time on public.cost_events(model_id, occurred_at desc);
create index if not exists idx_cost_events_feature_time on public.cost_events(feature_id, occurred_at desc);
create index if not exists idx_cost_events_pricing_version on public.cost_events(pricing_version_id);

-- Seed the catalogue with what actually runs today. Gemini only: OpenAI and
-- Anthropic are not integrated, and seeding providers with no credentials would
-- make the admin screens claim capacity that does not exist.
insert into public.ai_providers (slug, name)
values ('google-gemini', 'Google Gemini')
on conflict (slug) do nothing;

insert into public.ai_models (provider_id, slug, provider_model_name, display_name, capabilities, credits_per_1k_tokens)
select p.id, seed.slug, seed.provider_model_name, seed.display_name, seed.capabilities, seed.credits
from (values
  ('gemini-2.5-flash',       'gemini-2.5-flash',       'Gemini 2.5 Flash',       array['chat', 'reasoning', 'vision', 'structured_output', 'long_context'], 4::numeric),
  ('gemini-2.5-flash-image', 'gemini-2.5-flash-image', 'Gemini 2.5 Flash Image', array['image', 'vision'],                                                  0::numeric)
) as seed(slug, provider_model_name, display_name, capabilities, credits)
cross join (select id from public.ai_providers where slug = 'google-gemini') p
on conflict (slug) do nothing;

-- Published Gemini list prices at the time of writing. `source` records where
-- the number came from so a later correction is auditable rather than mystery.
insert into public.ai_pricing_versions (model_id, currency, input_price_per_1m, output_price_per_1m, cached_input_price_per_1m, source)
select m.id, 'USD', 0.30, 2.50, 0.075, 'google ai pricing page, 2026-09'
from public.ai_models m
where m.slug = 'gemini-2.5-flash'
  and not exists (select 1 from public.ai_pricing_versions v where v.model_id = m.id);

insert into public.ai_pricing_versions (model_id, currency, unit_price, unit, source)
select m.id, 'USD', 0.039, 'image', 'google ai pricing page, 2026-09'
from public.ai_models m
where m.slug = 'gemini-2.5-flash-image'
  and not exists (select 1 from public.ai_pricing_versions v where v.model_id = m.id);

insert into public.ai_features (slug, name, description)
values
  ('ai_chat',            'צ׳אט Mipo AI',          'The in-app assistant conversation'),
  ('health_analysis',    'ניתוח בריאות',          'Pet health summary and analysis'),
  ('document_analysis',  'ניתוח מסמכים',          'Uploaded document and test analysis'),
  ('pet_character',      'דמות החיה',             'Generated pet character artwork'),
  ('product_enrichment', 'העשרת מוצרים',          'Admin product enrichment'),
  ('product_list_scan',  'סריקת רשימת מוצרים',    'Bulk product extraction from a file or URL'),
  ('ingredient_analysis','ניתוח רכיבים',          'Product ingredient safety analysis'),
  ('agent_task',         'משימת סוכן',            'Multi-step agent run')
on conflict (slug) do nothing;
