-- Dog Training Module Database Schema

-- Training modules table
CREATE TABLE public.training_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  title_he TEXT NOT NULL,
  description TEXT,
  description_he TEXT,
  icon TEXT DEFAULT '📚',
  total_lessons INTEGER NOT NULL DEFAULT 0,
  xp_reward INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Training lessons table
CREATE TABLE public.training_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  lesson_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  title_he TEXT NOT NULL,
  description TEXT,
  description_he TEXT,
  instructions TEXT,
  instructions_he TEXT,
  demo_video_url TEXT,
  demo_image_url TEXT,
  duration_minutes INTEGER DEFAULT 5,
  xp_reward INTEGER NOT NULL DEFAULT 20,
  recommended_product_id TEXT,
  recommended_product_name TEXT,
  recommended_product_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(module_id, lesson_number)
);

-- User training progress table
CREATE TABLE public.user_training_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
  lesson_id UUID NOT NULL REFERENCES public.training_lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'available', 'in_progress', 'pending_review', 'completed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  xp_earned INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, pet_id, lesson_id)
);

-- Training submissions (photo/video proof)
CREATE TABLE public.training_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
  lesson_id UUID NOT NULL REFERENCES public.training_lessons(id) ON DELETE CASCADE,
  progress_id UUID NOT NULL REFERENCES public.user_training_progress(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  ai_analysis TEXT,
  ai_feedback TEXT,
  ai_approved BOOLEAN,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Daily training sessions
CREATE TABLE public.daily_training_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_xp_earned INTEGER DEFAULT 0,
  lessons_completed INTEGER DEFAULT 0,
  duration_minutes INTEGER DEFAULT 0,
  streak_day INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, pet_id, session_date)
);

-- Training certificates
CREATE TABLE public.training_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
  module_id UUID NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  certificate_number TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pet_name TEXT,
  module_title TEXT
);

-- Enable RLS
ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_certificates ENABLE ROW LEVEL SECURITY;

-- Public read access for modules and lessons
CREATE POLICY "Anyone can view training modules" ON public.training_modules FOR SELECT USING (true);
CREATE POLICY "Anyone can view training lessons" ON public.training_lessons FOR SELECT USING (true);

-- User-specific policies
CREATE POLICY "Users can view their own progress" ON public.user_training_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own progress" ON public.user_training_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own progress" ON public.user_training_progress FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own submissions" ON public.training_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own submissions" ON public.training_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own submissions" ON public.training_submissions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own daily sessions" ON public.daily_training_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own daily sessions" ON public.daily_training_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own daily sessions" ON public.daily_training_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own certificates" ON public.training_certificates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own certificates" ON public.training_certificates FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_training_lessons_module ON public.training_lessons(module_id);
CREATE INDEX idx_user_training_progress_user ON public.user_training_progress(user_id);
CREATE INDEX idx_user_training_progress_pet ON public.user_training_progress(pet_id);
CREATE INDEX idx_training_submissions_user ON public.training_submissions(user_id);
CREATE INDEX idx_daily_training_sessions_user_date ON public.daily_training_sessions(user_id, session_date);

-- Insert training modules
INSERT INTO public.training_modules (module_number, title, title_he, description, description_he, icon, total_lessons, xp_reward) VALUES
(1, 'Foundation', 'יסודות', 'Understanding dog behavior and building trust', 'הבנת התנהגות כלבים ובניית אמון', '🏠', 4, 100),
(2, 'Basic Commands', 'פקודות בסיסיות', 'Essential obedience commands every dog should know', 'פקודות ציות חיוניות שכל כלב צריך לדעת', '🎯', 7, 150),
(3, 'Behavior Fixes', 'תיקון התנהגות', 'Solving common behavioral problems', 'פתרון בעיות התנהגות נפוצות', '🔧', 7, 150),
(4, 'Advanced Training', 'אילוף מתקדם', 'Taking your dog''s training to the next level', 'לקחת את האילוף של הכלב שלך לשלב הבא', '🚀', 5, 200),
(5, 'Personalized Path', 'מסלול מותאם', 'Training adapted to your dog''s breed and age', 'אילוף מותאם לגזע ולגיל של הכלב שלך', '✨', 4, 150),
(6, 'Recommended Gear', 'ציוד מומלץ', 'Essential equipment for effective training', 'ציוד חיוני לאילוף יעיל', '🛒', 3, 50),
(7, 'Daily XP & Progress', 'התקדמות יומית', 'Track your progress and earn rewards', 'עקוב אחר ההתקדמות שלך וצבור פרסים', '🏆', 3, 100);

