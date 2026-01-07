
-- Subtasks for tasks
CREATE TABLE public.task_subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.admin_tasks(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  assigned_to UUID,
  due_date TIMESTAMPTZ,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Time tracking entries
CREATE TABLE public.task_time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.admin_tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  description TEXT,
  is_billable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Task templates for reusable workflows
CREATE TABLE public.task_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_priority TEXT DEFAULT 'medium',
  default_tags TEXT[],
  subtasks JSONB DEFAULT '[]',
  estimated_hours DECIMAL(5,2),
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Task dependencies
CREATE TABLE public.task_dependencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.admin_tasks(id) ON DELETE CASCADE NOT NULL,
  depends_on_task_id UUID REFERENCES public.admin_tasks(id) ON DELETE CASCADE NOT NULL,
  dependency_type TEXT DEFAULT 'finish_to_start', -- finish_to_start, start_to_start, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, depends_on_task_id)
);

-- Task comments/activity log
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.admin_tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  comment_type TEXT DEFAULT 'comment', -- comment, status_change, assignment, etc.
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workflow/Pipeline stages for CRM
CREATE TABLE public.crm_pipelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  stages JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CRM Deals/Opportunities
CREATE TABLE public.crm_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  customer_id UUID,
  pipeline_id UUID REFERENCES public.crm_pipelines(id),
  stage TEXT NOT NULL DEFAULT 'new',
  value DECIMAL(12,2),
  currency TEXT DEFAULT 'ILS',
  probability INTEGER DEFAULT 50,
  expected_close_date DATE,
  assigned_to UUID,
  tags TEXT[],
  custom_fields JSONB,
  status TEXT DEFAULT 'open', -- open, won, lost
  lost_reason TEXT,
  won_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CRM Activities (calls, meetings, emails)
CREATE TABLE public.crm_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  customer_id UUID,
  activity_type TEXT NOT NULL, -- call, meeting, email, note, task
  subject TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  outcome TEXT,
  assigned_to UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Automation rules
CREATE TABLE public.automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- task_status_changed, deal_stage_changed, etc.
  trigger_conditions JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin access
CREATE POLICY "Admins have full access to subtasks" ON public.task_subtasks FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins have full access to time entries" ON public.task_time_entries FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins have full access to templates" ON public.task_templates FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins have full access to dependencies" ON public.task_dependencies FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins have full access to comments" ON public.task_comments FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins have full access to pipelines" ON public.crm_pipelines FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins have full access to deals" ON public.crm_deals FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins have full access to activities" ON public.crm_activities FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins have full access to automation rules" ON public.automation_rules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_task_subtasks_task_id ON public.task_subtasks(task_id);
CREATE INDEX idx_task_time_entries_task_id ON public.task_time_entries(task_id);
CREATE INDEX idx_task_time_entries_user_id ON public.task_time_entries(user_id);
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_crm_deals_pipeline_id ON public.crm_deals(pipeline_id);
CREATE INDEX idx_crm_deals_customer_id ON public.crm_deals(customer_id);
CREATE INDEX idx_crm_deals_stage ON public.crm_deals(stage);
CREATE INDEX idx_crm_activities_deal_id ON public.crm_activities(deal_id);
