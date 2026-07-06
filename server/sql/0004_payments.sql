create table if not exists public.cardcom_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  low_profile_code text,
  transaction_id text,
  operation_response integer,
  deal_response integer,
  is_success boolean,
  payload_json jsonb not null,
  received_at timestamptz not null default now()
);

create index if not exists idx_orders_payment_status on public.orders(payment_status);
create index if not exists idx_orders_payment_transaction on public.orders(payment_transaction_id);
create index if not exists idx_cardcom_events_order on public.cardcom_events(order_id);
create index if not exists idx_cardcom_events_low_profile on public.cardcom_events(low_profile_code);
create index if not exists idx_cardcom_events_received_at on public.cardcom_events(received_at desc);
