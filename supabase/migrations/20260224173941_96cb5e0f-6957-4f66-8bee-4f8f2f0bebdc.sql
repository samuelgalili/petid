
-- automation_bots: central registry for the fleet
CREATE TABLE public.automation_bots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT 'bot',
  color TEXT DEFAULT 'blue',
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}',
  capabilities JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- admin_approval_queue: human-in-the-loop items
CREATE TABLE public.admin_approval_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id UUID REFERENCES public.automation_bots(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'pending_review',
  draft_content TEXT,
  proposed_changes JSONB,
  pet_name TEXT,
  target_entity TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- system_events: activity log
CREATE TABLE public.system_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id UUID REFERENCES public.automation_bots(id),
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'info',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- content_calendar: scheduled content
CREATE TABLE public.content_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id UUID REFERENCES public.automation_bots(id),
  title TEXT NOT NULL,
  content TEXT,
  channel TEXT DEFAULT 'feed',
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'draft',
  nrc_verified BOOLEAN DEFAULT false,
  pet_context JSONB,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- external_integrations: API keys and service configs
CREATE TABLE public.external_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT NOT NULL,
  service_type TEXT DEFAULT 'api',
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  status TEXT DEFAULT 'configured',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.automation_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_approval_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_integrations ENABLE ROW LEVEL SECURITY;

-- Public read for all (admin-only app context)
CREATE POLICY "Allow read automation_bots" ON public.automation_bots FOR SELECT USING (true);
CREATE POLICY "Allow all automation_bots" ON public.automation_bots FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow read admin_approval_queue" ON public.admin_approval_queue FOR SELECT USING (true);
CREATE POLICY "Allow all admin_approval_queue" ON public.admin_approval_queue FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow read system_events" ON public.system_events FOR SELECT USING (true);
CREATE POLICY "Allow insert system_events" ON public.system_events FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read content_calendar" ON public.content_calendar FOR SELECT USING (true);
CREATE POLICY "Allow all content_calendar" ON public.content_calendar FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow read external_integrations" ON public.external_integrations FOR SELECT USING (true);
CREATE POLICY "Allow all external_integrations" ON public.external_integrations FOR ALL USING (true) WITH CHECK (true);

-- Seed the fleet
INSERT INTO public.automation_bots (name, slug, icon, color, description, capabilities) VALUES
  ('Brain Bot', 'brain', 'brain', 'purple', 'Orchestrates flow between all bots', '["orchestration","routing","priority"]'),
  ('CRM Bot', 'crm', 'target', 'cyan', 'Ensures data integrity across profiles', '["data_sync","validation","dedup"]'),
  ('Sales Bot', 'sales', 'megaphone', 'orange', 'Generates Libra insurance leads and offers', '["lead_gen","pricing","offers"]'),
  ('Marketing Bot', 'marketing', 'sparkles', 'pink', 'Automated segmentation and campaigns', '["segmentation","campaigns","triggers"]'),
  ('Content Bot', 'content', 'message-circle', 'green', 'AI content creation with NRC verification', '["blog","social","tips","visual"]'),
  ('NRC Science Bot', 'nrc-science', 'scale', 'indigo', 'Validates nutrition against NRC 2006', '["nrc_verify","ingredients","diet"]'),
  ('Inventory Bot', 'inventory', 'store', 'amber', 'Predicts stock based on pet weight', '["stock","reorder","demand"]'),
  ('Support Bot', 'support', 'headphones', 'blue', 'AI help based on pet history', '["chat","tickets","faq"]'),
  ('Medical Bot', 'medical', 'stethoscope', 'emerald', 'Vet alerts and clinic locations', '["alerts","clinics","records"]'),
  ('Compliance Bot', 'compliance', 'scale', 'violet', 'Tracks municipal licenses', '["licenses","regulations","renewals"]');
