-- Create badges table for gamification
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_he TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  condition_type TEXT NOT NULL,
  condition_value INTEGER NOT NULL,
  points_reward INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create achievements table (user's earned badges)
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  points_awarded INTEGER NOT NULL DEFAULT 0
);

-- Create streaks table
CREATE TABLE public.streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  streak_level TEXT NOT NULL DEFAULT 'bronze' CHECK (streak_level IN ('bronze', 'silver', 'gold', 'platinum')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_he TEXT NOT NULL,
  description TEXT,
  points INTEGER NOT NULL DEFAULT 10,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  due_date DATE,
  task_type TEXT NOT NULL CHECK (task_type IN ('daily', 'weekly', 'one_time')),
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Extend pets table with gamification fields
ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS personality_tags TEXT[],
ADD COLUMN IF NOT EXISTS favorite_activities TEXT[],
ADD COLUMN IF NOT EXISTS health_notes TEXT,
ADD COLUMN IF NOT EXISTS mood_score INTEGER DEFAULT 75 CHECK (mood_score >= 0 AND mood_score <= 100);

-- Enable RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for badges (public read)
CREATE POLICY "Badges are viewable by everyone" 
ON public.badges FOR SELECT USING (true);

-- RLS Policies for achievements
CREATE POLICY "Users can view their own achievements" 
ON public.achievements FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements" 
ON public.achievements FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for streaks
CREATE POLICY "Users can view their own streak" 
ON public.streaks FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streak" 
ON public.streaks FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streak" 
ON public.streaks FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for tasks
CREATE POLICY "Users can view their own tasks" 
ON public.tasks FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" 
ON public.tasks FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" 
ON public.tasks FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" 
ON public.tasks FOR DELETE 
USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_streaks_updated_at
BEFORE UPDATE ON public.streaks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial badges
INSERT INTO public.badges (name, name_he, description, icon, rarity, condition_type, condition_value, points_reward) VALUES
('Welcome', 'ברוך הבא', 'השלמת תהליך האונבורדינג', '🎉', 'common', 'onboarding_complete', 1, 50),
('Explorer', 'מגלה ארצות', 'ביקור ב-5 גינות שונות', '🗺️', 'rare', 'parks_visited', 5, 100),
('Care Giver', 'מטפל מסור', 'תיעוד 3 טיפולים רפואיים', '❤️', 'rare', 'health_records', 3, 100),
('Community Paw', 'חבר הקהילה', 'כתיבת ביקורת ראשונה', '🐾', 'common', 'reviews_written', 1, 25),
('First Story', 'הסיפור הראשון', 'פרסום ראשון בפיד', '📸', 'common', 'posts_created', 1, 25),
('Pet Collector', 'אוסף חיות', 'הוספת 3 חיות מחמד', '🐶', 'epic', 'pets_added', 3, 150),
('Shopping Star', 'כוכב קניות', 'ביצוע 5 הזמנות', '🛍️', 'epic', 'orders_completed', 5, 200),
('Streak Master', 'אלוף הרצף', 'רצף של 30 ימים', '🔥', 'legendary', 'streak_days', 30, 500);