
-- Shipping providers configuration
CREATE TABLE public.shipping_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('international', 'local', 'both')),
  api_base_url TEXT,
  is_active BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  supported_countries TEXT[] DEFAULT '{}',
  config JSONB DEFAULT '{}',
  label_format TEXT DEFAULT 'pdf',
  tracking_url_template TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage shipping providers" ON public.shipping_providers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view active providers" ON public.shipping_providers
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Shipment tracking
CREATE TABLE public.shipment_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  provider_id UUID REFERENCES public.shipping_providers(id) ON DELETE SET NULL,
  tracking_number TEXT,
  carrier_name TEXT,
  origin_country TEXT DEFAULT 'CN',
  destination_country TEXT DEFAULT 'IL',
  current_status TEXT DEFAULT 'label_created',
  label_url TEXT,
  warehouse_label_url TEXT,
  estimated_delivery DATE,
  actual_delivery DATE,
  milestones JSONB DEFAULT '[]',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shipment_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shipment tracking" ON public.shipment_tracking
  FOR SELECT TO authenticated
  USING (order_id IN (
    SELECT id FROM public.orders WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage shipment tracking" ON public.shipment_tracking
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Shipping labels
CREATE TABLE public.shipping_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  tracking_id UUID REFERENCES public.shipment_tracking(id) ON DELETE CASCADE,
  label_type TEXT NOT NULL CHECK (label_type IN ('carrier', 'warehouse')),
  file_url TEXT,
  file_data JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage labels" ON public.shipping_labels
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own labels" ON public.shipping_labels
  FOR SELECT TO authenticated
  USING (order_id IN (
    SELECT id FROM public.orders WHERE user_id = auth.uid()
  ));

-- Seed default providers
INSERT INTO public.shipping_providers (name, slug, provider_type, supported_countries, tracking_url_template, config) VALUES
  ('YunExpress', 'yunexpress', 'international', ARRAY['CN','HK','TW'], 'https://www.yuntrack.com/Track/Detail?id={{tracking_number}}', '{"api_version": "v2"}'),
  ('HFD Express', 'hfd', 'local', ARRAY['IL'], 'https://www.hfd.co.il/track?id={{tracking_number}}', '{}'),
  ('ZigZag', 'zigzag', 'local', ARRAY['IL'], 'https://www.zigzag.co.il/tracking/{{tracking_number}}', '{}'),
  ('Israel Post', 'israel-post', 'local', ARRAY['IL'], 'https://israelpost.co.il/itemtrace?itemcode={{tracking_number}}', '{}');

-- Add shipping columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS destination_country TEXT DEFAULT 'IL',
  ADD COLUMN IF NOT EXISTS shipping_provider_id UUID REFERENCES public.shipping_providers(id),
  ADD COLUMN IF NOT EXISTS shipping_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS tracking_number TEXT;
