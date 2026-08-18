-- Unified customer identity.
--
-- The same person existed twice: app_users held the login and shop_customers
-- held the checkout record, joined only by comparing email strings. orders
-- carried both a customer_id and an unconstrained user_id, and a guest who
-- bought without signing in got no user_id at all.
--
-- After this migration every person is one customers row with one stable id.
-- app_users links to it, orders point at it through a real foreign key, and a
-- guest who registers later inherits the history they built as a guest.
--
-- shop_customers survives as an auto-updatable view, so the order-creation
-- upsert and the account-deletion path keep working with no code change.

-- ---------------------------------------------------------------------------
-- 1. The unified customer
-- ---------------------------------------------------------------------------

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),

  -- Set once the person has a login. Null for a guest who only ever checked
  -- out, which is why this is nullable rather than the primary key.
  app_user_id uuid unique references public.app_users(id) on delete set null,

  email text not null unique,
  phone text,
  -- Digits only, so the same person reaching us as 054-1234567 and +972541234567
  -- can be recognised later. Not unique: shared household numbers are common.
  normalized_phone text,
  full_name text,

  first_order_at timestamptz,
  last_order_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customers_app_user on public.customers(app_user_id);
create index if not exists idx_customers_phone on public.customers(normalized_phone)
  where normalized_phone is not null;
create index if not exists idx_customers_last_order on public.customers(last_order_at desc nulls last);

-- ---------------------------------------------------------------------------
-- 2. Backfill
--
-- Checkout records keep their ids so the existing orders.customer_id values
-- stay valid and the foreign key can be added without rewriting order rows.
-- ---------------------------------------------------------------------------

insert into public.customers (id, email, full_name, phone, normalized_phone, last_order_at, created_at, updated_at)
select
  sc.id,
  lower(btrim(sc.email)),
  sc.full_name,
  sc.phone,
  nullif(regexp_replace(coalesce(sc.phone, ''), '[^0-9]', '', 'g'), ''),
  sc.last_order_at,
  sc.created_at,
  sc.updated_at
from public.shop_customers sc
on conflict (id) do nothing;

-- A registered account that has never ordered still deserves a customer id, so
-- the CRM shows every person rather than only buyers.
insert into public.customers (app_user_id, email, full_name, phone, normalized_phone, created_at, updated_at)
select
  au.id,
  lower(btrim(au.email)),
  au.full_name,
  au.phone,
  nullif(regexp_replace(coalesce(au.phone, ''), '[^0-9]', '', 'g'), ''),
  au.created_at,
  au.updated_at
from public.app_users au
where not exists (
  select 1 from public.customers c where c.email = lower(btrim(au.email))
)
on conflict (email) do nothing;

-- The guest who later registered: same email, two records until now.
update public.customers c
set app_user_id = au.id,
    full_name = coalesce(c.full_name, au.full_name),
    phone = coalesce(c.phone, au.phone),
    normalized_phone = coalesce(
      c.normalized_phone,
      nullif(regexp_replace(coalesce(au.phone, ''), '[^0-9]', '', 'g'), '')
    ),
    updated_at = now()
from public.app_users au
where c.app_user_id is null
  and c.email = lower(btrim(au.email))
  and not exists (select 1 from public.customers other where other.app_user_id = au.id);

-- ---------------------------------------------------------------------------
-- 3. Orders point at real rows
-- ---------------------------------------------------------------------------

-- The old constraint still points at shop_customers, so it has to come off
-- before any order can be attached to a customers row.
alter table public.orders
  drop constraint if exists orders_customer_id_fkey;

-- An order can carry an email that never made it into shop_customers. Those
-- buyers get a customer record too, otherwise the order stays unattributable
-- and drops out of every future revenue or retention question.
insert into public.customers (email, full_name, phone, normalized_phone, created_at, updated_at)
select
  lower(btrim(o.customer_email)),
  (array_agg(o.customer_name order by o.order_date desc))[1],
  (array_agg(o.customer_phone order by o.order_date desc))[1],
  nullif(regexp_replace(coalesce((array_agg(o.customer_phone order by o.order_date desc))[1], ''), '[^0-9]', '', 'g'), ''),
  min(o.created_at),
  now()
from public.orders o
where o.customer_id is null
  and o.customer_email is not null
  and btrim(o.customer_email) <> ''
  and not exists (
    select 1 from public.customers c where c.email = lower(btrim(o.customer_email))
  )
group by lower(btrim(o.customer_email))
on conflict (email) do nothing;

-- A guest order whose email matches a known customer is attached to them, so
-- purchase history is complete rather than split across anonymous rows.
update public.orders o
set customer_id = c.id
from public.customers c
where o.customer_id is null
  and o.customer_email is not null
  and lower(btrim(o.customer_email)) = c.email;

-- user_id was never constrained, so it can hold ids of accounts that are gone.
update public.orders o
set user_id = null
where o.user_id is not null
  and not exists (select 1 from public.app_users au where au.id = o.user_id);

alter table public.orders
  add constraint orders_customer_id_fkey
  foreign key (customer_id) references public.customers(id) on delete set null;

alter table public.orders
  drop constraint if exists orders_user_id_fkey;

alter table public.orders
  add constraint orders_user_id_fkey
  foreign key (user_id) references public.app_users(id) on delete set null;

create index if not exists idx_orders_customer on public.orders(customer_id);
create index if not exists idx_orders_user on public.orders(user_id);

-- Order timestamps are the source of truth for these, so derive rather than
-- trusting whatever last_order_at happened to hold.
update public.customers c
set first_order_at = agg.first_at,
    last_order_at = agg.last_at
from (
  select customer_id, min(order_date) as first_at, max(order_date) as last_at
  from public.orders
  where customer_id is not null
  group by customer_id
) agg
where agg.customer_id = c.id;

-- ---------------------------------------------------------------------------
-- 4. shop_customers becomes a view
--
-- The order-creation path upserts with ON CONFLICT (email) and the account
-- deletion path deletes by email. Both work through an auto-updatable view:
-- the conflict target resolves against the unique index on customers.email,
-- and an INSTEAD OF DELETE trigger forwards the delete to the base table so
-- orders.customer_id is still cleared by its foreign key.
-- ---------------------------------------------------------------------------

alter table public.shop_customers rename to shop_customers_legacy;

create view public.shop_customers as
select id, email, full_name, phone, created_at, updated_at, last_order_at
from public.customers;

create or replace function public.delete_customer_instead_of_view_delete()
returns trigger
language plpgsql
as $$
begin
  delete from public.customers where id = old.id;
  return old;
end;
$$;

create trigger shop_customers_delete
  instead of delete on public.shop_customers
  for each row execute function public.delete_customer_instead_of_view_delete();
