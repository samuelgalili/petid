
-- Table for message feedback (thumbs up/down)
CREATE TABLE public.chat_message_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_messages JSONB NOT NULL DEFAULT '[]',
  message_content TEXT NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('up', 'down')),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_message_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own feedback"
ON public.chat_message_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback"
ON public.chat_message_feedback FOR SELECT
USING (auth.uid() = user_id);

-- Table for grooming leads
CREATE TABLE public.grooming_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pet_id UUID,
  pet_name TEXT,
  service_type TEXT,
  fur_notes TEXT,
  sensitivity_notes TEXT,
  preferred_date TEXT,
  preferred_time TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.grooming_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own grooming leads"
ON public.grooming_leads FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own grooming leads"
ON public.grooming_leads FOR SELECT
USING (auth.uid() = user_id);
