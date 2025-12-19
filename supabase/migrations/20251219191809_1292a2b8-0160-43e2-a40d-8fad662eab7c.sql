-- Create challenges table for trending challenges
CREATE TABLE public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  title_he TEXT NOT NULL,
  description TEXT,
  description_he TEXT,
  hashtag TEXT NOT NULL UNIQUE,
  cover_image_url TEXT,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  participant_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create challenge participants table
CREATE TABLE public.challenge_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- Enable RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

-- RLS policies for challenges (public read)
CREATE POLICY "Challenges are viewable by everyone"
ON public.challenges FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create challenges"
ON public.challenges FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- RLS policies for challenge_participants
CREATE POLICY "Challenge participants are viewable by everyone"
ON public.challenge_participants FOR SELECT
USING (true);

CREATE POLICY "Users can join challenges"
ON public.challenge_participants FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave their own challenges"
ON public.challenge_participants FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Function to increment participant count
CREATE OR REPLACE FUNCTION public.increment_challenge_participants()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.challenges SET participant_count = participant_count + 1 WHERE id = NEW.challenge_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to decrement participant count
CREATE OR REPLACE FUNCTION public.decrement_challenge_participants()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.challenges SET participant_count = GREATEST(0, participant_count - 1) WHERE id = OLD.challenge_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for participant count
CREATE TRIGGER on_challenge_participant_added
  AFTER INSERT ON public.challenge_participants
  FOR EACH ROW EXECUTE FUNCTION public.increment_challenge_participants();

CREATE TRIGGER on_challenge_participant_removed
  AFTER DELETE ON public.challenge_participants
  FOR EACH ROW EXECUTE FUNCTION public.decrement_challenge_participants();

-- Insert some initial challenges
INSERT INTO public.challenges (title, title_he, description, description_he, hashtag, is_active) VALUES
('Best Smile', 'החיוך הכי יפה', 'Share your pet''s best smile!', 'שתפו את החיוך הכי יפה של חיית המחמד שלכם!', 'חיוך_של_חיה', true),
('Morning Walk', 'טיול בוקר', 'Show us your morning walk routine', 'הראו לנו את הטיול בוקר שלכם', 'טיול_בוקר', true),
('Cozy Corner', 'פינה נעימה', 'Where does your pet love to relax?', 'איפה חיית המחמד שלכם אוהבת לנוח?', 'פינה_נעימה', true);