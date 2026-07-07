create table if not exists public.marketing_opt_out_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete set null,
  action text not null check (action in ('opt_in', 'opt_out')),
  source text,
  created_at timestamptz not null default now()
);

create index if not exists idx_marketing_opt_out_log_user_created
  on public.marketing_opt_out_log(user_id, created_at desc);

create index if not exists idx_orders_user_order_date
  on public.orders(user_id, order_date desc);
