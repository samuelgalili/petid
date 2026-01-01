-- Add flagged column to business_products
ALTER TABLE public.business_products 
ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS flagged_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS flagged_reason text;

-- Add flagged column to scraped_products
ALTER TABLE public.scraped_products 
ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS flagged_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS flagged_reason text;

-- Create function to flag product and notify admin when report is created
CREATE OR REPLACE FUNCTION public.handle_product_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id uuid;
  product_name text;
BEGIN
  -- Only handle product reports
  IF NEW.content_type = 'product' THEN
    -- Try to flag in business_products first
    UPDATE public.business_products 
    SET is_flagged = true, 
        flagged_at = now(), 
        flagged_reason = NEW.reason
    WHERE id::text = NEW.content_id;
    
    -- If no rows updated, try scraped_products
    IF NOT FOUND THEN
      UPDATE public.scraped_products 
      SET is_flagged = true, 
          flagged_at = now(), 
          flagged_reason = NEW.reason
      WHERE id::text = NEW.content_id;
    END IF;
    
    -- Get product name for notification
    SELECT name INTO product_name FROM public.business_products WHERE id::text = NEW.content_id;
    IF product_name IS NULL THEN
      SELECT product_name INTO product_name FROM public.scraped_products WHERE id::text = NEW.content_id;
    END IF;
    
    -- Send notification to all admins
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT ur.user_id, 
           '🚩 דיווח על מוצר',
           'התקבל דיווח על מוצר: ' || COALESCE(product_name, 'לא ידוע') || ' - ' || NEW.reason,
           'alert'
    FROM public.user_roles ur
    WHERE ur.role = 'admin';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for product reports
DROP TRIGGER IF EXISTS on_product_report_created ON public.content_reports;
CREATE TRIGGER on_product_report_created
  AFTER INSERT ON public.content_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_product_report();