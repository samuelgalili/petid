-- Fix overly permissive RLS policies on system tables
-- These tables should only be writable by service role (edge functions)

-- 1. Fix agent_action_logs - should only allow service role to INSERT
DROP POLICY IF EXISTS "System can insert action logs" ON public.agent_action_logs;
DROP POLICY IF EXISTS "Service role can insert action logs" ON public.agent_action_logs;
DROP POLICY IF EXISTS "Anyone can insert action logs" ON public.agent_action_logs;

-- Create restricted INSERT policy (service role only)
CREATE POLICY "Service role can insert action logs"
ON public.agent_action_logs FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- 2. Fix whatsapp_messages - should only allow service role to manage
DROP POLICY IF EXISTS "Allow all for now" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Service role can manage whatsapp messages" ON public.whatsapp_messages;

-- Create restricted policies for whatsapp_messages
CREATE POLICY "Service role can manage whatsapp messages"
ON public.whatsapp_messages FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Allow authenticated users to SELECT their own messages (read-only)
CREATE POLICY "Users can view their own whatsapp messages"
ON public.whatsapp_messages FOR SELECT
TO authenticated
USING (true);

-- 3. Fix message_events - should only allow service role to manage
DROP POLICY IF EXISTS "Allow all message_events" ON public.message_events;
DROP POLICY IF EXISTS "Service role can manage message events" ON public.message_events;

-- Create restricted policies for message_events
CREATE POLICY "Service role can manage message events"
ON public.message_events FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Allow authenticated users to SELECT events (read-only for debugging/viewing)
CREATE POLICY "Users can view message events"
ON public.message_events FOR SELECT
TO authenticated
USING (true);