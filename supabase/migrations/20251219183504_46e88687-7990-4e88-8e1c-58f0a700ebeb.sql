-- Create enum for business types
CREATE TYPE public.business_type AS ENUM ('vet', 'trainer', 'groomer', 'shop', 'pet_sitter', 'other');

-- Create business profiles table
CREATE TABLE public.business_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_type public.business_type NOT NULL,
  description TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  working_hours JSONB DEFAULT '{}',
  services TEXT[] DEFAULT '{}',
  price_range TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  rating NUMERIC(2,1) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Business profiles are viewable by everyone"
ON public.business_profiles
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own business profile"
ON public.business_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business profile"
ON public.business_profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own business profile"
ON public.business_profiles
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_business_profiles_type ON public.business_profiles(business_type);
CREATE INDEX idx_business_profiles_city ON public.business_profiles(city);
CREATE INDEX idx_business_profiles_featured ON public.business_profiles(is_featured) WHERE is_featured = true;

-- Create trigger for updated_at
CREATE TRIGGER update_business_profiles_updated_at
BEFORE UPDATE ON public.business_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();