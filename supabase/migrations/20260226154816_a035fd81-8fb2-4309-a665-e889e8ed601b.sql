
-- Create fleet_commands table for Admin Command Center
CREATE TABLE public.fleet_commands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_command TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  target_agent TEXT,
  brain_analysis JSONB,
  result TEXT,
  issued_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fleet_commands ENABLE ROW LEVEL SECURITY;

-- Admin-only policies (using user_roles table)
CREATE POLICY "Admins can view all fleet commands"
  ON public.fleet_commands FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert fleet commands"
  ON public.fleet_commands FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update fleet commands"
  ON public.fleet_commands FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.fleet_commands;

-- Timestamp trigger
CREATE TRIGGER update_fleet_commands_updated_at
  BEFORE UPDATE ON public.fleet_commands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
