-- Create message_events table for logging all inbound/outbound events
CREATE TABLE IF NOT EXISTS public.message_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'whatsapp',
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender TEXT,
  recipient TEXT,
  message_text TEXT,
  message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  latency_ms INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.message_events ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge functions use service role)
CREATE POLICY "Service role can manage message_events"
  ON public.message_events
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_message_events_provider_created ON public.message_events(provider, created_at DESC);
CREATE INDEX idx_message_events_sender ON public.message_events(sender);

-- Add comment
COMMENT ON TABLE public.message_events IS 'Logs all messaging events for debugging and analytics';