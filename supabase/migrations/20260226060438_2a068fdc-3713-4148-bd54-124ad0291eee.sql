-- Add consent_method to profiles (marketing_consent + marketing_consent_date already exist)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS consent_method text;

-- Create spam_compliance_logs for legal audit trail
CREATE TABLE IF NOT EXISTS public.spam_compliance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  platform text NOT NULL,
  created_at timestamptz DEFAULT now(),
  raw_message_ref text
);

ALTER TABLE public.spam_compliance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own compliance logs"
  ON public.spam_compliance_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins view all compliance logs"
  ON public.spam_compliance_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert compliance logs"
  ON public.spam_compliance_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create communication blacklist
CREATE TABLE IF NOT EXISTS public.communication_blacklist (
  phone_number text PRIMARY KEY,
  reason text,
  added_at timestamptz DEFAULT now()
);

ALTER TABLE public.communication_blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage blacklist"
  ON public.communication_blacklist FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for compliance logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.spam_compliance_logs;