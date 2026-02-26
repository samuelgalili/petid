-- Add marketing consent to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketing_consent boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketing_consent_date timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketing_unsubscribed_at timestamptz;

-- Create marketing opt-out log for legal compliance
CREATE TABLE IF NOT EXISTS public.marketing_opt_out_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL CHECK (action IN ('opt_in', 'opt_out')),
  channel text DEFAULT 'all',
  keyword text,
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.marketing_opt_out_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own opt-out log"
  ON public.marketing_opt_out_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own opt-out"
  ON public.marketing_opt_out_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all opt-out logs"
  ON public.marketing_opt_out_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add compliance tracking columns to content_calendar
ALTER TABLE public.content_calendar ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'general';
ALTER TABLE public.content_calendar ADD COLUMN IF NOT EXISTS compliance_status text DEFAULT 'pending';
ALTER TABLE public.content_calendar ADD COLUMN IF NOT EXISTS consent_verified boolean DEFAULT false;
ALTER TABLE public.content_calendar ADD COLUMN IF NOT EXISTS link_clicks integer DEFAULT 0;
ALTER TABLE public.content_calendar ADD COLUMN IF NOT EXISTS leads_generated integer DEFAULT 0;
ALTER TABLE public.content_calendar ADD COLUMN IF NOT EXISTS lumi_category text;

-- Enable realtime for opt-out log
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketing_opt_out_log;