import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(userId: string) {
  const { isAdminUser } = await import("@/lib/reports/access.server");
  if (!(await isAdminUser(userId))) throw new Error("Forbidden");
}

export const listPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: purchases, error } = await supabaseAdmin
      .from("report_purchases")
      .select(
        "id, user_id, report_id, amount_cents, currency, status, customer_email, email_sent_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const { data: products } = await supabaseAdmin
      .from("report_products")
      .select("id, title");
    const titles = new Map((products ?? []).map((p) => [p.id, p.title]));

    return (purchases ?? []).map((p) => ({
      ...p,
      reportTitle: titles.get(p.report_id) ?? p.report_id,
      emailStatus: p.email_sent_at ? "sent" : p.status === "paid" ? "pending" : "n/a",
    }));
  });

export const listEntitlements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("report_entitlements")
      .select("id, user_id, report_id, source, status, granted_at")
      .order("granted_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const GrantSchema = z.object({
  email: z.string().email().max(200),
  reportId: z.string().min(1).max(64),
  note: z.string().max(300).optional(),
});

export const grantReportAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => GrantSchema.parse(i))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { grantEntitlement } = await import("@/lib/reports/purchase.server");

    const email = data.email.trim().toLowerCase();
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = list?.users.find((u) => u.email?.toLowerCase() === email);
    if (!user) throw new Error(`No account found for ${email}.`);

    await grantEntitlement({
      userId: user.id,
      reportId: data.reportId,
      source: "admin_grant",
      grantedBy: context.userId,
      note: data.note ?? null,
    });

    await supabaseAdmin.from("admin_audit_log").insert({
      actor_id: context.userId,
      action: "entitlement.grant",
      target_user_id: user.id,
      target_email: email,
      target_report_id: data.reportId,
    });
    return { ok: true };
  });

export const revokeReportAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ userId: z.string().uuid(), reportId: z.string().min(1).max(64) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { revokeEntitlement } = await import("@/lib/reports/purchase.server");
    await revokeEntitlement(data.userId, data.reportId);
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_id: context.userId,
      action: "entitlement.revoke",
      target_user_id: data.userId,
      target_report_id: data.reportId,
    });
    return { ok: true };
  });

/** Creates/refreshes the Stripe Product & Price for every paid published report. */
export const syncStripePrices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getStripe, ensureStripePrice } = await import("@/lib/reports/stripe.server");

    const { data: rows, error } = await supabaseAdmin
      .from("report_products")
      .select(
        "id, title, tagline, price_cents, currency, is_free, is_published, stripe_price_id, stripe_product_id",
      )
      .eq("is_published", true)
      .eq("is_free", false)
      .gt("price_cents", 0);
    if (error) throw new Error(error.message);

    const stripe = getStripe();
    let synced = 0;
    const failures: string[] = [];
    for (const row of rows ?? []) {
      try {
        await ensureStripePrice(stripe, row);
        synced += 1;
      } catch (e) {
        failures.push(`${row.title}: ${(e as Error).message}`);
      }
    }
    return { synced, total: rows?.length ?? 0, failures };
  });