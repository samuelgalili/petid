-- M6 · seller_offers - a Seller's commercial terms.
--
-- This is the marketplace join, and the table that makes a variant purchasable
-- and says from whom. Everything commercial lives here rather than on the
-- product: price, SKU, and the right to sell.
--
-- Why price is here and not on the variant: two Sellers offering the same
-- variant charge different amounts. A price on the product or the variant makes
-- the second Seller overwrite the first, which is the structural reason the
-- existing business_products table cannot become a marketplace by adding
-- columns to it.
--
-- price_locked_at records when this price was set, and price_source records
-- whether a human set it or it was adopted from an import. Nothing syncs prices
-- automatically. A supplier page changing its number must never change what a
-- customer is charged without somebody deciding.
--
-- id is the offer_id that the cart and the order carry. That is what makes a
-- cart line unambiguous: it names the Seller, the variant and the terms at
-- once.

create table if not exists public.seller_offers (
  -- The offer_id carried by cart lines and order lines.
  id uuid primary key default gen_random_uuid(),

  -- The SELLING Seller. Not necessarily the Seller who curates the product.
  business_id uuid not null
    references public.business_profiles(id)
    on delete restrict,

  product_variant_id uuid not null
    references public.product_variants(id)
    on delete restrict,

  -- The Seller's own code. Unique within the Seller, never globally.
  sku text,

  -- The binding price. Everything else is indicative.
  price numeric(10, 2) not null check (price >= 0),
  sale_price numeric(10, 2) check (sale_price is null or sale_price >= 0),
  currency text not null default 'ILS' check (currency = 'ILS'),
  price_locked_at timestamptz not null default now(),
  price_source text check (price_source is null or price_source in ('manual', 'adopted')),

  -- INACTIVE by default: an offer becomes sellable only when somebody says so.
  status text not null default 'INACTIVE'
    check (status in ('INACTIVE', 'ACTIVE', 'SUSPENDED', 'ARCHIVED')),

  -- How this Seller came to offer it. Provenance, not ownership.
  adopted_from_raw_import_id uuid
    references public.raw_import_records(id)
    on delete restrict,

  created_by uuid not null references public.admin_users(id) on delete restrict,
  updated_by uuid references public.admin_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  archived_at timestamptz,
  archived_by uuid references public.admin_users(id) on delete restrict,

  constraint seller_offers_archived_status
    check (status <> 'ARCHIVED' or archived_at is not null),

  -- A sale price above the price is not a sale. Caught here because it is the
  -- kind of import error that otherwise reaches a customer.
  constraint seller_offers_sale_price_below_price
    check (sale_price is null or sale_price <= price)
);

-- One live offer per Seller per variant. A Seller cannot list the same thing
-- twice and then wonder which price applies.
create unique index if not exists uq_seller_offers_business_variant
  on public.seller_offers (business_id, product_variant_id)
  where archived_at is null;

-- SKU unique WITHIN a Seller. Never globally: two Sellers using the code
-- "COLLAR-BLUE-S" is normal, and a global unique would reject the second.
create unique index if not exists uq_seller_offers_business_sku
  on public.seller_offers (business_id, sku)
  where sku is not null and archived_at is null;

-- Checkout reads this: given a variant, which offers can be bought.
create index if not exists idx_seller_offers_variant_status
  on public.seller_offers (product_variant_id, status);

create index if not exists idx_seller_offers_business_status
  on public.seller_offers (business_id, status);

-- business_id and product_variant_id are immutable.
--
-- An offer is a promise by a particular Seller about a particular variant.
-- Changing either would rewrite what was promised, retroactively, for anything
-- already in a cart. Archive and create a new offer instead.
create or replace function public.seller_offers_identity_frozen()
returns trigger
language plpgsql
as $$
declare
  frozen text;
begin
  frozen := case
    when new.business_id is distinct from old.business_id then 'business_id'
    when new.product_variant_id is distinct from old.product_variant_id then 'product_variant_id'
    else null
  end;

  if frozen is not null then
    raise exception
      'seller_offers.% is immutable; archive this offer and create the correct one', frozen
      using errcode = 'restrict_violation';
  end if;

  -- A price change re-stamps when the price was locked, so "what was the price
  -- at the time" stays answerable.
  --
  -- Stamped here rather than demanded from the caller. Requiring the caller to
  -- pass it looks stricter but is a trap: inside a transaction now() is the
  -- transaction's start time, so `set price = 59, price_locked_at = now()`
  -- leaves the column unchanged and a check would reject a correct update.
  -- clock_timestamp() advances within the transaction, which is what this
  -- column actually needs to mean.
  --
  -- A caller that supplies its own value is respected - backfills and
  -- corrections need that - so only an unchanged stamp is filled in.
  if new.price is distinct from old.price or new.sale_price is distinct from old.sale_price then
    if new.price_locked_at is not distinct from old.price_locked_at then
      new.price_locked_at := clock_timestamp();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists seller_offers_identity_frozen on public.seller_offers;
create trigger seller_offers_identity_frozen
  before update on public.seller_offers
  for each row execute function public.seller_offers_identity_frozen();

comment on table public.seller_offers is
  'The marketplace join: what makes a variant purchasable and from whom. Price lives here, not on the product, so two Sellers can offer the same variant without overwriting each other.';

comment on column public.seller_offers.id is
  'The offer_id carried by cart and order lines. Names the Seller, the variant and the terms at once.';

comment on column public.seller_offers.sku is
  'The Seller''s own code. Unique within the Seller, never globally.';

comment on column public.seller_offers.price is
  'The binding price. Never synced automatically from a supplier; changes are explicit and re-stamp price_locked_at.';
