
-- Store poll votes linked to pets for behavioral profiling
CREATE TABLE public.pet_poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pet_id UUID NOT NULL,
  poll_key TEXT NOT NULL,
  selected_option INT NOT NULL,
  selected_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One vote per poll per pet
CREATE UNIQUE INDEX idx_pet_poll_votes_unique ON public.pet_poll_votes (user_id, pet_id, poll_key);

ALTER TABLE public.pet_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own votes" ON public.pet_poll_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own votes" ON public.pet_poll_votes
  FOR SELECT USING (auth.uid() = user_id);