-- Insert lessons for Module 1: Foundation
INSERT INTO public.training_lessons (module_id, lesson_number, title, title_he, description_he, instructions_he, duration_minutes, xp_reward, recommended_product_name, recommended_product_reason) VALUES
((SELECT id FROM public.training_modules WHERE module_number = 1), 1, 'Understanding Body Language', 'הבנת שפת הגוף', 'למד לקרוא את הסימנים של הכלב שלך', 'צפה בכלב שלך במצבים שונים. שים לב לתנוחת האוזניים, הזנב והגוף. צלם תמונה של הכלב כשהוא רגוע ומאושר.', 5, 20, 'מדריך שפת גוף כלבים', 'יעזור לך להבין טוב יותר את הכלב'),
((SELECT id FROM public.training_modules WHERE module_number = 1), 2, 'House Rules', 'חוקי הבית', 'קבע גבולות ברורים לכלב', 'הגדר 3 חוקים ברורים לכלב (למשל: לא לעלות על הספה, לא לקפוץ על אנשים). צלם את הכלב מכבד את אחד החוקים.', 5, 20, 'שלטי אימון לבית', 'לעזור לכלב להבין את החוקים'),
((SELECT id FROM public.training_modules WHERE module_number = 1), 3, 'Positive Reinforcement', 'חיזוק חיובי', 'למד את הבסיס של אימון חיובי', 'תרגל לתת פרס מיד כשהכלב עושה משהו טוב. צלם את עצמך נותן פרס לכלב אחרי התנהגות טובה.', 5, 20, 'חטיפי אימון', 'הכרחיים לאימון חיובי'),
((SELECT id FROM public.training_modules WHERE module_number = 1), 4, 'Leadership & Bonding', 'מנהיגות וקשר', 'בנה קשר חזק עם הכלב', 'בלה 10 דקות משחק איכותי עם הכלב. צלם רגע של חיבור ביניכם.', 10, 25, 'צעצוע משיכה', 'מעולה לחיזוק הקשר');

-- Insert lessons for Module 2: Basic Commands
INSERT INTO public.training_lessons (module_id, lesson_number, title, title_he, description_he, instructions_he, duration_minutes, xp_reward, recommended_product_name, recommended_product_reason) VALUES
((SELECT id FROM public.training_modules WHERE module_number = 2), 1, 'Sit', 'שב', 'למד את הפקודה הבסיסית ביותר', 'החזק חטיף מעל אף הכלב והזז לאחור. כשהכלב יושב - תגיד "שב" ותן פרס. צלם את הכלב יושב לפי הפקודה.', 5, 20, 'קליקר לאימון', 'מזרז את תהליך הלמידה'),
((SELECT id FROM public.training_modules WHERE module_number = 2), 2, 'Down', 'שכב', 'למד את פקודת השכיבה', 'מהישיבה, הורד חטיף לריצפה לאט. כשהכלב שוכב - תגיד "שכב" ותן פרס. צלם את הכלב שוכב.', 5, 20, 'מזרן אימון', 'נוח לתרגול שכיבה'),
((SELECT id FROM public.training_modules WHERE module_number = 2), 3, 'Stay', 'הישאר', 'למד את פקודת ההמתנה', 'אחרי שהכלב יושב, תגיד "הישאר" וצעד אחורה. אם נשאר - פרס! צלם את הכלב נשאר במקום.', 5, 25, 'חטיפים גדולים', 'פרס משמעותי להישארות'),
((SELECT id FROM public.training_modules WHERE module_number = 2), 4, 'Come', 'בוא', 'למד את פקודת הקריאה', 'התרחק מהכלב וקרא "בוא!" בקול שמח. פרס גדול כשמגיע! צלם את הכלב בא אליך.', 5, 25, 'חגורת חטיפים', 'נוח לשאת פרסים'),
((SELECT id FROM public.training_modules WHERE module_number = 2), 5, 'No', 'לא', 'למד לעצור התנהגות לא רצויה', 'כשהכלב עושה משהו אסור, תגיד "לא" בטון נחרץ והפנה אותו לפעילות מותרת. צלם את הכלב מפסיק התנהגות לא רצויה.', 5, 20, 'צעצוע לעיסה', 'אלטרנטיבה מותרת'),
((SELECT id FROM public.training_modules WHERE module_number = 2), 6, 'Leave It', 'עזוב', 'למד לוותר על דברים', 'שים חטיף בכף יד סגורה. כשהכלב מפסיק לנסות - פרס מהיד השנייה! צלם את הכלב מתעלם מחטיף.', 5, 25, 'כפפות אימון', 'להגנה בתרגול'),
((SELECT id FROM public.training_modules WHERE module_number = 2), 7, 'Heel', 'הלך ברגל', 'למד הליכה ללא משיכה', 'התחל עם רצועה קצרה. כל פעם שהכלב הולך לצידך - פרס! צלם הליכה נכונה ברצועה.', 10, 30, 'רצועה קצרה לאימון', 'שליטה טובה יותר');

