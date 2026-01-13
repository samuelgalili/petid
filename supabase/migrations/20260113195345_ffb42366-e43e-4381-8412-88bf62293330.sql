-- Add payment_status column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending' NOT NULL;

-- Add payment_transaction_id for CardCom reference
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_transaction_id text;

-- Add index for faster payment status queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);

-- Update existing orders to have correct payment status
UPDATE public.orders 
SET payment_status = 'pending' 
WHERE payment_status IS NULL;