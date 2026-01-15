-- Fix RPC: Search Food Products with correct column names
drop function if exists search_food_products(text, text);

create or replace function search_food_products(
  q text,
  p_pet_type text
)
returns table (
  id uuid,
  name text,
  price numeric,
  category text,
  pet_type text,
  source text
)
language sql
security definer
as $$
  (
    select
      bp.id,
      bp.name,
      bp.price,
      bp.category,
      bp.pet_type::text,
      'business' as source
    from business_products bp
    where (p_pet_type is null or bp.pet_type::text = p_pet_type)
      and bp.name ilike '%' || q || '%'
      and bp.in_stock = true
  )
  union all
  (
    select
      sp.id,
      sp.product_name as name,
      sp.final_price as price,
      sp.main_category as category,
      sp.pet_type,
      'scraped' as source
    from scraped_products sp
    where (p_pet_type is null or sp.pet_type = p_pet_type)
      and sp.product_name ilike '%' || q || '%'
  )
  limit 8;
$$;