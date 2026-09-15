-- M9 · what an order line records about who sold it, and on what terms.
--
-- Every column here is nullable and has NO foreign key, and both of those are
-- deliberate.
--
-- Nullable, because historical rows keep NULLs. Nothing is backfilled: an order
-- placed before the marketplace existed was not sold by a Seller under a
-- commission, and writing one in afterwards would be inventing a fact - the
-- same mistake that made legacy product ownership unreconstructible.
--
-- No foreign key, because an order line is a SNAPSHOT. It records what was
-- bought, from whom, and at what price, at one moment - and it must stay
-- readable forever without joining back to a catalogue that has since changed.
-- A product renamed, repriced, unpublished or archived next year must not
-- change what an old order says it was. order_items.product_id already works
-- this way and has never had a foreign key; these follow it.
--
-- commission_rate NULL and commission_rate 0 mean different things, and the
-- difference matters for accounting:
--
--   NULL  no platform rate was configured when this order was placed
--   0     a rate was configured and it was zero
--
-- Recording 0 for an unconfigured rate would be a claim nobody made.

alter table public.order_items
  -- The selling Seller. Denormalised onto the line so an order can be
  -- attributed without reaching into seller_offers, which may have been
  -- archived since.
  add column seller_business_id uuid,
  -- The offer these terms came from. Provenance, not a live reference.
  add column seller_offer_id uuid,
  add column product_variant_id uuid,
  add column currency text,
  -- The rate that applied at purchase, and the money it came to. Both are
  -- stored: recomputing an amount from a rate later would use today's rounding
  -- and today's price.
  add column commission_rate numeric(6, 5) check (commission_rate is null or (commission_rate >= 0 and commission_rate <= 1)),
  add column commission_amount numeric(10, 2) check (commission_amount is null or commission_amount >= 0);

-- The whole order belongs to one Seller: a cart is single-Seller (decided for
-- the MVP), so there is exactly one answer per order and it belongs here rather
-- than being derived by scanning the lines.
--
-- Also nullable and unenforced, for the same reason as above: orders placed
-- before this column existed have no Seller and must not be given one.
alter table public.orders
  add column seller_business_id uuid;

-- Answering "what did this Seller sell" without scanning every order.
create index if not exists idx_order_items_seller
  on public.order_items (seller_business_id)
  where seller_business_id is not null;

create index if not exists idx_orders_seller
  on public.orders (seller_business_id)
  where seller_business_id is not null;

create index if not exists idx_order_items_offer
  on public.order_items (seller_offer_id)
  where seller_offer_id is not null;

comment on column public.order_items.seller_offer_id is
  'The offer these terms came from. Provenance only - never joined to for order history, so an archived or repriced offer cannot change what this order says.';

comment on column public.order_items.commission_rate is
  'The platform rate that applied at purchase. NULL means no rate was configured then; 0 means a rate was configured and was zero. The two are not the same.';

comment on column public.orders.seller_business_id is
  'The Seller this order was placed with. One per order: the cart is single-Seller. NULL on orders that predate the marketplace.';
