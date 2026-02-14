
-- Shared Feed table for DM shared viewing
CREATE TABLE public.shared_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  post_ids UUID[] NOT NULL DEFAULT '{}',
  current_index_user1 INT NOT NULL DEFAULT 0,
  current_index_user2 INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

-- Enable RLS
ALTER TABLE public.shared_feeds ENABLE ROW LEVEL SECURITY;

-- Only participants can view their shared feed
CREATE POLICY "Users can view own shared feeds"
  ON public.shared_feeds FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Only participants can create shared feeds
CREATE POLICY "Users can create shared feeds"
  ON public.shared_feeds FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Only participants can update shared feeds
CREATE POLICY "Users can update own shared feeds"
  ON public.shared_feeds FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Only participants can delete shared feeds
CREATE POLICY "Users can delete own shared feeds"
  ON public.shared_feeds FOR DELETE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_feeds;

-- Auto-update timestamp
CREATE TRIGGER update_shared_feeds_updated_at
  BEFORE UPDATE ON public.shared_feeds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
