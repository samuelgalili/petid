
-- Create pet care plans table for tracking products added to a pet's care plan
CREATE TABLE public.pet_care_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  product_price NUMERIC,
  safety_score NUMERIC,
  is_scientist_approved BOOLEAN DEFAULT false,
  category TEXT,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pet_care_plans ENABLE ROW LEVEL SECURITY;

-- Users can manage their own care plans
CREATE POLICY "Users can view own care plans" ON public.pet_care_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own care plans" ON public.pet_care_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own care plans" ON public.pet_care_plans FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pet_care_plans;
