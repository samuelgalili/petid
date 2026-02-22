
-- Pet follows (social follow between users for specific pets)
CREATE TABLE public.pet_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  pet_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one follow per user per pet
ALTER TABLE pet_follows ADD CONSTRAINT pet_follows_unique UNIQUE (follower_id, pet_id);

-- Enable RLS
ALTER TABLE public.pet_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follows" ON public.pet_follows FOR SELECT USING (true);
CREATE POLICY "Users can follow pets" ON public.pet_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.pet_follows FOR DELETE USING (auth.uid() = follower_id);

-- Pet treats (free social interaction)
CREATE TABLE public.pet_treats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  pet_id UUID NOT NULL,
  treat_type TEXT NOT NULL DEFAULT 'bone',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pet_treats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view treats" ON public.pet_treats FOR SELECT USING (true);
CREATE POLICY "Users can send treats" ON public.pet_treats FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Indexes
CREATE INDEX idx_pet_follows_pet ON public.pet_follows(pet_id);
CREATE INDEX idx_pet_follows_follower ON public.pet_follows(follower_id);
CREATE INDEX idx_pet_treats_pet ON public.pet_treats(pet_id);
