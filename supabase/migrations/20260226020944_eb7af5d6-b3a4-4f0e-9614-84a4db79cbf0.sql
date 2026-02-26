
-- Evolution Cards table for Ido's AI-generated suggestions
CREATE TABLE public.architect_evolution_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight TEXT NOT NULL,
  solution TEXT NOT NULL,
  code_before TEXT,
  code_after TEXT,
  file_path TEXT,
  component TEXT,
  category TEXT NOT NULL DEFAULT 'ui', -- 'ui', 'performance', 'security', 'ux', 'data'
  confidence NUMERIC(3,2) DEFAULT 0.80,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'approved', 'deployed', 'rolled_back', 'dismissed'
  deploy_pr_url TEXT,
  deploy_commit_sha TEXT,
  deployed_at TIMESTAMPTZ,
  deployed_by UUID,
  rollback_reason TEXT,
  error_source_id UUID REFERENCES public.system_error_logs(id),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_architect_cards_status ON public.architect_evolution_cards(status);

ALTER TABLE public.architect_evolution_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage evolution cards"
  ON public.architect_evolution_cards FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.architect_evolution_cards;
