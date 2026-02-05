-- Add numeric rating columns to existing breed_information table
ALTER TABLE public.breed_information
ADD COLUMN IF NOT EXISTS affection_family INT,
ADD COLUMN IF NOT EXISTS kids_friendly INT,
ADD COLUMN IF NOT EXISTS dog_friendly INT,
ADD COLUMN IF NOT EXISTS shedding_level INT,
ADD COLUMN IF NOT EXISTS grooming_freq INT,
ADD COLUMN IF NOT EXISTS drooling_level INT,
ADD COLUMN IF NOT EXISTS stranger_openness INT,
ADD COLUMN IF NOT EXISTS playfulness INT,
ADD COLUMN IF NOT EXISTS watchdog_nature INT,
ADD COLUMN IF NOT EXISTS trainability INT,
ADD COLUMN IF NOT EXISTS energy_level INT,
ADD COLUMN IF NOT EXISTS barking_level INT,
ADD COLUMN IF NOT EXISTS mental_needs INT;

-- Insert Batch 1: Popular breeds with full rating data
INSERT INTO public.breed_information (
  breed_name, breed_name_he, pet_type, life_expectancy_years, description, description_he,
  affection_family, kids_friendly, dog_friendly, shedding_level, grooming_freq, drooling_level,
  stranger_openness, playfulness, watchdog_nature, trainability, energy_level, barking_level, mental_needs,
  is_active
)
VALUES 
  ('French Bulldog', 'בולדוג צרפתי', 'dog', '10-12', 'A charming companion dog, quiet and very suitable for apartments.', 'כלב לוויה מקסים, שקט ומתאים מאוד לדירה.', 5, 5, 4, 3, 1, 1, 5, 5, 3, 4, 3, 1, 3, true),
  ('Golden Retriever', 'גולדן רטריבר', 'dog', '10-12', 'Exceptionally friendly, very intelligent and perfect for families.', 'חברותי בצורה יוצאת דופן, חכם מאוד ומושלם למשפחות.', 5, 5, 5, 4, 2, 2, 5, 5, 2, 5, 3, 3, 4, true),
  ('German Shepherd', 'רועה גרמני', 'dog', '7-10', 'A noble working dog, very loyal with a developed guarding instinct.', 'כלב עבודה אצילי, נאמן מאוד ובעל יצר שמירה מפותח.', 5, 5, 3, 4, 2, 2, 2, 4, 5, 5, 5, 3, 5, true),
  ('Poodle', 'פודל', 'dog', '10-18', 'Exceptional intelligence, almost no shedding (hypoallergenic).', 'אינטליגנציה יוצאת דופן, כמעט ללא נשירה (היפואלרגני).', 5, 5, 4, 1, 4, 1, 3, 5, 3, 5, 4, 4, 5, true),
  ('Doberman Pinscher', 'דוברמן פינצ''ר', 'dog', '10-12', 'An elegant guardian, very intelligent and fast.', 'שומר ראש אלגנטי, חכם ומהיר מאוד.', 5, 5, 3, 2, 1, 1, 2, 4, 5, 5, 5, 3, 5, true),
  ('Labrador Retriever', 'לברדור רטריבר', 'dog', '10-12', 'The ultimate family dog, loves water and people.', 'כלב משפחה אולטימטיבי, אוהב מים ואנשים.', 5, 5, 5, 4, 2, 3, 5, 5, 3, 5, 5, 3, 5, true),
  ('Cavalier King Charles Spaniel', 'קאוואליר קינג צ''ארלס', 'dog', '12-15', 'Gentle, calm and loves cuddles, suitable for all experience levels.', 'עדין, רגוע ואוהב ליטופים, מתאים לכל רמת ניסיון.', 5, 5, 4, 2, 3, 1, 4, 4, 2, 4, 2, 2, 3, true),
  ('Rottweiler', 'רוטוויילר', 'dog', '9-10', 'A powerful protector, calm indoors and very devoted to family.', 'מגן עוצמתי, רגוע בתוך הבית ומסור מאוד למשפחתו.', 5, 3, 2, 3, 2, 3, 2, 4, 5, 4, 3, 2, 4, true),
  ('Shih Tzu', 'שי טסו', 'dog', '10-18', 'A small, regal companion dog that loves attention and gets along with everyone.', 'כלב לוויה קטן ומלכותי, אוהב תשומת לב ומסתדר עם כולם.', 5, 5, 4, 1, 4, 1, 4, 4, 3, 3, 2, 2, 3, true),
  ('Beagle', 'ביגל', 'dog', '10-15', 'A small hunting dog with an incredible sense of smell, friendly and energetic.', 'כלב ציד קטן עם חוש ריח מטורף, חברותי ואנרגטי.', 4, 5, 5, 3, 2, 1, 4, 5, 2, 3, 4, 4, 3, true)
ON CONFLICT (breed_name) DO UPDATE SET
  breed_name_he = EXCLUDED.breed_name_he,
  life_expectancy_years = EXCLUDED.life_expectancy_years,
  description = EXCLUDED.description,
  description_he = EXCLUDED.description_he,
  affection_family = EXCLUDED.affection_family,
  kids_friendly = EXCLUDED.kids_friendly,
  dog_friendly = EXCLUDED.dog_friendly,
  shedding_level = EXCLUDED.shedding_level,
  grooming_freq = EXCLUDED.grooming_freq,
  drooling_level = EXCLUDED.drooling_level,
  stranger_openness = EXCLUDED.stranger_openness,
  playfulness = EXCLUDED.playfulness,
  watchdog_nature = EXCLUDED.watchdog_nature,
  trainability = EXCLUDED.trainability,
  energy_level = EXCLUDED.energy_level,
  barking_level = EXCLUDED.barking_level,
  mental_needs = EXCLUDED.mental_needs,
  is_active = EXCLUDED.is_active,
  updated_at = now();