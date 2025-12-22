-- Quick Replies for businesses
CREATE TABLE public.quick_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message_text TEXT NOT NULL,
  shortcut TEXT,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their quick replies"
ON public.quick_replies FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Auto-replies settings
CREATE TABLE public.auto_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  greeting_enabled BOOLEAN DEFAULT false,
  greeting_message TEXT,
  away_enabled BOOLEAN DEFAULT false,
  away_message TEXT,
  away_start_time TIME,
  away_end_time TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.auto_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their auto replies"
ON public.auto_replies FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DM Labels for conversations
CREATE TYPE public.dm_label AS ENUM ('primary', 'general', 'flagged', 'pending');

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS label public.dm_label DEFAULT 'general';

-- Lead Forms
CREATE TABLE public.lead_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage lead forms"
ON public.lead_forms FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.business_profiles 
    WHERE id = lead_forms.business_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view active lead forms"
ON public.lead_forms FOR SELECT
USING (is_active = true);

-- Lead Submissions
CREATE TABLE public.lead_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.lead_forms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  data JSONB NOT NULL,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their leads"
ON public.lead_submissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lead_forms lf
    JOIN public.business_profiles bp ON bp.id = lf.business_id
    WHERE lf.id = lead_submissions.form_id AND bp.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can submit leads"
ON public.lead_submissions FOR INSERT
WITH CHECK (true);

-- Business Subscriptions (exclusive content)
CREATE TABLE public.business_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT DEFAULT 'basic',
  price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(business_id, subscriber_id)
);

ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their subscribers"
ON public.business_subscriptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.business_profiles 
    WHERE id = business_subscriptions.business_id AND user_id = auth.uid()
  )
  OR subscriber_id = auth.uid()
);

CREATE POLICY "Users can manage their subscriptions"
ON public.business_subscriptions FOR ALL
USING (subscriber_id = auth.uid())
WITH CHECK (subscriber_id = auth.uid());

-- Branded Content / Partnerships
CREATE TABLE public.branded_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  partner_business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.branded_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view branded content"
ON public.branded_content FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.posts WHERE id = branded_content.post_id AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.business_profiles 
    WHERE id = branded_content.partner_business_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Post owners can create branded content"
ON public.branded_content FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.posts WHERE id = post_id AND user_id = auth.uid()
  )
);

-- Business Appointments Calendar
CREATE TABLE public.business_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES auth.users(id),
  customer_name TEXT,
  customer_phone TEXT,
  service_type TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.business_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage appointments"
ON public.business_appointments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.business_profiles 
    WHERE id = business_appointments.business_id AND user_id = auth.uid()
  )
  OR customer_id = auth.uid()
);

CREATE POLICY "Anyone can book appointments"
ON public.business_appointments FOR INSERT
WITH CHECK (true);

-- Advanced Analytics - Profile Views History
CREATE TABLE public.business_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id),
  viewer_age_range TEXT,
  viewer_city TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.business_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their analytics"
ON public.business_analytics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.business_profiles 
    WHERE id = business_analytics.business_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can create view events"
ON public.business_analytics FOR INSERT
WITH CHECK (true);