-- Insert lessons for Module 3: Behavior Fixes
INSERT INTO public.training_lessons (module_id, lesson_number, title, title_he, description_he, instructions_he, duration_minutes, xp_reward, recommended_product_name, recommended_product_reason) VALUES
((SELECT id FROM public.training_modules WHERE module_number = 3), 1, 'Leash Pulling', 'משיכה ברצועה', 'פתור את בעיית המשיכה', 'כשהכלב מושך - עצור לגמרי. המשך רק כשהרצועה רפויה. צלם הליכה עם רצועה רפויה.', 10, 25, 'רתמה אנטי-משיכה', 'מפחית משיכה משמעותית'),
((SELECT id FROM public.training_modules WHERE module_number = 3), 2, 'Jumping on People', 'קפיצה על אנשים', 'עצור קפיצות לא רצויות', 'התעלם לחלוטין כשקופץ. פרס רק כשכל 4 הרגליים על הרצפה. צלם את הכלב מברך אנשים בצורה נכונה.', 5, 20, 'חטיפי אימון קטנים', 'לפרס מהיר'),
((SELECT id FROM public.training_modules WHERE module_number = 3), 3, 'Excessive Barking', 'נביחות מוגזמות', 'הפחת נביחות מיותרות', 'למד את הטריגר. לימד "שקט" - כשנובח, אמור "שקט" והמתן. פרס ברגע שמפסיק. צלם את הכלב שקט אחרי טריגר.', 10, 25, 'צעצוע אינטראקטיבי', 'מסיח דעת מנביחות'),
((SELECT id FROM public.training_modules WHERE module_number = 3), 4, 'Separation Anxiety', 'חרדת נטישה', 'עזור לכלב להרגיש בטוח לבד', 'התחל עם יציאות קצרות (30 שניות) והגדל בהדרגה. צלם את הכלב רגוע כשאתה יוצא.', 10, 30, 'צעצוע קונג', 'תעסוקה לזמן לבד'),
((SELECT id FROM public.training_modules WHERE module_number = 3), 5, 'Destructive Behavior', 'התנהגות הרסנית', 'עצור כרסום והרס', 'ספק מספיק פעילות גופנית ומנטלית. הפנה לכרסום מותר. צלם את הכלב כורסם צעצוע מותר.', 5, 20, 'צעצועי לעיסה עמידים', 'אלטרנטיבה בטוחה'),
((SELECT id FROM public.training_modules WHERE module_number = 3), 6, 'Puppy Biting', 'נשיכות גורים', 'למד גור לשלוט בפה', 'כשנושך - צעק "אאוץ" והפסק משחק. המשך רק כשנרגע. צלם משחק ללא נשיכות.', 5, 20, 'צעצועי גורים רכים', 'בטוחים לחניכיים'),
((SELECT id FROM public.training_modules WHERE module_number = 3), 7, 'Running Away', 'בריחה והתעלמות', 'בנה זיכרון אמין', 'תרגל קריאה עם פרסים מדהימים. לעולם אל תעניש על חזרה איטית. צלם את הכלב חוזר אליך.', 10, 30, 'רצועה ארוכה לאימון', 'מאפשר תרגול בטוח');

-- Insert lessons for Module 4: Advanced Training
INSERT INTO public.training_lessons (module_id, lesson_number, title, title_he, description_he, instructions_he, duration_minutes, xp_reward, recommended_product_name, recommended_product_reason) VALUES
((SELECT id FROM public.training_modules WHERE module_number = 4), 1, 'Off-Leash Obedience', 'ציות ללא רצועה', 'שליטה ללא רצועה', 'התחל במקום מגודר. תרגל פקודות בסיסיות ללא רצועה. צלם את הכלב מציית ללא רצועה.', 10, 35, 'קולר GPS', 'בטיחות בתרגול'),
((SELECT id FROM public.training_modules WHERE module_number = 4), 2, 'Focus Around Distractions', 'ריכוז עם הסחות', 'שמור מיקוד בכל מצב', 'תרגל פקודות ליד הסחות (כלבים אחרים, אנשים). צלם את הכלב ממוקד למרות הסחות.', 10, 35, 'חטיפים בעלי ריח חזק', 'למשוך תשומת לב'),
((SELECT id FROM public.training_modules WHERE module_number = 4), 3, 'Confidence Building', 'בניית ביטחון', 'חזק כלב פחדן', 'חשוף בהדרגה לדברים מפחידים עם פרסים. צלם את הכלב מתמודד עם פחד.', 10, 30, 'רתמה נוחה', 'תחושת ביטחון'),
((SELECT id FROM public.training_modules WHERE module_number = 4), 4, 'Basic Protection', 'הגנה בסיסית', 'בנה ביטחון ושמירה', 'למד את הכלב לנבוח לפי פקודה ולהפסיק לפי פקודה. צלם תרגיל שמירה.', 10, 40, 'צעצוע משיכה חזק', 'לאימון הגנה'),
((SELECT id FROM public.training_modules WHERE module_number = 4), 5, 'Anti-Aggression', 'מניעת תוקפנות', 'ניהול תוקפנות בטוח', 'זהה טריגרים והפחת רגישות בהדרגה. צלם את הכלב רגוע ליד טריגר.', 15, 45, 'זמם אימון', 'בטיחות בתרגול');