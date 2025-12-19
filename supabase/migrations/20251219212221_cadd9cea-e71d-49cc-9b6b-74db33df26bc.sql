-- Add pet_type enum
CREATE TYPE public.pet_type AS ENUM ('dog', 'cat', 'other', 'all');

-- Add pet_type column to business_products
ALTER TABLE public.business_products 
ADD COLUMN pet_type public.pet_type DEFAULT 'all';

-- Create coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL,
  min_order_amount NUMERIC(10,2) DEFAULT 0,
  max_uses INTEGER DEFAULT NULL,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create coupon_uses table to track usage per user
CREATE TABLE public.coupon_uses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add coupon reference to orders
ALTER TABLE public.orders 
ADD COLUMN coupon_id UUID REFERENCES public.coupons(id),
ADD COLUMN discount_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN payment_installments INTEGER DEFAULT 1;

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_uses ENABLE ROW LEVEL SECURITY;

-- RLS policies for coupons (public read for active coupons)
CREATE POLICY "Anyone can view active coupons" 
ON public.coupons 
FOR SELECT 
USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

-- RLS policies for coupon_uses
CREATE POLICY "Users can view their own coupon usage" 
ON public.coupon_uses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own coupon usage" 
ON public.coupon_uses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Insert sample coupons
INSERT INTO public.coupons (code, discount_type, discount_value, min_order_amount, valid_until) VALUES
('WELCOME10', 'percentage', 10, 50, now() + interval '1 year'),
('SAVE20', 'fixed', 20, 100, now() + interval '6 months'),
('PETLOVE15', 'percentage', 15, 75, now() + interval '3 months');

-- Create index for coupon lookups
CREATE INDEX idx_coupons_code ON public.coupons(code);
CREATE INDEX idx_coupon_uses_user ON public.coupon_uses(user_id);
CREATE INDEX idx_coupon_uses_coupon ON public.coupon_uses(coupon_id);