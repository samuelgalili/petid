-- Add missing fields to pets table for complete pet profile
ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS weight_unit TEXT DEFAULT 'kg',
ADD COLUMN IF NOT EXISTS has_insurance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS insurance_company TEXT,
ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT,
ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE,
ADD COLUMN IF NOT EXISTS last_vet_visit DATE,
ADD COLUMN IF NOT EXISTS next_vet_visit DATE,
ADD COLUMN IF NOT EXISTS vet_name TEXT,
ADD COLUMN IF NOT EXISTS vet_clinic TEXT,
ADD COLUMN IF NOT EXISTS vet_phone TEXT;

-- Create vaccinations table for tracking pet vaccinations
CREATE TABLE IF NOT EXISTS public.pet_vaccinations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vaccine_name TEXT NOT NULL,
  vaccination_date DATE NOT NULL,
  expiry_date DATE,
  administered_by TEXT,
  batch_number TEXT,
  notes TEXT,
  document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on vaccinations table
ALTER TABLE public.pet_vaccinations ENABLE ROW LEVEL SECURITY;

-- RLS policies for pet_vaccinations
CREATE POLICY "Users can view their own pet vaccinations"
ON public.pet_vaccinations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pet vaccinations"
ON public.pet_vaccinations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pet vaccinations"
ON public.pet_vaccinations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pet vaccinations"
ON public.pet_vaccinations FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all vaccinations
CREATE POLICY "Admins can view all pet vaccinations"
ON public.pet_vaccinations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create vet visits table
CREATE TABLE IF NOT EXISTS public.pet_vet_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  visit_date DATE NOT NULL,
  visit_type TEXT, -- checkup, emergency, vaccination, surgery, etc.
  vet_name TEXT,
  clinic_name TEXT,
  diagnosis TEXT,
  treatment TEXT,
  notes TEXT,
  cost DECIMAL(10,2),
  document_url TEXT,
  next_visit_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on vet visits table
ALTER TABLE public.pet_vet_visits ENABLE ROW LEVEL SECURITY;

-- RLS policies for pet_vet_visits
CREATE POLICY "Users can view their own pet vet visits"
ON public.pet_vet_visits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pet vet visits"
ON public.pet_vet_visits FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pet vet visits"
ON public.pet_vet_visits FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pet vet visits"
ON public.pet_vet_visits FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all vet visits
CREATE POLICY "Admins can view all pet vet visits"
ON public.pet_vet_visits FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);