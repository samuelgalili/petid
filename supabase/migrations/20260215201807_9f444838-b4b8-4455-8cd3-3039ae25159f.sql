
-- Add encrypted ID number to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_number_encrypted text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_number_last4 text;

-- Add vet clinic info to pets table
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS vet_clinic_name text;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS vet_clinic_phone text;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS vet_clinic_address text;

-- RLS: id_number columns are protected by existing profiles policies (users can only update their own)
