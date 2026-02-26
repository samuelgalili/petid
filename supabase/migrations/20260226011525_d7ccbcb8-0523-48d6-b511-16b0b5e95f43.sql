-- Lead quality scoring for Libra Insurance
ALTER TABLE public.insurance_leads
  ADD COLUMN IF NOT EXISTS quality_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_tier TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS has_verified_chip BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS medical_completeness NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_pushed_at TIMESTAMPTZ;

-- User engagement tracking for dynamic UI personalization
CREATE TABLE IF NOT EXISTS public.user_engagement_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  section TEXT NOT NULL,
  time_spent_seconds NUMERIC NOT NULL DEFAULT 0,
  interaction_count INTEGER NOT NULL DEFAULT 0,
  last_visited_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, section)
);

ALTER TABLE public.user_engagement_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own engagement logs"
  ON public.user_engagement_logs FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_engagement_logs;