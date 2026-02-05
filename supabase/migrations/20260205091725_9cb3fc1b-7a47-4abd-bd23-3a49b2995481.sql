-- Create storage bucket for admin data files (correct column name)
INSERT INTO storage.buckets (id, name)
VALUES ('admin-data', 'admin-data')
ON CONFLICT (id) DO NOTHING;

-- Storage policies for admin-data bucket
CREATE POLICY "Admins can upload data files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'admin-data' 
    AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can view data files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'admin-data' 
    AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete data files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'admin-data' 
    AND public.has_role(auth.uid(), 'admin')
);