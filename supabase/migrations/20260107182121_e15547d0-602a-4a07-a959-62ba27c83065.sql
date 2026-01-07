-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role has full access to whatsapp_messages" ON public.whatsapp_messages;

-- Service role access is automatic and doesn't need a policy
-- Keep only the admin read policy which is already restrictive