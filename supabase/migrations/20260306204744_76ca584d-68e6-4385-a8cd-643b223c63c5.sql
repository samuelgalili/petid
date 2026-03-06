-- Add API settings columns to suppliers table
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS api_key_hash text,
ADD COLUMN IF NOT EXISTS api_key_prefix text,
ADD COLUMN IF NOT EXISTS webhook_url text,
ADD COLUMN IF NOT EXISTS webhook_secret text,
ADD COLUMN IF NOT EXISTS api_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS webhook_enabled boolean DEFAULT false;

-- Create factory_api_logs table for tracking API usage
CREATE TABLE IF NOT EXISTS public.factory_api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer,
  request_body jsonb,
  response_summary text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.factory_api_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers can view own API logs"
ON public.factory_api_logs FOR SELECT TO authenticated
USING (supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid()));

CREATE POLICY "System can insert API logs"
ON public.factory_api_logs FOR INSERT TO authenticated
WITH CHECK (true);