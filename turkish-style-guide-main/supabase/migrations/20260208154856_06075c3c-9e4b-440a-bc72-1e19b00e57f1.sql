-- Make clothing-images bucket public for image viewing
UPDATE storage.buckets SET public = true WHERE id = 'clothing-images';

-- Add SELECT policy for clothing images (public read access)
CREATE POLICY "Clothing images are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'clothing-images');

-- Add table for outfit favorites (already have is_favorite column, but add proper history tracking)
ALTER TABLE public.outfit_suggestions 
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS outfit_name TEXT;

-- Create virtual try-on requests table
CREATE TABLE IF NOT EXISTS public.try_on_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  clothing_item_id UUID REFERENCES public.clothing_items(id) ON DELETE CASCADE,
  result_image_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on try_on_sessions
ALTER TABLE public.try_on_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for try_on_sessions
CREATE POLICY "Users can view their own try-on sessions"
ON public.try_on_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own try-on sessions"
ON public.try_on_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own try-on sessions"
ON public.try_on_sessions FOR DELETE
USING (auth.uid() = user_id);