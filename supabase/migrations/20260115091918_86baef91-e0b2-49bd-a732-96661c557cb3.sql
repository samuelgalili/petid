-- =============================================
-- 1. POST COLLECTIONS (תיקיות לפוסטים שמורים)
-- =============================================

-- Create post_collections table
CREATE TABLE public.post_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  cover_image_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add collection_id to saved_posts
ALTER TABLE public.saved_posts ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES public.post_collections(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.post_collections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_collections
CREATE POLICY "Users can view their own collections"
ON public.post_collections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own collections"
ON public.post_collections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
ON public.post_collections FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
ON public.post_collections FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- 2. MUSIC LIBRARY (מוזיקה לסטוריז ורילס)
-- =============================================

-- Create music_tracks table
CREATE TABLE public.music_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  genre TEXT,
  duration_seconds INTEGER NOT NULL,
  preview_url TEXT NOT NULL,
  full_url TEXT,
  cover_art_url TEXT,
  is_trending BOOLEAN DEFAULT false,
  play_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_favorite_tracks table
CREATE TABLE public.user_favorite_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  track_id UUID NOT NULL REFERENCES public.music_tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, track_id)
);

-- Add music columns to stories table
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS music_track_id UUID REFERENCES public.music_tracks(id) ON DELETE SET NULL;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS music_start_time INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorite_tracks ENABLE ROW LEVEL SECURITY;

-- RLS for music_tracks (publicly viewable)
CREATE POLICY "Anyone can view music tracks"
ON public.music_tracks FOR SELECT
USING (true);

-- RLS for user_favorite_tracks
CREATE POLICY "Users can view their favorite tracks"
ON public.user_favorite_tracks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorite tracks"
ON public.user_favorite_tracks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorite tracks"
ON public.user_favorite_tracks FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- 3. ADD SAMPLE MUSIC TRACKS
-- =============================================
INSERT INTO public.music_tracks (title, artist, genre, duration_seconds, preview_url, cover_art_url, is_trending) VALUES
('Happy Vibes', 'PetID Music', 'Pop', 30, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200', true),
('Chill Day', 'PetID Music', 'Lo-Fi', 30, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=200', true),
('Adventure Time', 'PetID Music', 'Electronic', 30, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200', false),
('Sunny Morning', 'PetID Music', 'Acoustic', 30, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=200', true),
('Pet Party', 'PetID Music', 'Dance', 30, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200', false),
('Relaxing Walk', 'PetID Music', 'Ambient', 30, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', 'https://images.unsplash.com/photo-1446057032654-9d8885db76c6?w=200', true),
('Playful Paws', 'PetID Music', 'Fun', 30, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=200', false),
('Cozy Evening', 'PetID Music', 'Jazz', 30, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=200', true);