
-- Add support center columns to support_tickets
ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS ai_triage_summary TEXT,
ADD COLUMN IF NOT EXISTS vet_flag BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS pet_id UUID REFERENCES public.pets(id);

COMMENT ON COLUMN public.support_tickets.ai_triage_summary IS 'Summary of AI chat before human handoff';
COMMENT ON COLUMN public.support_tickets.vet_flag IS 'Flagged for veterinarian review';
COMMENT ON COLUMN public.support_tickets.internal_notes IS 'CRM internal notes about the customer';
