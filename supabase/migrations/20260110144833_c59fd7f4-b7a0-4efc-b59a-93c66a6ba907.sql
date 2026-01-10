-- Add failed_attempts tracking to whatsapp_otps table
ALTER TABLE public.whatsapp_otps 
ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_failed_at TIMESTAMPTZ;

-- Fix scraped_products RLS policies
DROP POLICY IF EXISTS "Authenticated users can manage scraped_products" ON public.scraped_products;

CREATE POLICY "Anyone can view scraped products"
ON public.scraped_products FOR SELECT
USING (true);

CREATE POLICY "Admins can insert scraped products"
ON public.scraped_products FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update scraped products"
ON public.scraped_products FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete scraped products"
ON public.scraped_products FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix product_variations RLS policies
DROP POLICY IF EXISTS "Authenticated users can manage product_variations" ON public.product_variations;

CREATE POLICY "Anyone can view product variations"
ON public.product_variations FOR SELECT
USING (true);

CREATE POLICY "Admins can insert product variations"
ON public.product_variations FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product variations"
ON public.product_variations FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete product variations"
ON public.product_variations FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix product_images RLS policies
DROP POLICY IF EXISTS "Authenticated users can manage product_images" ON public.product_images;

CREATE POLICY "Anyone can view product images"
ON public.product_images FOR SELECT
USING (true);

CREATE POLICY "Admins can insert product images"
ON public.product_images FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product images"
ON public.product_images FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete product images"
ON public.product_images FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix scraping_jobs RLS policies
DROP POLICY IF EXISTS "Authenticated users can manage scraping_jobs" ON public.scraping_jobs;

CREATE POLICY "Admins can view scraping jobs"
ON public.scraping_jobs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert scraping jobs"
ON public.scraping_jobs FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update scraping jobs"
ON public.scraping_jobs FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete scraping jobs"
ON public.scraping_jobs FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));