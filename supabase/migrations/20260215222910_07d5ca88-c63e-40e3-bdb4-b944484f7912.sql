-- Add lost-pet / found-pet fields to pets table
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS is_lost boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lost_since timestamptz,
  ADD COLUMN IF NOT EXISTS lost_reward_text text,
  ADD COLUMN IF NOT EXISTS lost_temperament text,
  ADD COLUMN IF NOT EXISTS lost_medication_note text,
  ADD COLUMN IF NOT EXISTS lost_allergy_note text,
  ADD COLUMN IF NOT EXISTS lost_show_phone boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lost_contact_phone text;

-- Public read policy for found-pet page (anyone scanning QR can see basic pet info)
CREATE POLICY "Public can view lost pet info"
  ON public.pets
  FOR SELECT
  USING (is_lost = true);
