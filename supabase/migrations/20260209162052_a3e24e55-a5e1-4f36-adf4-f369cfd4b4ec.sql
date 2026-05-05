
CREATE TABLE public.usage_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  feature text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage events"
ON public.usage_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage events"
ON public.usage_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_usage_events_user_feature_time
ON public.usage_events (user_id, feature, created_at DESC);
