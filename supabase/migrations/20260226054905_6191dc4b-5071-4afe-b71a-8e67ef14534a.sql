
-- Add ai_consent column to profiles for privacy consent tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_consent_given BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_consent_date TIMESTAMPTZ;

-- Create agent_data_access_log for privacy audit trail
CREATE TABLE IF NOT EXISTS public.agent_data_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'read',
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  user_id UUID,
  data_fields TEXT[],
  reason TEXT,
  route TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_data_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view agent audit logs"
  ON public.agent_data_access_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role inserts (edge functions)
CREATE POLICY "Service can insert agent audit logs"
  ON public.agent_data_access_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Enable realtime for audit log
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_data_access_log;
