// Single source of truth for "may this user open this report?".
// Server-only: never import from client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { REPORTS } from "@/lib/astrology/reports-catalog";
import { defaultPriceCents } from "./pricing";

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

function envAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || process.env.SITE_ADMIN_EMAIL || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * True when the user is an administrator (unlimited free report generation).
 * Accepts optional email from JWT claims so we never depend solely on a
 * service-role auth.admin lookup that can lag or fail.
 */
export async function isAdminUser(
  userId: string,
  emailCandidate?: string | null,
): Promise<boolean> {
  if (!userId && !emailCandidate) return false;

  const envAdmins = envAdminEmails();
  const claimEmail = emailCandidate?.toLowerCase()?.trim() || null;

  // 0) Fast path: JWT / claim email is on the env allowlist.
  if (claimEmail && envAdmins.includes(claimEmail)) {
    if (userId) {
      try {
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
      } catch {
        // non-fatal — still treat as admin
      }
    }
    return true;
  }

  // 1) Authoritative table read (service role bypasses RLS).
  if (userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("user_id", userId)
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();
      if (!error && data) return true;
      if (error) console.error("[isAdminUser] user_roles read error:", error.message);
    } catch (err) {
      console.error("[isAdminUser] user_roles exception:", err);
    }

    // 2) RPC fallback
    try {
      const { data, error } = await supabaseAdmin.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (!error && data) return true;
    } catch {
      // continue
    }
  }

  // 3) Resolve email (claim or auth.admin) → invites + env allowlist + self-heal
  try {
    let email = claimEmail;
    if (!email && userId) {
      const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(userId);
      email = userRes?.user?.email?.toLowerCase()?.trim() ?? null;
    }
    if (email) {
      if (envAdmins.includes(email)) {
        if (userId) {
          await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
        }
        return true;
      }

      const { data: invite } = await supabaseAdmin
        .from("admin_invites")
        .select("email")
        .eq("email", email)
        .maybeSingle();
      if (invite) {
        if (userId) {
          await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
        }
        return true;
      }
    }
  } catch (err) {
    console.error("[isAdminUser] fallback check failed:", userId, err);
  }

  console.error(
    `[isAdminUser] Access denied for userId=${userId}, email=${claimEmail ?? "(none)"}`,
  );
  return false;
}

async function loadProduct(reportId: string) {
  const { data, error } = await supabaseAdmin
    .from("report_products")
    .select("id, title, price_cents, is_free, is_published")
    .eq("id", reportId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data;

  // Self-heal: a report defined in code but not yet in the catalog table gets
  // seeded with its default price so pricing is never silently zero.
  const def = REPORTS.find((r) => r.id === reportId);
  if (!def) return null;
  const row = {
    id: def.id,
    title: def.title,
    tagline: def.tagline,
    category: def.category,
    icon: def.icon,
    adult: !!def.adult,
    price_cents: defaultPriceCents(def),
    is_free: false,
    is_published: true,
    slug: def.id,
  };
  await supabaseAdmin.from("report_products").upsert(row, { onConflict: "id" });
  return {
    id: row.id,
    title: row.title,
    price_cents: row.price_cents,
    is_free: row.is_free,
    is_published: row.is_published,
  };
}

export async function resolveReportAccess(
  userId: string,
  reportId: string,
  emailCandidate?: string | null,
): Promise<ReportAccess> {
  // Admins always have access — check before product lookup so generation
  // still works if the catalog row is missing or mid-sync.
  if (await isAdminUser(userId, emailCandidate)) {
    const def = REPORTS.find((r) => r.id === reportId);
    return {
      allowed: true,
      reason: "admin",
      reportId,
      title: def?.title ?? reportId,
      priceCents: 0,
    };
  }

  const product = await loadProduct(reportId);
  if (!product) return { allowed: false, reason: "unknown_report", reportId };

  const base = {
    reportId,
    title: product.title,
    priceCents: product.price_cents,
  };

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
export async function assertReportAccess(
  userId: string,
  reportId: string,
  emailCandidate?: string | null,
) {
  const access = await resolveReportAccess(userId, reportId, emailCandidate);
  if (!access.allowed) {
    if (access.reason === "unknown_report") throw new Error(`Unknown report: ${reportId}`);
    if (access.reason === "unpublished") throw new Error("This report is not available.");
    throw new Error(
      `REPORT_LOCKED: Purchase required to access "${access.title ?? reportId}".`,
    );
  }
  return access;
}
