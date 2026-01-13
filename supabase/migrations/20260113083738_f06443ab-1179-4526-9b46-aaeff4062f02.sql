-- Fix overly permissive RLS on agent_action_logs, hashtags, and locations

-- 1. agent_action_logs: Remove permissive INSERT policy, add admin-only SELECT
-- Edge Functions will use service role for INSERT
DROP POLICY IF EXISTS "Anyone can insert action logs" ON public.agent_action_logs;
DROP POLICY IF EXISTS "Service can insert logs" ON public.agent_action_logs;

-- Only admins can view action logs
CREATE POLICY "Admins can view agent_action_logs"
ON public.agent_action_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. hashtags: Replace permissive INSERT with authenticated-only
DROP POLICY IF EXISTS "Anyone can insert hashtags" ON public.hashtags;
DROP POLICY IF EXISTS "Authenticated can insert hashtags" ON public.hashtags;

-- Only authenticated users can create hashtags
CREATE POLICY "Authenticated users can create hashtags"
ON public.hashtags FOR INSERT TO authenticated
WITH CHECK (true);

-- 3. locations: Replace permissive INSERT with authenticated-only
DROP POLICY IF EXISTS "Anyone can insert locations" ON public.locations;
DROP POLICY IF EXISTS "Authenticated can insert locations" ON public.locations;

-- Only authenticated users can create locations
CREATE POLICY "Authenticated users can create locations"
ON public.locations FOR INSERT TO authenticated
WITH CHECK (true);