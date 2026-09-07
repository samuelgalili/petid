-- 0017_customer_identity.sql
-- Links the commerce customer (shop_customers) to the auth principal (app_users)
-- and constrains orders.user_id, which until now was an unvalidated uuid.
--
-- Guest checkout is preserved: shop_customers.user_id stays nullable, and a
-- guest row is simply an unclaimed one.

-- 1. The missing link.
alter table public.shop_customers
  add column if not exists user_id uuid
    references public.app_users(id) on delete set null;

create index if not exists idx_shop_customers_user_id
  on public.shop_customers(user_id);

-- 2. Case-insensitive email identity, enforced by the database rather than by
--    convention in application code. Required for ON CONFLICT inference below.
drop index if exists public.idx_shop_customers_email_lower;

create unique index if not exists uq_shop_customers_email_lower
  on public.shop_customers (lower(email));

-- 3. Backfill: claim every unclaimed customer whose email matches an account.
update public.shop_customers sc
set user_id = au.id,
    updated_at = now()
from public.app_users au
where sc.user_id is null
  and lower(sc.email) = lower(au.email);

-- 3b. Claim customers proven to belong to an account by their own order history:
--     the order was placed while that user was logged in, so the commerce row is
--     theirs even when the checkout email differs from the account email.
--     Only unambiguous cases are claimed — a customer row used by two different
--     accounts is left alone for a human to resolve.
update public.shop_customers sc
set user_id = evidence.user_id,
    updated_at = now()
from (
  select customer_id, min(user_id::text)::uuid as user_id
  from public.orders
  where user_id is not null
    and customer_id is not null
  group by customer_id
  having count(distinct user_id) = 1
) evidence
where sc.id = evidence.customer_id
  and sc.user_id is null;

-- 4. orders.user_id becomes a real foreign key.
--    Any dangling value is cleared first, or the constraint cannot be added.
update public.orders o
set user_id = null,
    updated_at = now()
where o.user_id is not null
  and not exists (
    select 1 from public.app_users au where au.id = o.user_id
  );

alter table public.orders
  drop constraint if exists orders_user_id_fkey;

alter table public.orders
  add constraint orders_user_id_fkey
    foreign key (user_id) references public.app_users(id) on delete set null;

-- 5. Reporting helper: one row per human, however they arrived.
--    Deliberately reads identity from app_users and shop_customers only, never
--    from profiles — that keeps this view independent of the profiles schema.
create or replace view public.customer_identities as
select
  coalesce(au.id, sc.id)                                     as identity_id,
  case when au.id is not null then 'account' else 'guest' end as identity_kind,
  au.id                                                      as user_id,
  sc.id                                                      as shop_customer_id,
  coalesce(au.email, sc.email)                               as email,
  coalesce(au.full_name, sc.full_name)                       as full_name,
  coalesce(au.phone, sc.phone)                               as phone,
  sc.last_order_at
from public.app_users au
full outer join public.shop_customers sc on sc.user_id = au.id;
