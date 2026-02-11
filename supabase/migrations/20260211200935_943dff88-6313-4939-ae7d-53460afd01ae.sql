
-- Create insurance_leads table for capturing leads from chat insurance flow
CREATE TABLE public.insurance_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pet_id UUID NULL,
  pet_name TEXT NOT NULL,
  pet_type TEXT NOT NULL DEFAULT 'dog',
  breed TEXT NULL,
  age_years NUMERIC NULL,
  phone TEXT NOT NULL,
  health_answer_1 TEXT NULL,
  health_answer_2 TEXT NULL,
  selected_plan TEXT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.insurance_leads ENABLE ROW LEVEL SECURITY;

-- Users can insert their own leads
CREATE POLICY "Users can insert own insurance leads"
ON public.insurance_leads FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own leads
CREATE POLICY "Users can view own insurance leads"
ON public.insurance_leads FOR SELECT
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_insurance_leads_updated_at
BEFORE UPDATE ON public.insurance_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
