-- Create minimal table for tracking WhatsApp conversation windows
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wa_id TEXT NOT NULL UNIQUE,
  last_inbound_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast lookups by wa_id
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_wa_id ON public.whatsapp_conversations(wa_id);

-- Enable RLS
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (Edge Functions use service role)
CREATE POLICY "Service role full access" ON public.whatsapp_conversations
  FOR ALL USING (true) WITH CHECK (true);