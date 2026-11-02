CREATE TABLE public.checkout_notice_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  enabled boolean NOT NULL DEFAULT true,
  message text NOT NULL DEFAULT 'Checkout is temporarily unavailable while we update our payment processing system. The Cosmic Blueprint website and its other features remain available. We appreciate your patience and look forward to welcoming you back to checkout soon.' CHECK (char_length(btrim(message)) BETWEEN 1 AND 1000),
  scope text NOT NULL DEFAULT 'report-checkout-only' CHECK (scope IN ('site-wide', 'report-checkout-only')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.checkout_notice_settings TO anon, authenticated;
GRANT ALL ON public.checkout_notice_settings TO service_role;
ALTER TABLE public.checkout_notice_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read checkout notice" ON public.checkout_notice_settings FOR SELECT TO anon, authenticated USING (true);
COMMENT ON TABLE public.checkout_notice_settings IS 'Public checkout notice only. Writes restricted to service_role after existing server-verified admin authorization.';
INSERT INTO public.checkout_notice_settings (id) SELECT true WHERE NOT EXISTS (SELECT 1 FROM public.checkout_notice_settings);
