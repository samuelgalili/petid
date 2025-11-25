-- Create promotional_offers table for dynamic rewards carousel
CREATE TABLE IF NOT EXISTS public.promotional_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  badge_text TEXT NOT NULL,
  gradient_from TEXT NOT NULL DEFAULT '#F59E0B',
  gradient_to TEXT NOT NULL DEFAULT '#EA580C',
  button_text TEXT NOT NULL DEFAULT 'Shop Now',
  button_link TEXT NOT NULL DEFAULT '/shop',
  button_color TEXT NOT NULL DEFAULT 'orange-600',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.promotional_offers ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active offers (public content, no sensitive data)
CREATE POLICY "Anyone can view active offers"
ON public.promotional_offers
FOR SELECT
USING (is_active = true);

-- Policy: Only admins can insert offers
CREATE POLICY "Admins can insert offers"
ON public.promotional_offers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Only admins can update offers
CREATE POLICY "Admins can update offers"
ON public.promotional_offers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy: Only admins can delete offers
CREATE POLICY "Admins can delete offers"
ON public.promotional_offers
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Insert initial promotional offers
INSERT INTO public.promotional_offers (title, subtitle, badge_text, gradient_from, gradient_to, button_text, button_link, button_color, display_order) VALUES
('20% Off', 'Premium Pet Food', 'LIMITED TIME', '#F59E0B', '#EA580C', 'Shop Now', '/shop', 'orange-600', 1),
('Free Shipping', 'On orders over ₪199', 'THIS WEEK', '#3B82F6', '#06B6D4', 'Shop Now', '/shop', 'blue-600', 2),
('2x Points', 'Complete tasks today', 'MEMBERS ONLY', '#A855F7', '#EC4899', 'Start Tasks', '/tasks', 'purple-600', 3),
('New Arrivals', 'Fresh toys & treats', 'NEW', '#10B981', '#059669', 'Explore', '/shop', 'green-600', 4);

-- Create index for faster queries
CREATE INDEX idx_promotional_offers_active_order ON public.promotional_offers(is_active, display_order) WHERE is_active = true;