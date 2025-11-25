-- Add breed_confidence column to pets table
ALTER TABLE public.pets 
ADD COLUMN breed_confidence INTEGER;

COMMENT ON COLUMN public.pets.breed_confidence IS 'AI confidence score (0-100) for breed detection';