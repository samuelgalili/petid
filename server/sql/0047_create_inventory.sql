-- M7 · inventory - stock per offer.
--
-- Separated from seller_offers so that a stock change is not a price event.
-- Kept together, every "back in stock" would touch the row that carries the
-- binding price, and price history would fill with changes that were not price
-- changes at all.
--
-- Stock belongs to the OFFER, not the variant: two Sellers offering the same
-- variant hold their own stock. That was the approved recommendation, and it is
-- what makes the same product sellable by several Sellers with different
-- availability.
--
-- availability defaults to OUT_OF_STOCK, which is the single most important
-- default in this file. business_products.in_stock defaults to TRUE, so a row
-- created with no stock information claims to be available - and that claim
-- reaches a customer. Here, unknown means not sellable until somebody says
-- otherwise.
--
-- quantity NULL means the quantity is untracked, not that it is zero.
-- availability stays authoritative either way, so a Seller who does not count
-- units can still say IN_STOCK.
--
-- reserved_quantity exists now and is used from Stage 4 (checkout). It is here
-- so that adding reservations later is not a schema change on a table that by
-- then holds live stock.

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),

  seller_offer_id uuid not null
    references public.seller_offers(id)
    on delete restrict,

  -- No "unknown means in stock".
  availability text not null default 'OUT_OF_STOCK'
    check (availability in ('IN_STOCK', 'OUT_OF_STOCK', 'PREORDER', 'DISCONTINUED')),

  -- NULL = untracked, not zero.
  quantity integer check (quantity is null or quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  low_stock_threshold integer check (low_stock_threshold is null or low_stock_threshold >= 0),
  restock_expected_at timestamptz,

  created_by uuid references public.admin_users(id) on delete restrict,
  updated_by uuid references public.admin_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Cannot reserve stock that is not there. Only meaningful when quantity is
  -- tracked; an untracked offer has nothing to compare against.
  constraint inventory_reserved_within_quantity
    check (quantity is null or reserved_quantity <= quantity)
);

-- One inventory row per offer. Two rows would mean two answers to "is this in
-- stock", and nothing to choose between them.
create unique index if not exists uq_inventory_seller_offer
  on public.inventory (seller_offer_id);

create index if not exists idx_inventory_availability
  on public.inventory (availability);

-- seller_offer_id is immutable: inventory is a property of one offer, and
-- moving it would transfer stock between Sellers silently.
create or replace function public.inventory_offer_frozen()
returns trigger
language plpgsql
as $$
begin
  if new.seller_offer_id is distinct from old.seller_offer_id then
    raise exception
      'inventory.seller_offer_id is immutable; stock belongs to one offer'
      using errcode = 'restrict_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists inventory_offer_frozen on public.inventory;
create trigger inventory_offer_frozen
  before update on public.inventory
  for each row execute function public.inventory_offer_frozen();

comment on table public.inventory is
  'Availability per offer, kept apart from price so a stock change is not a price event. Stock belongs to the offer, so several Sellers can hold their own for the same variant.';

comment on column public.inventory.availability is
  'Defaults to OUT_OF_STOCK. business_products.in_stock defaults to true, so a row with no stock information claimed to be available; that claim reached customers.';

comment on column public.inventory.quantity is
  'NULL means untracked, not zero. availability remains authoritative.';
