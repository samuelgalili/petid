-- Close Friends table
CREATE TABLE public.close_friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  friend_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE public.close_friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their close friends"
ON public.close_friends FOR ALL
USING (auth.uid() = user_id);

-- Notes (24-hour status)
CREATE TABLE public.user_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view notes"
ON public.user_notes FOR SELECT USING (expires_at > now());

CREATE POLICY "Users can manage their notes"
ON public.user_notes FOR ALL
USING (auth.uid() = user_id);

-- Draft Posts
CREATE TABLE public.draft_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  caption TEXT,
  image_url TEXT,
  media_urls TEXT[],
  pet_id UUID,
  alt_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.draft_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their drafts"
ON public.draft_posts FOR ALL
USING (auth.uid() = user_id);

-- Scheduled Posts
CREATE TABLE public.scheduled_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  caption TEXT,
  image_url TEXT NOT NULL,
  media_urls TEXT[],
  pet_id UUID,
  alt_text TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their scheduled posts"
ON public.scheduled_posts FOR ALL
USING (auth.uid() = user_id);

-- Add alt_text to posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS alt_text TEXT;

-- Activity Status in profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_activity_status BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS quiet_mode_until TIMESTAMP WITH TIME ZONE;

-- Vanish Mode for messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_vanish BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS vanish_after_read BOOLEAN DEFAULT false;

-- Collaborative Posts
CREATE TABLE public.post_collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.post_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their collaborations"
ON public.post_collaborators FOR SELECT
USING (auth.uid() = collaborator_id OR auth.uid() IN (SELECT user_id FROM posts WHERE id = post_id));

CREATE POLICY "Post owners can manage collaborators"
ON public.post_collaborators FOR ALL
USING (auth.uid() IN (SELECT user_id FROM posts WHERE id = post_id));

-- Add Yours Sticker responses
CREATE TABLE public.add_yours_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sticker_id UUID NOT NULL REFERENCES public.story_stickers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.add_yours_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view add yours responses"
ON public.add_yours_responses FOR SELECT USING (true);

CREATE POLICY "Users can add their responses"
ON public.add_yours_responses FOR INSERT
WITH CHECK (auth.uid() = user_id);