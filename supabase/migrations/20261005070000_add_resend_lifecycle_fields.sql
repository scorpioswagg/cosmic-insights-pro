-- Cosmic Blueprint lifecycle fields for Resend automations.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS birthday_event_sent_on date,
  ADD COLUMN IF NOT EXISTS inactive_event_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS profiles_birth_date_idx
  ON public.profiles (birth_date);
