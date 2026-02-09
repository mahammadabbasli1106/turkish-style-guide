
-- Add onboarding fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS country_code text DEFAULT '+90',
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS height numeric,
  ADD COLUMN IF NOT EXISTS weight numeric,
  ADD COLUMN IF NOT EXISTS height_unit text DEFAULT 'cm',
  ADD COLUMN IF NOT EXISTS weight_unit text DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS goals text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS closet_permission_granted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS location_permission_granted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
