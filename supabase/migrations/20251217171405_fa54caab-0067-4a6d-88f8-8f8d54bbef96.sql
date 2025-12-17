-- =============================================
-- HASHTAGS SYSTEM
-- =============================================
CREATE TABLE public.hashtags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.post_hashtags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, hashtag_id)
);

-- =============================================
-- LOCATIONS SYSTEM
-- =============================================
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.posts ADD COLUMN location_id UUID REFERENCES public.locations(id);

-- =============================================
-- VOICE MESSAGES
-- =============================================
ALTER TABLE public.messages ADD COLUMN voice_url TEXT;
ALTER TABLE public.messages ADD COLUMN voice_duration INTEGER;
ALTER TABLE public.messages ADD COLUMN message_type TEXT DEFAULT 'text';

-- =============================================
-- MESSAGE REACTIONS
-- =============================================
CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- =============================================
-- STORY STICKERS (Polls, Questions, Countdown)
-- =============================================
CREATE TABLE public.story_stickers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  sticker_type TEXT NOT NULL CHECK (sticker_type IN ('poll', 'question', 'countdown', 'mention', 'location')),
  position_x DECIMAL(5, 2) DEFAULT 50,
  position_y DECIMAL(5, 2) DEFAULT 50,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.story_poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sticker_id UUID NOT NULL REFERENCES public.story_stickers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sticker_id, user_id)
);

CREATE TABLE public.story_question_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sticker_id UUID NOT NULL REFERENCES public.story_stickers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  answer_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- REELS
-- =============================================
CREATE TABLE public.reels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  audio_id UUID,
  duration INTEGER,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.reel_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reel_id, user_id)
);

CREATE TABLE public.reel_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Hashtags (public read)
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hashtags are viewable by everyone" ON public.hashtags FOR SELECT USING (true);
CREATE POLICY "Users can create hashtags" ON public.hashtags FOR INSERT WITH CHECK (true);

-- Post Hashtags
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Post hashtags are viewable by everyone" ON public.post_hashtags FOR SELECT USING (true);
CREATE POLICY "Users can tag their posts" ON public.post_hashtags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
);
CREATE POLICY "Users can remove tags from their posts" ON public.post_hashtags FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
);

-- Locations (public read)
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Locations are viewable by everyone" ON public.locations FOR SELECT USING (true);
CREATE POLICY "Users can create locations" ON public.locations FOR INSERT WITH CHECK (true);

-- Message Reactions
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view reactions on their messages" ON public.message_reactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.messages WHERE id = message_id AND (sender_id = auth.uid() OR receiver_id = auth.uid()))
);
CREATE POLICY "Users can add reactions" ON public.message_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their reactions" ON public.message_reactions FOR DELETE USING (auth.uid() = user_id);

-- Story Stickers
ALTER TABLE public.story_stickers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Story stickers are viewable by everyone" ON public.story_stickers FOR SELECT USING (true);
CREATE POLICY "Users can add stickers to their stories" ON public.story_stickers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.stories WHERE id = story_id AND user_id = auth.uid())
);

-- Story Poll Votes
ALTER TABLE public.story_poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Poll votes visible to story owner" ON public.story_poll_votes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.story_stickers ss JOIN public.stories s ON ss.story_id = s.id WHERE ss.id = sticker_id AND s.user_id = auth.uid())
  OR auth.uid() = user_id
);
CREATE POLICY "Users can vote on polls" ON public.story_poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Story Question Answers
ALTER TABLE public.story_question_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Answers visible to story owner" ON public.story_question_answers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.story_stickers ss JOIN public.stories s ON ss.story_id = s.id WHERE ss.id = sticker_id AND s.user_id = auth.uid())
  OR auth.uid() = user_id
);
CREATE POLICY "Users can answer questions" ON public.story_question_answers FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reels
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reels are viewable by everyone" ON public.reels FOR SELECT USING (true);
CREATE POLICY "Users can create reels" ON public.reels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their reels" ON public.reels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their reels" ON public.reels FOR DELETE USING (auth.uid() = user_id);

-- Reel Likes
ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reel likes are viewable by everyone" ON public.reel_likes FOR SELECT USING (true);
CREATE POLICY "Users can like reels" ON public.reel_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike reels" ON public.reel_likes FOR DELETE USING (auth.uid() = user_id);

-- Reel Comments
ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reel comments are viewable by everyone" ON public.reel_comments FOR SELECT USING (true);
CREATE POLICY "Users can comment on reels" ON public.reel_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can edit their comments" ON public.reel_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their comments" ON public.reel_comments FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_post_hashtags_post ON public.post_hashtags(post_id);
CREATE INDEX idx_post_hashtags_hashtag ON public.post_hashtags(hashtag_id);
CREATE INDEX idx_hashtags_name ON public.hashtags(name);
CREATE INDEX idx_locations_name ON public.locations(name);
CREATE INDEX idx_reels_user ON public.reels(user_id);
CREATE INDEX idx_reels_created ON public.reels(created_at DESC);
CREATE INDEX idx_reel_likes_reel ON public.reel_likes(reel_id);
CREATE INDEX idx_reel_comments_reel ON public.reel_comments(reel_id);
CREATE INDEX idx_story_stickers_story ON public.story_stickers(story_id);
CREATE INDEX idx_message_reactions_message ON public.message_reactions(message_id);