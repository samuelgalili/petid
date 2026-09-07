-- The manual catalog could describe a weight but never hold one: it had
-- weight_unit and price_per_weight, and no number for the unit to qualify.
-- Imported products (scraped_products.weight) always had one, so the warehouse
-- label printed a weight for imported lines and a dash for hand-made ones.
--
-- Numeric rather than text, unlike the scraped column, so a shipment total can
-- be summed later; the unit stays in the existing weight_unit column.
alter table public.business_products
  add column if not exists weight numeric(10,3);
