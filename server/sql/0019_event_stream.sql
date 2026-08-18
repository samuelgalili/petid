-- The event stream.
--
-- Orders, products and customers can always be read back from their tables.
-- Behaviour cannot: a product view, a search that returned nothing, a cart
-- abandoned before checkout leave no trace anywhere in this schema today, and
-- there is no way to reconstruct them later. Whatever is not captured now is
-- gone.
--
-- One table serves two consumers. It is the behavioural record the catalogue
-- and recommendation work will read from, and it is the outbox that pushes
-- events to n8n once that is wired up. Both need the same row, so neither gets
-- its own half-copy.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),

  -- Dotted names, e.g. product.viewed, cart.item_added, order.placed.
  -- Deliberately not an enum: adding an event type should not need a migration,
  -- and the ingest endpoint keeps its own allowlist.
  event_type text not null,
  occurred_at timestamptz not null default now(),

  -- Who. A customer for shop behaviour, an admin for catalogue actions, both
  -- null for a system or import event.
  actor_customer_id uuid references public.customers(id) on delete set null,
  actor_admin_user_id uuid references public.admin_users(id) on delete set null,

  -- Stitches anonymous browsing to the person once they sign in or check out.
  -- Opaque and client-generated, so it is never trusted as identity.
  session_id text,

  -- What the event is about. Not a foreign key: an event must survive the
  -- deletion of the thing it describes, which is most of the point of keeping
  -- a log.
  entity_type text,
  entity_id uuid,

  source text not null default 'web'
    check (source in ('web', 'admin', 'api', 'import', 'system')),

  payload jsonb not null default '{}'::jsonb,

  -- Set by the client for retryable posts and by the import engine for
  -- replayable rows, so the same event cannot land twice.
  idempotency_key text,

  -- Outbox state for the n8n worker. Null delivered_at means still pending.
  delivered_at timestamptz,
  delivery_attempts integer not null default 0,
  last_delivery_error text,

  created_at timestamptz not null default now()
);

create unique index if not exists idx_events_idempotency
  on public.events(idempotency_key)
  where idempotency_key is not null;

-- "What did this person do, most recent first" — the query the CRM card and
-- every retention question start from.
create index if not exists idx_events_actor_customer
  on public.events(actor_customer_id, occurred_at desc)
  where actor_customer_id is not null;

-- "What happened to this product" — views, cart adds and price changes for one
-- catalogue entry.
create index if not exists idx_events_entity
  on public.events(entity_type, entity_id, occurred_at desc)
  where entity_id is not null;

create index if not exists idx_events_type_time
  on public.events(event_type, occurred_at desc);

create index if not exists idx_events_session
  on public.events(session_id, occurred_at)
  where session_id is not null;

-- The outbox worker only ever looks at undelivered rows, so the index stays
-- small no matter how large the table grows.
create index if not exists idx_events_pending_delivery
  on public.events(occurred_at)
  where delivered_at is null;

-- An anonymous session that later signs in or checks out gets its earlier
-- events attributed to the person, so the funnel is not cut in half at the
-- moment of login.
create or replace function public.attach_session_events_to_customer(
  p_session_id text,
  p_customer_id uuid
) returns integer
language plpgsql
as $$
declare
  updated_rows integer;
begin
  if p_session_id is null or btrim(p_session_id) = '' or p_customer_id is null then
    return 0;
  end if;

  update public.events
  set actor_customer_id = p_customer_id
  where session_id = p_session_id
    and actor_customer_id is null;

  get diagnostics updated_rows = row_count;
  return updated_rows;
end;
$$;
