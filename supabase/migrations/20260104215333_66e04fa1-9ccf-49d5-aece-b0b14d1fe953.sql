-- Add organization/shelter fields to adoption_pets table
ALTER TABLE public.adoption_pets 
ADD COLUMN IF NOT EXISTS organization_name TEXT,
ADD COLUMN IF NOT EXISTS organization_phone TEXT,
ADD COLUMN IF NOT EXISTS organization_email TEXT,
ADD COLUMN IF NOT EXISTS organization_address TEXT,
ADD COLUMN IF NOT EXISTS organization_city TEXT,
ADD COLUMN IF NOT EXISTS organization_logo_url TEXT,
ADD COLUMN IF NOT EXISTS organization_website TEXT;

-- Add some sample organization data to existing pets
UPDATE public.adoption_pets 
SET 
  organization_name = 'עמותת חיים של אהבה',
  organization_phone = '03-1234567',
  organization_city = 'תל אביב'
WHERE organization_name IS NULL;

-- Create index for better querying by organization
CREATE INDEX IF NOT EXISTS idx_adoption_pets_organization ON public.adoption_pets(organization_name);

COMMENT ON COLUMN public.adoption_pets.organization_name IS 'Name of the shelter or organization';
COMMENT ON COLUMN public.adoption_pets.organization_phone IS 'Contact phone number';
COMMENT ON COLUMN public.adoption_pets.organization_city IS 'City where the organization is located';