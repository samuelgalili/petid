
-- Manufacturer feeding guidelines per product
-- Each row = one line in the manufacturer's feeding table on the bag
CREATE TABLE public.product_feeding_guidelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.business_products(id) ON DELETE CASCADE,
  weight_min_kg NUMERIC(5,1) NOT NULL,
  weight_max_kg NUMERIC(5,1) NOT NULL,
  age_group VARCHAR(30) DEFAULT 'adult',
  -- puppy, junior, adult, senior
  grams_per_day_min INTEGER NOT NULL,
  grams_per_day_max INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by product
CREATE INDEX idx_feeding_guidelines_product ON public.product_feeding_guidelines(product_id);

-- Index for weight-based queries
CREATE INDEX idx_feeding_guidelines_weight ON public.product_feeding_guidelines(weight_min_kg, weight_max_kg);

-- Enable RLS
ALTER TABLE public.product_feeding_guidelines ENABLE ROW LEVEL SECURITY;

-- Everyone can read feeding guidelines (public product info)
CREATE POLICY "Feeding guidelines are publicly readable"
ON public.product_feeding_guidelines
FOR SELECT
USING (true);

-- Only business owners can manage their product guidelines
CREATE POLICY "Business owners can manage feeding guidelines"
ON public.product_feeding_guidelines
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.business_products bp
    JOIN public.business_profiles bpr ON bp.business_id = bpr.id
    WHERE bp.id = product_feeding_guidelines.product_id
    AND bpr.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_feeding_guidelines_updated_at
BEFORE UPDATE ON public.product_feeding_guidelines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
