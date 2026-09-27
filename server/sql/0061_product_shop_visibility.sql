-- Hide a legacy catalogue product from the shop without touching stock.
--
-- business_products had no visibility column. The shop dropped rows whose
-- in_stock was false, and that is a stock fact, not a reason to pretend a
-- product with stock is gone. shop_hidden is additive: existing rows default
-- to visible, and no stock, price, variant, offer or inventory column moves.
--
-- The hold row is the value unhide writes back. The events table is the log
-- that remains after the hold is consumed. Neither table cascades a delete
-- onto the product.

alter table public.business_products
  add column if not exists shop_hidden boolean not null default false;

comment on column public.business_products.shop_hidden is
  'When true, public shop, search, category listings and the product sitemap omit this row. Stock is unchanged. Restored from product_shop_visibility_holds.';

create table if not exists public.product_shop_visibility_holds (
  product_id uuid primary key references public.business_products(id),
  previous_shop_hidden boolean not null,
  reason text not null,
  hidden_at timestamptz not null default now()
);

comment on table public.product_shop_visibility_holds is
  'The shop_hidden value to write back on unhide. One row per product currently hidden by the broken-image workflow.';

create table if not exists public.product_shop_visibility_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.business_products(id),
  action text not null check (action in ('hide', 'unhide')),
  previous_shop_hidden boolean not null,
  resulting_shop_hidden boolean not null,
  created_at timestamptz not null default now()
);

comment on table public.product_shop_visibility_events is
  'Append-only log of shop_hidden changes. previous_shop_hidden is the value before the action.';

create index if not exists idx_product_shop_visibility_events_product
  on public.product_shop_visibility_events (product_id, created_at desc);
