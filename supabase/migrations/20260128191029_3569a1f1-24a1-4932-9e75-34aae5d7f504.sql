-- 1. Add location to posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS location_name TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 8);
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS location_lng DECIMAL(11, 8);

-- 2. Add views count to posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- 3. Create post_views table for tracking unique views
CREATE TABLE IF NOT EXISTS public.post_views (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    viewer_ip TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(post_id, viewer_id)
);

-- 4. Create reposts table
CREATE TABLE IF NOT EXISTS public.reposts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    original_post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    caption TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, original_post_id)
);

-- 5. Create mentions table
CREATE TABLE IF NOT EXISTS public.mentions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mentioner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Create story_polls table
CREATE TABLE IF NOT EXISTS public.story_polls (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_a_count INTEGER DEFAULT 0,
    option_b_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Create story_poll_votes table
CREATE TABLE IF NOT EXISTS public.story_poll_votes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id UUID NOT NULL REFERENCES public.story_polls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    selected_option TEXT NOT NULL CHECK (selected_option IN ('a', 'b')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(poll_id, user_id)
);

-- 8. Add video support columns to posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS video_thumbnail_url TEXT;

-- Enable RLS on new tables
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_poll_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_views
CREATE POLICY "Anyone can view post views" ON public.post_views FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert views" ON public.post_views FOR INSERT WITH CHECK (auth.uid() = viewer_id OR viewer_id IS NULL);

-- RLS Policies for reposts
CREATE POLICY "Anyone can view reposts" ON public.reposts FOR SELECT USING (true);
CREATE POLICY "Users can create their own reposts" ON public.reposts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reposts" ON public.reposts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for mentions
CREATE POLICY "Users can view mentions they're part of" ON public.mentions FOR SELECT USING (auth.uid() = mentioned_user_id OR auth.uid() = mentioner_user_id);
CREATE POLICY "Users can create mentions" ON public.mentions FOR INSERT WITH CHECK (auth.uid() = mentioner_user_id);

-- RLS Policies for story_polls
CREATE POLICY "Anyone can view story polls" ON public.story_polls FOR SELECT USING (true);
CREATE POLICY "Story owners can create polls" ON public.story_polls FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.stories WHERE id = story_id AND user_id = auth.uid())
);

-- RLS Policies for story_poll_votes
CREATE POLICY "Anyone can view poll votes" ON public.story_poll_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote once per poll" ON public.story_poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_post_views(post_id_param UUID, viewer_id_param UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Try to insert a view record
    INSERT INTO post_views (post_id, viewer_id)
    VALUES (post_id_param, viewer_id_param)
    ON CONFLICT (post_id, viewer_id) DO NOTHING;
    
    -- Update the views count on the post
    UPDATE posts 
    SET views_count = (SELECT COUNT(*) FROM post_views WHERE post_id = post_id_param)
    WHERE id = post_id_param;
END;
$$;

-- Function to vote on poll
CREATE OR REPLACE FUNCTION public.vote_on_poll(poll_id_param UUID, option_param TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert vote
    INSERT INTO story_poll_votes (poll_id, user_id, selected_option)
    VALUES (poll_id_param, auth.uid(), option_param)
    ON CONFLICT (poll_id, user_id) DO UPDATE SET selected_option = option_param;
    
    -- Update counts
    UPDATE story_polls SET
        option_a_count = (SELECT COUNT(*) FROM story_poll_votes WHERE poll_id = poll_id_param AND selected_option = 'a'),
        option_b_count = (SELECT COUNT(*) FROM story_poll_votes WHERE poll_id = poll_id_param AND selected_option = 'b')
    WHERE id = poll_id_param;
END;
$$;