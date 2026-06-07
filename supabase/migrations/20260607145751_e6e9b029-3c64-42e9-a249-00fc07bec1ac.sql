ALTER TABLE public.breed_information
  ADD COLUMN IF NOT EXISTS bloodline_variants text,
  ADD COLUMN IF NOT EXISTS owner_experience_required text,
  ADD COLUMN IF NOT EXISTS solitude_tolerance text;