-- Create storage bucket for pet avatars
INSERT INTO storage.buckets (id, name)
VALUES ('pet-avatars', 'pet-avatars')
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for pet avatars (allow public access)
CREATE POLICY "Anyone can view pet avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'pet-avatars');

CREATE POLICY "Authenticated users can upload pet avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pet-avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update pet avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'pet-avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete pet avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'pet-avatars' AND auth.uid() IS NOT NULL);