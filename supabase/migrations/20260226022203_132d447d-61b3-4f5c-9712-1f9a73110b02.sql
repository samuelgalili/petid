
-- Readiness drill results table
CREATE TABLE public.readiness_drill_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  overall_status TEXT NOT NULL DEFAULT 'green',
  stability_score INTEGER NOT NULL DEFAULT 100,
  total_tests INTEGER NOT NULL DEFAULT 0,
  passed_tests INTEGER NOT NULL DEFAULT 0,
  failed_tests INTEGER NOT NULL DEFAULT 0,
  self_healed INTEGER NOT NULL DEFAULT 0,
  agent_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  integrity_results JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint on drill_date to allow upsert
ALTER TABLE public.readiness_drill_results ADD CONSTRAINT readiness_drill_results_drill_date_key UNIQUE (drill_date);

-- RLS
ALTER TABLE public.readiness_drill_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read drill results"
  ON public.readiness_drill_results FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role can insert drill results"
  ON public.readiness_drill_results FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update drill results"
  ON public.readiness_drill_results FOR UPDATE
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.readiness_drill_results;
