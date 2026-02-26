
-- Enable required extensions for cron scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Daily briefs table to store generated briefs
CREATE TABLE IF NOT EXISTS public.ceo_daily_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_date DATE NOT NULL DEFAULT CURRENT_DATE,
  net_profit NUMERIC DEFAULT 0,
  total_vat NUMERIC DEFAULT 0,
  costs_saved NUMERIC DEFAULT 0,
  gross_revenue NUMERIC DEFAULT 0,
  total_costs NUMERIC DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  ai_insight TEXT,
  scientific_fact TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(brief_date)
);

-- Enable RLS
ALTER TABLE public.ceo_daily_briefs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users with admin role to read
CREATE POLICY "Admins can read daily briefs" ON public.ceo_daily_briefs
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Allow service role full access (for edge function inserts)
CREATE POLICY "Service role can manage daily briefs" ON public.ceo_daily_briefs
  FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for instant dashboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.ceo_daily_briefs;
