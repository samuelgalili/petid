-- Create table for feed polls/questions
CREATE TABLE public.feed_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  poll_type TEXT NOT NULL DEFAULT 'single', -- single, multiple
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feed_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view polls" ON public.feed_polls FOR SELECT USING (true);
CREATE POLICY "Users can create own polls" ON public.feed_polls FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own polls" ON public.feed_polls FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own polls" ON public.feed_polls FOR DELETE USING (auth.uid() = user_id);

-- Poll votes
CREATE TABLE public.feed_poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.feed_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

ALTER TABLE public.feed_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view poll votes" ON public.feed_poll_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON public.feed_poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can change vote" ON public.feed_poll_votes FOR DELETE USING (auth.uid() = user_id);

-- Pet tags on posts
CREATE TABLE public.post_pet_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  position_x REAL DEFAULT 50,
  position_y REAL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, pet_id)
);

ALTER TABLE public.post_pet_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pet tags" ON public.post_pet_tags FOR SELECT USING (true);
CREATE POLICY "Post owners can tag pets" ON public.post_pet_tags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
);
CREATE POLICY "Post owners can remove tags" ON public.post_pet_tags FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid())
);

-- Quick emoji reactions on posts
CREATE TABLE public.post_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions" ON public.post_reactions FOR SELECT USING (true);
CREATE POLICY "Users can add reactions" ON public.post_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove reactions" ON public.post_reactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete reactions" ON public.post_reactions FOR DELETE USING (auth.uid() = user_id);