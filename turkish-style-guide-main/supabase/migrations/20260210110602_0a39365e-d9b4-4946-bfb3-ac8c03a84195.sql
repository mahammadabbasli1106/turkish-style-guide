
-- Create storage bucket for temporary try-on images
INSERT INTO storage.buckets (id, name, public)
VALUES ('try-on-images', 'try-on-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to try-on-images
CREATE POLICY "Authenticated users can upload try-on images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'try-on-images');

-- Allow public read access to try-on images
CREATE POLICY "Public read access for try-on images"
ON storage.objects FOR SELECT
USING (bucket_id = 'try-on-images');

-- Allow authenticated users to delete their own try-on images
CREATE POLICY "Users can delete their own try-on images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'try-on-images' AND auth.uid()::text = (storage.foldername(name))[1]);
