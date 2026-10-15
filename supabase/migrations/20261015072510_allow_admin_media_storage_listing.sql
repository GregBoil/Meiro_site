-- Storage remove/list operations require SELECT as well as DELETE.
-- Public image serving is already provided by the public bucket.
CREATE POLICY "Meiro admins can read storage metadata" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'product-images' AND public.is_meiro_admin());
