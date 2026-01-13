-- Fix overly permissive RLS on product scraping tables
-- Restrict management to admin users only

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can manage scraped_products" ON public.scraped_products;
DROP POLICY IF EXISTS "Authenticated users can manage product_variations" ON public.product_variations;
DROP POLICY IF EXISTS "Authenticated users can manage product_images" ON public.product_images;
DROP POLICY IF EXISTS "Authenticated users can manage scraping_jobs" ON public.scraping_jobs;

-- Create admin-only policies for scraped_products
CREATE POLICY "Admins can manage scraped_products"
ON public.scraped_products FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public can view products (for storefront)
CREATE POLICY "Public can view scraped_products"
ON public.scraped_products FOR SELECT TO authenticated
USING (true);

-- Create admin-only policies for product_variations
CREATE POLICY "Admins can manage product_variations"
ON public.product_variations FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public can view variations
CREATE POLICY "Public can view product_variations"
ON public.product_variations FOR SELECT TO authenticated
USING (true);

-- Create admin-only policies for product_images
CREATE POLICY "Admins can manage product_images"
ON public.product_images FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public can view images
CREATE POLICY "Public can view product_images"
ON public.product_images FOR SELECT TO authenticated
USING (true);

-- Create admin-only policies for scraping_jobs (no public access needed)
CREATE POLICY "Admins can manage scraping_jobs"
ON public.scraping_jobs FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));