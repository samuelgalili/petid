
-- Add medical_conditions array column to pets table
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS medical_conditions TEXT[] DEFAULT NULL;
