
-- Add smart intelligence & subscription columns to business_products
ALTER TABLE public.business_products
  ADD COLUMN IF NOT EXISTS medical_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS breed_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS auto_restock BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS restock_interval_days INTEGER DEFAULT NULL;
