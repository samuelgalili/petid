-- Create adoption_pets table for pets available for adoption
CREATE TABLE IF NOT EXISTS public.adoption_pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  breed TEXT,
  age_years INTEGER,
  age_months INTEGER,
  gender TEXT,
  size TEXT NOT NULL,
  description TEXT,
  special_needs TEXT,
  is_vaccinated BOOLEAN DEFAULT false,
  is_neutered BOOLEAN DEFAULT false,
  image_url TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'pending', 'adopted')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create adoption_requests table for adoption applications
CREATE TABLE IF NOT EXISTS public.adoption_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pet_id UUID REFERENCES public.adoption_pets(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  has_experience BOOLEAN DEFAULT false,
  experience_details TEXT,
  has_other_pets BOOLEAN DEFAULT false,
  other_pets_details TEXT,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.adoption_pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adoption_requests ENABLE ROW LEVEL SECURITY;

-- Policies for adoption_pets (public read, admin write)
CREATE POLICY "Anyone can view available pets"
ON public.adoption_pets
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert pets"
ON public.adoption_pets
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pets"
ON public.adoption_pets
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pets"
ON public.adoption_pets
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Policies for adoption_requests
CREATE POLICY "Users can view their own requests"
ON public.adoption_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create requests"
ON public.adoption_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their pending requests"
ON public.adoption_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can update any request"
ON public.adoption_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_adoption_pets_updated_at
BEFORE UPDATE ON public.adoption_pets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_adoption_requests_updated_at
BEFORE UPDATE ON public.adoption_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample adoption pets
INSERT INTO public.adoption_pets (name, type, breed, age_years, age_months, gender, size, description, special_needs, is_vaccinated, is_neutered, image_url, status) VALUES
('מקס', 'כלב', 'לברדור רטריבר', 2, 6, 'זכר', 'גדול', 'כלב ידידותי ואנרגטי, אוהב לשחק ולרוץ. מתאים למשפחות עם ילדים.', NULL, true, true, 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=500', 'available'),
('לונה', 'כלב', 'גולדן רטריבר', 1, 3, 'נקבה', 'גדול', 'כלבה עדינה ורגועה, מאוד חברותית. מושלמת כחבר נאמן.', NULL, true, false, 'https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=500', 'available'),
('צ׳רלי', 'כלב', 'בולדוג צרפתי', 3, 0, 'זכר', 'קטן', 'כלב קטן וחמוד, אוהב חיבוקים ומתאים לדירה קטנה.', 'צריך תרופות לאלרגיות', true, true, 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=500', 'available'),
('בלה', 'חתול', 'פרסי', 2, 0, 'נקבה', 'בינוני', 'חתולה יפהפייה ורגועה, אוהבת לישון ולהתפנק.', NULL, true, true, 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=500', 'available'),
('סימבה', 'חתול', 'סיאמי', 1, 8, 'זכר', 'בינוני', 'חתול שובב ומשחק, מאוד חכם וסקרן.', NULL, true, true, 'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=500', 'available'),
('מילו', 'חתול', 'מעורב', 4, 6, 'זכר', 'בינוני', 'חתול בוגר ורגוע, מחפש בית שקט לשנים האחרונות שלו.', NULL, true, true, 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500', 'available'),
('רוקי', 'כלב', 'ביגל', 5, 0, 'זכר', 'בינוני', 'כלב נאמן ורגוע, מתאים למשפחות. קצת מבוגר אבל מלא אנרגיה.', NULL, true, true, 'https://images.unsplash.com/photo-1505628346881-b72b27e84530?w=500', 'available'),
('דייזי', 'כלב', 'פודל', 1, 0, 'נקבה', 'קטן', 'כלבה צעירה ומקסימה, אנרגטית ושמחה.', NULL, true, false, 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=500', 'available');
