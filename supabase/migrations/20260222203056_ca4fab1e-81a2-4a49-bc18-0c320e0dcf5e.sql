
-- Enrich suppliers table with e-commerce fields
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS api_endpoint TEXT,
  ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS shipping_days INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'net30',
  ADD COLUMN IF NOT EXISTS logo_url TEXT;
