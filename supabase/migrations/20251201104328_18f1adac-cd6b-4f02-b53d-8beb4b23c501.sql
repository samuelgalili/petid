-- Create trainers table
CREATE TABLE IF NOT EXISTS public.trainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  specialty TEXT,
  bio TEXT,
  experience_years INTEGER,
  city TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  rating DECIMAL(2,1) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  price_per_session DECIMAL(10,2),
  avatar_url TEXT,
  is_certified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create training_courses table
CREATE TABLE IF NOT EXISTS public.training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES public.trainers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_weeks INTEGER,
  sessions_per_week INTEGER,
  price DECIMAL(10,2),
  level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  max_participants INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create training_tips table
CREATE TABLE IF NOT EXISTS public.training_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create training_videos table
CREATE TABLE IF NOT EXISTS public.training_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_minutes INTEGER,
  category TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Public read access
CREATE POLICY "Public read access for trainers"
  ON public.trainers FOR SELECT
  USING (is_active = true);

CREATE POLICY "Public read access for training_courses"
  ON public.training_courses FOR SELECT
  USING (is_active = true);

CREATE POLICY "Public read access for training_tips"
  ON public.training_tips FOR SELECT
  USING (true);

CREATE POLICY "Public read access for training_videos"
  ON public.training_videos FOR SELECT
  USING (true);

-- Insert sample trainers
INSERT INTO public.trainers (name, specialty, bio, experience_years, city, phone, email, rating, total_reviews, price_per_session, is_certified, is_active) VALUES
('דניאל כהן', 'אילוף בסיסי וציות', 'מאלף כלבים מוסמך עם 10 שנות ניסיון בהכשרת כלבים מכל הגזעים', 10, 'תל אביב', '050-1234567', 'daniel@trainers.co.il', 4.8, 127, 250.00, true, true),
('שרה לוי', 'אג׳יליטי ותחרויות', 'מתמחה באימוני אג׳יליטי והכנה לתחרויות ברמה בינלאומית', 8, 'חיפה', '052-9876543', 'sarah@trainers.co.il', 4.9, 89, 300.00, true, true),
('יוסי מזרחי', 'טיפול בבעיות התנהגות', 'מומחה לטיפול בבעיות התנהגות כמו נביחות, חרדה ואגרסיביות', 15, 'ירושלים', '054-5551234', 'yossi@trainers.co.il', 4.7, 203, 350.00, true, true),
('מיכל אברהם', 'אילוף גורים', 'מתמחה באילוף גורים וסוציאליזציה בשלב מוקדם', 6, 'רעננה', '053-7778899', 'michal@trainers.co.il', 4.9, 156, 220.00, true, true);

-- Insert sample courses
INSERT INTO public.training_courses (trainer_id, title, description, duration_weeks, sessions_per_week, price, level, max_participants, is_active)
SELECT 
  t.id,
  'קורס ציות בסיסי',
  'קורס מקיף לאילוף בסיסי הכולל פקודות יסוד, ציות וסוציאליזציה',
  8,
  2,
  1200.00,
  'beginner',
  8,
  true
FROM public.trainers t
WHERE t.name = 'דניאל כהן';

INSERT INTO public.training_courses (trainer_id, title, description, duration_weeks, sessions_per_week, price, level, max_participants, is_active)
SELECT 
  t.id,
  'קורס אג׳יליטי למתקדמים',
  'אימוני אג׳יליטי מתקדמים עם מסלולי מכשולים והכנה לתחרויות',
  12,
  2,
  2400.00,
  'advanced',
  6,
  true
FROM public.trainers t
WHERE t.name = 'שרה לוי';

-- Insert sample training tips
INSERT INTO public.training_tips (title, content, category, difficulty, views, likes) VALUES
('איך ללמד את הכלב שלך לשבת', 'השלב הראשון באילוף הוא ללמד את הכלב לשבת. החזק חטיף מעל ראשו והעבר אותו לאחור. כשהוא מסתכל למעלה, התחת שלו יגע באדמה באופן טבעי. אמור "שב" וכשהוא יושב, תן לו את החטיף ושבח אותו.', 'פקודות בסיס', 'easy', 1250, 89),
('טיפול בנביחות מוגזמות', 'נביחות מוגזמות יכולות לנבוע מחרדה, שעמום או צורך בתשומת לב. זהה את הסיבה תחילה. אל תצעק בחזרה - זה רק יחזק את ההתנהגות. במקום זאת, תגמל על שקט והתעלם מנביחות.', 'בעיות התנהגות', 'medium', 2340, 156),
('סוציאליזציה של גור', 'חודשי החיים הראשונים הם קריטיים לסוציאליזציה. חשוף את הגור שלך למגוון רחב של אנשים, כלבים, מקומות וצלילים בצורה חיובית. זה ימנע בעיות התנהגות בעתיד.', 'גורים', 'easy', 1890, 134),
('אימון בשרשרת רופפת', 'כלבים שמושכים בשרשרת הם בעיה נפוצה. עצור בכל פעם שהשרשרת מתוחה ותזוז קדימה רק כשהיא רופפה. זה לוקח זמן אבל עקבי והכלב ילמד שמשיכה לא מביאה אותו לאן שהוא רוצה.', 'פקודות בסיס', 'medium', 1670, 98);

-- Insert sample training videos
INSERT INTO public.training_videos (title, description, video_url, thumbnail_url, duration_minutes, category, views, likes) VALUES
('פקודת "שב" בשלבים', 'הדרכה מפורטת ללימוד פקודת שב בשלושה שלבים פשוטים', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '', 8, 'פקודות בסיס', 5420, 312),
('טיפים לאילוף גורים', 'כל מה שצריך לדעת על אילוף גורים בגיל 2-6 חודשים', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '', 15, 'גורים', 8930, 567),
('טיפול בחרדת נטישה', 'שיטות מוכחות לטיפול בכלבים עם חרדת נטישה', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '', 12, 'בעיות התנהגות', 3210, 189),
('מבוא לאג׳יליטי', 'מדריך למתחילים באימוני אג׳יליטי עם הכלב שלכם', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '', 20, 'אג׳יליטי', 4560, 278);

-- Create indexes for performance
CREATE INDEX idx_trainers_city ON public.trainers(city);
CREATE INDEX idx_trainers_rating ON public.trainers(rating DESC);
CREATE INDEX idx_courses_trainer ON public.training_courses(trainer_id);
CREATE INDEX idx_tips_category ON public.training_tips(category);
CREATE INDEX idx_videos_category ON public.training_videos(category);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trainers_updated_at BEFORE UPDATE ON public.trainers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.training_courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();