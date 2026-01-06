-- Create table for WhatsApp OTPs
CREATE TABLE public.whatsapp_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'signup',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_otps ENABLE ROW LEVEL SECURITY;

-- Only service role can access (via edge functions)
CREATE POLICY "Service role only"
ON public.whatsapp_otps
FOR ALL
USING (false)
WITH CHECK (false);

-- Index for faster lookups
CREATE INDEX idx_whatsapp_otps_phone ON public.whatsapp_otps(phone);
CREATE INDEX idx_whatsapp_otps_expires ON public.whatsapp_otps(expires_at);

-- Auto-delete expired OTPs (cleanup function)
CREATE OR REPLACE FUNCTION public.cleanup_expired_whatsapp_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.whatsapp_otps 
  WHERE expires_at < NOW() OR used = true;
END;
$$;