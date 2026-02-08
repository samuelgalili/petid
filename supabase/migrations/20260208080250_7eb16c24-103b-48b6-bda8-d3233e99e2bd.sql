-- Data alerts table for admin notifications
CREATE TABLE public.admin_data_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL, -- 'missing_data', 'stale_content', 'sync_error', 'quality_low', 'new_data'
  severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'error'
  category TEXT NOT NULL, -- 'breeds', 'articles', 'insurance', 'dog_parks', 'research'
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_data_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage alerts" ON public.admin_data_alerts
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Data sync log for tracking auto-sync operations
CREATE TABLE public.admin_data_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES public.admin_data_sources(id) ON DELETE SET NULL,
  sync_type TEXT NOT NULL, -- 'auto', 'manual'
  target_table TEXT NOT NULL, -- 'breed_information', etc.
  records_created INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  records_failed INT DEFAULT 0,
  error_details JSONB,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_data_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync logs" ON public.admin_data_sync_log
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Add quality score to data sources
ALTER TABLE public.admin_data_sources ADD COLUMN IF NOT EXISTS quality_score NUMERIC(3,1) DEFAULT 0;
ALTER TABLE public.admin_data_sources ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE public.admin_data_sources ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';

-- Enable realtime for alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_data_alerts;

-- Index for quick alert lookups
CREATE INDEX idx_admin_data_alerts_unread ON public.admin_data_alerts (is_read, severity) WHERE is_read = false;
CREATE INDEX idx_admin_data_alerts_category ON public.admin_data_alerts (category, alert_type);
