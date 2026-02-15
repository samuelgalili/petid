
-- Add order management columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'regular',
ADD COLUMN IF NOT EXISTS pet_name TEXT,
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS special_instructions TEXT,
ADD COLUMN IF NOT EXISTS medical_urgency TEXT DEFAULT 'none';

-- Add product_id reference to order_items for inventory sync
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.business_products(id);

COMMENT ON COLUMN public.orders.order_type IS 'regular or auto-restock';
COMMENT ON COLUMN public.orders.medical_urgency IS 'none, low, medium, high';
