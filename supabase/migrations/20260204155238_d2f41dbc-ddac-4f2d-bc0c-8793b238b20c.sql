-- Fix overly permissive RLS policies on product scraping tables
-- Restrict to admin-only access using the existing has_role function

-- 1. scraped_products - Drop permissive policy and create admin-only
DROP POLICY IF EXISTS "Authenticated users can manage scraped_products" ON public.scraped_products;
DROP POLICY IF EXISTS "Admins can manage scraped_products" ON public.scraped_products;

CREATE POLICY "Admins can manage scraped_products"
ON public.scraped_products FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. product_variations - Drop permissive policy and create admin-only
DROP POLICY IF EXISTS "Authenticated users can manage product_variations" ON public.product_variations;
DROP POLICY IF EXISTS "Admins can manage product_variations" ON public.product_variations;

CREATE POLICY "Admins can manage product_variations"
ON public.product_variations FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. product_images - Drop permissive policy and create admin-only
DROP POLICY IF EXISTS "Authenticated users can manage product_images" ON public.product_images;
DROP POLICY IF EXISTS "Admins can manage product_images" ON public.product_images;

CREATE POLICY "Admins can manage product_images"
ON public.product_images FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. scraping_jobs - Drop permissive policy and create admin-only
DROP POLICY IF EXISTS "Authenticated users can manage scraping_jobs" ON public.scraping_jobs;
DROP POLICY IF EXISTS "Admins can manage scraping_jobs" ON public.scraping_jobs;

CREATE POLICY "Admins can manage scraping_jobs"
ON public.scraping_jobs FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));