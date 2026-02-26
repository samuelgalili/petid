INSERT INTO storage.buckets (id, name)
VALUES ('admin-data', 'admin-data')
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth_upload_admin_data_v2" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'admin-data');

CREATE POLICY "public_read_admin_data_v2" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'admin-data');

CREATE POLICY "auth_delete_admin_data_v2" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'admin-data');