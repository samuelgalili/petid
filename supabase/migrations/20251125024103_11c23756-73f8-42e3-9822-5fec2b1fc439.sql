-- Add archive columns to pets table
ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Create index for faster archived pet queries
CREATE INDEX IF NOT EXISTS idx_pets_archived ON public.pets(user_id, archived);

-- Update RLS policies to allow viewing archived pets
DROP POLICY IF EXISTS "Users can view their own pets" ON public.pets;
CREATE POLICY "Users can view their own pets including archived"
  ON public.pets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON COLUMN public.pets.archived IS 'Soft delete flag - when true, pet is archived instead of deleted';
COMMENT ON COLUMN public.pets.archived_at IS 'Timestamp when pet was archived';