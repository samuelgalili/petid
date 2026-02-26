
-- Insurance partner settings (admin-configurable)
CREATE TABLE IF NOT EXISTS public.insurance_partner_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name TEXT NOT NULL DEFAULT 'Insurance Partner',
  api_endpoint TEXT,
  api_key_name TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  share_default_off BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_partner_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage partner settings"
  ON public.insurance_partner_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read partner settings"
  ON public.insurance_partner_settings FOR SELECT
  TO authenticated
  USING (true);

-- Seed default row
INSERT INTO public.insurance_partner_settings (partner_name) VALUES ('Insurance Partner') ON CONFLICT DO NOTHING;
