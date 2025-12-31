-- Create enum for stock status
CREATE TYPE public.stock_status AS ENUM ('in_stock', 'out_of_stock', 'preorder', 'unknown');

-- Create scraped_products table
CREATE TABLE public.scraped_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT,
  sku TEXT,
  product_name TEXT NOT NULL,
  product_url TEXT UNIQUE NOT NULL,
  brand TEXT,
  category_path TEXT,
  main_category TEXT,
  sub_category TEXT,
  regular_price DECIMAL(10,2),
  sale_price DECIMAL(10,2),
  final_price DECIMAL(10,2),
  currency TEXT DEFAULT '₪',
  discount_text TEXT,
  stock_status stock_status DEFAULT 'unknown',
  stock_badge TEXT,
  short_description TEXT,
  long_description TEXT,
  long_description_html TEXT,
  bullet_points TEXT[],
  technical_details JSONB,
  nutrition_info JSONB,
  ingredients TEXT,
  usage_instructions TEXT,
  warnings TEXT,
  main_image_url TEXT,
  meta_title TEXT,
  meta_description TEXT,
  h1_title TEXT,
  canonical_url TEXT,
  json_ld_data JSONB,
  shipping_info TEXT,
  return_info TEXT,
  badges TEXT[],
  rating DECIMAL(2,1),
  review_count INTEGER DEFAULT 0,
  sample_review TEXT,
  data_attributes JSONB,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create product_variations table
CREATE TABLE public.product_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.scraped_products(id) ON DELETE CASCADE,
  variation_name TEXT NOT NULL,
  variation_value TEXT,
  variation_price DECIMAL(10,2),
  variation_sku TEXT,
  variation_stock_status stock_status DEFAULT 'unknown',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create product_images table
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.scraped_products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  is_main BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create scraping_jobs table for tracking progress
CREATE TABLE public.scraping_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  total_pages INTEGER DEFAULT 0,
  scraped_pages INTEGER DEFAULT 0,
  total_products INTEGER DEFAULT 0,
  scraped_products INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_scraped_products_category ON public.scraped_products(main_category);
CREATE INDEX idx_scraped_products_stock ON public.scraped_products(stock_status);
CREATE INDEX idx_scraped_products_price ON public.scraped_products(final_price);
CREATE INDEX idx_product_variations_product ON public.product_variations(product_id);
CREATE INDEX idx_product_images_product ON public.product_images(product_id);

-- Enable RLS
ALTER TABLE public.scraped_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraping_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin access (authenticated users can manage)
CREATE POLICY "Authenticated users can manage scraped_products"
ON public.scraped_products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage product_variations"
ON public.product_variations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage product_images"
ON public.product_images FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage scraping_jobs"
ON public.scraping_jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime for scraping_jobs
ALTER PUBLICATION supabase_realtime ADD TABLE public.scraping_jobs;