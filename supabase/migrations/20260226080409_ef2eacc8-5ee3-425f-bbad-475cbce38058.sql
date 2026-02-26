
-- Return requests table
CREATE TABLE IF NOT EXISTS public.return_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  product_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','refunded')),
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- System integrations table
CREATE TABLE IF NOT EXISTS public.system_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  icon TEXT DEFAULT '🔌',
  is_connected BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customer segments table
CREATE TABLE IF NOT EXISTS public.customer_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  customer_count INTEGER DEFAULT 0,
  criteria JSONB DEFAULT '[]',
  color TEXT DEFAULT 'from-blue-500 to-cyan-600',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  vat_amount NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid','pending','overdue','cancelled')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compliance checks table
CREATE TABLE IF NOT EXISTS public.compliance_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'safe' CHECK (status IN ('safe','warning','action_required')),
  detail TEXT,
  category TEXT DEFAULT 'general',
  last_checked_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Business payouts table
CREATE TABLE IF NOT EXISTS public.business_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  method TEXT DEFAULT 'Bank Transfer',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  payout_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Flagged content table
CREATE TABLE IF NOT EXISTS public.flagged_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL,
  title TEXT NOT NULL,
  user_identifier TEXT,
  risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low','medium','high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed')),
  flagged_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies (admin-only access)
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flagged_content ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write (admin pages require auth)
CREATE POLICY "Authenticated users full access" ON public.return_requests FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON public.system_integrations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON public.customer_segments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON public.invoices FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON public.compliance_checks FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON public.business_payouts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON public.flagged_content FOR ALL USING (auth.role() = 'authenticated');
