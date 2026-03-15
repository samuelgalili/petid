
-- ============================================
-- AI OS CORE SCHEMA
-- ============================================

-- Tool Registry: Central registry of all available tools
CREATE TABLE public.ai_os_tool_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  endpoint_type TEXT NOT NULL DEFAULT 'edge_function', -- edge_function, database, api, internal
  endpoint_config JSONB DEFAULT '{}'::jsonb,
  input_schema JSONB DEFAULT '{}'::jsonb,
  output_schema JSONB DEFAULT '{}'::jsonb,
  risk_level TEXT NOT NULL DEFAULT 'low', -- low, medium, high, critical
  requires_approval BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  rate_limit_per_minute INTEGER DEFAULT 60,
  allowed_roles TEXT[] DEFAULT ARRAY['admin'],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agent Permissions: Granular permissions per agent
CREATE TABLE public.ai_os_agent_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug TEXT NOT NULL,
  tool_name TEXT REFERENCES public.ai_os_tool_registry(name) ON DELETE CASCADE,
  allowed_actions TEXT[] DEFAULT ARRAY['read'],
  max_risk_level TEXT DEFAULT 'low',
  requires_approval BOOLEAN DEFAULT false,
  data_scopes JSONB DEFAULT '{}'::jsonb,
  execution_limit_per_hour INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_slug, tool_name)
);

-- Tool Executions: Every tool call logged
CREATE TABLE public.ai_os_tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name TEXT NOT NULL,
  agent_slug TEXT NOT NULL,
  conversation_id UUID,
  input_params JSONB DEFAULT '{}'::jsonb,
  output_result JSONB,
  risk_score NUMERIC(3,2) DEFAULT 0,
  risk_factors JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, executing, completed, failed, blocked, rolled_back
  approval_required BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  error_message TEXT,
  execution_time_ms INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Risk Assessments: Dynamic risk scoring
CREATE TABLE public.ai_os_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES public.ai_os_tool_executions(id) ON DELETE CASCADE,
  overall_score NUMERIC(3,2) NOT NULL DEFAULT 0,
  autonomy_score NUMERIC(3,2) DEFAULT 0,
  data_sensitivity_score NUMERIC(3,2) DEFAULT 0,
  financial_impact_score NUMERIC(3,2) DEFAULT 0,
  reversibility_score NUMERIC(3,2) DEFAULT 0,
  customer_impact_score NUMERIC(3,2) DEFAULT 0,
  propagation_score NUMERIC(3,2) DEFAULT 0,
  confidence_score NUMERIC(3,2) DEFAULT 0,
  decision TEXT NOT NULL DEFAULT 'allow', -- allow, require_approval, block, escalate
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow Runs: Multi-step workflow tracking
CREATE TABLE public.ai_os_workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_name TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'manual', -- manual, scheduled, event, agent
  trigger_source TEXT,
  conversation_id UUID,
  steps JSONB DEFAULT '[]'::jsonb,
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, paused, waiting_approval, completed, failed, cancelled
  started_by UUID,
  error_log JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Security Incidents: Track security events
CREATE TABLE public.ai_os_security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type TEXT NOT NULL, -- prompt_injection, unauthorized_access, tool_misuse, anomaly, cascading_failure
  severity TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  agent_slug TEXT,
  tool_name TEXT,
  execution_id UUID REFERENCES public.ai_os_tool_executions(id),
  description TEXT NOT NULL,
  evidence JSONB DEFAULT '{}'::jsonb,
  action_taken TEXT, -- blocked, warned, escalated, kill_switch
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent Memory: Layered memory system
CREATE TABLE public.ai_os_agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_type TEXT NOT NULL, -- session, long_term, business, customer, operational, policy
  agent_slug TEXT,
  scope TEXT DEFAULT 'global', -- global, agent, conversation, customer
  scope_id TEXT,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  trust_score NUMERIC(3,2) DEFAULT 1.0,
  source TEXT, -- user, agent, system, external
  is_protected BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- AI OS Conversations: Enhanced conversation tracking
CREATE TABLE public.ai_os_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  status TEXT DEFAULT 'active', -- active, archived, pinned
  agent_slugs TEXT[] DEFAULT ARRAY[]::TEXT[],
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- AI OS Messages: Rich message format
CREATE TABLE public.ai_os_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.ai_os_conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL, -- user, assistant, system, agent, tool
  agent_slug TEXT,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text', -- text, card, chart, table, approval, status, error
  structured_data JSONB,
  tool_calls JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_os_tool_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_os_agent_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_os_tool_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_os_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_os_workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_os_security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_os_agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_os_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_os_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin-only for system tables
CREATE POLICY "Admins can manage tool registry" ON public.ai_os_tool_registry FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage agent permissions" ON public.ai_os_agent_permissions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view tool executions" ON public.ai_os_tool_executions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view risk assessments" ON public.ai_os_risk_assessments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage workflows" ON public.ai_os_workflow_runs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage security incidents" ON public.ai_os_security_incidents FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage agent memory" ON public.ai_os_agent_memory FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Conversations: Users can access their own, admins all
CREATE POLICY "Users can manage own conversations" ON public.ai_os_conversations FOR ALL TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can manage own messages" ON public.ai_os_messages FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ai_os_conversations c WHERE c.id = conversation_id AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_os_messages;

-- Indexes for performance
CREATE INDEX idx_ai_os_tool_executions_agent ON public.ai_os_tool_executions(agent_slug, created_at DESC);
CREATE INDEX idx_ai_os_tool_executions_status ON public.ai_os_tool_executions(status);
CREATE INDEX idx_ai_os_messages_conversation ON public.ai_os_messages(conversation_id, created_at);
CREATE INDEX idx_ai_os_conversations_user ON public.ai_os_conversations(user_id, updated_at DESC);
CREATE INDEX idx_ai_os_workflow_runs_status ON public.ai_os_workflow_runs(status, created_at DESC);
CREATE INDEX idx_ai_os_security_incidents_severity ON public.ai_os_security_incidents(severity, is_resolved);
CREATE INDEX idx_ai_os_agent_memory_lookup ON public.ai_os_agent_memory(memory_type, scope, scope_id, key);
