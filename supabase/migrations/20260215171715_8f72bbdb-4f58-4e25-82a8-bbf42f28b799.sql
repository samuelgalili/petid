
-- Create product_variants table for weight, color, size, protein type variants
CREATE TABLE public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.business_products(id) ON DELETE CASCADE,
  variant_type TEXT NOT NULL, -- 'weight', 'color', 'size', 'protein'
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  weight_kg NUMERIC NULL,
  weight_unit TEXT NULL,
  price NUMERIC NULL,
  sale_price NUMERIC NULL,
  sku TEXT NULL,
  in_stock BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Public read access (products are public)
CREATE POLICY "Anyone can view product variants"
  ON public.product_variants FOR SELECT USING (true);

-- Authenticated users can manage variants (admin)
CREATE POLICY "Authenticated users can insert variants"
  ON public.product_variants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update variants"
  ON public.product_variants FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete variants"
  ON public.product_variants FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Index for fast lookups
CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);

-- Trigger for updated_at
CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
