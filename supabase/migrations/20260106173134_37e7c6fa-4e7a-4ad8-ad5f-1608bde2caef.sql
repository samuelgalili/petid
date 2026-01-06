-- Loyalty Point Rules - configurable weights table
CREATE TABLE public.loyalty_point_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL UNIQUE,
  action_name_he TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  cooldown_hours INTEGER DEFAULT 24,
  daily_limit INTEGER DEFAULT NULL,
  weekly_limit INTEGER DEFAULT NULL,
  requires_tenure_days INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_point_rules ENABLE ROW LEVEL SECURITY;

-- Everyone can read rules
CREATE POLICY "Anyone can read loyalty rules" 
ON public.loyalty_point_rules 
FOR SELECT 
USING (true);

-- Loyalty Events - user point accumulation log
CREATE TABLE public.loyalty_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 0,
  reference_id TEXT DEFAULT NULL,
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own events
CREATE POLICY "Users can view their own loyalty events" 
ON public.loyalty_events 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own events
CREATE POLICY "Users can insert their own loyalty events" 
ON public.loyalty_events 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_loyalty_events_user_id ON public.loyalty_events(user_id);
CREATE INDEX idx_loyalty_events_action_type ON public.loyalty_events(action_type);
CREATE INDEX idx_loyalty_events_created_at ON public.loyalty_events(created_at);

-- User Loyalty Stats - cumulative stats per user
CREATE TABLE public.user_loyalty_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  current_rank TEXT NOT NULL DEFAULT 'גור',
  rank_level INTEGER NOT NULL DEFAULT 1,
  first_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  total_purchases INTEGER DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_photos INTEGER DEFAULT 0,
  total_referrals INTEGER DEFAULT 0,
  consecutive_months_active INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  current_streak_days INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_loyalty_stats ENABLE ROW LEVEL SECURITY;

-- Users can view their own stats
CREATE POLICY "Users can view their own loyalty stats" 
ON public.user_loyalty_stats 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own stats
CREATE POLICY "Users can insert their own loyalty stats" 
ON public.user_loyalty_stats 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own stats
CREATE POLICY "Users can update their own loyalty stats" 
ON public.user_loyalty_stats 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_user_loyalty_stats_user_id ON public.user_loyalty_stats(user_id);
CREATE INDEX idx_user_loyalty_stats_rank ON public.user_loyalty_stats(current_rank);

-- Insert default point rules
INSERT INTO public.loyalty_point_rules (action_type, action_name_he, points, cooldown_hours, daily_limit, weekly_limit, requires_tenure_days) VALUES
-- Purchases
('first_purchase', 'רכישה ראשונה', 10, 0, 1, 1, 0),
('purchase', 'רכישה', 6, 0, NULL, NULL, 0),
('repeat_purchase', 'רכישה חוזרת של אותו מוצר', 8, 0, NULL, NULL, 7),
('purchase_after_reminder', 'רכישה אחרי תזכורת', 5, 0, NULL, NULL, 0),
-- Community
('write_review', 'כתיבת ביקורת', 4, 168, 1, 3, 7),
('upload_photo', 'העלאת תמונה', 5, 72, 1, 5, 3),
('rate_product', 'דירוג מוצר', 1, 24, 3, 10, 0),
('share_product', 'שיתוף מוצר', 3, 24, 2, 7, 0),
-- Pet Profile
('create_pet_profile', 'יצירת פרופיל חיית מחמד', 5, 0, NULL, NULL, 0),
('complete_pet_details', 'השלמת פרטי חיית מחמד', 3, 0, 1, 1, 0),
('use_bag_reminder', 'שימוש בתזכורת שק', 2, 168, 1, 1, 7),
-- Referrals
('invite_friend', 'הזמנת חבר', 6, 0, 3, 10, 14),
('friend_first_purchase', 'חבר ביצע רכישה ראשונה', 10, 0, NULL, NULL, 14),
-- Tenure bonuses
('monthly_active_bonus', 'בונוס פעילות חודשית', 5, 720, 1, 1, 30),
('veteran_bonus', 'בונוס ותק', 10, 2160, 1, 1, 90);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_loyalty_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for timestamp updates
CREATE TRIGGER update_loyalty_point_rules_updated_at
BEFORE UPDATE ON public.loyalty_point_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_loyalty_updated_at();

CREATE TRIGGER update_user_loyalty_stats_updated_at
BEFORE UPDATE ON public.user_loyalty_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_loyalty_updated_at();