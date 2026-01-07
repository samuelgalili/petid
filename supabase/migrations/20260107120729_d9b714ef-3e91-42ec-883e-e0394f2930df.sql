-- Create customer_charges table for manual billing
CREATE TABLE public.customer_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  charge_type TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  notes TEXT,
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_charges ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can manage customer charges"
ON public.customer_charges
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'business')
  )
);

-- Create index for faster lookups
CREATE INDEX idx_customer_charges_customer_id ON public.customer_charges(customer_id);
CREATE INDEX idx_customer_charges_status ON public.customer_charges(status);

-- Create trigger for updating updated_at
CREATE TRIGGER update_customer_charges_updated_at
BEFORE UPDATE ON public.customer_charges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();