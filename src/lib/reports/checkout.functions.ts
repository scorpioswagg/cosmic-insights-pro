import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type Stripe from "stripe";

function claimEmail(context: { claims?: unknown }): string | null {
  const email = (context.claims as { email?: unknown } | undefined)?.email;
  return typeof email === "string" ? email : null;
}

function checkoutOrigin(context: { claims?: unknown }): string {
  const claimed = (context.claims as { origin?: unknown } | undefined)?.origin;
  const configured = typeof process.env.SITE_URL === "string" ? process.env.SITE_URL : "";
  const candidate =
    (typeof claimed === "string" && claimed ? claimed : "") ||
    configured ||
    "https://yourcosmicblueprint.lovable.app";
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("Secure checkout is temporarily unavailable. Please contact support.");
  }
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
    throw new Error("Secure checkout is temporarily unavailable. Please contact support.");
  }
  return parsed.origin;
}

/** Creates a Stripe Checkout Session for one report. Price is resolved server-side. */
export const createReportCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      reportId: z.string().min(1).max(64),
      requestId: z.string().uuid(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    if ((context.claims as { is_anonymous?: boolean })?.is_anonymous) {
      throw new Error("Please sign in with Google before purchasing.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getStripe, ensureStripePrice } = await import("./stripe.server");
    const { resolveReportAccess } = await import("./access.server");

    const email = claimEmail(context);
    const access = await resolveReportAccess(context.userId, data.reportId, email);
    if (access.allowed) return { alreadyOwned: true as const, url: null };
    if (access.reason === "unknown_report") throw new Error("Unknown report.");
    if (access.reason === "unpublished") throw new Error("This report is not available.");

    const { data: row, error } = await supabaseAdmin
      .from("report_products")
      .select(
        "id, title, tagline, price_cents, currency, is_free, is_published, stripe_price_id, stripe_product_id",
      )
      .eq("id", data.reportId)
      .maybeSingle();
    if (error) throw new Error("We couldn't verify the report catalog. Please try again.");
    if (!row) throw new Error("Unknown report.");
    if (!row.is_published) throw new Error("This report is not available.");
    if (row.is_free || row.price_cents <= 0) throw new Error("This report is free.");

    const stripe = getStripe();
    const priceId = await ensureStripePrice(stripe, row);
    const origin = checkoutOrigin(context);

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        allow_promotion_codes: true,
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: email ?? undefined,
        client_reference_id: context.userId,
        metadata: {
          user_id: context.userId,
          report_id: row.id,
          report_slug: row.id,
        },
        payment_intent_data: {
          metadata: { user_id: context.userId, report_id: row.id },
        },
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&report=${encodeURIComponent(row.id)}`,
        cancel_url: `${origin}/checkout/cancel?report=${encodeURIComponent(row.id)}`,
      }, { idempotencyKey: `checkout-report-${context.userId}-${data.reportId}-${data.requestId}` });
    } catch {
      throw new Error("We couldn't open secure checkout. Please try again. No report access has changed.");
    }

    if (!session.url) throw new Error("Secure checkout is unavailable. Please try again.");
    const { error: purchaseError } = await supabaseAdmin.from("report_purchases").upsert({
      user_id: context.userId,
      report_id: row.id,
      stripe_session_id: session.id,
      amount_cents: session.amount_total ?? row.price_cents,
      currency: session.currency ?? row.currency,
      status: "pending",
      customer_email: email ?? null,
    }, { onConflict: "stripe_session_id", ignoreDuplicates: true });
    if (purchaseError) {
      throw new Error("We couldn't save your checkout record. Please retry; duplicate sessions are protected.");
    }

    return { alreadyOwned: false as const, url: session.url };
  });

/** Verify a Stripe Checkout Session belongs to this user and fulfill only a paid session. */
export const confirmCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ sessionId: z.string().min(10).max(255) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    if ((context.claims as { is_anonymous?: boolean })?.is_anonymous) {
      throw new Error("Please sign in to confirm this purchase.");
    }
    const { getStripe } = await import("./stripe.server");
    const { fulfillCheckoutSession } = await import("./purchase.server");
    const stripe = getStripe();
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(data.sessionId);
    } catch {
      throw new Error("We couldn't verify this checkout session yet.");
    }
    if (session.client_reference_id !== context.userId ||
        session.metadata?.user_id !== context.userId) {
      throw new Error("This checkout session does not belong to your account.");
    }
    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
      return { confirmed: false as const };
    }
    const result = await fulfillCheckoutSession(session);
    if (!result.ok) throw new Error("This payment needs support review before access can be granted.");
    return { confirmed: true as const };
  });

/** Access state for every published report, for the signed-in user. */
export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { isAdminUser } = await import("./access.server");
    const admin = await isAdminUser(context.userId, claimEmail(context));

    if (admin) {
      const { REPORTS } = await import("@/lib/astrology/reports-catalog");
      const { data: rows } = await supabaseAdmin.from("report_products").select("id");
      const all = new Set<string>([
        ...REPORTS.map((r) => r.id),
        ...(rows ?? []).map((r) => r.id),
      ]);
      return { isAdmin: true, unlocked: Array.from(all) };
    }

    const { data: ents } = await supabaseAdmin
      .from("report_entitlements")
      .select("report_id, status, expires_at, source, granted_at")
      .eq("user_id", context.userId)
      .eq("status", "active");

    const now = Date.now();
    const unlocked = (ents ?? [])
      .filter((e) => !e.expires_at || new Date(e.expires_at).getTime() > now)
      .map((e) => e.report_id);

    return { isAdmin: admin, unlocked };
  });

/** Returns entitlement state after server-side fulfillment. */
export const getEntitlementStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ reportId: z.string().min(1).max(64) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { resolveReportAccess } = await import("./access.server");
    const access = await resolveReportAccess(context.userId, data.reportId, claimEmail(context));
    return { unlocked: access.allowed, reason: access.reason, title: access.title ?? data.reportId };
  });

/** The signed-in customer's library. */
export const getMyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { isAdminUser } = await import("./access.server");
    const admin = await isAdminUser(context.userId, claimEmail(context));

    if (admin) {
      const { REPORTS } = await import("@/lib/astrology/reports-catalog");
      const items = REPORTS.map((r) => ({
        reportId: r.id, source: "admin", grantedAt: null as string | null,
        title: r.title, tagline: r.tagline, category: r.category, icon: r.icon,
      }));
      return { isAdmin: true, items, purchases: [] };
    }

    const { data: ents } = await supabaseAdmin
      .from("report_entitlements")
      .select("report_id, source, granted_at, status, expires_at")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .order("granted_at", { ascending: false });
    const activeEnts = (ents ?? []).filter((e) =>
      !e.expires_at || new Date(e.expires_at).getTime() > Date.now()
    );

    const ids = activeEnts.map((e) => e.report_id);
    const { data: products } = ids.length
      ? await supabaseAdmin.from("report_products")
          .select("id, title, tagline, category, icon").in("id", ids)
      : { data: [] as { id: string; title: string; tagline: string; category: string; icon: string }[] };

    const byId = new Map((products ?? []).map((p) => [p.id, p]));
    const { data: purchases } = await supabaseAdmin.from("report_purchases")
      .select("report_id, amount_cents, currency, status, created_at")
      .eq("user_id", context.userId).eq("status", "paid").order("created_at", { ascending: false });

    return {
      isAdmin: admin,
      items: activeEnts.map((e) => ({
        reportId: e.report_id, source: e.source, grantedAt: e.granted_at,
        title: byId.get(e.report_id)?.title ?? e.report_id,
        tagline: byId.get(e.report_id)?.tagline ?? "",
        category: byId.get(e.report_id)?.category ?? "",
        icon: byId.get(e.report_id)?.icon ?? "",
      })),
      purchases: purchases ?? [],
    };
  });
