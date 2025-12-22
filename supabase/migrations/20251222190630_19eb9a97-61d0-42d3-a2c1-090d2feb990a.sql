-- Wishlists / Saved Products
CREATE TABLE public.wishlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.business_products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notify_on_sale BOOLEAN DEFAULT true,
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wishlist" ON public.wishlists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own wishlist" ON public.wishlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their own wishlist" ON public.wishlists
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wishlist items" ON public.wishlists
  FOR UPDATE USING (auth.uid() = user_id);

-- Product Reviews
CREATE TABLE public.product_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.business_products(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  photos TEXT[],
  is_verified_purchase BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product reviews" ON public.product_reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own reviews" ON public.product_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON public.product_reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" ON public.product_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- Price Drop Alerts
CREATE TABLE public.price_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.business_products(id) ON DELETE CASCADE,
  target_price NUMERIC,
  original_price NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own price alerts" ON public.price_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own price alerts" ON public.price_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own price alerts" ON public.price_alerts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own price alerts" ON public.price_alerts
  FOR DELETE USING (auth.uid() = user_id);

-- Product Guides
CREATE TABLE public.product_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published guides" ON public.product_guides
  FOR SELECT USING (is_published = true);

CREATE POLICY "Business owners can manage their guides" ON public.product_guides
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles
      WHERE id = business_id AND user_id = auth.uid()
    )
  );

-- Guide Products (many-to-many)
CREATE TABLE public.guide_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id UUID NOT NULL REFERENCES public.product_guides(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.business_products(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(guide_id, product_id)
);

ALTER TABLE public.guide_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view guide products" ON public.guide_products
  FOR SELECT USING (true);

CREATE POLICY "Guide owners can manage products" ON public.guide_products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.product_guides g
      JOIN public.business_profiles b ON g.business_id = b.id
      WHERE g.id = guide_id AND b.user_id = auth.uid()
    )
  );

-- Reel Product Tags
CREATE TABLE public.reel_product_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.business_products(id) ON DELETE CASCADE,
  position_x NUMERIC DEFAULT 50,
  position_y NUMERIC DEFAULT 50,
  timestamp_seconds NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, product_id)
);

ALTER TABLE public.reel_product_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reel product tags" ON public.reel_product_tags
  FOR SELECT USING (true);

CREATE POLICY "Post owners can manage reel product tags" ON public.reel_product_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE id = post_id AND user_id = auth.uid()
    )
  );

-- Order Tracking
CREATE TABLE public.order_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  description TEXT,
  location TEXT,
  tracking_number TEXT,
  carrier TEXT,
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.order_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tracking for their orders" ON public.order_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all tracking" ON public.order_tracking
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add review stats to products
ALTER TABLE public.business_products 
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating NUMERIC(2,1) DEFAULT 0;

-- Function to update product review stats
CREATE OR REPLACE FUNCTION public.update_product_review_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.business_products
    SET 
      review_count = (SELECT COUNT(*) FROM public.product_reviews WHERE product_id = NEW.product_id),
      average_rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM public.product_reviews WHERE product_id = NEW.product_id)
    WHERE id = NEW.product_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.business_products
    SET 
      review_count = (SELECT COUNT(*) FROM public.product_reviews WHERE product_id = OLD.product_id),
      average_rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM public.product_reviews WHERE product_id = OLD.product_id), 0)
    WHERE id = OLD.product_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_product_review_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_product_review_stats();