
-- ========================================
-- Fix all overly permissive RLS policies
-- ========================================

-- 1. admin_data_alerts: restrict to admin only
DROP POLICY IF EXISTS "Admins can manage alerts" ON public.admin_data_alerts;
CREATE POLICY "Admins can manage alerts" ON public.admin_data_alerts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. admin_data_sync_log: restrict to admin only
DROP POLICY IF EXISTS "Admins can view sync logs" ON public.admin_data_sync_log;
CREATE POLICY "Admins can manage sync logs" ON public.admin_data_sync_log
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. business_analytics: restrict INSERT to authenticated
DROP POLICY IF EXISTS "Anyone can create view events" ON public.business_analytics;
CREATE POLICY "Authenticated users can create view events" ON public.business_analytics
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 4. business_appointments: restrict INSERT to authenticated with user check
DROP POLICY IF EXISTS "Anyone can book appointments" ON public.business_appointments;
CREATE POLICY "Authenticated users can book appointments" ON public.business_appointments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id);

-- 5. cardcom_events: remove public policies (service_role bypasses RLS)
DROP POLICY IF EXISTS "Service role can insert events" ON public.cardcom_events;
DROP POLICY IF EXISTS "Service role can select events" ON public.cardcom_events;
CREATE POLICY "Admin can view cardcom events" ON public.cardcom_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. hashtags: remove duplicate public INSERT
DROP POLICY IF EXISTS "Users can create hashtags" ON public.hashtags;

-- 7. locations: remove duplicate public INSERT
DROP POLICY IF EXISTS "Users can create locations" ON public.locations;

-- 8. message_events: remove open ALL true policy, keep service_role one
DROP POLICY IF EXISTS "Service role can manage message_events" ON public.message_events;
DROP POLICY IF EXISTS "Users can view message events" ON public.message_events;
CREATE POLICY "Admins can view message events" ON public.message_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 9. whatsapp_conversations: restrict to admin
DROP POLICY IF EXISTS "Service role full access" ON public.whatsapp_conversations;
CREATE POLICY "Admins can view whatsapp conversations" ON public.whatsapp_conversations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 10. lead_submissions: keep public INSERT (legitimate for lead forms)
-- No change needed
