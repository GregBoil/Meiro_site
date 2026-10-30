-- Apply individually: the earlier strict MFA migration is deliberately pending.
-- Bucket limits already verified on Meiro; record them for reproducibility.
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
WHERE id = 'product-images';

-- Public catalogue queries need only media attached to published products or
-- active homepage slides. Admins retain their existing independent ALL policy.
DROP POLICY "Public can read media" ON public.media;
CREATE POLICY "Public can read displayed media" ON public.media
FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.product_images pi
    JOIN public.products p ON p.id = pi.product_id
    WHERE pi.media_id = media.id AND p.status = 'published'
  ) OR EXISTS (
    SELECT 1 FROM public.homepage_carousel h
    WHERE h.media_id = media.id AND h.active
  )
);

-- The UI's unused check is insufficient: protect direct API deletes and races
-- with new references using the foreign key, not a client-side check.
ALTER TABLE public.product_images DROP CONSTRAINT product_images_media_id_fkey;
ALTER TABLE public.product_images ADD CONSTRAINT product_images_media_id_fkey
FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE RESTRICT;

-- Block direct Storage deletion/replacement of files referenced by any media
-- record. Cleanup must first remove the unused media record (FK-protected).
-- Restrictive policies supplement, rather than replace, admin authorization.
CREATE POLICY "Protect registered media files from deletion" ON storage.objects
AS RESTRICTIVE FOR DELETE TO authenticated
USING (bucket_id <> 'product-images' OR NOT EXISTS (
  SELECT 1 FROM public.media m WHERE m.storage_path = objects.name
));
CREATE POLICY "Protect registered media files from replacement" ON storage.objects
AS RESTRICTIVE FOR UPDATE TO authenticated
USING (bucket_id <> 'product-images' OR NOT EXISTS (
  SELECT 1 FROM public.media m WHERE m.storage_path = objects.name
))
WITH CHECK (bucket_id <> 'product-images' OR NOT EXISTS (
  SELECT 1 FROM public.media m WHERE m.storage_path = objects.name
));
