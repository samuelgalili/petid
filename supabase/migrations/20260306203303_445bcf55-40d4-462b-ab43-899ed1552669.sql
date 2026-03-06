
-- Add user_id to suppliers so factory users can self-manage their profile
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS company_description TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'CN';
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS total_products INTEGER DEFAULT 0;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 0;

-- Factory product submissions (pending admin approval)
CREATE TABLE public.factory_product_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price NUMERIC(10,2) NOT NULL,
  cost_price NUMERIC(10,2),
  min_order_qty INTEGER DEFAULT 1,
  images TEXT[] DEFAULT '{}',
  ingredients TEXT,
  pet_type TEXT DEFAULT 'dog',
  life_stage TEXT,
  weight_kg NUMERIC(6,2),
  kcal_per_kg NUMERIC(8,2),
  certifications TEXT[],
  safety_data_sheet_url TEXT,
  status TEXT DEFAULT 'pending_review',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  published_product_id UUID REFERENCES public.business_products(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Factory orders (orders from PetID to factory)
CREATE TABLE public.factory_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
  order_number TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending',
  total_amount NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  items JSONB DEFAULT '[]',
  shipping_address TEXT,
  shipping_method TEXT,
  tracking_number TEXT,
  estimated_delivery TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Factory shipments
CREATE TABLE public.factory_shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.factory_orders(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
  tracking_number TEXT,
  carrier TEXT,
  status TEXT DEFAULT 'preparing',
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  weight_kg NUMERIC(8,2),
  dimensions TEXT,
  customs_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Factory financial records
CREATE TABLE public.factory_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.factory_orders(id),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_method TEXT,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  reference_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.factory_product_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factory_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factory_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factory_payments ENABLE ROW LEVEL SECURITY;

-- RLS: Suppliers can manage their own product submissions
CREATE POLICY "suppliers_manage_own_submissions" ON public.factory_product_submissions
  FOR ALL USING (
    supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
  );

-- RLS: Admins can manage all submissions
CREATE POLICY "admins_manage_all_submissions" ON public.factory_product_submissions
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin')
  );

-- RLS: Suppliers can view their own orders
CREATE POLICY "suppliers_view_own_orders" ON public.factory_orders
  FOR SELECT USING (
    supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
  );

-- RLS: Admins can manage all orders
CREATE POLICY "admins_manage_all_orders" ON public.factory_orders
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin')
  );

-- RLS: Suppliers can view own shipments
CREATE POLICY "suppliers_view_own_shipments" ON public.factory_shipments
  FOR SELECT USING (
    supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
  );

-- RLS: Suppliers can update shipment tracking
CREATE POLICY "suppliers_update_own_shipments" ON public.factory_shipments
  FOR UPDATE USING (
    supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
  );

-- RLS: Admins manage all shipments
CREATE POLICY "admins_manage_all_shipments" ON public.factory_shipments
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin')
  );

-- RLS: Suppliers view own payments
CREATE POLICY "suppliers_view_own_payments" ON public.factory_payments
  FOR SELECT USING (
    supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
  );

-- RLS: Admins manage all payments
CREATE POLICY "admins_manage_all_payments" ON public.factory_payments
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin')
  );

-- Allow suppliers to read their own supplier row
CREATE POLICY "suppliers_read_own_profile" ON public.suppliers
  FOR SELECT USING (
    user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );

-- Allow suppliers to update their own profile
CREATE POLICY "suppliers_update_own_profile" ON public.suppliers
  FOR UPDATE USING (user_id = auth.uid());

-- Allow new supplier registration (insert with own user_id)
CREATE POLICY "suppliers_insert_own_profile" ON public.suppliers
  FOR INSERT WITH CHECK (user_id = auth.uid());
