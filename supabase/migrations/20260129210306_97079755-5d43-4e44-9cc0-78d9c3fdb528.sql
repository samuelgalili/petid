-- Create live_streams table
CREATE TABLE public.live_streams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  stream_key TEXT UNIQUE,
  playback_url TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
  viewer_count INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  is_private BOOLEAN DEFAULT false,
  allow_comments BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create live_stream_viewers table for tracking viewers
CREATE TABLE public.live_stream_viewers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Create live_stream_comments table
CREATE TABLE public.live_stream_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create live_stream_reactions table for hearts/likes during stream
CREATE TABLE public.live_stream_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT DEFAULT 'heart',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_stream_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_stream_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_stream_reactions ENABLE ROW LEVEL SECURITY;

-- Policies for live_streams
CREATE POLICY "Anyone can view public live streams"
  ON public.live_streams FOR SELECT
  USING (is_private = false OR auth.uid() = user_id);

CREATE POLICY "Users can create their own streams"
  ON public.live_streams FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streams"
  ON public.live_streams FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own streams"
  ON public.live_streams FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for live_stream_viewers
CREATE POLICY "Anyone can view stream viewers"
  ON public.live_stream_viewers FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can join streams"
  ON public.live_stream_viewers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own viewer status"
  ON public.live_stream_viewers FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies for live_stream_comments
CREATE POLICY "Anyone can view stream comments"
  ON public.live_stream_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can comment"
  ON public.live_stream_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.live_stream_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for live_stream_reactions
CREATE POLICY "Anyone can view reactions"
  ON public.live_stream_reactions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can react"
  ON public.live_stream_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for live features
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stream_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stream_reactions;

-- Function to update viewer count
CREATE OR REPLACE FUNCTION update_stream_viewer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.live_streams 
    SET viewer_count = (
      SELECT COUNT(*) FROM public.live_stream_viewers 
      WHERE stream_id = NEW.stream_id AND is_active = true
    ),
    peak_viewers = GREATEST(
      peak_viewers,
      (SELECT COUNT(*) FROM public.live_stream_viewers 
       WHERE stream_id = NEW.stream_id AND is_active = true)
    )
    WHERE id = NEW.stream_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.live_streams 
    SET viewer_count = (
      SELECT COUNT(*) FROM public.live_stream_viewers 
      WHERE stream_id = NEW.stream_id AND is_active = true
    )
    WHERE id = NEW.stream_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for viewer count
CREATE TRIGGER on_viewer_change
  AFTER INSERT OR UPDATE ON public.live_stream_viewers
  FOR EACH ROW EXECUTE FUNCTION update_stream_viewer_count();