-- Add service role policy for cardcom_events (webhooks write, no public read needed)
-- This table is only accessed by edge functions using service role key
CREATE POLICY "Service role can insert events" 
ON public.cardcom_events 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can select events" 
ON public.cardcom_events 
FOR SELECT 
USING (true);