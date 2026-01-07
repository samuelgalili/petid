-- Add address and contact fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS street text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS region text,
ADD COLUMN IF NOT EXISTS house_number text,
ADD COLUMN IF NOT EXISTS apartment_number text,
ADD COLUMN IF NOT EXISTS building_code text,
ADD COLUMN IF NOT EXISTS postal_code text;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.first_name IS 'שם פרטי';
COMMENT ON COLUMN public.profiles.last_name IS 'שם משפחה';
COMMENT ON COLUMN public.profiles.phone IS 'מספר טלפון';
COMMENT ON COLUMN public.profiles.street IS 'רחוב';
COMMENT ON COLUMN public.profiles.city IS 'עיר';
COMMENT ON COLUMN public.profiles.region IS 'מחוז';
COMMENT ON COLUMN public.profiles.house_number IS 'מספר בית';
COMMENT ON COLUMN public.profiles.apartment_number IS 'מספר דירה';
COMMENT ON COLUMN public.profiles.building_code IS 'קוד כניסה לבניין';
COMMENT ON COLUMN public.profiles.postal_code IS 'מיקוד';