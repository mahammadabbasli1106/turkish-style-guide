-- Make clothing-images bucket private
UPDATE storage.buckets SET public = false WHERE id = 'clothing-images';

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Clothing images are publicly viewable" ON storage.objects;