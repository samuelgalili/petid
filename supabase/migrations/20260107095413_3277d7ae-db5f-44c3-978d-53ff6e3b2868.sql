-- ===============================
-- DATA NORMALIZATION LAYER - PART 1
-- Create tables in correct order
-- ===============================

-- Raw imports table - stores original imported data
CREATE TABLE public.raw_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_name TEXT,
  data_type TEXT NOT NULL,
  raw_data JSONB NOT NULL,
  row_index INTEGER,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Normalized customers - unified customer records (CREATE FIRST - referenced by transactions)
CREATE TABLE public.normalized_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT,
  source_type TEXT,
  email TEXT,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  company TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'IL',
  first_order_date TIMESTAMPTZ,
  last_order_date TIMESTAMPTZ,
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  average_order_value DECIMAL(12,2) DEFAULT 0,
  customer_segment TEXT,
  lifetime_value DECIMAL(12,2) DEFAULT 0,
  tags TEXT[],
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email)
);

-- Normalized products - unified product catalog
CREATE TABLE public.normalized_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT,
  source_type TEXT,
  sku TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  subcategory TEXT,
  cost_price DECIMAL(12,2),
  price DECIMAL(12,2) NOT NULL,
  sale_price DECIMAL(12,2),
  currency TEXT DEFAULT 'ILS',
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  total_sold INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  last_sold_date TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  image_url TEXT,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Normalized transactions - unified order/sale records (NOW can reference customers)
CREATE TABLE public.normalized_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT,
  source_type TEXT NOT NULL,
  source_import_id UUID REFERENCES public.raw_imports(id),
  transaction_date TIMESTAMPTZ NOT NULL,
  transaction_type TEXT NOT NULL DEFAULT 'sale',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  shipping_amount DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'ILS',
  customer_id UUID REFERENCES public.normalized_customers(id),
  customer_email TEXT,
  customer_name TEXT,
  status TEXT DEFAULT 'completed',
  payment_status TEXT DEFAULT 'paid',
  fulfillment_status TEXT,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transaction items - line items for each transaction
CREATE TABLE public.normalized_transaction_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.normalized_transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.normalized_products(id),
  external_product_id TEXT,
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  cost_price DECIMAL(12,2),
  discount_amount DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily metrics - pre-calculated KPIs
CREATE TABLE public.metrics_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_date DATE NOT NULL,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  gross_profit DECIMAL(12,2) DEFAULT 0,
  net_revenue DECIMAL(12,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  average_order_value DECIMAL(12,2) DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  returning_customers INTEGER DEFAULT 0,
  total_customers INTEGER DEFAULT 0,
  items_sold INTEGER DEFAULT 0,
  top_products JSONB,
  revenue_change_percent DECIMAL(6,2),
  orders_change_percent DECIMAL(6,2),
  total_expenses DECIMAL(12,2) DEFAULT 0,
  expense_breakdown JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(metric_date)
);

-- Expenses table - for tracking business expenses
CREATE TABLE public.normalized_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_import_id UUID REFERENCES public.raw_imports(id),
  expense_date DATE NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'ILS',
  vendor TEXT,
  description TEXT,
  receipt_url TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_period TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.raw_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.normalized_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.normalized_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.normalized_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.normalized_transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.normalized_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only access (using has_role function if exists, otherwise role column)
CREATE POLICY "Admins can manage raw_imports" ON public.raw_imports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage normalized_transactions" ON public.normalized_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage normalized_customers" ON public.normalized_customers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage normalized_products" ON public.normalized_products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage normalized_transaction_items" ON public.normalized_transaction_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage metrics_daily" ON public.metrics_daily
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage normalized_expenses" ON public.normalized_expenses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Indexes for performance
CREATE INDEX idx_raw_imports_status ON public.raw_imports(status);
CREATE INDEX idx_raw_imports_data_type ON public.raw_imports(data_type);
CREATE INDEX idx_normalized_transactions_date ON public.normalized_transactions(transaction_date);
CREATE INDEX idx_normalized_transactions_customer ON public.normalized_transactions(customer_id);
CREATE INDEX idx_normalized_customers_email ON public.normalized_customers(email);
CREATE INDEX idx_normalized_products_sku ON public.normalized_products(sku);
CREATE INDEX idx_metrics_daily_date ON public.metrics_daily(metric_date);
CREATE INDEX idx_normalized_expenses_date ON public.normalized_expenses(expense_date);
CREATE INDEX idx_normalized_expenses_category ON public.normalized_expenses(category);

-- Function to update customer metrics after transaction
CREATE OR REPLACE FUNCTION public.update_customer_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    UPDATE public.normalized_customers
    SET 
      total_orders = (SELECT COUNT(*) FROM public.normalized_transactions WHERE customer_id = NEW.customer_id AND status = 'completed'),
      total_spent = (SELECT COALESCE(SUM(total), 0) FROM public.normalized_transactions WHERE customer_id = NEW.customer_id AND status = 'completed'),
      first_order_date = (SELECT MIN(transaction_date) FROM public.normalized_transactions WHERE customer_id = NEW.customer_id),
      last_order_date = (SELECT MAX(transaction_date) FROM public.normalized_transactions WHERE customer_id = NEW.customer_id),
      average_order_value = (SELECT COALESCE(AVG(total), 0) FROM public.normalized_transactions WHERE customer_id = NEW.customer_id AND status = 'completed'),
      customer_segment = CASE
        WHEN (SELECT COUNT(*) FROM public.normalized_transactions WHERE customer_id = NEW.customer_id AND status = 'completed') = 1 THEN 'new'
        WHEN (SELECT COALESCE(SUM(total), 0) FROM public.normalized_transactions WHERE customer_id = NEW.customer_id AND status = 'completed') > 2000 THEN 'vip'
        ELSE 'returning'
      END,
      updated_at = now()
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_customer_metrics
AFTER INSERT OR UPDATE ON public.normalized_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_customer_metrics();

-- Function to update product metrics after transaction item
CREATE OR REPLACE FUNCTION public.update_product_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    UPDATE public.normalized_products
    SET 
      total_sold = (SELECT COALESCE(SUM(quantity), 0) FROM public.normalized_transaction_items WHERE product_id = NEW.product_id),
      total_revenue = (SELECT COALESCE(SUM(total_price), 0) FROM public.normalized_transaction_items WHERE product_id = NEW.product_id),
      last_sold_date = now(),
      updated_at = now()
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_product_metrics
AFTER INSERT ON public.normalized_transaction_items
FOR EACH ROW EXECUTE FUNCTION public.update_product_metrics();