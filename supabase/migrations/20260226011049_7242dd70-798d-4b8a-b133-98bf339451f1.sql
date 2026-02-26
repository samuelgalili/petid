-- Predictive consumption tracking
CREATE TABLE IF NOT EXISTS public.food_consumption_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.business_products(id),
  product_name TEXT,
  bag_weight_kg NUMERIC NOT NULL DEFAULT 0,
  daily_intake_grams NUMERIC NOT NULL DEFAULT 0,
  days_remaining NUMERIC NOT NULL DEFAULT 0,
  estimated_empty_date DATE,
  mer_kcal NUMERIC,
  pet_weight_kg NUMERIC,
  kcal_per_kg NUMERIC,
  notification_sent BOOLEAN DEFAULT false,
  reorder_triggered BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.food_consumption_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access food_consumption_predictions"
  ON public.food_consumption_predictions FOR ALL
  USING (true) WITH CHECK (true);

-- Enable realtime on key tables for Command Center
ALTER PUBLICATION supabase_realtime ADD TABLE public.food_consumption_predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.insurance_leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_bots;
