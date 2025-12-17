-- Create reels storage bucket
INSERT INTO storage.buckets (id, name)
VALUES ('reels', 'reels')
ON CONFLICT (id) DO NOTHING;

-- Enable public read access for reels
CREATE POLICY "Public read access for reels"
ON storage.objects FOR SELECT
USING (bucket_id = 'reels');

-- Allow authenticated users to upload reels
CREATE POLICY "Authenticated users can upload reels"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'reels' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to update their own reels
CREATE POLICY "Users can update own reels"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'reels' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own reels
CREATE POLICY "Users can delete own reels"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'reels' AND auth.uid()::text = (storage.foldername(name))[1]);