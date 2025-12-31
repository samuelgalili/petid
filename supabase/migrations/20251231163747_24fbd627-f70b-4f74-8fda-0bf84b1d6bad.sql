-- Add variants column to scraped_products
ALTER TABLE scraped_products 
ADD COLUMN IF NOT EXISTS variants jsonb DEFAULT '[]'::jsonb;

-- Add additional fields that match business_products
ALTER TABLE scraped_products 
ADD COLUMN IF NOT EXISTS pet_type text,
ADD COLUMN IF NOT EXISTS weight text,
ADD COLUMN IF NOT EXISTS weight_unit text,
ADD COLUMN IF NOT EXISTS flavors text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS sizes text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS colors text[] DEFAULT '{}';