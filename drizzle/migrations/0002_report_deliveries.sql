CREATE TABLE public.report_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id text NOT NULL,
  purchase_id uuid REFERENCES public.report_purchases(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  report_id text NOT NULL,
  chart_snapshot jsonb,
  partner_snapshot jsonb,
  status text NOT NULL DEFAULT 'awaiting_payment',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  pdf_path text,
  email_sent_at timestamptz,
  locked_at timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stripe_session_id, report_id)
);
GRANT SELECT ON public.report_deliveries TO authenticated;
GRANT ALL ON public.report_deliveries TO service_role;
ALTER TABLE public.report_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view deliveries" ON public.report_deliveries FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view own deliveries" ON public.report_deliveries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_report_deliveries_updated_at BEFORE UPDATE ON public.report_deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.internal_cron_tokens (
  name text PRIMARY KEY,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.internal_cron_tokens TO service_role;
ALTER TABLE public.internal_cron_tokens ENABLE ROW LEVEL SECURITY;
INSERT INTO public.internal_cron_tokens (name) VALUES ('report_delivery');

CREATE OR REPLACE FUNCTION public.claim_report_delivery()
RETURNS SETOF public.report_deliveries
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  UPDATE public.report_deliveries d
     SET status = 'generating', locked_at = now(), attempts = d.attempts + 1
   WHERE d.id = (
     SELECT id FROM public.report_deliveries
      WHERE attempts < 5 AND next_attempt_at <= now()
        AND (status IN ('pending','retry') OR (status = 'generating' AND locked_at < now() - interval '20 minutes'))
      ORDER BY created_at
      FOR UPDATE SKIP LOCKED
      LIMIT 1)
  RETURNING d.*;
END; $$;
REVOKE ALL ON FUNCTION public.claim_report_delivery() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_report_delivery() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
SELECT cron.schedule('report-deliveries-backstop', '0 * * * *', $cron$
  SELECT net.http_post(
    url := 'https://yourcosmicblueprint.lovable.app/api/public/deliveries/process',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-token',
      (SELECT token FROM public.internal_cron_tokens WHERE name = 'report_delivery')),
    body := '{}'::jsonb,
    timeout_milliseconds := 600000)
  WHERE EXISTS (SELECT 1 FROM public.report_deliveries WHERE status IN ('pending','retry','generating') AND attempts < 5);
$cron$);