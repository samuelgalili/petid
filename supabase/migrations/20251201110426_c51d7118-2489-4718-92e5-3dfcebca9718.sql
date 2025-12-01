-- Create park reviews table
CREATE TABLE public.park_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  park_id UUID REFERENCES public.dog_parks(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, park_id)
);

-- Enable RLS
ALTER TABLE public.park_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view park reviews"
ON public.park_reviews
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert their own reviews"
ON public.park_reviews
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
ON public.park_reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
ON public.park_reviews
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_park_reviews_updated_at
BEFORE UPDATE ON public.park_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for park review photos
INSERT INTO storage.buckets (id, name)
VALUES ('park-photos', 'park-photos')
ON CONFLICT (id) DO NOTHING;

-- Storage policies for park photos
CREATE POLICY "Anyone can view park photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'park-photos');

CREATE POLICY "Authenticated users can upload park photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'park-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own park photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'park-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own park photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'park-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add indexes for performance
CREATE INDEX idx_park_reviews_park_id ON public.park_reviews(park_id);
CREATE INDEX idx_park_reviews_user_id ON public.park_reviews(user_id);
CREATE INDEX idx_park_reviews_rating ON public.park_reviews(rating);
CREATE INDEX idx_park_reviews_created_at ON public.park_reviews(created_at DESC);