-- Create function to create admin alert
CREATE OR REPLACE FUNCTION create_admin_alert()
RETURNS TRIGGER AS $$
DECLARE
  alert_title TEXT;
  alert_desc TEXT;
  alert_cat TEXT;
  alert_type TEXT;
  source_id TEXT;
BEGIN
  -- Determine alert details based on table
  IF TG_TABLE_NAME = 'insurance_leads' THEN
    alert_title := '🛡️ פניית ביטוח חדשה';
    alert_desc := NEW.pet_name || ' (' || CASE WHEN NEW.pet_type = 'dog' THEN 'כלב' ELSE 'חתול' END || ') - ' || NEW.phone;
    alert_cat := 'insurance';
    alert_type := 'lead';
    source_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'content_reports' THEN
    alert_title := '🚩 דיווח תוכן חדש';
    alert_desc := 'סיבה: ' || NEW.reason;
    alert_cat := 'moderation';
    alert_type := 'report';
    source_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'adoption_requests' THEN
    alert_title := '🐾 בקשת אימוץ חדשה';
    alert_desc := NEW.full_name || ' מתעניין/ת באימוץ';
    alert_cat := 'adoption';
    alert_type := 'request';
    source_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'orders' THEN
    alert_title := '🛍️ הזמנה חדשה';
    alert_desc := 'הזמנה חדשה בסך ₪' || NEW.total;
    alert_cat := 'sales';
    alert_type := 'order';
    source_id := NEW.id;
  END IF;

  -- Insert into admin_data_alerts
  INSERT INTO public.admin_data_alerts (
    title, 
    description, 
    category, 
    alert_type, 
    is_read, 
    is_resolved,
    metadata
  ) VALUES (
    alert_title,
    alert_desc,
    alert_cat,
    alert_type,
    false,
    false,
    jsonb_build_object('source_id', source_id, 'source_table', TG_TABLE_NAME)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS on_insurance_lead_created ON public.insurance_leads;
CREATE TRIGGER on_insurance_lead_created
  AFTER INSERT ON public.insurance_leads
  FOR EACH ROW EXECUTE FUNCTION create_admin_alert();

DROP TRIGGER IF EXISTS on_report_created ON public.content_reports;
CREATE TRIGGER on_report_created
  AFTER INSERT ON public.content_reports
  FOR EACH ROW EXECUTE FUNCTION create_admin_alert();

DROP TRIGGER IF EXISTS on_adoption_request_created ON public.adoption_requests;
CREATE TRIGGER on_adoption_request_created
  AFTER INSERT ON public.adoption_requests
  FOR EACH ROW EXECUTE FUNCTION create_admin_alert();

DROP TRIGGER IF EXISTS on_order_created ON public.orders;
CREATE TRIGGER on_order_created
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION create_admin_alert();
