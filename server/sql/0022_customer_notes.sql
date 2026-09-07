-- 0022_customer_notes.sql
-- An internal log of what was said to a customer: calls, notes, messages.
--
-- The subject is stored as two nullable keys rather than as the identity_id
-- customer_identities reports. identity_id is not a real key -- it is the
-- app_users id for an account and the shop_customers id for a guest -- so a
-- guest whose commerce row is later claimed by an account changes identity,
-- and every note filed under the old value would fall off the card.
--
-- Storing user_id and shop_customer_id separately keeps the note attached to
-- the row it was actually written about. A card then reads both, so notes
-- written while the person was a guest still surface after they sign up.

create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade,
  shop_customer_id uuid references public.shop_customers(id) on delete cascade,

  -- The author survives their own admin account being removed: the id goes
  -- null, the name stays, so the log never loses who said what.
  admin_user_id uuid references public.admin_users(id) on delete set null,
  author_name text,

  kind text not null default 'note',
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint customer_notes_kind_check
    check (kind in ('note', 'call', 'whatsapp', 'email', 'meeting')),
  constraint customer_notes_body_check
    check (btrim(body) <> ''),

  -- A note with no subject is unreachable, and would silently accumulate.
  constraint customer_notes_subject_check
    check (user_id is not null or shop_customer_id is not null)
);

create index if not exists idx_customer_notes_user
  on public.customer_notes (user_id, created_at desc)
  where user_id is not null;

create index if not exists idx_customer_notes_shop_customer
  on public.customer_notes (shop_customer_id, created_at desc)
  where shop_customer_id is not null;
