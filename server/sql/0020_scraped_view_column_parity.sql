-- Restore full column parity on the scraped_products view.
--
-- 0017 replaced the table with a view that exposed only the columns the API
-- writes. Two readers need more than that:
--
--   resolveCatalogOrderItem selects stock_status when a scraped product is
--   added to an order, so checkout raised "column stock_status does not exist"
--   and no scraped product could be bought.
--
--   mapScrapedProduct reads stock_status, short_description, main_category and
--   scraped_at off a `select *`. With stock_status missing its in_stock test
--   evaluated false, so every scraped product would have displayed as out of
--   stock.
--
-- stock_status is derived from products.in_stock rather than stored twice.
-- Derived columns are not updatable, so in_stock is exposed alongside it and
-- the API now writes that instead; see scrapedProductFields in server/src.

drop view if exists public.scraped_products;

create view public.scraped_products as
select
  id,
  name as product_name,
  source_url as product_url,
  description as long_description,
  description as short_description,
  price as final_price,
  original_price as regular_price,
  sale_price,
  image_url as main_image_url,
  category as sub_category,
  category as main_category,
  sku,
  brand,
  pet_type,
  flavors,
  weight_unit,
  ingredients,
  average_rating as rating,
  review_count,
  is_flagged,
  flagged_reason,
  flagged_at,
  -- Writable: the API updates this column directly.
  in_stock,
  -- Read-only projection of the same fact, for callers that still speak in the
  -- enum the old table used.
  case when in_stock then 'in_stock'::public.stock_status else 'out_of_stock'::public.stock_status end as stock_status,
  created_at as scraped_at,
  created_at,
  updated_at
from public.products
where source_kind = 'scraped'
  and deleted_at is null
  and status not in ('archived', 'rejected');

create trigger scraped_products_soft_delete
  instead of delete on public.scraped_products
  for each row execute function public.archive_product_instead_of_delete();
