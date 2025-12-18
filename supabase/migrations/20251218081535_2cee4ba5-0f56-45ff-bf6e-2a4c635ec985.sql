-- Create storage bucket for training submissions
INSERT INTO storage.buckets (id, name) 
VALUES ('training-submissions', 'training-submissions')
ON CONFLICT (id) DO NOTHING;

-- RLS policies for training submissions bucket
CREATE POLICY "Users can upload their own training submissions"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'training-submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own training submissions"
ON storage.objects FOR SELECT
USING (bucket_id = 'training-submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own training submissions"
ON storage.objects FOR DELETE
USING (bucket_id = 'training-submissions' AND auth.uid()::text = (storage.foldername(name))[1]);