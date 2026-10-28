import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Bundle checkout is enabled only if a matching preconfigured Stripe Price exists. */
export const createBundleCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    bundleId: z.string().min(1).max(64),
    requestId: z.string().uuid(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    if ((context.claims as { is_anonymous?: boolean })?.is_anonymous) {
      throw new Error("Please sign in with Google before purchasing.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getStripe } = await import("./stripe.server");
    const { getBundle, bundlePricing } = await import("./bundles");

    const bundle = getBundle(data.bundleId);
    if (!bundle) throw new Error("Unknown bundle.");
    const pricing = bundlePricing(bundle);
    if (pricing.count === 0 || !bundle.reportIds.length) throw new Error("This bundle is empty.");

    const email = typeof (context.claims as { email?: unknown }).email === "string"
      ? (context.claims as { email: string }).email
      : undefined;
    const claimOrigin = (context.claims as { origin?: unknown }).origin;
    const originCandidate = (typeof claimOrigin === "string" && claimOrigin.startsWith("https://") ? claimOrigin : "") || process.env.SITE_URL || "https://yourcosmicblueprint.lovable.app";
    let origin: string;
    try {
      const url = new URL(originCandidate);
      if (url.protocol !== "https:" && url.hostname !== "localhost") throw new Error();
      origin = url.origin;
    } catch {
      throw new Error("Secure checkout is temporarily unavailable. Please contact support.");
    }

    const { data: product, error } = await supabaseAdmin.from("report_products")
      .select("id, title, price_cents, currency, is_free, is_published, stripe_price_id, stripe_product_id")
      .eq("id", bundle.id).maybeSingle();
    if (error) throw new Error("We couldn't verify this bundle's catalog entry.");
    if (!product || !product.is_published || product.is_free || product.price_cents <= 0 || product.price_cents !== pricing.priceCents) {
      throw new Error("This gift bundle is not configured for checkout yet.");
    }

    const stripe = getStripe();
    const { ensureStripePrice } = await import("./stripe.server");
    const priceId = await ensureStripePrice(stripe, {
      ...product,
      tagline: bundle.tagline,
    });
    if (!priceId) throw new Error("This gift bundle has no configured Stripe price.");

    const anchor = bundle.reportIds[0];
    if (!anchor) throw new Error("This bundle has no reports.");
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      client_reference_id: context.userId,
      metadata: {
        user_id: context.userId,
        bundle_id: bundle.id,
        report_id: anchor,
        report_ids: bundle.reportIds.join(","),
      },
      payment_intent_data: {
        metadata: { user_id: context.userId, bundle_id: bundle.id, report_id: anchor },
      },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&report=${encodeURIComponent(anchor)}`,
      cancel_url: `${origin}/checkout/cancel?report=${encodeURIComponent(anchor)}`,
    }, { idempotencyKey: `checkout-bundle-${context.userId}-${bundle.id}-${data.requestId}` });

    const { error: purchaseError } = await supabaseAdmin.from("report_purchases").upsert({
      user_id: context.userId,
      report_id: anchor,
      stripe_session_id: session.id,
      amount_cents: session.amount_total ?? pricing.priceCents,
      currency: session.currency ?? "usd",
      status: "pending",
      customer_email: email ?? null,
      metadata: { bundle_id: bundle.id, report_ids: bundle.reportIds } as never,
    }, { onConflict: "stripe_session_id", ignoreDuplicates: true });
    if (purchaseError) {
      throw new Error("We couldn't save your checkout record. Please retry; duplicate sessions are protected.");
    }
    if (!session.url) throw new Error("Secure checkout is unavailable. Please try again.");
    return { url: session.url };
  });
