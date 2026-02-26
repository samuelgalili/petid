
-- UI visual audit logs for Ofek
CREATE TABLE public.ui_visual_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_run_id UUID NOT NULL DEFAULT gen_random_uuid(),
  route TEXT NOT NULL,
  element_type TEXT NOT NULL DEFAULT 'button',
  element_label TEXT,
  issue_type TEXT NOT NULL DEFAULT 'render_error',
  severity TEXT NOT NULL DEFAULT 'warning',
  is_critical_path BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  suggested_fix TEXT,
  fix_applied BOOLEAN NOT NULL DEFAULT false,
  fix_card_id UUID REFERENCES public.architect_evolution_cards(id),
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ui_audit_status ON public.ui_visual_audit_logs(status);
CREATE INDEX idx_ui_audit_severity ON public.ui_visual_audit_logs(severity);
CREATE INDEX idx_ui_audit_run ON public.ui_visual_audit_logs(audit_run_id);

ALTER TABLE public.ui_visual_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ui audit logs"
  ON public.ui_visual_audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service can insert ui audit logs"
  ON public.ui_visual_audit_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update ui audit logs"
  ON public.ui_visual_audit_logs FOR UPDATE
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.ui_visual_audit_logs;
