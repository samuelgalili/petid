-- Fix scraping_jobs policies - drop existing and recreate
DROP POLICY IF EXISTS "Admins can view scraping jobs" ON public.scraping_jobs;
DROP POLICY IF EXISTS "Admins can manage scraping jobs" ON public.scraping_jobs;

CREATE POLICY "Admins can view scraping jobs"
ON public.scraping_jobs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage scraping jobs"
ON public.scraping_jobs FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));