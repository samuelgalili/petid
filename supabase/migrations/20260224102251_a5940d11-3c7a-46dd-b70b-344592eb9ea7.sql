
-- Add parent_id to post_comments for nested replies
ALTER TABLE public.post_comments
ADD COLUMN parent_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE;

-- Index for fast child lookups
CREATE INDEX idx_post_comments_parent_id ON public.post_comments(parent_id);

-- Create comment_likes table
CREATE TABLE public.comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for comment_likes
CREATE POLICY "Anyone can view comment likes"
  ON public.comment_likes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like comments"
  ON public.comment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
  ON public.comment_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime for post_comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
