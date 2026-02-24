
-- Add admin approval and email forwarding columns to insurance_leads
ALTER TABLE public.insurance_leads 
  ADD COLUMN IF NOT EXISTS admin_approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS admin_approved_by UUID,
  ADD COLUMN IF NOT EXISTS forwarded_to_email TEXT,
  ADD COLUMN IF NOT EXISTS forwarded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;
