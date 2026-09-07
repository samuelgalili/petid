-- 0028_shipping_profiles.sql
--
-- Gives a delivery address somewhere to live between orders.
--
-- Today nothing stores one. The checkout keeps what the customer typed in
-- sessionStorage, which is gone when the tab closes and never reaches a second
-- device, so someone with ten past orders retypes their address on the
-- eleventh. Every order carries its own shipping_address jsonb and that is the
-- only record.
--
-- This is also where the warehouse's missing fields come from. The label needs
-- building, floor, apartment and the lobby code to get a courier to the door,
-- and none of them are collected anywhere.
--
-- The address on an order stays on the order. This table is the customer's
-- current default, used to prefill the next checkout; editing it must never
-- rewrite where a past parcel was sent.

create table if not exists public.shipping_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,

  full_name text,
  phone text,
  -- A courier who gets no answer on the first number tries this one before
  -- giving up and taking the parcel back.
  phone_secondary text,

  city text,
  street text,
  building text,
  floor text,
  apartment text,
  -- Without this a courier reaches a locked lobby and the delivery fails, so
  -- it is required for a building and meaningless for a house.
  lobby_code text,
  entrance_type text not null default 'house'
    check (entrance_type in ('house', 'building')),
  zip_code text,

  -- Free text from the customer for the courier: "dog in the yard, ring the
  -- bell", "gate code is on the left".
  notes text,

  -- Leaving a parcel at an unattended door shifts the risk to the customer, so
  -- what they agreed to is recorded, not just that they agreed. The wording
  -- will change over time and a bare boolean cannot say which version was on
  -- screen when they ticked it.
  leave_at_door boolean not null default false,
  leave_at_door_terms text,
  leave_at_door_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One profile per customer for now. Multiple named addresses can come later
  -- by dropping this constraint and adding a default flag.
  unique (user_id)
);

create index if not exists idx_shipping_profiles_user
  on public.shipping_profiles(user_id);
