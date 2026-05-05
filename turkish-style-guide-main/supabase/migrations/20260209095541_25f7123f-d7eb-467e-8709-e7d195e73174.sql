-- Add full_body_photo_url column to profiles table for try-on feature
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_body_photo_url text;

-- Add avatar type column for avatar selection
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_type text DEFAULT 'default';

-- Create avatars table for predefined avatars
CREATE TABLE IF NOT EXISTS public.avatars (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  image_url text NOT NULL,
  category text DEFAULT 'default'
);

-- Enable RLS on avatars table
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;

-- Allow all users to read avatars
CREATE POLICY "Anyone can view avatars" 
ON public.avatars 
FOR SELECT 
USING (true);

-- Insert default avatars
INSERT INTO public.avatars (name, image_url, category) VALUES
('Default', 'https://api.dicebear.com/7.x/avataaars/svg?seed=default', 'default'),
('Cool', 'https://api.dicebear.com/7.x/avataaars/svg?seed=cool', 'default'),
('Happy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=happy', 'default'),
('Style', 'https://api.dicebear.com/7.x/avataaars/svg?seed=style', 'default'),
('Fashion', 'https://api.dicebear.com/7.x/avataaars/svg?seed=fashion', 'default'),
('Chic', 'https://api.dicebear.com/7.x/avataaars/svg?seed=chic', 'default'),
('Trendy', 'https://api.dicebear.com/7.x/avataaars/svg?seed=trendy', 'default'),
('Classic', 'https://api.dicebear.com/7.x/avataaars/svg?seed=classic', 'default');