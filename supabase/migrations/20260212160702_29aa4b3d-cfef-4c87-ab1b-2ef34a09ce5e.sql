
CREATE TABLE public.training_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pet_id UUID,
  pet_name TEXT,
  pet_breed TEXT,
  pet_age TEXT,
  issue_category TEXT NOT NULL,
  issue_detail TEXT,
  severity_detail TEXT,
  phone_last_digits TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.training_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own training leads"
ON public.training_leads FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own training leads"
ON public.training_leads FOR SELECT
USING (auth.uid() = user_id);
