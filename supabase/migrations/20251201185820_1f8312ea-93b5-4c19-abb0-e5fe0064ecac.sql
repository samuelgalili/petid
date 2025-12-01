-- Create story_highlights table for highlight categories
CREATE TABLE IF NOT EXISTS public.story_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cover_image TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create highlight_stories table for stories saved to highlights
CREATE TABLE IF NOT EXISTS public.highlight_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  highlight_id UUID NOT NULL REFERENCES public.story_highlights(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  display_order INTEGER DEFAULT 0,
  UNIQUE(highlight_id, story_id)
);

-- Enable RLS
ALTER TABLE public.story_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlight_stories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for story_highlights
CREATE POLICY "Users can view all highlights"
  ON public.story_highlights FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own highlights"
  ON public.story_highlights FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for highlight_stories
CREATE POLICY "Users can view all highlight stories"
  ON public.highlight_stories FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own highlight stories"
  ON public.highlight_stories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.story_highlights
      WHERE story_highlights.id = highlight_stories.highlight_id
      AND story_highlights.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.story_highlights
      WHERE story_highlights.id = highlight_stories.highlight_id
      AND story_highlights.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_story_highlights_user_id ON public.story_highlights(user_id);
CREATE INDEX idx_story_highlights_display_order ON public.story_highlights(display_order);
CREATE INDEX idx_highlight_stories_highlight_id ON public.highlight_stories(highlight_id);
CREATE INDEX idx_highlight_stories_story_id ON public.highlight_stories(story_id);

-- Trigger for updated_at
CREATE TRIGGER update_story_highlights_updated_at
  BEFORE UPDATE ON public.story_highlights
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();