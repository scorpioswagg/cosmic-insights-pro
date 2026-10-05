import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { REPORTS } from "./reports-catalog";
import { generateReportMarkdown } from "./generate-report-core.server";

const BodySchema = z.object({
  name: z.string(),
  longitude: z.number().optional(),
  sign: z.string(),
  signDegree: z.number(),
  house: z.number().optional(),
  retrograde: z.boolean(),
  speed: z.number().optional(),
});

const AspectSchema = z.object({
  a: z.string(),
  b: z.string(),
  type: z.string(),
  angle: z.number().optional(),
  orb: z.number(),
  applying: z.boolean(),
});

const ChartSchema = z.object({
  input: z.object({
    name: z.string(),
    date: z.string(),
    time: z.string(),
    place: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    timezone: z.string(),
    timeUnknown: z.boolean().optional(),
  }),
  julianDayUT: z.number(),
  utcIso: z.string(),
  ascendant: z.number(),
  midheaven: z.number(),
  bodies: z.array(BodySchema).min(1).max(40),
  houses: z.array(z.number()).min(12).max(12),
  aspects: z.array(AspectSchema).max(120),
});

const InputSchema = z.object({
  reportId: z.string().min(1).max(64),
  chart: ChartSchema,
  partnerChart: ChartSchema.optional(),
});

function unwrapInput(input: unknown): unknown {
  if (input && typeof input === "object" && "data" in input) {
    return (input as { data: unknown }).data;
  }
  return input;
}

export const generateAstroReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    try {
      return InputSchema.parse(unwrapInput(input));
    } catch (e) {
      if (e instanceof z.ZodError) {
        const first = e.issues[0];
        const path = first?.path?.join(".") || "input";
        throw new Error(`Invalid chart data (${path}): ${first?.message ?? "validation failed"}`);
      }
      throw e;
    }
  })
  .handler(async ({ data, context }) => {
    if ((context.claims as { is_anonymous?: boolean })?.is_anonymous) {
      throw new Error("Unauthorized: please sign in with Google to generate reports.");
    }
    const def = REPORTS.find((r) => r.id === data.reportId);
    if (!def) throw new Error(`Unknown report: ${data.reportId}`);

    const email =
      typeof (context.claims as { email?: unknown }).email === "string"
        ? ((context.claims as { email?: string }).email as string)
        : null;

    const { assertReportAccess } = await import("@/lib/reports/access.server");
    const access = await assertReportAccess(context.userId, data.reportId, email);

    if (def.adult) {
      const { data: profile, error: profileError } = await context.supabase
        .from("profiles")
        .select("adult_consent")
        .eq("id", context.userId)
        .maybeSingle();
      if (profileError) throw new Error(profileError.message);
      if (!profile?.adult_consent) {
        throw new Error(
          "ADULT_CONSENT_REQUIRED: You must record 18+ consent before generating intimacy reports.",
        );
      }
    }

    if (def.requiresPartner && !data.partnerChart) {
      throw new Error(
        "This synastry report requires a second (partner) chart. Please provide birth data for both people.",
      );
    }

    const { whichWritingProvider } = await import("@/lib/ai-gateway.server");
    const activeProvider = whichWritingProvider();

    let result;
    try {
      result = await generateReportMarkdown({
        reportId: data.reportId,
        chart: data.chart,
        partnerChart: data.partnerChart,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const statusCode =
        e && typeof e === "object" && "statusCode" in e
          ? Number((e as { statusCode?: unknown }).statusCode)
          : undefined;
      console.error(
        `[generateAstroReport] provider=${activeProvider} status=${statusCode ?? "n/a"} reportId=${data.reportId}`,
        msg.slice(0, 400),
      );

      // Only blame Lovable credits when we are actually on the Lovable gateway.
      if (
        activeProvider === "lovable-gateway" &&
        (statusCode === 402 || /payment required/i.test(msg) || /credit/i.test(msg))
      ) {
        throw new Error(
          "Report writing failed: Lovable AI credits are exhausted. Set GEMINI_API_KEY (exact name) in secrets and republish, or top up Lovable credits.",
        );
      }

      // Gemini-specific failures (key not visible at runtime, invalid key, model, quota).
      if (activeProvider === "gemini-direct") {
        if (/api key|invalid|unauthorized|401|403|permission/i.test(msg)) {
          throw new Error(
            "Gemini rejected the API key. Confirm GEMINI_API_KEY in Lovable secrets is a valid Google AI Studio key, then republish.",
          );
        }
        if (/quota|rate limit|resource exhausted|429/i.test(msg)) {
          throw new Error(
            "Gemini quota or rate limit hit. Check Google AI Studio billing/quota, wait, and retry.",
          );
        }
        throw new Error(
          `Gemini generation failed: ${msg.slice(0, 280)}`,
        );
      }

      if (
        msg.includes("LOVABLE_API_KEY") ||
        msg.includes("GEMINI_API_KEY") ||
        msg.includes("not configured")
      ) {
        throw new Error(
          "Report engine is not configured. In Lovable → Secrets add GEMINI_API_KEY (exact spelling), then Publish/Redeploy so the server process receives it.",
        );
      }
      throw new Error(msg || "Report generation failed.");
    }

    // Persist the birth date/name used for this chart so the daily lifecycle
    // worker can trigger the birthday automation without storing birth time.
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await (supabaseAdmin.from("profiles") as any).upsert({
        id: context.userId,
        birth_date: data.chart.input.date,
        display_name: data.chart.input.name,
      }, { onConflict: "id" });
    } catch (profileErr) {
      console.warn("[generateAstroReport] lifecycle profile sync failed", profileErr);
    }

    // Fire the published Resend "report.ready" automation only after the report
    // has been generated successfully. The email failure must never make a
    // successfully generated report fail.
    if (email) {
      try {
        const { sendResendLifecycleEvent } = await import("@/lib/email/service.server");
        const siteUrl = process.env.SITE_URL ?? "https://mycosmicblueprint.online";
        const pageCount = Math.max(1, (result.markdown.match(/^#{1,3}\\s/gm) ?? []).length);
        await sendResendLifecycleEvent({
          event: "report.ready",
          email,
          payload: {
            reportName: result.title,
            orderNumber: `report-${data.reportId}-${Date.now()}`,
            completedDate: result.generatedAt.slice(0, 10),
            pageCount,
            downloadLink: `${siteUrl}/#report-${data.reportId}`,
            dashboardLink: `${siteUrl}/my-reports`,
          },
        });
      } catch (emailErr) {
        console.error("[generateAstroReport] report.ready event failed", emailErr);
      }
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("admin_audit_log").insert({
        actor_id: context.userId,
        actor_email: email,
        action: "report.generate",
        target_user_id: context.userId,
        target_email: email,
        target_report_id: data.reportId,
        metadata: {
          title: def.title,
          chartName: data.chart.input.name,
          partnerName: data.partnerChart?.input.name ?? null,
          accessReason: access.reason,
          aiProvider: activeProvider,
          isFree:
            access.reason === "admin" ||
            access.reason === "free" ||
            access.reason === "entitlement",
        },
      });
    } catch (auditErr) {
      console.warn("[generateAstroReport] audit log failed", auditErr);
    }

    return result;
  });
