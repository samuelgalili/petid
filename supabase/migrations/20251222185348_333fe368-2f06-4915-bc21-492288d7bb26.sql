-- Product Collections for organizing products
CREATE TABLE public.product_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view collections"
ON public.product_collections FOR SELECT
USING (true);

CREATE POLICY "Business owners can manage collections"
ON public.product_collections FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.business_profiles 
    WHERE id = product_collections.business_id AND user_id = auth.uid()
  )
);

-- Collection Products (many-to-many)
CREATE TABLE public.collection_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.product_collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.business_products(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(collection_id, product_id)
);

ALTER TABLE public.collection_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view collection products"
ON public.collection_products FOR SELECT
USING (true);

CREATE POLICY "Business owners can manage collection products"
ON public.collection_products FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.product_collections pc
    JOIN public.business_profiles bp ON bp.id = pc.business_id
    WHERE pc.id = collection_products.collection_id AND bp.user_id = auth.uid()
  )
);

-- Story Product Tags
CREATE TABLE public.story_product_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.business_products(id) ON DELETE CASCADE,
  position_x DECIMAL(5,2) DEFAULT 50,
  position_y DECIMAL(5,2) DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.story_product_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view story product tags"
ON public.story_product_tags FOR SELECT
USING (true);

CREATE POLICY "Story owners can manage product tags"
ON public.story_product_tags FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.stories 
    WHERE id = story_product_tags.story_id AND user_id = auth.uid()
  )
);

-- Live Shopping Sessions
CREATE TABLE public.live_shopping_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'scheduled',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  viewer_count INTEGER DEFAULT 0,
  stream_url TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.live_shopping_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live sessions"
ON public.live_shopping_sessions FOR SELECT
USING (true);

CREATE POLICY "Business owners can manage live sessions"
ON public.live_shopping_sessions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.business_profiles 
    WHERE id = live_shopping_sessions.business_id AND user_id = auth.uid()
  )
);

-- Live Shopping Products (products featured in a live session)
CREATE TABLE public.live_shopping_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.live_shopping_sessions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.business_products(id) ON DELETE CASCADE,
  featured_at TIMESTAMPTZ,
  sale_price DECIMAL(10,2),
  sales_count INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  UNIQUE(session_id, product_id)
);

ALTER TABLE public.live_shopping_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live products"
ON public.live_shopping_products FOR SELECT
USING (true);

CREATE POLICY "Business owners can manage live products"
ON public.live_shopping_products FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.live_shopping_sessions ls
    JOIN public.business_profiles bp ON bp.id = ls.business_id
    WHERE ls.id = live_shopping_products.session_id AND bp.user_id = auth.uid()
  )
);