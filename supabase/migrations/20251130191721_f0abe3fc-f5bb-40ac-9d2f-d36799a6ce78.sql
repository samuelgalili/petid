-- Create storage bucket for pet photos
INSERT INTO storage.buckets (id, name)
VALUES ('pet-photos', 'pet-photos');

-- Create photos table
CREATE TABLE public.pet_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pet_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own pet photos"
  ON public.pet_photos
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own pet photos"
  ON public.pet_photos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pet photos"
  ON public.pet_photos
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pet photos"
  ON public.pet_photos
  FOR DELETE
  USING (auth.uid() = user_id);

-- Storage policies for pet-photos bucket
CREATE POLICY "Users can view pet photos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'pet-photos');

CREATE POLICY "Users can upload their own pet photos to storage"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'pet-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own pet photos in storage"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'pet-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own pet photos from storage"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'pet-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Trigger for updated_at
CREATE TRIGGER update_pet_photos_updated_at
  BEFORE UPDATE ON public.pet_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();