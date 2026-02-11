-- Add missing DELETE and UPDATE policies for style_checkins
CREATE POLICY "Users can delete their own check-ins"
ON public.style_checkins
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own check-ins"
ON public.style_checkins
FOR UPDATE
USING (auth.uid() = user_id);