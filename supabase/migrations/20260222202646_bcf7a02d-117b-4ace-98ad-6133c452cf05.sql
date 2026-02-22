
-- Add supplier-related columns to business_products (IF NOT EXISTS handles duplicates)
ALTER TABLE public.business_products
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id),
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC,
  ADD COLUMN IF NOT EXISTS safety_score INTEGER,
  ADD COLUMN IF NOT EXISTS kcal_per_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS api_sync_enabled BOOLEAN DEFAULT false;

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_business_products_supplier ON public.business_products(supplier_id);
