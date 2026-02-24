
-- Trigger function: when an order is confirmed, create CRM activity + restock reminder
CREATE OR REPLACE FUNCTION public.on_order_created_crm()
RETURNS TRIGGER AS $$
DECLARE
  v_pet_weight NUMERIC;
  v_bag_weight NUMERIC;
  v_daily_intake NUMERIC;
  v_days_lasting INT;
  v_product_name TEXT;
  v_pet_name TEXT;
BEGIN
  -- 1. Create CRM activity for the purchase
  INSERT INTO public.crm_activities (
    customer_id, activity_type, subject, description, completed_at, created_by
  ) VALUES (
    NEW.user_id,
    'purchase',
    'רכישה #' || NEW.order_number,
    'סה"כ: ₪' || NEW.total::TEXT || COALESCE(' • ' || NEW.pet_name, ''),
    NOW(),
    NEW.user_id
  );

  -- 2. Try to calculate restock reminder from pet weight + product weight
  -- Get pet weight
  SELECT p.weight, p.name INTO v_pet_weight, v_pet_name
  FROM public.pets p
  WHERE p.user_id = NEW.user_id AND p.archived = false
  ORDER BY p.created_at DESC
  LIMIT 1;

  -- Get first product info from order items
  SELECT oi.product_name INTO v_product_name
  FROM public.order_items oi
  WHERE oi.order_id = NEW.id
  LIMIT 1;

  -- Try to get bag weight from business_products via order_items
  SELECT 
    CASE 
      WHEN bp.weight_unit ILIKE '%גרם%' OR bp.weight_unit ILIKE '%g%' 
        THEN (regexp_replace(bp.weight_unit, '[^0-9.]', '', 'g'))::NUMERIC / 1000
      ELSE COALESCE((regexp_replace(bp.weight_unit, '[^0-9.]', '', 'g'))::NUMERIC, 0)
    END
  INTO v_bag_weight
  FROM public.order_items oi
  JOIN public.business_products bp ON bp.id = oi.product_id
  WHERE oi.order_id = NEW.id AND bp.weight_unit IS NOT NULL
  LIMIT 1;

  -- Calculate days lasting
  IF v_pet_weight IS NOT NULL AND v_pet_weight > 0 AND v_bag_weight IS NOT NULL AND v_bag_weight > 0 THEN
    -- Daily intake: ~2.5% of body weight
    v_daily_intake := v_pet_weight * 0.025;
    IF v_daily_intake > 0 THEN
      v_days_lasting := ROUND(v_bag_weight / v_daily_intake);
      
      IF v_days_lasting > 0 THEN
        -- Create restock reminder (5 days before bag runs out)
        INSERT INTO public.customer_reminders (
          customer_id, title, description, due_date, priority, status, created_by
        ) VALUES (
          NEW.user_id,
          '🔄 הזמנה חוזרת: ' || COALESCE(v_product_name, 'מוצר'),
          'השקית של ' || COALESCE(v_pet_name, 'חיית המחמד') || ' עומדת להיגמר בעוד כ-' || v_days_lasting || ' ימים. הגיע הזמן להזמין שוב!',
          NOW() + ((v_days_lasting - 5) || ' days')::INTERVAL,
          'medium',
          'pending',
          NEW.user_id
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block order creation if CRM insert fails
  RAISE WARNING 'CRM trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach trigger to orders table
DROP TRIGGER IF EXISTS trg_order_created_crm ON public.orders;
CREATE TRIGGER trg_order_created_crm
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.on_order_created_crm();
