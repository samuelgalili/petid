
-- User feedback table
CREATE TABLE public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  message TEXT,
  route TEXT,
  sentiment TEXT DEFAULT 'neutral',
  is_angry_alert BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_feedback_sentiment ON public.user_feedback(sentiment);
CREATE INDEX idx_user_feedback_created ON public.user_feedback(created_at DESC);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can submit feedback (logged in or not)
CREATE POLICY "Anyone can insert feedback"
  ON public.user_feedback FOR INSERT
  WITH CHECK (true);

-- Admins can read all feedback
CREATE POLICY "Admins can read feedback"
  ON public.user_feedback FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Users can read own feedback
CREATE POLICY "Users can read own feedback"
  ON public.user_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can update feedback (for sentiment tagging)
CREATE POLICY "Admins can update feedback"
  ON public.user_feedback FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_feedback;

-- Rage click events table
CREATE TABLE public.rage_click_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  route TEXT NOT NULL,
  element_selector TEXT,
  element_text TEXT,
  click_count INTEGER NOT NULL DEFAULT 0,
  session_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rage_click_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert rage clicks"
  ON public.rage_click_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read rage clicks"
  ON public.rage_click_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
