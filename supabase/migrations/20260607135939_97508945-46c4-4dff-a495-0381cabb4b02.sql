
-- ============================================================
-- pet_insights — ranked, cached insights per pet
-- ============================================================
CREATE TABLE public.pet_insights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id          UUID NOT NULL,
  user_id         UUID NOT NULL,
  insight_key     TEXT NOT NULL, -- stable dedupe key, e.g. "weight_loss_30d"
  tier            SMALLINT NOT NULL CHECK (tier BETWEEN 1 AND 5),
  category        TEXT NOT NULL, -- 'sos' | 'care_plan' | 'data_gap' | 'milestone' | 'predictive'
  confidence      NUMERIC(3,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  hero_text       TEXT NOT NULL,
  hero_subtext    TEXT,
  cta_label       TEXT,
  cta_action      TEXT, -- 'open_sheet:vault' | 'navigate:/chat' | 'add_record:weight' | ...
  icon_name       TEXT, -- lucide icon name
  payload         JSONB DEFAULT '{}'::jsonb,
  valid_until     TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '6 hours'),
  dismissed_at    TIMESTAMPTZ,
  acted_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pet_id, insight_key)
);

CREATE INDEX idx_pet_insights_lookup
  ON public.pet_insights (pet_id, tier, confidence DESC, valid_until)
  WHERE dismissed_at IS NULL AND acted_at IS NULL;

CREATE INDEX idx_pet_insights_user ON public.pet_insights (user_id);

GRANT SELECT, UPDATE ON public.pet_insights TO authenticated;
GRANT ALL ON public.pet_insights TO service_role;

ALTER TABLE public.pet_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their pet insights"
  ON public.pet_insights FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can update (dismiss/act) their pet insights"
  ON public.pet_insights FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- insight_surface_log — cross-surface dedupe (24h)
-- ============================================================
CREATE TABLE public.insight_surface_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id   UUID NOT NULL REFERENCES public.pet_insights(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL,
  surface      TEXT NOT NULL CHECK (surface IN ('dashboard','chat','feed')),
  shown_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_insight_surface_recent
  ON public.insight_surface_log (insight_id, shown_at DESC);

CREATE INDEX idx_insight_surface_user
  ON public.insight_surface_log (user_id, shown_at DESC);

GRANT SELECT ON public.insight_surface_log TO authenticated;
GRANT ALL ON public.insight_surface_log TO service_role;

ALTER TABLE public.insight_surface_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their surface log"
  ON public.insight_surface_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pet_insights_touch
  BEFORE UPDATE ON public.pet_insights
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
