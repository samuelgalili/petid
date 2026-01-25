-- =====================================================
-- PET SERVICES TABLES - Insurance, Training, Grooming, Boarding, Breed Info
-- =====================================================

-- 1. Pet Insurance Policies (admin managed)
CREATE TABLE IF NOT EXISTS public.pet_insurance_policies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    provider_name TEXT NOT NULL,
    coverage_details JSONB,
    monthly_price DECIMAL(10,2),
    annual_price DECIMAL(10,2),
    suitable_pet_types TEXT[] DEFAULT ARRAY['dog', 'cat'],
    suitable_breeds TEXT[],
    min_age_months INTEGER DEFAULT 0,
    max_age_years INTEGER DEFAULT 20,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Pet Training Programs (admin managed)
CREATE TABLE IF NOT EXISTS public.pet_training_programs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    training_type TEXT NOT NULL, -- 'professional', 'online', 'group'
    trainer_name TEXT,
    trainer_phone TEXT,
    trainer_image_url TEXT,
    duration_sessions INTEGER,
    price DECIMAL(10,2),
    suitable_pet_types TEXT[] DEFAULT ARRAY['dog'],
    suitable_breeds TEXT[],
    min_age_months INTEGER DEFAULT 0,
    max_age_years INTEGER DEFAULT 20,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Grooming Services (admin managed)
CREATE TABLE IF NOT EXISTS public.pet_grooming_services (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    service_type TEXT NOT NULL, -- 'bath', 'haircut', 'full_grooming', 'nail_trim'
    price DECIMAL(10,2),
    duration_minutes INTEGER DEFAULT 60,
    suitable_pet_types TEXT[] DEFAULT ARRAY['dog', 'cat'],
    suitable_breeds TEXT[],
    provider_name TEXT,
    provider_phone TEXT,
    provider_address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Grooming Bookings (requires admin approval)
CREATE TABLE IF NOT EXISTS public.pet_grooming_bookings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.pet_grooming_services(id) ON DELETE CASCADE,
    requested_date DATE NOT NULL,
    requested_time TIME,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'completed', 'cancelled'
    admin_notes TEXT,
    total_price DECIMAL(10,2),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Boarding Services (admin managed)
CREATE TABLE IF NOT EXISTS public.pet_boarding_services (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    provider_name TEXT NOT NULL,
    provider_phone TEXT,
    provider_address TEXT,
    provider_image_url TEXT,
    price_per_night DECIMAL(10,2),
    suitable_pet_types TEXT[] DEFAULT ARRAY['dog', 'cat'],
    suitable_breeds TEXT[],
    min_age_months INTEGER DEFAULT 0,
    max_age_years INTEGER DEFAULT 20,
    amenities TEXT[],
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Boarding Bookings (requires admin approval)
CREATE TABLE IF NOT EXISTS public.pet_boarding_bookings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.pet_boarding_services(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'completed', 'cancelled'
    admin_notes TEXT,
    total_nights INTEGER,
    total_price DECIMAL(10,2),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Breed Information (admin managed - research based)
CREATE TABLE IF NOT EXISTS public.breed_information (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    breed_name TEXT NOT NULL UNIQUE,
    breed_name_he TEXT,
    pet_type TEXT NOT NULL DEFAULT 'dog', -- 'dog', 'cat'
    description TEXT,
    description_he TEXT,
    origin_country TEXT,
    size_category TEXT, -- 'small', 'medium', 'large', 'giant'
    weight_range_kg TEXT,
    height_range_cm TEXT,
    life_expectancy_years TEXT,
    temperament TEXT[],
    temperament_he TEXT[],
    exercise_needs TEXT, -- 'low', 'moderate', 'high', 'very_high'
    grooming_needs TEXT, -- 'low', 'moderate', 'high'
    health_issues TEXT[],
    health_issues_he TEXT[],
    dietary_notes TEXT,
    training_difficulty TEXT, -- 'easy', 'moderate', 'challenging'
    good_with_children BOOLEAN,
    good_with_other_pets BOOLEAN,
    apartment_friendly BOOLEAN,
    source_references TEXT[],
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.pet_insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_grooming_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_grooming_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_boarding_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_boarding_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breed_information ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin-managed tables (public read, admin write)
-- Insurance Policies
CREATE POLICY "Anyone can view active insurance policies" ON public.pet_insurance_policies
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage insurance policies" ON public.pet_insurance_policies
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Training Programs
CREATE POLICY "Anyone can view active training programs" ON public.pet_training_programs
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage training programs" ON public.pet_training_programs
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Grooming Services
CREATE POLICY "Anyone can view active grooming services" ON public.pet_grooming_services
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage grooming services" ON public.pet_grooming_services
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Grooming Bookings
CREATE POLICY "Users can view their own grooming bookings" ON public.pet_grooming_bookings
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own grooming bookings" ON public.pet_grooming_bookings
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own grooming bookings" ON public.pet_grooming_bookings
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all grooming bookings" ON public.pet_grooming_bookings
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Boarding Services
CREATE POLICY "Anyone can view active boarding services" ON public.pet_boarding_services
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage boarding services" ON public.pet_boarding_services
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Boarding Bookings
CREATE POLICY "Users can view their own boarding bookings" ON public.pet_boarding_bookings
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own boarding bookings" ON public.pet_boarding_bookings
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own boarding bookings" ON public.pet_boarding_bookings
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all boarding bookings" ON public.pet_boarding_bookings
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Breed Information
CREATE POLICY "Anyone can view active breed information" ON public.breed_information
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage breed information" ON public.breed_information
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update triggers for all tables
CREATE TRIGGER update_pet_insurance_policies_updated_at
    BEFORE UPDATE ON public.pet_insurance_policies
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pet_training_programs_updated_at
    BEFORE UPDATE ON public.pet_training_programs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pet_grooming_services_updated_at
    BEFORE UPDATE ON public.pet_grooming_services
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pet_grooming_bookings_updated_at
    BEFORE UPDATE ON public.pet_grooming_bookings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pet_boarding_services_updated_at
    BEFORE UPDATE ON public.pet_boarding_services
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pet_boarding_bookings_updated_at
    BEFORE UPDATE ON public.pet_boarding_bookings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_breed_information_updated_at
    BEFORE UPDATE ON public.breed_information
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pet_insurance_policies_active ON public.pet_insurance_policies(is_active);
CREATE INDEX IF NOT EXISTS idx_pet_training_programs_active ON public.pet_training_programs(is_active);
CREATE INDEX IF NOT EXISTS idx_pet_grooming_services_active ON public.pet_grooming_services(is_active);
CREATE INDEX IF NOT EXISTS idx_pet_grooming_bookings_user ON public.pet_grooming_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_pet_grooming_bookings_status ON public.pet_grooming_bookings(status);
CREATE INDEX IF NOT EXISTS idx_pet_boarding_services_active ON public.pet_boarding_services(is_active);
CREATE INDEX IF NOT EXISTS idx_pet_boarding_bookings_user ON public.pet_boarding_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_pet_boarding_bookings_status ON public.pet_boarding_bookings(status);
CREATE INDEX IF NOT EXISTS idx_breed_information_pet_type ON public.breed_information(pet_type);
CREATE INDEX IF NOT EXISTS idx_breed_information_breed_name ON public.breed_information(breed_name);