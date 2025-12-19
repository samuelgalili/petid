-- Create business_products table for shop functionality
CREATE TABLE public.business_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  image_url TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  category TEXT,
  in_stock BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create post_product_tags table for tagging products in posts
CREATE TABLE public.post_product_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.business_products(id) ON DELETE CASCADE NOT NULL,
  position_x DECIMAL(5,2) DEFAULT 50,
  position_y DECIMAL(5,2) DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_product_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for business_products
CREATE POLICY "Anyone can view products" 
ON public.business_products 
FOR SELECT 
USING (true);

CREATE POLICY "Business owners can manage their products" 
ON public.business_products 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.business_profiles 
    WHERE id = business_id AND user_id = auth.uid()
  )
);

-- RLS policies for post_product_tags
CREATE POLICY "Anyone can view product tags" 
ON public.post_product_tags 
FOR SELECT 
USING (true);

CREATE POLICY "Post owners can manage product tags" 
ON public.post_product_tags 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE id = post_id AND user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_business_products_business ON public.business_products(business_id);
CREATE INDEX idx_business_products_category ON public.business_products(category);
CREATE INDEX idx_post_product_tags_post ON public.post_product_tags(post_id);
CREATE INDEX idx_post_product_tags_product ON public.post_product_tags(product_id);