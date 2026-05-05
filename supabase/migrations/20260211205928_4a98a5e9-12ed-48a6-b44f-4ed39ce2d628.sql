
-- Remove the public read policy from try-on-images
DROP POLICY IF EXISTS "Public read access for try-on images" ON storage.objects;

-- Add owner-only read policy for try-on-images
CREATE POLICY "Users can read own try-on images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'try-on-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add update policy for try-on-images (needed for upsert)
CREATE POLICY "Users can update own try-on images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'try-on-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Make try-on-images bucket private
UPDATE storage.buckets SET public = false WHERE id = 'try-on-images';
