
-- Style check-ins for streak tracking
CREATE TABLE public.style_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  outfit_suggestion_id UUID REFERENCES public.outfit_suggestions(id) ON DELETE SET NULL,
  checked_in_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One check-in per day per user
CREATE UNIQUE INDEX idx_style_checkins_user_date ON public.style_checkins(user_id, checked_in_at);
CREATE INDEX idx_style_checkins_user ON public.style_checkins(user_id);

ALTER TABLE public.style_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkins"
  ON public.style_checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkins"
  ON public.style_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);
