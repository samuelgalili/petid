-- =============================================
-- SECURITY HARDENING: Fix overly permissive RLS policies
-- =============================================

-- 1. admin_approval_queue: Admin-only access (CRITICAL - was public ALL)
DROP POLICY IF EXISTS "Allow all admin_approval_queue" ON public.admin_approval_queue;
CREATE POLICY "Admins can manage approval queue"
  ON public.admin_approval_queue FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. automation_bots: Admin-only write, authenticated read
DROP POLICY IF EXISTS "Allow all automation_bots" ON public.automation_bots;
CREATE POLICY "Anyone can read active bots"
  ON public.automation_bots FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Admins can manage bots"
  ON public.automation_bots FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. ceo_daily_briefs: Admin-only (CRITICAL - was public ALL)
DROP POLICY IF EXISTS "Service role can manage daily briefs" ON public.ceo_daily_briefs;
CREATE POLICY "Admins can manage daily briefs"
  ON public.ceo_daily_briefs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. content_calendar: Admin-only (was public ALL)
DROP POLICY IF EXISTS "Allow all content_calendar" ON public.content_calendar;
CREATE POLICY "Admins can manage content calendar"
  ON public.content_calendar FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. external_integrations: Admin-only (CRITICAL - was public ALL)
DROP POLICY IF EXISTS "Allow all external_integrations" ON public.external_integrations;
CREATE POLICY "Admins can manage integrations"
  ON public.external_integrations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. food_consumption_predictions: Admin-only write, user can read own
DROP POLICY IF EXISTS "Admins full access food_consumption_predictions" ON public.food_consumption_predictions;
CREATE POLICY "Admins can manage food predictions"
  ON public.food_consumption_predictions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. vendor tables: Admin-only (CRITICAL - was public ALL)
DROP POLICY IF EXISTS "full_access_vendor_audit_results" ON public.vendor_audit_results;
CREATE POLICY "Admins can manage vendor audits"
  ON public.vendor_audit_results FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "full_access_vendor_cost_savings" ON public.vendor_cost_savings;
CREATE POLICY "Admins can manage vendor savings"
  ON public.vendor_cost_savings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "full_access_vendor_quote_items" ON public.vendor_quote_items;
CREATE POLICY "Admins can manage vendor quote items"
  ON public.vendor_quote_items FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "full_access_vendor_quotes" ON public.vendor_quotes;
CREATE POLICY "Admins can manage vendor quotes"
  ON public.vendor_quotes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. readiness_drill_results: Restrict to authenticated only
DROP POLICY IF EXISTS "Service role can insert drill results" ON public.readiness_drill_results;
DROP POLICY IF EXISTS "Service role can update drill results" ON public.readiness_drill_results;
CREATE POLICY "Admins can manage drill results"
  ON public.readiness_drill_results FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 9. ui_visual_audit_logs: Restrict to authenticated
DROP POLICY IF EXISTS "Service can insert ui audit logs" ON public.ui_visual_audit_logs;
DROP POLICY IF EXISTS "Service can update ui audit logs" ON public.ui_visual_audit_logs;
CREATE POLICY "Authenticated can insert ui audit logs"
  ON public.ui_visual_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
CREATE POLICY "Admins can manage ui audit logs"
  ON public.ui_visual_audit_logs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 10. agent_health_checks: Restrict to authenticated
DROP POLICY IF EXISTS "Service can insert health checks" ON public.agent_health_checks;
CREATE POLICY "Authenticated can insert health checks"
  ON public.agent_health_checks FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 11. system_error_logs: Restrict INSERT to authenticated (was public)
DROP POLICY IF EXISTS "Anyone can insert error logs" ON public.system_error_logs;
CREATE POLICY "Authenticated can insert error logs"
  ON public.system_error_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 12. system_events: Restrict INSERT to authenticated (was public)
DROP POLICY IF EXISTS "Allow insert system_events" ON public.system_events;
CREATE POLICY "Authenticated can insert system events"
  ON public.system_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 13. rage_click_events: Restrict to authenticated (was public)
DROP POLICY IF EXISTS "Anyone can insert rage clicks" ON public.rage_click_events;
CREATE POLICY "Authenticated can insert rage clicks"
  ON public.rage_click_events FOR INSERT
  TO authenticated
  WITH CHECK (true);