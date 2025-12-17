-- Create table for park photos
CREATE TABLE public.park_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  park_id UUID NOT NULL REFERENCES public.dog_parks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.park_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view park photos"
ON public.park_photos FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can upload park photos"
ON public.park_photos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own park photos"
ON public.park_photos FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_park_photos_park_id ON public.park_photos(park_id);
CREATE INDEX idx_park_photos_created_at ON public.park_photos(created_at DESC);