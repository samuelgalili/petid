-- Add new fields to business_products table
ALTER TABLE public.business_products 
ADD COLUMN IF NOT EXISTS sku TEXT,
ADD COLUMN IF NOT EXISTS sale_price NUMERIC,
ADD COLUMN IF NOT EXISTS price_per_weight NUMERIC,
ADD COLUMN IF NOT EXISTS weight_unit TEXT,
ADD COLUMN IF NOT EXISTS flavors TEXT[],
ADD COLUMN IF NOT EXISTS needs_image_review BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS needs_price_review BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suggested_price NUMERIC,
ADD COLUMN IF NOT EXISTS price_suggestion_reason TEXT;

-- Create reference prices table for market price comparison
CREATE TABLE IF NOT EXISTS public.reference_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name TEXT NOT NULL,
  sku TEXT,
  market_price NUMERIC NOT NULL,
  source TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reference_prices ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage reference prices
CREATE POLICY "Admins can manage reference prices"
ON public.reference_prices
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reference_prices_sku ON public.reference_prices(sku);
CREATE INDEX IF NOT EXISTS idx_reference_prices_name ON public.reference_prices(product_name);
CREATE INDEX IF NOT EXISTS idx_business_products_sku ON public.business_products(sku);