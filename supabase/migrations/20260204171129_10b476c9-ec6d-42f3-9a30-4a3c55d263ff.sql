-- Add size and weight columns to pets table
ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS size TEXT,
ADD COLUMN IF NOT EXISTS weight DECIMAL;