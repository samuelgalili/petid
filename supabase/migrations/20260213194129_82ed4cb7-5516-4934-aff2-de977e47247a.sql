
-- Add source_url to business_products for tracking scraped product origin
ALTER TABLE public.business_products ADD COLUMN IF NOT EXISTS source_url text;

-- Add index for cron price sync lookups
CREATE INDEX IF NOT EXISTS idx_business_products_source_url ON public.business_products (source_url) WHERE source_url IS NOT NULL;
