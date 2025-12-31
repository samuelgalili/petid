-- =====================================================
-- PERSONALIZATION ENGINE TABLES
-- Tracks user behavior, preferences, and engagement
-- =====================================================

-- 1. User Interests - What types of content/pets the user is interested in
CREATE TABLE public.user_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interest_type TEXT NOT NULL, -- 'pet_type', 'content_type', 'topic'
  interest_value TEXT NOT NULL, -- 'dog', 'cat', 'video', 'adoption', etc.
  weight NUMERIC DEFAULT 1.0, -- How strong is the interest (0-10)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, interest_type, interest_value)
);

-- 2. User Engagement - Tracks interactions with content
CREATE TABLE public.user_engagement (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'post', 'product', 'adoption', 'challenge', 'ad'
  content_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'view', 'like', 'save', 'share', 'click', 'purchase'
  duration_seconds INTEGER, -- Time spent viewing (for 'view' action)
  metadata JSONB, -- Additional data like scroll depth, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. User Sessions - Track usage patterns
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_end TIMESTAMP WITH TIME ZONE,
  device_type TEXT, -- 'mobile', 'desktop', 'tablet'
  preferred_view_mode TEXT, -- 'feed', 'grid', 'video', 'masonry'
  preferred_tab TEXT, -- 'foryou', 'following', 'nearby', etc.
  location_city TEXT,
  location_lat NUMERIC,
  location_lng NUMERIC,
  pages_visited TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Content Safety Reports - User reports of inappropriate content
CREATE TABLE public.content_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  reason TEXT NOT NULL, -- 'violence', 'abuse', 'spam', 'inappropriate', 'other'
  description TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'removed', 'dismissed'
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Personalization Scores - Cached scores for faster feed generation
CREATE TABLE public.personalization_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  score NUMERIC NOT NULL DEFAULT 0.5, -- 0-1 relevance score
  last_calculated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  factors JSONB, -- What contributed to this score
  UNIQUE(user_id, content_type)
);

-- Enable RLS on all tables
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalization_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see/modify their own data

-- user_interests policies
CREATE POLICY "Users can view own interests" 
  ON public.user_interests FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interests" 
  ON public.user_interests FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interests" 
  ON public.user_interests FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own interests" 
  ON public.user_interests FOR DELETE 
  USING (auth.uid() = user_id);

-- user_engagement policies
CREATE POLICY "Users can view own engagement" 
  ON public.user_engagement FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own engagement" 
  ON public.user_engagement FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- user_sessions policies
CREATE POLICY "Users can view own sessions" 
  ON public.user_sessions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" 
  ON public.user_sessions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" 
  ON public.user_sessions FOR UPDATE 
  USING (auth.uid() = user_id);

-- content_reports policies
CREATE POLICY "Users can view own reports" 
  ON public.content_reports FOR SELECT 
  USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create reports" 
  ON public.content_reports FOR INSERT 
  WITH CHECK (auth.uid() = reporter_id);

-- personalization_scores policies
CREATE POLICY "Users can view own scores" 
  ON public.personalization_scores FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scores" 
  ON public.personalization_scores FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scores" 
  ON public.personalization_scores FOR UPDATE 
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_user_interests_user ON public.user_interests(user_id);
CREATE INDEX idx_user_engagement_user ON public.user_engagement(user_id);
CREATE INDEX idx_user_engagement_content ON public.user_engagement(content_type, content_id);
CREATE INDEX idx_user_engagement_action ON public.user_engagement(action);
CREATE INDEX idx_user_engagement_created ON public.user_engagement(created_at DESC);
CREATE INDEX idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX idx_content_reports_status ON public.content_reports(status);
CREATE INDEX idx_personalization_scores_user ON public.personalization_scores(user_id);

-- Function to update interests based on engagement
CREATE OR REPLACE FUNCTION public.update_user_interests_from_engagement()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert interest based on engagement
  INSERT INTO public.user_interests (user_id, interest_type, interest_value, weight)
  VALUES (
    NEW.user_id,
    'content_type',
    NEW.content_type,
    CASE 
      WHEN NEW.action = 'purchase' THEN 3.0
      WHEN NEW.action = 'save' THEN 2.0
      WHEN NEW.action = 'like' THEN 1.5
      WHEN NEW.action = 'share' THEN 2.0
      WHEN NEW.action = 'click' THEN 1.0
      WHEN NEW.action = 'view' THEN 0.5
      ELSE 0.5
    END
  )
  ON CONFLICT (user_id, interest_type, interest_value)
  DO UPDATE SET
    weight = LEAST(10, user_interests.weight + EXCLUDED.weight * 0.1),
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-update interests
CREATE TRIGGER on_engagement_update_interests
  AFTER INSERT ON public.user_engagement
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_interests_from_engagement();