-- 0021_entity_identifiers.sql
-- Gives the remaining entities a stable, unique way to be referred to.
--
-- Automation and support both need to name a thing and be certain which one
-- they mean. Orders already have order_number. These did not:
--
--   pets.microchip_number       a globally unique registry number, unconstrained
--   business_products.sku       nullable and non-unique, so a catalogue sync
--                               keyed on SKU can match zero rows, one, or five
--                               (still true — see the note in section 1)
--   orders.tracking_number      free text, so two orders could carry the same
--   insurance_claims            no reference at all — only a uuid
--   pet_service_bookings        the same
--
-- Every constraint here is a PARTIAL unique index (`where ... is not null`).
-- In PostgreSQL a plain unique index already permits many NULLs, but writing
-- the predicate makes the intent explicit and keeps the index small: absence is
-- always allowed, duplication never is.

-- ── 1. Refuse to run on data that already violates what we are about to
--       enforce, and say exactly which rows, rather than failing later with a
--       constraint-violation stack trace mid-deploy.
-- SKU is deliberately not in this guard. The production catalogue has SKUs
-- repeated across rows, and this block previously refused the whole migration
-- because of them — which stopped the deploy after 0019 had already dropped the
-- identity columns, leaving the running API querying columns that were gone.
-- A catalogue tidy-up is not something a deploy should perform on its own, and
-- it is not a reason to take the site down. The unique index on SKU therefore
-- moves to a later migration, to be run once the duplicates are resolved. The
-- query that lists them is in the comment below.
do $$
declare
  dup_chip integer;
  dup_track integer;
begin
  select count(*) into dup_chip from (
    select 1 from public.pets
    where microchip_number is not null and btrim(microchip_number) <> ''
    group by btrim(microchip_number) having count(*) > 1
  ) d;

  select count(*) into dup_track from (
    select 1 from public.orders
    where tracking_number is not null and btrim(tracking_number) <> ''
    group by btrim(tracking_number) having count(*) > 1
  ) d;

  if dup_chip > 0 or dup_track > 0 then
    raise exception using
      message = format(
        'Duplicate identifiers block this migration: %s microchip, %s tracking_number',
        dup_chip, dup_track),
      hint = 'Resolve the duplicates first. The queries are in the comment below this block.';
  end if;
end
$$;

--  select btrim(microchip_number), count(*) from public.pets
--  where microchip_number is not null and btrim(microchip_number) <> ''
--  group by 1 having count(*) > 1;
--
--  select btrim(sku), count(*) from public.business_products
--  where sku is not null and btrim(sku) <> '' group by 1 having count(*) > 1;
--
--  select btrim(tracking_number), count(*) from public.orders
--  where tracking_number is not null and btrim(tracking_number) <> ''
--  group by 1 having count(*) > 1;

-- ── 2. Identifiers that come from outside MIPO.
--       Compared on the trimmed value, so trailing whitespace cannot smuggle a
--       duplicate past the constraint.

create unique index if not exists uq_pets_microchip_number
  on public.pets (btrim(microchip_number))
  where microchip_number is not null and btrim(microchip_number) <> '';

-- No index on business_products.sku here: 0001 already created
-- idx_business_products_sku, and the unique one this migration used to add is
-- deferred until the duplicates are resolved. See the note above the guard.

create unique index if not exists uq_orders_tracking_number
  on public.orders (btrim(tracking_number))
  where tracking_number is not null and btrim(tracking_number) <> '';

-- ── 3. Human-quotable references for the two entities that had none.
--       Same shape as orders.order_number, so support reads one format.

alter table public.insurance_claims
  add column if not exists claim_number text;

alter table public.pet_service_bookings
  add column if not exists booking_number text;

-- Backfill deterministically from the submission date and the row's own uuid,
-- so a re-run produces the same reference and never a second one.
update public.insurance_claims
set claim_number = 'CLM-'
  || to_char(coalesce(submitted_at, now()), 'YYYYMMDD') || '-'
  || upper(substr(replace(id::text, '-', ''), 1, 6))
where claim_number is null;

update public.pet_service_bookings
set booking_number = 'BKG-'
  || to_char(coalesce(created_at, now()), 'YYYYMMDD') || '-'
  || upper(substr(replace(id::text, '-', ''), 1, 6))
where booking_number is null;

create unique index if not exists uq_insurance_claims_claim_number
  on public.insurance_claims (claim_number)
  where claim_number is not null;

create unique index if not exists uq_service_bookings_booking_number
  on public.pet_service_bookings (booking_number)
  where booking_number is not null;

-- New rows get one without the application having to remember.
alter table public.insurance_claims
  alter column claim_number set default
    'CLM-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

alter table public.pet_service_bookings
  alter column booking_number set default
    'BKG-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

-- ── 4. shop_customers carried two unique constraints on email: the original
--       raw-value one, and the case-insensitive one added in 0017. The second
--       is strictly stronger, so the first is now redundant noise in the schema.
alter table public.shop_customers
  drop constraint if exists shop_customers_email_key;

comment on index public.uq_pets_microchip_number is
  'A microchip number identifies one animal in the national registry. Two pets '
  'sharing one is a data-entry error or a duplicate registration, never valid.';
