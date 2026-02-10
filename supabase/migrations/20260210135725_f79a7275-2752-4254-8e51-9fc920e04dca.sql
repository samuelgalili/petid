-- Add current_food column to store the pet's current food brand/name
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS current_food TEXT;

-- Add current_mood column to store the pet's daily mood (emoji-based)
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS current_mood TEXT;

-- Add mood_updated_at to track when mood was last updated
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS mood_updated_at TIMESTAMP WITH TIME ZONE;

-- Create pet_photos table for gallery
CREATE TABLE IF NOT EXISTS public.pet_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pet_photos ENABLE ROW LEVEL SECURITY;

-- Public read access for pet photos
CREATE POLICY "Anyone can view pet photos"
  ON public.pet_photos FOR SELECT
  USING (true);

-- Only pet owner can insert/delete photos
CREATE POLICY "Pet owners can add photos"
  ON public.pet_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pets WHERE pets.id = pet_photos.pet_id AND pets.user_id = auth.uid()
    )
  );

CREATE POLICY "Pet owners can delete photos"
  ON public.pet_photos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.pets WHERE pets.id = pet_photos.pet_id AND pets.user_id = auth.uid()
    )
  );

-- Create pet_events table for mini calendar
CREATE TABLE IF NOT EXISTS public.pet_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  event_type TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pet_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pet events"
  ON public.pet_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own pet events"
  ON public.pet_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pet events"
  ON public.pet_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pet events"
  ON public.pet_events FOR DELETE
  USING (auth.uid() = user_id);

-- Index for quick event lookups
CREATE INDEX IF NOT EXISTS idx_pet_events_pet_date ON public.pet_events(pet_id, event_date);