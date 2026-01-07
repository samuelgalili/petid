-- Create suppliers table
CREATE TABLE public.suppliers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    supplier_type TEXT NOT NULL DEFAULT 'variable' CHECK (supplier_type IN ('fixed', 'variable', 'merchandise')),
    monthly_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create supplier_invoices table
CREATE TABLE public.supplier_invoices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
    invoice_number TEXT,
    amount DECIMAL(10,2) NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin_tasks table for Kanban
CREATE TABLE public.admin_tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to UUID REFERENCES auth.users(id),
    due_date DATE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    tags TEXT[],
    attachments TEXT[],
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create financial_records table
CREATE TABLE public.financial_records (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create monthly_balance table
CREATE TABLE public.monthly_balance (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    total_income DECIMAL(10,2) DEFAULT 0,
    total_expenses DECIMAL(10,2) DEFAULT 0,
    merchandise_expenses DECIMAL(10,2) DEFAULT 0,
    salary_expenses DECIMAL(10,2) DEFAULT 0,
    fixed_expenses DECIMAL(10,2) DEFAULT 0,
    variable_expenses DECIMAL(10,2) DEFAULT 0,
    balance DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(month, year)
);

-- Create customer_debts table
CREATE TABLE public.customer_debts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    amount DECIMAL(10,2) NOT NULL,
    original_amount DECIMAL(10,2) NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create leads table
CREATE TABLE public.leads (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    source TEXT CHECK (source IN ('facebook', 'instagram', 'tiktok', 'whatsapp', 'website', 'manual', 'other')),
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
    notes TEXT,
    assigned_to UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admins
CREATE POLICY "Admins can manage suppliers" ON public.suppliers
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage supplier_invoices" ON public.supplier_invoices
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage admin_tasks" ON public.admin_tasks
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage financial_records" ON public.financial_records
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage monthly_balance" ON public.monthly_balance
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage customer_debts" ON public.customer_debts
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage leads" ON public.leads
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create update timestamp triggers
CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supplier_invoices_updated_at
BEFORE UPDATE ON public.supplier_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_tasks_updated_at
BEFORE UPDATE ON public.admin_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_records_updated_at
BEFORE UPDATE ON public.financial_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_monthly_balance_updated_at
BEFORE UPDATE ON public.monthly_balance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_debts_updated_at
BEFORE UPDATE ON public.customer_debts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();