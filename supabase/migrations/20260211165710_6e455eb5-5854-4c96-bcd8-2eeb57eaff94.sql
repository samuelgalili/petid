-- Music library table for pre-loaded tracks
CREATE TABLE IF NOT EXISTS public.music_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT 'PetID',
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  cover_image_url TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.music_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Music library is readable by everyone"
  ON public.music_library FOR SELECT USING (true);

-- Add music fields to posts table
ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS music_id UUID REFERENCES public.music_library(id),
  ADD COLUMN IF NOT EXISTS music_url TEXT,
  ADD COLUMN IF NOT EXISTS music_title TEXT,
  ADD COLUMN IF NOT EXISTS music_artist TEXT;