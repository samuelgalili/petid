
-- Add AI extraction and recovery mode columns to pet_vet_visits
ALTER TABLE public.pet_vet_visits
  ADD COLUMN IF NOT EXISTS vaccines text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS medications text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS diagnoses text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_recovery_mode boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS recovery_until date,
  ADD COLUMN IF NOT EXISTS ai_extracted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS raw_summary text;

-- Create index for recovery mode lookups
CREATE INDEX IF NOT EXISTS idx_pet_vet_visits_recovery ON public.pet_vet_visits (pet_id, is_recovery_mode) WHERE is_recovery_mode = true;

-- Create index for vaccine countdown queries
CREATE INDEX IF NOT EXISTS idx_pet_vet_visits_next_visit ON public.pet_vet_visits (pet_id, next_visit_date) WHERE next_visit_date IS NOT NULL;
