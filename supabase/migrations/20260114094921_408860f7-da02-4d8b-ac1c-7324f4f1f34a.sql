-- Create competitors table to store competitor URLs for price comparison
CREATE TABLE public.price_competitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  logo_emoji TEXT DEFAULT '🏪',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_competitors ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read competitors
CREATE POLICY "Anyone can view competitors" 
ON public.price_competitors 
FOR SELECT 
USING (true);

-- Only admins can manage competitors
CREATE POLICY "Admins can manage competitors" 
ON public.price_competitors 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_price_competitors_updated_at
BEFORE UPDATE ON public.price_competitors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default Israeli pet store competitors
INSERT INTO public.price_competitors (name, domain, logo_emoji) VALUES
('פטשופ', 'petshop.co.il', '🐕'),
('זופלוס', 'zooplus.co.il', '🐱'),
('פט סיטי', 'petcity.co.il', '🦮'),
('חיות כיף', 'hayotkef.co.il', '🐾'),
('לייק אנימל', 'likeanimal.co.il', '🐶'),
('פט פוד', 'petfood.co.il', '🍖'),
('מאסטר פט', 'masterpet.co.il', '🎾');
