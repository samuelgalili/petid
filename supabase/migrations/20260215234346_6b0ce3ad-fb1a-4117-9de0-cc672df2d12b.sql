
-- Behavioral preference tags derived from poll answers
CREATE TABLE public.pet_preference_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL,
  user_id UUID NOT NULL,
  tag TEXT NOT NULL,
  category TEXT NOT NULL,
  source_poll_key TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One tag per category per pet (upsert pattern)
CREATE UNIQUE INDEX idx_pet_pref_tags_unique ON public.pet_preference_tags (pet_id, category, source_poll_key);
CREATE INDEX idx_pet_pref_tags_pet ON public.pet_preference_tags (pet_id);

ALTER TABLE public.pet_preference_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own pet tags" ON public.pet_preference_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pet tags" ON public.pet_preference_tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own pet tags" ON public.pet_preference_tags
  FOR SELECT USING (auth.uid() = user_id);

-- Add pet_type column to pet_poll_votes for multi-pet tracking
ALTER TABLE public.pet_poll_votes ADD COLUMN IF NOT EXISTS pet_type TEXT;
