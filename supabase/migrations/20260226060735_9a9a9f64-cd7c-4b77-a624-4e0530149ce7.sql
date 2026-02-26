
-- Prometheus: Agent Prompt Versioning
CREATE TABLE IF NOT EXISTS public.agent_prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  system_prompt text NOT NULL,
  performance_score numeric DEFAULT 0,
  conversion_rate numeric DEFAULT 0,
  empathy_score numeric DEFAULT 0,
  accuracy_score numeric DEFAULT 0,
  is_active boolean DEFAULT false,
  created_by text DEFAULT 'prometheus',
  deployed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.agent_prompt_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage prompt versions"
  ON public.agent_prompt_versions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Prometheus: A/B Test Shadow Runs
CREATE TABLE IF NOT EXISTS public.prometheus_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug text NOT NULL,
  test_name text NOT NULL,
  variant_a_prompt_id uuid REFERENCES public.agent_prompt_versions(id),
  variant_b_prompt_id uuid REFERENCES public.agent_prompt_versions(id),
  status text DEFAULT 'running' CHECK (status IN ('running', 'completed', 'cancelled')),
  variant_a_score numeric DEFAULT 0,
  variant_b_score numeric DEFAULT 0,
  variant_a_samples integer DEFAULT 0,
  variant_b_samples integer DEFAULT 0,
  winner text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.prometheus_ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ab tests"
  ON public.prometheus_ab_tests FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Prometheus: Agent Performance Scores (daily tracking)
CREATE TABLE IF NOT EXISTS public.agent_performance_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug text NOT NULL,
  score_date date DEFAULT CURRENT_DATE,
  empathy_score numeric DEFAULT 0,
  accuracy_score numeric DEFAULT 0,
  conversion_rate numeric DEFAULT 0,
  response_quality numeric DEFAULT 0,
  logic_gaps_found integer DEFAULT 0,
  improvements_applied integer DEFAULT 0,
  total_interactions integer DEFAULT 0,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(agent_slug, score_date)
);

ALTER TABLE public.agent_performance_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage performance scores"
  ON public.agent_performance_scores FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Prometheus: Intelligence Growth Log (for CEO Brief)
CREATE TABLE IF NOT EXISTS public.prometheus_intelligence_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug text NOT NULL,
  improvement_type text NOT NULL,
  description text NOT NULL,
  before_value numeric,
  after_value numeric,
  improvement_pct numeric,
  auto_applied boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.prometheus_intelligence_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view intelligence log"
  ON public.prometheus_intelligence_log FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for live monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.prometheus_intelligence_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_performance_scores;
