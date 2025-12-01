-- Create grooming salons table
CREATE TABLE public.grooming_salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  description TEXT,
  price_range TEXT, -- e.g., "₪100-₪300"
  rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  services TEXT[] DEFAULT '{}', -- Array of services offered
  working_hours JSONB, -- Store working hours as JSON
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create grooming appointments table
CREATE TABLE public.grooming_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES public.grooming_salons(id) ON DELETE CASCADE,
  pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.grooming_salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grooming_appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for grooming_salons (public read, admin write)
CREATE POLICY "Anyone can view active grooming salons"
  ON public.grooming_salons
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can insert grooming salons"
  ON public.grooming_salons
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update grooming salons"
  ON public.grooming_salons
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for grooming_appointments (users see their own, admins see all)
CREATE POLICY "Users can view their own appointments"
  ON public.grooming_appointments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own appointments"
  ON public.grooming_appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appointments"
  ON public.grooming_appointments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_grooming_salons_city ON public.grooming_salons(city);
CREATE INDEX idx_grooming_appointments_user_id ON public.grooming_appointments(user_id);
CREATE INDEX idx_grooming_appointments_salon_id ON public.grooming_appointments(salon_id);
CREATE INDEX idx_grooming_appointments_date ON public.grooming_appointments(appointment_date);

-- Trigger for updated_at
CREATE TRIGGER update_grooming_salons_updated_at
  BEFORE UPDATE ON public.grooming_salons
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_grooming_appointments_updated_at
  BEFORE UPDATE ON public.grooming_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert sample grooming salons data
INSERT INTO public.grooming_salons (name, city, address, phone, description, price_range, rating, total_reviews, services, working_hours, image_url) VALUES
('ספא לכלבים ולחתולים', 'תל אביב', 'רחוב דיזנגוף 123', '03-1234567', 'מספרה מקצועית לכלבים וחתולים עם שירותי ספא מלאים', '₪150-₪400', 4.8, 156, ARRAY['תספורת', 'רחצה', 'טיפול בציפורניים', 'ספא', 'טיפול בשיער'], '{"sunday": "09:00-18:00", "monday": "09:00-18:00", "tuesday": "09:00-18:00", "wednesday": "09:00-18:00", "thursday": "09:00-18:00", "friday": "09:00-14:00", "saturday": "closed"}', 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&h=600'),
('גרומינג פרימיום', 'ירושלים', 'רחוב יפו 45', '02-9876543', 'מספרה יוקרתית עם מומחים מוסמכים', '₪200-₪500', 4.9, 243, ARRAY['תספורת מקצועית', 'רחצה מפנקת', 'צביעה', 'עיצוב שיער', 'טיפולי עור'], '{"sunday": "08:00-19:00", "monday": "08:00-19:00", "tuesday": "08:00-19:00", "wednesday": "08:00-19:00", "thursday": "08:00-19:00", "friday": "08:00-13:00", "saturday": "closed"}', 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=600'),
('מספרת חיות ביתיות', 'חיפה', 'שדרות הנשיא 78', '04-5551234', 'מספרה ידידותית עם שירות אישי וחם', '₪120-₪300', 4.6, 89, ARRAY['תספורת בסיסית', 'רחצה', 'ניקוי אוזניים', 'גזירת ציפורניים'], '{"sunday": "09:00-17:00", "monday": "09:00-17:00", "tuesday": "09:00-17:00", "wednesday": "09:00-17:00", "thursday": "09:00-17:00", "friday": "09:00-13:00", "saturday": "closed"}', 'https://images.unsplash.com/photo-1616734755909-bb016ce64929?w=800&h=600'),
('גרום אנד גלאם', 'ראשון לציון', 'רחוב הרצל 234', '03-7778899', 'מספרה מודרנית עם ציוד חדיש ושירותים מתקדמים', '₪180-₪450', 4.7, 127, ARRAY['תספורת מעוצבת', 'רחצה וטיפוח', 'טיפול בפרווה', 'עיסוי', 'ארומתרפיה'], '{"sunday": "09:00-18:00", "monday": "09:00-18:00", "tuesday": "09:00-18:00", "wednesday": "09:00-18:00", "thursday": "09:00-20:00", "friday": "09:00-14:00", "saturday": "closed"}', 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=600'),
('פטס סטייל', 'באר שבע', 'רחוב רגר 12', '08-6667788', 'מספרה משפחתית עם ניסיון של 15 שנה', '₪100-₪250', 4.5, 67, ARRAY['תספורת', 'רחצה', 'ניקוי שיניים', 'טיפול בציפורניים'], '{"sunday": "08:30-17:30", "monday": "08:30-17:30", "tuesday": "08:30-17:30", "wednesday": "08:30-17:30", "thursday": "08:30-17:30", "friday": "08:30-13:00", "saturday": "closed"}', 'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=800&h=600');