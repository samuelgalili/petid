-- Create products table for CardCom payments
CREATE TABLE public.cardcom_products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('one_time', 'subscription')),
    price_ils INTEGER NOT NULL,
    billing_period TEXT CHECK (billing_period IN ('monthly', 'yearly')),
    cardcom_product_id TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customers table
CREATE TABLE public.cardcom_customers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Create payments table
CREATE TABLE public.cardcom_payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.cardcom_products(id),
    amount_ils INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'canceled')),
    cardcom_transaction_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.cardcom_subscriptions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.cardcom_products(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'past_due', 'canceled', 'pending')),
    cardcom_subscription_id TEXT,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cardcom_events table for webhook logging
CREATE TABLE public.cardcom_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    payload_json JSONB NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.cardcom_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cardcom_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cardcom_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cardcom_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cardcom_events ENABLE ROW LEVEL SECURITY;

-- Products are publicly readable (for pricing page)
CREATE POLICY "Products are publicly readable" 
ON public.cardcom_products 
FOR SELECT 
USING (active = true);

-- Customers can only access their own record
CREATE POLICY "Users can view their own customer record" 
ON public.cardcom_customers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own customer record" 
ON public.cardcom_customers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customer record" 
ON public.cardcom_customers 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Payments - users can view their own payments
CREATE POLICY "Users can view their own payments" 
ON public.cardcom_payments 
FOR SELECT 
USING (auth.uid() = user_id);

-- Subscriptions - users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions" 
ON public.cardcom_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Insert sample products
INSERT INTO public.cardcom_products (name, description, type, price_ils, billing_period, active) VALUES
('חבילת בסיס', 'גישה בסיסית לכל התכונות. תשלום חד פעמי ללא התחייבות.', 'one_time', 99, NULL, true),
('חבילה חודשית', 'גישה מלאה לכל התכונות עם תמיכה מועדפת. חיוב חודשי.', 'subscription', 49, 'monthly', true),
('חבילה שנתית', 'חיסכון של 20%! גישה מלאה לכל התכונות + בונוסים בלעדיים.', 'subscription', 470, 'yearly', true);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_cardcom_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_cardcom_products_updated_at
BEFORE UPDATE ON public.cardcom_products
FOR EACH ROW
EXECUTE FUNCTION public.update_cardcom_updated_at_column();

CREATE TRIGGER update_cardcom_customers_updated_at
BEFORE UPDATE ON public.cardcom_customers
FOR EACH ROW
EXECUTE FUNCTION public.update_cardcom_updated_at_column();

CREATE TRIGGER update_cardcom_payments_updated_at
BEFORE UPDATE ON public.cardcom_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_cardcom_updated_at_column();

CREATE TRIGGER update_cardcom_subscriptions_updated_at
BEFORE UPDATE ON public.cardcom_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_cardcom_updated_at_column();