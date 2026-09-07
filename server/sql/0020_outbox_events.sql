-- 0020_outbox_events.sql
-- The transactional outbox: MIPO's first outbound event mechanism.
--
-- Until now nothing in MIPO told any external system that anything had
-- happened. Every integration would have had to poll, and polling reads state
-- rather than transitions — an order that goes pending → paid → cancelled
-- between two polls shows up only as cancelled, and the payment is lost.
--
-- An event row is written in the SAME transaction as the business change it
-- describes. That is the whole point of the pattern: the event cannot exist
-- for a change that rolled back, and a committed change cannot silently fail
-- to produce its event. Delivery happens afterwards, separately, with retries.

create table if not exists public.outbox_events (
  id           uuid primary key default gen_random_uuid(),

  -- What happened. Dotted, past tense: 'order.paid', 'user.registered'.
  event_type   text not null,
  entity_type  text not null,
  entity_id    uuid,

  payload      jsonb not null default '{}'::jsonb,

  -- Who caused it. Events with origin 'automation' came from a caller that
  -- identified itself as an automation platform, and are not delivered back to
  -- it — this is what stops a workflow re-triggering itself forever.
  origin       text not null default 'app',

  occurred_at  timestamptz not null default now(),

  -- Delivery state.
  status          text not null default 'pending',
  attempts        integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  delivered_at    timestamptz,
  last_error      text,

  created_at   timestamptz not null default now(),

  constraint outbox_events_type_check
    check (event_type ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'),
  constraint outbox_events_entity_type_check
    check (entity_type ~ '^[a-z][a-z0-9_]{1,39}$'),
  constraint outbox_events_origin_check
    check (origin in ('app', 'admin', 'automation', 'system')),
  constraint outbox_events_status_check
    check (status in ('pending', 'delivering', 'delivered', 'failed', 'skipped')),
  constraint outbox_events_attempts_check
    check (attempts >= 0)
);

-- The dispatcher's pickup query. Partial, so it stays small no matter how many
-- delivered rows accumulate.
create index if not exists idx_outbox_pending
  on public.outbox_events (next_attempt_at, occurred_at)
  where status in ('pending', 'delivering');

-- "What happened to this order?" — the support and debugging path.
create index if not exists idx_outbox_entity
  on public.outbox_events (entity_type, entity_id, occurred_at desc);

create index if not exists idx_outbox_type
  on public.outbox_events (event_type, occurred_at desc);

-- Retention: delivered events are kept for replay and audit, then swept.
create index if not exists idx_outbox_delivered_at
  on public.outbox_events (delivered_at)
  where status = 'delivered';

comment on table public.outbox_events is
  'Transactional outbox. Rows are written inside the transaction that made the '
  'change they describe, then delivered asynchronously with retry and backoff. '
  'origin=automation marks events caused by an automation platform so they are '
  'not delivered back to it.';
