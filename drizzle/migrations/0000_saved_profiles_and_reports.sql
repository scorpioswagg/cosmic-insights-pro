CREATE TABLE public.saved_birth_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL, date text NOT NULL, time text NOT NULL, place text NOT NULL,
  latitude double precision NOT NULL, longitude double precision NOT NULL,
  timezone text NOT NULL, time_unknown boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name, date, time)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_birth_profiles TO authenticated;
GRANT ALL ON public.saved_birth_profiles TO service_role;
ALTER TABLE public.saved_birth_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profiles" ON public.saved_birth_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.user_generated_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  report_id text NOT NULL, report_title text NOT NULL, chart_name text NOT NULL,
  partner_name text, markdown text NOT NULL,
  chart_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb, partner_snapshot jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.user_generated_reports (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_generated_reports TO authenticated;
GRANT ALL ON public.user_generated_reports TO service_role;
ALTER TABLE public.user_generated_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reports" ON public.user_generated_reports FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);