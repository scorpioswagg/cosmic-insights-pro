import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { whichWritingProvider } from "@/lib/ai-gateway.server";

function claimEmail(context: { claims?: unknown }): string | null {
  const email = (context.claims as { email?: unknown } | undefined)?.email;
  return typeof email === "string" ? email : null;
}

async function requireAdmin(userId: string, email?: string | null) {
  const { isAdminUser } = await import("@/lib/reports/access.server");
  if (!(await isAdminUser(userId, email))) throw new Error("Forbidden");
}

/** Which AI path is live in this deployment (no secrets leaked). */
export const getWritingProviderStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId, claimEmail(context));
    const provider = whichWritingProvider();
    return {
      provider,
      hasOpenAI: !!process.env.OPENAI_API_KEY?.trim(),
      hasGemini: !!process.env.GEMINI_API_KEY?.trim(),
      hasLovable: !!process.env.LOVABLE_API_KEY?.trim(),
      openaiModel: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      geminiModel: process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
      forced: process.env.AI_PROVIDER?.trim() || null,
      ready: provider !== null,
    };
  });

/** Recent report.generate rows from admin_audit_log. */
export const listRecentReportGenerations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId, claimEmail(context));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("admin_audit_log")
      .select("id, action, actor_id, actor_email, target_report_id, target_email, metadata, created_at")
      .eq("action", "report.generate")
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
