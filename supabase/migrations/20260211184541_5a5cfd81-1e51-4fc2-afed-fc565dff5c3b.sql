
ALTER TABLE public.profiles
ADD COLUMN privacy_consent_version text DEFAULT NULL,
ADD COLUMN privacy_consent_at timestamp with time zone DEFAULT NULL;
