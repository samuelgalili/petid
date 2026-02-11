-- Create storage bucket for music
INSERT INTO storage.buckets (id, name)
VALUES ('music', 'music')
ON CONFLICT (id) DO NOTHING;

-- Storage policies for music bucket
CREATE POLICY "Music files are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'music');

CREATE POLICY "Authenticated users can upload music"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'music' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own music"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'music' AND auth.uid()::text = (storage.foldername(name))[1]);