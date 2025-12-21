-- Add policy for admins to delete products
CREATE POLICY "Admins can manage all products" 
ON public.business_products 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));