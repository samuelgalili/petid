
CREATE TABLE public.breed_disease_diet_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  disease TEXT NOT NULL UNIQUE,
  diet TEXT NOT NULL,
  required_nutrients TEXT[] NOT NULL DEFAULT '{}',
  avoid TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.breed_disease_diet_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read diet rules"
  ON public.breed_disease_diet_rules
  FOR SELECT
  USING (true);

INSERT INTO public.breed_disease_diet_rules (disease, diet, required_nutrients, avoid) VALUES
  ('mitral_valve_disease', 'cardiac', ARRAY['low_sodium','taurine','omega3'], ARRAY['high_salt']),
  ('dilated_cardiomyopathy', 'cardiac', ARRAY['taurine','l_carnitine','omega3'], ARRAY['grain_free_exotic']),
  ('hip_dysplasia', 'joint_support', ARRAY['glucosamine','chondroitin','epa_dha'], ARRAY['excess_calories']),
  ('obesity', 'weight_control', ARRAY['high_fiber','low_fat'], ARRAY['high_calorie_treats']),
  ('diabetes', 'diabetic', ARRAY['low_glycemic','high_protein'], ARRAY['simple_carbs']),
  ('renal_failure', 'renal', ARRAY['low_phosphorus','moderate_protein','omega3'], ARRAY['high_protein']),
  ('atopic_dermatitis', 'hypoallergenic', ARRAY['hydrolyzed_protein','omega3'], ARRAY['chicken','beef','dairy']),
  ('gastroenteritis', 'gastrointestinal', ARRAY['high_digestibility','prebiotics'], ARRAY['high_fat']),
  ('pancreatitis', 'low_fat_gi', ARRAY['very_low_fat'], ARRAY['fatty_foods']);
