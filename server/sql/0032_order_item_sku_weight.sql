-- The warehouse label prints a SKU and a weight for every line.
--
-- These are snapshotted onto the order line at order time, the same way
-- product_name, product_image and price already are. Reading them from the
-- catalog at print time would mean a later catalog edit silently changes what
-- is printed for an order that has already shipped, and a deleted product
-- would print nothing at all.
alter table public.order_items
  add column if not exists sku text,
  add column if not exists weight text,
  add column if not exists weight_unit text;
