
CREATE TABLE IF NOT EXISTS public.dietary_categories (
    id SERIAL PRIMARY KEY,
    category_name_he TEXT,
    category_name_en TEXT,
    target_condition_he TEXT,
    description_he TEXT
);

ALTER TABLE public.dietary_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read dietary categories"
ON public.dietary_categories FOR SELECT
USING (true);

INSERT INTO public.dietary_categories (category_name_he, category_name_en, target_condition_he, description_he)
VALUES 
('היפואלרגני', 'Hypoallergenic', 'אלרגיות מזון, רגישות בעור', 'מבוסס על חלבון מפורק למניעת תגובה אלרגית.'),
('דיאבטיק', 'Diabetic', 'סוכרת', 'מזון דל בפחמימות מורכבות לוויסות רמת הסוכר.'),
('גסטרו / אינטסטינל', 'Gastrointestinal', 'בעיות עיכול, שלשולים, הקאות', 'קל מאוד לעיכול ומעשיר את פלורת המעי.'),
('יורינרי / סטרוויט', 'Urinary / Struvite', 'אבנים וקריסטלים בדרכי השתן', 'מאזן את חומציות השתן להמסה ומניעה של אבנים.'),
('רנל', 'Renal', 'אי ספיקת כליות', 'רמות מבוקרות של זרחן וחלבון להקלה על הכליות.'),
('אוביסיטי / מטבוליק', 'Obesity / Metabolic', 'עודף משקל, השמנת יתר', 'תכולת קלוריות נמוכה וסיבים תזונתיים לתחושת שובע.'),
('דרמטוזיס', 'Dermatosis', 'בעיות עור ופרווה, נשירה מוגברת', 'עשיר באומגה 3 ו-6 לשיקום מחסום העור.'),
('היירבול', 'Hairball', 'כדורי פרווה (חתולים)', 'סיבים מיוחדים המסייעים למעבר פרווה במערכת העיכול.');
