
CREATE TABLE public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'click', 'scroll', 'exit', 'stay')),
  route TEXT NOT NULL,
  route_label TEXT,
  time_spent_seconds INTEGER,
  scroll_depth INTEGER,
  element_id TEXT,
  element_label TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ual_user_id ON public.user_activity_logs(user_id);
CREATE INDEX idx_ual_session ON public.user_activity_logs(session_id);
CREATE INDEX idx_ual_created ON public.user_activity_logs(created_at DESC);
CREATE INDEX idx_ual_event_type ON public.user_activity_logs(event_type);

ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can insert their own logs
CREATE POLICY "Users can insert own activity" ON public.user_activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can read all logs
CREATE POLICY "Admins can read all activity" ON public.user_activity_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activity_logs;
