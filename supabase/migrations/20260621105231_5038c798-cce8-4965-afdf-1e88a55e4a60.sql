-- ─────────────────────────────────────────────────────────
-- 1. pet_feeding_logs
-- ─────────────────────────────────────────────────────────
CREATE TABLE public.pet_feeding_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  pet_id        uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  logged_at     timestamptz NOT NULL DEFAULT now(),
  meal_type     text NOT NULL DEFAULT 'meal',  -- morning|noon|evening|snack|meal
  food_name     text,
  amount_g      numeric(8,2),
  kcal          numeric(8,2),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pet_feeding_logs TO authenticated;
GRANT ALL ON public.pet_feeding_logs TO service_role;
ALTER TABLE public.pet_feeding_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own feeding logs"
  ON public.pet_feeding_logs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_feeding_logs_pet_logged ON public.pet_feeding_logs (pet_id, logged_at DESC);
CREATE INDEX idx_feeding_logs_user       ON public.pet_feeding_logs (user_id);

CREATE TRIGGER trg_feeding_logs_updated_at
  BEFORE UPDATE ON public.pet_feeding_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─────────────────────────────────────────────────────────
-- 2. pet_water_logs
-- ─────────────────────────────────────────────────────────
CREATE TABLE public.pet_water_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  pet_id      uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  logged_at   timestamptz NOT NULL DEFAULT now(),
  amount_ml   integer NOT NULL,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pet_water_logs TO authenticated;
GRANT ALL ON public.pet_water_logs TO service_role;
ALTER TABLE public.pet_water_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own water logs"
  ON public.pet_water_logs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_water_logs_pet_logged ON public.pet_water_logs (pet_id, logged_at DESC);
CREATE INDEX idx_water_logs_user       ON public.pet_water_logs (user_id);

CREATE TRIGGER trg_water_logs_updated_at
  BEFORE UPDATE ON public.pet_water_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─────────────────────────────────────────────────────────
-- 3. pet_weight_logs
-- ─────────────────────────────────────────────────────────
CREATE TABLE public.pet_weight_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  pet_id      uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  measured_at timestamptz NOT NULL DEFAULT now(),
  weight_kg   numeric(6,2) NOT NULL,
  source      text NOT NULL DEFAULT 'manual',  -- manual|scale|vet|estimate
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pet_weight_logs TO authenticated;
GRANT ALL ON public.pet_weight_logs TO service_role;
ALTER TABLE public.pet_weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own weight logs"
  ON public.pet_weight_logs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_weight_logs_pet_measured ON public.pet_weight_logs (pet_id, measured_at DESC);
CREATE INDEX idx_weight_logs_user         ON public.pet_weight_logs (user_id);

CREATE TRIGGER trg_weight_logs_updated_at
  BEFORE UPDATE ON public.pet_weight_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─────────────────────────────────────────────────────────
-- 4. pet_daily_tasks
-- ─────────────────────────────────────────────────────────
CREATE TABLE public.pet_daily_tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  pet_id      uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  task_date   date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jerusalem')::date,
  task_key    text NOT NULL,            -- walk_morning|feed_morning|water|play|walk_evening|feed_evening|grooming|health_check
  completed   boolean NOT NULL DEFAULT true,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pet_daily_tasks_unique UNIQUE (pet_id, task_date, task_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pet_daily_tasks TO authenticated;
GRANT ALL ON public.pet_daily_tasks TO service_role;
ALTER TABLE public.pet_daily_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own daily tasks"
  ON public.pet_daily_tasks FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_daily_tasks_pet_date ON public.pet_daily_tasks (pet_id, task_date DESC);
CREATE INDEX idx_daily_tasks_user     ON public.pet_daily_tasks (user_id);

CREATE TRIGGER trg_daily_tasks_updated_at
  BEFORE UPDATE ON public.pet_daily_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();