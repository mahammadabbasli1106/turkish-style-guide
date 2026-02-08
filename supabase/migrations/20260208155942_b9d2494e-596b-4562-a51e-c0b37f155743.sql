-- Add UPDATE policy for try_on_sessions (was missing)
CREATE POLICY "Users can update their own try-on sessions"
ON public.try_on_sessions FOR UPDATE
USING (auth.uid() = user_id);