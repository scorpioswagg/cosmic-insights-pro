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
  bodies: z.array(BodySchema).max(30),
  houses: z.array(z.number()).length(12),
  aspects: z.array(AspectSchema).max(80),
});

const InputSchema = z.object({
  reportId: z.string().min(1).max(64),
  chart: ChartSchema,
  partnerChart: ChartSchema.optional(),
});

export const generateAstroReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    if ((context.claims as { is_anonymous?: boolean })?.is_anonymous) {
      throw new Error("Unauthorized: please sign in with Google to generate reports.");
    }
    const def = REPORTS.find((r) => r.id === data.reportId);
    if (!def) throw new Error(`Unknown report: ${data.reportId}`);

    // Entitlement gate — the single server-side source of truth for access.
    const { assertReportAccess } = await import("@/lib/reports/access.server");
    await assertReportAccess(context.userId, data.reportId);

    // Adult (18+) reports require a persisted server-side consent acknowledgment
    // stored on the user's profile. Client-only confirms are bypassable.
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

    return await generateReportMarkdown({
      reportId: data.reportId,
      chart: data.chart,
      partnerChart: data.partnerChart,
    });
  });
