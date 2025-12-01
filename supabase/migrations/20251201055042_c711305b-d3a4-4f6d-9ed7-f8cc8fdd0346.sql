-- Create dog_parks table
CREATE TABLE public.dog_parks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  coordinates POINT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  google_maps_link TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'maintenance', 'unknown')),
  size TEXT CHECK (size IN ('small', 'medium', 'large', 'unknown')),
  fencing BOOLEAN DEFAULT false,
  water BOOLEAN DEFAULT false,
  shade BOOLEAN DEFAULT false,
  agility BOOLEAN DEFAULT false,
  parking BOOLEAN DEFAULT false,
  lighting BOOLEAN DEFAULT false,
  notes TEXT,
  source TEXT,
  verified BOOLEAN DEFAULT false,
  rating DECIMAL(2, 1) CHECK (rating >= 0 AND rating <= 5),
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create index for city searches
CREATE INDEX idx_dog_parks_city ON public.dog_parks(city);
CREATE INDEX idx_dog_parks_status ON public.dog_parks(status);
CREATE INDEX idx_dog_parks_coordinates ON public.dog_parks USING GIST(coordinates);

-- Enable Row Level Security
ALTER TABLE public.dog_parks ENABLE ROW LEVEL SECURITY;

-- Public can view active parks
CREATE POLICY "Anyone can view active dog parks"
ON public.dog_parks
FOR SELECT
USING (status = 'active' OR auth.uid() IS NOT NULL);

-- Authenticated users can view all parks
CREATE POLICY "Authenticated users can view all parks"
ON public.dog_parks
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins can insert/update/delete parks
CREATE POLICY "Admins can insert dog parks"
ON public.dog_parks
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update dog parks"
ON public.dog_parks
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete dog parks"
ON public.dog_parks
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_dog_parks_updated_at
BEFORE UPDATE ON public.dog_parks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data for major Israeli cities
INSERT INTO public.dog_parks (name, city, address, latitude, longitude, status, size, fencing, water, shade, agility, parking, notes, source, verified) VALUES
('גינת כלבים פארק הירקון', 'תל אביב', 'פארק הירקון, ליד רוקח', 32.1133, 34.8050, 'active', 'large', true, true, true, true, true, 'גינה גדולה ומגודרת עם אזורים מוצלים ומתקני אג''יליטי', 'עיריית תל אביב', true),
('גינת כלבים גן העצמאות', 'תל אביב', 'גן העצמאות, רחוב דיזנגוף', 32.0749, 34.7743, 'active', 'medium', true, true, true, false, false, 'גינה מרכזית במרכז העיר', 'עיריית תל אביב', true),
('גינת כלבים פארק מדרון', 'ירושלים', 'שכונת גונן, פארק מדרון', 31.7683, 35.2014, 'active', 'large', true, true, true, true, true, 'גינה גדולה עם שטח מתאים לריצה חופשית', 'עיריית ירושלים', true),
('גינת כלבים גן סאקר', 'ירושלים', 'גן סאקר, ליד הקניון הגדול', 31.7644, 35.2097, 'active', 'medium', true, true, false, false, true, 'גינה נגישה במרכז העיר', 'עיריית ירושלים', true),
('גינת כלבים פארק דניאל', 'חיפה', 'פארק דניאל, שכונת כרמל', 32.8047, 34.9908, 'active', 'medium', true, true, true, false, true, 'גינה עם נוף לים', 'עיריית חיפה', true),
('גינת כלבים נווה שאנן', 'חיפה', 'נווה שאנן, ליד המרכז המסחרי', 32.7870, 35.0023, 'active', 'small', true, true, false, false, false, 'גינה קטנה ונעימה לשכונה', 'עיריית חיפה', true);

COMMENT ON TABLE public.dog_parks IS 'Stores information about dog parks across Israel with facilities, location, and status tracking';