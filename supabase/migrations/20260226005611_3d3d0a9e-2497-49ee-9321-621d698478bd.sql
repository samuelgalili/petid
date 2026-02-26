
CREATE TABLE public.vendor_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id),
  supplier_name TEXT,
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal NUMERIC(12,2) DEFAULT 0,
  shipping_cost NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.vendor_quote_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.vendor_quotes(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.vendor_audit_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  quote_id UUID REFERENCES public.vendor_quotes(id),
  invoice_id UUID REFERENCES public.supplier_invoices(id),
  validation_status TEXT DEFAULT 'pending',
  discrepancies JSONB DEFAULT '[]'::jsonb,
  total_delta NUMERIC(12,2) DEFAULT 0,
  email_draft TEXT,
  email_sent BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.vendor_cost_savings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month DATE NOT NULL,
  total_overcharges NUMERIC(12,2) DEFAULT 0,
  total_saved NUMERIC(12,2) DEFAULT 0,
  audits_count INTEGER DEFAULT 0,
  discrepancies_found INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.vendor_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_audit_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_cost_savings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "full_access_vendor_quotes" ON public.vendor_quotes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "full_access_vendor_quote_items" ON public.vendor_quote_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "full_access_vendor_audit_results" ON public.vendor_audit_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "full_access_vendor_cost_savings" ON public.vendor_cost_savings FOR ALL USING (true) WITH CHECK (true);
