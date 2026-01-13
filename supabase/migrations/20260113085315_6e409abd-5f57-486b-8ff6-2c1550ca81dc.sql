-- Fix SECURITY DEFINER view issue by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles 
WITH (security_invoker = true) AS
SELECT
  id,
  full_name,
  avatar_url,
  bio,
  created_at
FROM public.profiles;

-- Re-grant access
GRANT SELECT ON public.public_profiles TO authenticated;