import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function claimEmail(context: { claims?: unknown }): string | null {
  const email = (context.claims as { email?: unknown } | undefined)?.email;
  return typeof email === "string" ? email : null;
}

/** Creates a Stripe Checkout Session for one report. Price is resolved server-side. */
export const createReportCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ reportId: z.string().min(1).max(64) }).parse(input),
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
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Unknown report.");
    if (!row.is_published) throw new Error("This report is not available.");
    if (row.is_free || row.price_cents <= 0) throw new Error("This report is free.");

    const stripe = getStripe();
    const priceId = await ensureStripePrice(stripe, row);

    const origin =
      process.env.SITE_URL?.replace(/\/$/, "") ||
      process.env.VITE_SITE_URL?.replace(/\/$/, "") ||
      (context.claims as { origin?: string })?.origin ||
      "https://mycosmicblueprint.online";

    const session = await stripe.checkout.sessions.create({
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
    });

    await supabaseAdmin.from("report_purchases").insert({
      user_id: context.userId,
      report_id: row.id,
      stripe_session_id: session.id,
      amount_cents: row.price_cents,
      currency: row.currency || "usd",
      status: "pending",
      customer_email: email ?? null,
    });

    return { alreadyOwned: false as const, url: session.url };
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

/** Polled by the success page until the verified webhook has landed. */
export const getEntitlementStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ reportId: z.string().min(1).max(64) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { resolveReportAccess } = await import("./access.server");
    const access = await resolveReportAccess(
      context.userId,
      data.reportId,
      claimEmail(context),
    );
    return {
      unlocked: access.allowed,
      reason: access.reason,
      title: access.title ?? data.reportId,
    };
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
        reportId: r.id,
        source: "admin",
        grantedAt: null as string | null,
        title: r.title,
        tagline: r.tagline,
        category: r.category,
        icon: r.icon,
      }));
      return { isAdmin: true, items, purchases: [] };
    }

    const { data: ents } = await supabaseAdmin
      .from("report_entitlements")
      .select("report_id, source, granted_at, status")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .order("granted_at", { ascending: false });

    const ids = (ents ?? []).map((e) => e.report_id);
    const { data: products } = ids.length
      ? await supabaseAdmin
          .from("report_products")
          .select("id, title, tagline, category, icon")
          .in("id", ids)
      : { data: [] as { id: string; title: string; tagline: string; category: string; icon: string }[] };

    const byId = new Map((products ?? []).map((p) => [p.id, p]));

    const { data: purchases } = await supabaseAdmin
      .from("report_purchases")
      .select("report_id, amount_cents, currency, status, created_at")
      .eq("user_id", context.userId)
      .eq("status", "paid")
      .order("created_at", { ascending: false });

    return {
      isAdmin: admin,
      items: (ents ?? []).map((e) => ({
        reportId: e.report_id,
        source: e.source,
        grantedAt: e.granted_at,
        title: byId.get(e.report_id)?.title ?? e.report_id,
        tagline: byId.get(e.report_id)?.tagline ?? "",
        category: byId.get(e.report_id)?.category ?? "",
        icon: byId.get(e.report_id)?.icon ?? "",
      })),
      purchases: purchases ?? [],
    };
  });

/**
 * Client-side recovery after Stripe redirect.
 * If the webhook is slow or not configured, the success page calls this with
 * session_id so we can retrieve the session from Stripe and grant the entitlement
 * immediately. Safe to call multiple times (fulfill is idempotent).
 */
export const confirmCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        sessionId: z.string().min(1).max(200),
        reportId: z.string().min(1).max(64).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { getStripe } = await import("./stripe.server");
    const { fulfillCheckoutSession } = await import("./purchase.server");
    const { resolveReportAccess } = await import("./access.server");

    const stripe = getStripe();
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(data.sessionId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Could not load Stripe session: ${msg.slice(0, 200)}`);
    }

    const metaUser = session.metadata?.user_id;
    if (metaUser && metaUser !== context.userId) {
      throw new Error("This checkout session belongs to a different account.");
    }

    const paid =
      session.payment_status === "paid" ||
      session.payment_status === "no_payment_required" ||
      session.status === "complete";

    if (paid) {
      if (!session.metadata) session.metadata = {};
      if (!session.metadata.user_id) session.metadata.user_id = context.userId;
      if (!session.metadata.report_id && data.reportId) {
        session.metadata.report_id = data.reportId;
      }
      await fulfillCheckoutSession(session);
    }

    const reportId =
      data.reportId || session.metadata?.report_id || "";
    if (!reportId) {
      return {
        unlocked: paid,
        reason: paid ? "purchase" : "pending",
        title: "Report",
        paymentStatus: session.payment_status,
      };
    }

    const access = await resolveReportAccess(
      context.userId,
      reportId,
      claimEmail(context),
    );
    return {
      unlocked: access.allowed,
      reason: access.reason,
      title: access.title ?? reportId,
      paymentStatus: session.payment_status,
    };
  });
