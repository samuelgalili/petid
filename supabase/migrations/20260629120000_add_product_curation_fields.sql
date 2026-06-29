ALTER TABLE public.business_products
  ADD COLUMN IF NOT EXISTS curation_status TEXT DEFAULT 'draft'
    CHECK (curation_status IN ('draft', 'auto_published', 'pending_review', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS curation_notes TEXT,
  ADD COLUMN IF NOT EXISTS curation_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS curation_reviewed_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_business_products_curation_status
  ON public.business_products(curation_status);
