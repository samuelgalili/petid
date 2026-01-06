
-- Add RLS policies for password_reset_otps table
-- This table should only be accessible by the service role (edge functions)
-- Users should not be able to read or modify OTPs directly

-- Policy: Allow service role to manage OTPs (via edge functions)
-- Since this table is managed by edge functions using service role key,
-- we create a restrictive policy that blocks direct user access

CREATE POLICY "Service role can manage OTPs"
ON public.password_reset_otps
FOR ALL
USING (false)
WITH CHECK (false);

-- Note: Edge functions use service role key which bypasses RLS,
-- so this policy effectively blocks any direct client access
-- while allowing edge functions to work normally
