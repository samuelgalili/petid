
-- Insurance claims table for Libra refund tracking
CREATE TABLE public.insurance_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pet_id UUID NOT NULL,
  pet_name TEXT,
  pet_microchip TEXT,
  owner_name TEXT,
  owner_id_number TEXT,
  clinic_name TEXT,
  visit_date DATE,
  diagnosis TEXT,
  treatment TEXT,
  total_amount NUMERIC(10,2),
  receipt_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  status_note TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  paid_amount NUMERIC(10,2),
  deductible_amount NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;

-- Users can view their own claims
CREATE POLICY "Users can view own claims"
ON public.insurance_claims FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own claims
CREATE POLICY "Users can create own claims"
ON public.insurance_claims FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own claims
CREATE POLICY "Users can update own claims"
ON public.insurance_claims FOR UPDATE
USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE TRIGGER update_insurance_claims_updated_at
BEFORE UPDATE ON public.insurance_claims
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
