-- Content Guides - Instagram-style curated content collections
CREATE TABLE public.content_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  guide_type TEXT NOT NULL DEFAULT 'places' CHECK (guide_type IN ('places', 'products', 'posts')),
  is_published BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Guide items - can be posts, products, or places (parks/businesses)
CREATE TABLE public.guide_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id UUID NOT NULL REFERENCES public.content_guides(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('post', 'product', 'park', 'business')),
  item_id UUID NOT NULL,
  display_order INTEGER DEFAULT 0,
  note TEXT, -- User's personal note about this item
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Saved guides by users
CREATE TABLE public.saved_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  guide_id UUID NOT NULL REFERENCES public.content_guides(id) ON DELETE CASCADE,
  saved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, guide_id)
);

-- Enable RLS
ALTER TABLE public.content_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_guides ENABLE ROW LEVEL SECURITY;

-- Content guides policies
CREATE POLICY "Published guides are viewable by everyone"
ON public.content_guides FOR SELECT
USING (is_published = true);

CREATE POLICY "Users can view their own guides"
ON public.content_guides FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own guides"
ON public.content_guides FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own guides"
ON public.content_guides FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own guides"
ON public.content_guides FOR DELETE
USING (auth.uid() = user_id);

-- Guide items policies
CREATE POLICY "Guide items are viewable if guide is published"
ON public.guide_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.content_guides 
    WHERE id = guide_id AND (is_published = true OR user_id = auth.uid())
  )
);

CREATE POLICY "Users can manage items in their own guides"
ON public.guide_items FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.content_guides WHERE id = guide_id AND user_id = auth.uid())
);

CREATE POLICY "Users can update items in their own guides"
ON public.guide_items FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.content_guides WHERE id = guide_id AND user_id = auth.uid())
);

CREATE POLICY "Users can delete items from their own guides"
ON public.guide_items FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.content_guides WHERE id = guide_id AND user_id = auth.uid())
);

-- Saved guides policies
CREATE POLICY "Users can view their saved guides"
ON public.saved_guides FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can save guides"
ON public.saved_guides FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave guides"
ON public.saved_guides FOR DELETE
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_content_guides_user ON public.content_guides(user_id);
CREATE INDEX idx_content_guides_type ON public.content_guides(guide_type);
CREATE INDEX idx_content_guides_published ON public.content_guides(is_published);
CREATE INDEX idx_guide_items_guide ON public.guide_items(guide_id);
CREATE INDEX idx_guide_items_type ON public.guide_items(item_type, item_id);
CREATE INDEX idx_saved_guides_user ON public.saved_guides(user_id);
CREATE INDEX idx_saved_guides_guide ON public.saved_guides(guide_id);

-- Trigger for updating timestamps
CREATE TRIGGER update_content_guides_updated_at
BEFORE UPDATE ON public.content_guides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();