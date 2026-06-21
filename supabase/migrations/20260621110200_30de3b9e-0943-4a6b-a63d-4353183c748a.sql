-- ─────────────────────────────────────────────
-- 1) recommendation_feedback
-- ─────────────────────────────────────────────
CREATE TABLE public.recommendation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE,
  recommendation_type text NOT NULL,        -- 'insight' | 'product' | 'task' | 'nrc' | ...
  recommendation_id text NOT NULL,          -- free-form id of the surfaced recommendation
  feedback text NOT NULL CHECK (feedback IN ('positive','negative','irrelevant','dismissed')),
  reason text,                              -- optional free-text
  context jsonb DEFAULT '{}'::jsonb,        -- snapshot of state when feedback was given
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommendation_feedback TO authenticated;
GRANT ALL ON public.recommendation_feedback TO service_role;

ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_feedback_select" ON public.recommendation_feedback
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_feedback_insert" ON public.recommendation_feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_feedback_update" ON public.recommendation_feedback
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_feedback_delete" ON public.recommendation_feedback
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_recfb_user_created ON public.recommendation_feedback(user_id, created_at DESC);
CREATE INDEX idx_recfb_pet_type ON public.recommendation_feedback(pet_id, recommendation_type);

-- ─────────────────────────────────────────────
-- 2) pet_baselines (one row per pet, refreshed nightly)
-- ─────────────────────────────────────────────
CREATE TABLE public.pet_baselines (
  pet_id uuid PRIMARY KEY REFERENCES public.pets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avg_water_ml_per_day numeric,
  avg_kcal_per_day numeric,
  avg_task_pct numeric,                     -- 0..100
  weight_trend_kg_per_week numeric,         -- positive = gaining
  latest_weight_kg numeric,
  confidence numeric NOT NULL DEFAULT 0,    -- 0..1, based on data density
  data_days integer NOT NULL DEFAULT 0,     -- distinct days with any log in window
  anomalies jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{kind,severity,detail}, ...]
  window_days integer NOT NULL DEFAULT 14,
  computed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pet_baselines TO authenticated;
GRANT ALL ON public.pet_baselines TO service_role;

ALTER TABLE public.pet_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_baseline_select" ON public.pet_baselines
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- writes are server-side only (edge function with service_role)

CREATE TRIGGER trg_pet_baselines_updated
  BEFORE UPDATE ON public.pet_baselines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();