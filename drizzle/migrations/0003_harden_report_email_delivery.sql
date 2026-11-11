ALTER TABLE public.report_purchases ADD COLUMN customer_name text;
CREATE TABLE public.email_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 idempotency_key text NOT NULL UNIQUE,
 template_name text NOT NULL,
 payload jsonb NOT NULL,
 status text NOT NULL DEFAULT 'pending',
 attempts integer NOT NULL DEFAULT 0,
 resend_id text,
 first_attempt_at timestamptz,
 next_attempt_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.email_outbox TO service_role;
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.email_outbox IS 'Service-only immutable email payload and stable Resend idempotency keys; private links never exposed in admin DTOs. Replay stops after 23 hours within the provider 24-hour window.';
CREATE OR REPLACE FUNCTION public.claim_outbox_email(email_key text)
RETURNS SETOF public.email_outbox LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
 UPDATE public.email_outbox SET status = 'sending', attempts = attempts + 1,
 first_attempt_at = COALESCE(first_attempt_at, now()), next_attempt_at = now() + interval '5 minutes', updated_at = now()
 WHERE idempotency_key = email_key AND resend_id IS NULL AND status <> 'requires_attention'
 AND (next_attempt_at IS NULL OR next_attempt_at <= now())
 AND (first_attempt_at IS NULL OR first_attempt_at > now() - interval '23 hours')
 RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.claim_outbox_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_outbox_email(text) TO service_role;