// Single source of truth for "may this user open this report?".
// Server-only: never import from client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AccessReason =
  | "admin"
  | "free"
  | "entitlement"
  | "locked"
  | "unpublished"
  | "unknown_report";

export interface ReportAccess {
  allowed: boolean;
  reason: AccessReason;
  reportId: string;
  title?: string;
  priceCents?: number;
}

export async function isAdminUser(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  return !!data;
}

export async function resolveReportAccess(
  userId: string,
  reportId: string,
): Promise<ReportAccess> {
  const { data: product, error } = await supabaseAdmin
    .from("report_products")
    .select("id, title, price_cents, is_free, is_published")
    .eq("id", reportId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!product) return { allowed: false, reason: "unknown_report", reportId };

  const base = {
    reportId,
    title: product.title,
    priceCents: product.price_cents,
  };

  if (await isAdminUser(userId)) return { allowed: true, reason: "admin", ...base };
  if (!product.is_published) return { allowed: false, reason: "unpublished", ...base };
  if (product.is_free || product.price_cents <= 0)
    return { allowed: true, reason: "free", ...base };

  const { data: ent, error: entErr } = await supabaseAdmin
    .from("report_entitlements")
    .select("id, status, expires_at")
    .eq("user_id", userId)
    .eq("report_id", reportId)
    .maybeSingle();
  if (entErr) throw new Error(entErr.message);

  const active =
    !!ent &&
    ent.status === "active" &&
    (!ent.expires_at || new Date(ent.expires_at).getTime() > Date.now());

  return active
    ? { allowed: true, reason: "entitlement", ...base }
    : { allowed: false, reason: "locked", ...base };
}

/** Throws when the user may not access the report. */
export async function assertReportAccess(userId: string, reportId: string) {
  const access = await resolveReportAccess(userId, reportId);
  if (!access.allowed) {
    if (access.reason === "unknown_report") throw new Error(`Unknown report: ${reportId}`);
    if (access.reason === "unpublished") throw new Error("This report is not available.");
    throw new Error(
      `REPORT_LOCKED: Purchase required to access "${access.title ?? reportId}".`,
    );
  }
  return access;
}