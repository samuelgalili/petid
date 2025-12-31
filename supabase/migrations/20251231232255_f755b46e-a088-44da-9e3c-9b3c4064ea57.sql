-- Create function to check if user is moderator or admin
CREATE OR REPLACE FUNCTION public.is_moderator_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'moderator')
  )
$$;

-- Update reports table RLS to allow moderators
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
CREATE POLICY "Admins and moderators can view all reports"
ON public.reports
FOR SELECT
TO authenticated
USING (public.is_moderator_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Admins and moderators can update reports"
ON public.reports
FOR UPDATE
TO authenticated
USING (public.is_moderator_or_admin(auth.uid()));

-- Add RLS policy for content_reports table for moderators
DROP POLICY IF EXISTS "Admins can view content reports" ON public.content_reports;
CREATE POLICY "Admins and moderators can view content reports"
ON public.content_reports
FOR SELECT
TO authenticated
USING (public.is_moderator_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update content reports" ON public.content_reports;
CREATE POLICY "Admins and moderators can update content reports"
ON public.content_reports
FOR UPDATE
TO authenticated
USING (public.is_moderator_or_admin(auth.uid()));