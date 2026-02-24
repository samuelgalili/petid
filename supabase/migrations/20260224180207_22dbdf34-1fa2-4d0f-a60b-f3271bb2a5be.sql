
-- Agent health check logs table
CREATE TABLE public.agent_health_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_slug TEXT NOT NULL,
  check_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'healthy',
  message TEXT,
  response_time_ms INTEGER,
  metadata JSONB,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read health checks"
  ON public.agent_health_checks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service can insert health checks"
  ON public.agent_health_checks FOR INSERT WITH CHECK (true);

-- Data validation rules table
CREATE TABLE public.data_validation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  rule_config JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.data_validation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage validation rules"
  ON public.data_validation_rules FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Seed default validation rules
INSERT INTO public.data_validation_rules (field_name, table_name, rule_type, rule_config, description)
VALUES
  ('weight', 'pets', 'range', '{"min": 0.5, "max": 120}'::jsonb, 'Dog/cat weight must be between 0.5kg and 120kg'),
  ('weight', 'pets', 'delta', '{"max_change_percent": 30}'::jsonb, 'Weight cannot change more than 30% in a single update'),
  ('age', 'pets', 'range', '{"min": 0, "max": 30}'::jsonb, 'Pet age must be between 0 and 30 years'),
  ('phone', 'profiles', 'format', '{"pattern": "^\\+?[0-9]{7,15}$"}'::jsonb, 'Phone number must be 7-15 digits');

-- Test simulation results table
CREATE TABLE public.agent_test_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_name TEXT NOT NULL,
  scenario TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  steps JSONB NOT NULL DEFAULT '[]',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  triggered_by TEXT
);

ALTER TABLE public.agent_test_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage test runs"
  ON public.agent_test_runs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Add health columns to automation_bots
ALTER TABLE public.automation_bots
  ADD COLUMN IF NOT EXISTS health_status TEXT DEFAULT 'healthy',
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMP WITH TIME ZONE;

-- Ensure dry_run_mode setting exists
INSERT INTO public.system_settings (key, value, updated_at)
VALUES ('dry_run_mode', '{"enabled": false}'::jsonb, now())
ON CONFLICT (key) DO NOTHING;
