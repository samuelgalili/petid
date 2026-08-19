-- The event bus.
--
-- 0019 built the events table as two things at once: the behavioural record, and
-- an outbox waiting for a consumer. This is the consumer.
--
-- Two decisions shape the schema.
--
-- First, delivery is a row of its own rather than a column on the event. The
-- outbox columns on `events` assumed a single destination, which is true today
-- and stops being true the first time a second n8n workflow wants
-- `order.placed`. A per-destination row means one workflow being down cannot
-- hold up another, and a failure is retried where it happened.
--
-- Second, fan-out and delivery are separate steps. Deciding who wants an event
-- is a database write and cannot half-fail; sending it over the network can and
-- will. Keeping them apart is what stops a timeout from re-running the fan-out
-- and delivering the same event twice.

-- ---------------------------------------------------------------------------
-- 1. Who is listening
-- ---------------------------------------------------------------------------

create table if not exists public.event_subscriptions (
  id uuid primary key default gen_random_uuid(),
  name text not null,

  -- An n8n Webhook node URL, in practice. Validated against the SSRF rules in
  -- urlSafety.js before it is ever stored, because an admin-supplied URL that
  -- the server then fetches is exactly the shape of a request forgery.
  target_url text not null,

  -- Exact names (`order.placed`), one-level wildcards (`order.*`), or `*` for
  -- everything. Empty means the subscription is listening to nothing, which is
  -- a safer default than accidentally firehosing every page view at a workflow.
  event_types text[] not null default '{}',

  -- Signing key, held in plaintext because signing requires it. It is never
  -- returned by the admin API — only whether one is set.
  secret text,

  -- Static headers the receiver needs, e.g. an n8n header-auth credential.
  headers jsonb not null default '{}'::jsonb,

  is_active boolean not null default true,
  max_attempts integer not null default 8 check (max_attempts between 1 and 20),
  timeout_ms integer not null default 15000 check (timeout_ms between 1000 and 60000),

  -- Health, so a workflow that quietly stopped accepting events is visible
  -- without reading the delivery table.
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error text,

  created_by_admin_user_id uuid references public.admin_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_event_subscriptions_active
  on public.event_subscriptions(created_at)
  where is_active;

-- Pattern matching lives in the database because the fan-out is a single
-- insert...select and must not become a row-by-row round trip.
create or replace function public.event_matches_patterns(
  p_event_type text,
  p_patterns text[]
) returns boolean
language sql
immutable
as $$
  select exists (
    select 1
    from unnest(coalesce(p_patterns, '{}'::text[])) as pattern
    where pattern = '*'
       or pattern = p_event_type
       or (pattern like '%.*'
           and p_event_type like (left(pattern, length(pattern) - 1) || '%'))
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. One attempt at one destination
-- ---------------------------------------------------------------------------

create table if not exists public.event_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  subscription_id uuid not null references public.event_subscriptions(id) on delete cascade,

  status text not null default 'pending'
    check (status in ('pending', 'delivering', 'delivered', 'dead')),

  attempts integer not null default 0,
  run_after timestamptz not null default now(),

  response_status integer,
  last_error text,
  delivered_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The delivery id is what goes out as the idempotency key, so a receiver that
-- sees a retry can recognise it. One row per event per destination is what makes
-- that key stable.
create unique index if not exists idx_event_deliveries_unique
  on public.event_deliveries(event_id, subscription_id);

-- The worker's only query. Partial, so it stays small however large the table
-- grows.
create index if not exists idx_event_deliveries_due
  on public.event_deliveries(run_after)
  where status = 'pending';

create index if not exists idx_event_deliveries_subscription
  on public.event_deliveries(subscription_id, created_at desc);

create index if not exists idx_event_deliveries_dead
  on public.event_deliveries(created_at desc)
  where status = 'dead';

-- ---------------------------------------------------------------------------
-- 3. Fan-out state on the event
--
-- `dispatched_at` answers "has this event been offered to the subscriptions
-- that exist", which is not the same question as "has it arrived". The existing
-- `delivered_at` keeps its meaning: nothing is left to send.
-- ---------------------------------------------------------------------------

alter table public.events
  add column if not exists dispatched_at timestamptz;

create index if not exists idx_events_pending_dispatch
  on public.events(occurred_at)
  where dispatched_at is null;

-- Events already in the table predate any subscription. Marking them dispatched
-- is deliberate: switching the bus on should not replay months of history into a
-- workflow that has no idea what to do with it. Replay is an explicit action.
update public.events
set dispatched_at = now(), delivered_at = coalesce(delivered_at, now())
where dispatched_at is null;

-- ---------------------------------------------------------------------------
-- 4. Claiming
--
-- Same `for update skip locked` hand-off as the job queue, for the same reason:
-- a second API process must not be able to send the same event twice.
-- ---------------------------------------------------------------------------

create or replace function public.claim_next_delivery()
returns table (
  delivery_id uuid,
  attempts integer,
  event_id uuid,
  subscription_id uuid,
  target_url text,
  secret text,
  headers jsonb,
  timeout_ms integer,
  max_attempts integer,
  event_type text,
  occurred_at timestamptz,
  entity_type text,
  entity_id uuid,
  actor_customer_id uuid,
  actor_admin_user_id uuid,
  session_id text,
  source text,
  payload jsonb,
  idempotency_key text
)
language plpgsql
as $$
declare
  claimed public.event_deliveries;
begin
  select d.* into claimed
  from public.event_deliveries d
  join public.event_subscriptions s on s.id = d.subscription_id
  where d.status = 'pending'
    and d.run_after <= now()
    and s.is_active
  order by d.run_after
  for update of d skip locked
  limit 1;

  if claimed.id is null then
    return;
  end if;

  -- The increment reads from the claimed row rather than the column, because
  -- `attempts` on its own would resolve to this function's OUT parameter.
  update public.event_deliveries
  set status = 'delivering', attempts = claimed.attempts + 1, updated_at = now()
  where id = claimed.id;

  return query
  select claimed.id, claimed.attempts + 1,
         e.id, s.id, s.target_url, s.secret, s.headers, s.timeout_ms, s.max_attempts,
         e.event_type, e.occurred_at, e.entity_type, e.entity_id,
         e.actor_customer_id, e.actor_admin_user_id, e.session_id, e.source,
         e.payload, e.idempotency_key
  from public.events e
  join public.event_subscriptions s on s.id = claimed.subscription_id
  where e.id = claimed.event_id;
end;
$$;
