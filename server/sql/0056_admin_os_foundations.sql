-- 0056_admin_os_foundations.sql
-- Two things every Admin OS phase needs, and neither exists today.
--
-- 1. IDEMPOTENCY. Nothing in MIPO deduplicates a retry. Not the payment path,
--    not the order path, not anything. Today that is survivable because an
--    admin cannot create an order or record a payment at all - there is no
--    endpoint. Phase 3 adds both, and at that point a retried request is a
--    second charge against a real person.
--
--    This ships BEFORE the endpoints that need it, on purpose. Retrofitting
--    deduplication after money has moved is not a code change, it is a
--    reconciliation project over financial history: somebody has to decide,
--    per pair of rows, which one was the duplicate.
--
-- 2. WHO ACTED. admin_audit_log records actor_email and actor_role, which is
--    enough while every actor is a person. The brief's §44 asks for admin,
--    system, workflow and AI-agent actors, and an AI agent with a service
--    account email is indistinguishable from a human with the same address.
--    A reader cannot tell "the operations lead refunded this" from "an agent
--    refunded this", and those are different sentences.

-- ─── idempotency ─────────────────────────────────────────────────────────────

create table if not exists public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),

  -- The endpoint, not just the key. A client that reuses one key across two
  -- endpoints would otherwise be handed a payment's stored response when it
  -- asked to send a message. Scoping makes that a miss rather than a lie.
  scope text not null,
  idempotency_key text not null,

  -- WHAT was asked, hashed. This is the property that makes the table safe
  -- rather than merely quiet: same key + DIFFERENT body is a caller bug, and
  -- returning the first response to it would silently discard the second
  -- request. It must be a 409, which requires remembering the first request.
  request_fingerprint text not null,

  actor_admin_user_id uuid references public.admin_users(id) on delete set null,

  -- Claimed before the work runs, completed after. Two concurrent requests
  -- carrying one key cannot both proceed: the second sees in_progress.
  status text not null default 'in_progress',

  response_status integer,
  response_body jsonb,

  created_at timestamptz not null default now(),
  completed_at timestamptz,

  -- A key is a retry window, not a permanent record. The audit log is the
  -- permanent record.
  expires_at timestamptz not null default (now() + interval '24 hours'),

  constraint idempotency_keys_status_check
    check (status in ('in_progress', 'completed')),

  -- A completed row must carry what it completed with, or a replay returns
  -- nothing and the caller retries for real.
  constraint idempotency_keys_completed_has_response
    check (status <> 'completed' or response_status is not null),

  -- THE constraint. Everything else is bookkeeping around this one.
  constraint idempotency_keys_scope_key_unique unique (scope, idempotency_key)
);

create index if not exists idempotency_keys_expires_at_idx
  on public.idempotency_keys (expires_at);

comment on table public.idempotency_keys is
  'Retry deduplication for admin endpoints with external or financial effects. '
  'Claim-before-work: the row is inserted with status in_progress before the '
  'handler runs, so concurrent duplicates collide on the unique constraint '
  'rather than both executing.';

-- ─── who acted ───────────────────────────────────────────────────────────────

alter table public.admin_audit_log
  add column if not exists actor_type text not null default 'admin';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'admin_audit_log_actor_type_check'
  ) then
    alter table public.admin_audit_log
      add constraint admin_audit_log_actor_type_check
      check (actor_type in ('admin', 'system', 'workflow', 'ai_agent'));
  end if;
end
$$;

-- The default backfills every existing row to 'admin', which is true: every
-- row in this table today was written by a person's session. There is no
-- guessing here and nothing to reclassify later.

create index if not exists admin_audit_log_actor_type_created_at_idx
  on public.admin_audit_log (actor_type, created_at desc);

-- The Audit Log screen's other two filters. Reading this table unindexed is
-- fine at today's row count and will not stay fine once system actors write
-- to it on every workflow reaction.
create index if not exists admin_audit_log_entity_idx
  on public.admin_audit_log (entity_type, entity_id, created_at desc);

comment on column public.admin_audit_log.actor_type is
  'admin | system | workflow | ai_agent. An AI agent acting under a service '
  'account is otherwise indistinguishable from a person with the same email.';
