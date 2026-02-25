
-- Returns management table (table may already exist from failed attempt)
CREATE TABLE IF NOT EXISTS public.order_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  redirect_address TEXT,
  redirect_country TEXT DEFAULT 'IL',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_by TEXT
);

ALTER TABLE public.order_returns ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist from partial migration
DROP POLICY IF EXISTS "Admins manage returns" ON public.order_returns;
DROP POLICY IF EXISTS "Users view own returns" ON public.order_returns;

CREATE POLICY "Admins manage returns" ON public.order_returns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users view own returns" ON public.order_returns
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_returns.order_id AND orders.user_id = auth.uid())
  );
