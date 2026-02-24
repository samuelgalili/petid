-- Add license-related columns to pets table
ALTER TABLE public.pets 
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS license_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS license_renewal_date DATE;