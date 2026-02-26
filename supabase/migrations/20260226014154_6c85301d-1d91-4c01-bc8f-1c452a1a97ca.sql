
CREATE TABLE public.system_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_source TEXT NOT NULL DEFAULT 'client',
  error_type TEXT NOT NULL DEFAULT 'runtime',
  message TEXT NOT NULL,
  stack_trace TEXT,
  component TEXT,
  route TEXT,
  severity TEXT NOT NULL DEFAULT 'error',
  occurrence_count INT NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'open',
  triage_notes TEXT,
  triaged_by UUID,
  resolved_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_system_error_logs_status ON public.system_error_logs(status);
CREATE INDEX idx_system_error_logs_severity ON public.system_error_logs(severity);

ALTER TABLE public.system_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read system error logs"
  ON public.system_error_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update system error logs"
  ON public.system_error_logs FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Anyone can insert error logs"
  ON public.system_error_logs FOR INSERT
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.system_error_logs;
