-- First just create the functions without using new enum values
-- Create function to get user's highest role (uses text comparison to avoid enum issues)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role::text FROM public.user_roles 
     WHERE user_id = _user_id 
     ORDER BY 
       CASE role::text 
         WHEN 'admin' THEN 1 
         WHEN 'business' THEN 2 
         WHEN 'org' THEN 3 
         WHEN 'user' THEN 4
         ELSE 5
       END 
     LIMIT 1),
    'user'
  )
$$;