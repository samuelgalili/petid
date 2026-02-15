
-- Add pet identification and regulatory columns
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS microchip_number text;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS is_dangerous_breed boolean DEFAULT false;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS license_conditions text;
