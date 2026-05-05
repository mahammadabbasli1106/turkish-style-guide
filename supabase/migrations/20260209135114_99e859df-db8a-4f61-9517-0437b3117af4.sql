-- Drop the unique constraint so each outfit generation creates a new check-in
DROP INDEX IF EXISTS public.idx_style_checkins_user_date;