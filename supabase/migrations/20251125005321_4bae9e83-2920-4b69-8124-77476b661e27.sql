-- Create breed_detection_history table
CREATE TABLE public.breed_detection_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  breed TEXT,
  confidence INTEGER,
  avatar_url TEXT,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.breed_detection_history IS 'Stores historical breed detection results for pets';
COMMENT ON COLUMN public.breed_detection_history.breed IS 'Detected breed name';
COMMENT ON COLUMN public.breed_detection_history.confidence IS 'AI confidence score (0-100)';
COMMENT ON COLUMN public.breed_detection_history.avatar_url IS 'Photo URL used for this detection';

-- Enable Row Level Security
ALTER TABLE public.breed_detection_history ENABLE ROW LEVEL SECURITY;

-- Create policies for breed_detection_history
CREATE POLICY "Users can view their own pets' breed history"
ON public.breed_detection_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.pets
    WHERE pets.id = breed_detection_history.pet_id
    AND pets.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert breed history for their own pets"
ON public.breed_detection_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pets
    WHERE pets.id = breed_detection_history.pet_id
    AND pets.user_id = auth.uid()
  )
);

-- Create index for faster queries
CREATE INDEX idx_breed_history_pet_id ON public.breed_detection_history(pet_id);
CREATE INDEX idx_breed_history_detected_at ON public.breed_detection_history(detected_at DESC);