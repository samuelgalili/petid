
-- Fix search_food_products: add search_path
CREATE OR REPLACE FUNCTION public.search_food_products(q text, p_pet_type text)
RETURNS TABLE(id uuid, name text, price numeric, category text, pet_type text, source text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Fix update_admin_data_sources_updated_at: add search_path
CREATE OR REPLACE FUNCTION public.update_admin_data_sources_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
