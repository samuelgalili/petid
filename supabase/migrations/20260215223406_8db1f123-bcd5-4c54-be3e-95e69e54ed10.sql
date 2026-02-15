-- QR scan tracking table
CREATE TABLE public.qr_scan_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  latitude double precision,
  longitude double precision,
  ip_address text,
  user_agent text
);

ALTER TABLE public.qr_scan_logs ENABLE ROW LEVEL SECURITY;

-- Anyone can INSERT a scan log (public page, no auth)
CREATE POLICY "Anyone can log a QR scan"
  ON public.qr_scan_logs
  FOR INSERT
  WITH CHECK (true);

-- Only pet owner can view scan logs
CREATE POLICY "Owners can view their pet scan logs"
  ON public.qr_scan_logs
  FOR SELECT
  USING (
    pet_id IN (SELECT id FROM public.pets WHERE user_id = auth.uid())
  );
