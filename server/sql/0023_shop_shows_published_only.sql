-- The shop shows published products, and only those.
--
-- 0017 wrote the compatibility views to exclude archived and rejected rows.
-- That was the wrong shape of rule. It listed what to hide instead of what to
-- show, so every status invented afterwards was visible by default — and the
-- first one invented was pending_review.
--
-- The effect was that an import put 267 unreviewed products straight onto the
-- storefront, which is precisely what the decision not to auto-publish a first
-- delivery was meant to prevent.
--
-- Stating it the other way round means a new status is invisible until someone
-- decides it should be seen.

drop view if exists public.business_products;
drop view if exists public.scraped_products;

create view public.business_products as
select
  id, business_id, name, description, price, original_price, sale_price, image_url, images,
  category, in_stock, is_featured, sku, pet_type, flavors, brand, weight_unit,
  price_per_weight, source_url, ingredients, benefits, feeding_guide, product_attributes,
  life_stage, dog_size, special_diet, needs_image_review, needs_price_review, suggested_price,
  price_suggestion_reason, is_flagged, flagged_reason, flagged_at, safety_score,
  average_rating, review_count, legacy_supplier_id as supplier_id,
  supplier_link, auto_restock, restock_interval_days, api_sync_enabled, breed_tags,
  medical_tags, kcal_per_kg, created_at, updated_at
from public.products
where source_kind in ('manual', 'import')
  and deleted_at is null
  and status = 'published';

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
  in_stock,
  case when in_stock then 'in_stock'::public.stock_status else 'out_of_stock'::public.stock_status end as stock_status,
  created_at as scraped_at,
  created_at,
  updated_at
from public.products
where source_kind = 'scraped'
  and deleted_at is null
  and status = 'published';

create trigger business_products_soft_delete
  instead of delete on public.business_products
  for each row execute function public.archive_product_instead_of_delete();

create trigger scraped_products_soft_delete
  instead of delete on public.scraped_products
  for each row execute function public.archive_product_instead_of_delete();
