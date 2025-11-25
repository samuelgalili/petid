-- Add birth_date column to pets table
ALTER TABLE public.pets 
ADD COLUMN birth_date DATE;

-- Add a comment to the column
COMMENT ON COLUMN public.pets.birth_date IS 'Pet birth date for dynamic age calculation';