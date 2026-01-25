-- Fix remaining security issues - use DROP IF EXISTS for all policies first

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can insert scraped products" ON public.scraped_products;
DROP POLICY IF EXISTS "Admins can update scraped products" ON public.scraped_products;
DROP POLICY IF EXISTS "Admins can delete scraped products" ON public.scraped_products;
DROP POLICY IF EXISTS "Admins can insert product variations" ON public.product_variations;
DROP POLICY IF EXISTS "Admins can update product variations" ON public.product_variations;
DROP POLICY IF EXISTS "Admins can delete product variations" ON public.product_variations;
DROP POLICY IF EXISTS "Admins can insert product images" ON public.product_images;
DROP POLICY IF EXISTS "Admins can update product images" ON public.product_images;
DROP POLICY IF EXISTS "Admins can delete product images" ON public.product_images;
DROP POLICY IF EXISTS "Admins can insert scraping jobs" ON public.scraping_jobs;
DROP POLICY IF EXISTS "Admins can update scraping jobs" ON public.scraping_jobs;
DROP POLICY IF EXISTS "Admins can delete scraping jobs" ON public.scraping_jobs;
DROP POLICY IF EXISTS "Authenticated users can view scraped products" ON public.scraped_products;
DROP POLICY IF EXISTS "Authenticated users can view product variations" ON public.product_variations;
DROP POLICY IF EXISTS "Authenticated users can view product images" ON public.product_images;
DROP POLICY IF EXISTS "Authenticated users can view scraping jobs" ON public.scraping_jobs;

-- Create read access for all authenticated users
CREATE POLICY "Authenticated users can view scraped products"
ON public.scraped_products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view product variations"
ON public.product_variations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view product images"
ON public.product_images FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view scraping jobs"
ON public.scraping_jobs FOR SELECT
TO authenticated
USING (true);

-- Create admin-only write access for scraped_products
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

-- Create admin-only write access for product_variations
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

-- Create admin-only write access for product_images
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

-- Create admin-only write access for scraping_jobs
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

-- Fix get_user_email function - add access control
CREATE OR REPLACE FUNCTION public.get_user_email(_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Only allow if caller is the user themselves or an admin
  IF auth.uid() = _user_id OR public.has_role(auth.uid(), 'admin') THEN
    SELECT email INTO user_email FROM auth.users WHERE id = _user_id;
    RETURN user_email;
  END IF;
  
  -- Access denied - return NULL
  RETURN NULL;
END;
$$;