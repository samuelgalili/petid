CREATE OR REPLACE FUNCTION public.search_products_unified(
  p_query text DEFAULT NULL,
  p_pet_type text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_limit int DEFAULT 24
)
RETURNS TABLE(
  id uuid,
  source text,
  name text,
  brand text,
  price numeric,
  image_url text,
  pet_type text,
  category text,
  in_stock boolean,
  rank int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH q AS (
    SELECT NULLIF(TRIM(p_query), '') AS term
  )
  SELECT * FROM (
    (
      SELECT
        bp.id,
        'business'::text AS source,
        bp.name,
        bp.brand,
        COALESCE(bp.sale_price, bp.price) AS price,
        (SELECT pi.image_url FROM product_images pi WHERE pi.product_id = bp.id ORDER BY pi.display_order LIMIT 1) AS image_url,
        bp.pet_type::text AS pet_type,
        bp.category,
        bp.in_stock,
        1 AS rank
      FROM business_products bp, q
      WHERE (q.term IS NULL OR bp.name ILIKE '%' || q.term || '%' OR bp.description ILIKE '%' || q.term || '%')
        AND (p_pet_type IS NULL OR bp.pet_type::text = p_pet_type)
        AND (p_category IS NULL OR bp.category = p_category)
        AND (p_min_price IS NULL OR COALESCE(bp.sale_price, bp.price) >= p_min_price)
        AND (p_max_price IS NULL OR COALESCE(bp.sale_price, bp.price) <= p_max_price)
        AND COALESCE(bp.is_flagged, false) = false
      LIMIT p_limit
    )
    UNION ALL
    (
      SELECT
        np.id,
        'normalized'::text AS source,
        np.name,
        (np.metadata->>'brand')::text AS brand,
        COALESCE(np.sale_price, np.price) AS price,
        np.image_url,
        (np.metadata->>'pet_type')::text AS pet_type,
        np.category,
        (COALESCE(np.stock_quantity, 0) > 0) AS in_stock,
        2 AS rank
      FROM normalized_products np, q
      WHERE (q.term IS NULL OR np.name ILIKE '%' || q.term || '%')
        AND (p_pet_type IS NULL OR (np.metadata->>'pet_type') = p_pet_type)
        AND (p_category IS NULL OR np.category = p_category)
        AND (p_min_price IS NULL OR COALESCE(np.sale_price, np.price) >= p_min_price)
        AND (p_max_price IS NULL OR COALESCE(np.sale_price, np.price) <= p_max_price)
        AND COALESCE(np.status, 'active') = 'active'
      LIMIT p_limit
    )
    UNION ALL
    (
      SELECT
        sp.id,
        'scraped'::text AS source,
        sp.product_name AS name,
        sp.brand,
        sp.final_price AS price,
        sp.main_image_url AS image_url,
        sp.pet_type,
        sp.main_category AS category,
        true AS in_stock,
        3 AS rank
      FROM scraped_products sp, q
      WHERE (q.term IS NULL OR sp.product_name ILIKE '%' || q.term || '%')
        AND (p_pet_type IS NULL OR sp.pet_type = p_pet_type)
        AND (p_category IS NULL OR sp.main_category = p_category)
        AND (p_min_price IS NULL OR sp.final_price >= p_min_price)
        AND (p_max_price IS NULL OR sp.final_price <= p_max_price)
        AND COALESCE(sp.is_flagged, false) = false
      LIMIT p_limit
    )
  ) unified
  ORDER BY rank ASC, name ASC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_products_unified TO authenticated, anon;