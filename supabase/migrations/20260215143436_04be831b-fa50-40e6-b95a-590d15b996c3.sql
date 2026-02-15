-- Add rich product data columns to business_products
ALTER TABLE public.business_products
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS ingredients TEXT,
  ADD COLUMN IF NOT EXISTS benefits JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS feeding_guide JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS product_attributes JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS life_stage TEXT,
  ADD COLUMN IF NOT EXISTS dog_size TEXT,
  ADD COLUMN IF NOT EXISTS special_diet TEXT[];