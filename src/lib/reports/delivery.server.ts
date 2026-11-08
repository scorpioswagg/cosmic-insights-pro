/**
 * Post-purchase report delivery: generate the purchased report from the
 * customer's chart, build the PDF, store it privately and email a link.
 * Every step is idempotent and failures are recorded on the delivery row.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

const MAX_ATTEMPTS = 5;
const LINK_TTL_SECONDS = 60 * 60 * 24 * 7;

export function retryDelayMs(attempts: number): number {
  return Math.min(60 * 60 * 1000, 2 ** Math.max(0, attempts - 1) * 2 * 60 * 1000);
}

/** Saved at checkout so the paid report uses the exact chart the customer was viewing. */
export async function recordDeliveryIntents(args: {
  sessionId: string;
  userId: string;
  reportIds: string[];
  chart?: unknown;
  partnerChart?: unknown;
}) {
  if (!args.reportIds.length) return;
  const rows = args.reportIds.map((reportId) => ({
    stripe_session_id: args.sessionId,
    user_id: args.userId,
    report_id: reportId,
    chart_snapshot: (args.chart ?? null) as Json,
    partner_snapshot: (args.partnerChart ?? null) as Json,
    status: "awaiting_payment",
  }));
  const { error } = await supabaseAdmin
    .from("report_deliveries")
    .upsert(rows, { onConflict: "stripe_session_id,report_id", ignoreDuplicates: true });
  if (error) console.error("[delivery] could not record intent", args.sessionId, error.message);
}

/** Called from fulfillment; safe to repeat. Never resets a sent delivery. */
export async function enqueueDeliveries(args: {
  sessionId: string;
  purchaseId: string;
  userId: string;
  reportIds: string[];
}) {
  const rows = args.reportIds.map((reportId) => ({
    stripe_session_id: args.sessionId,
    purchase_id: args.purchaseId,
    user_id: args.userId,
    report_id: reportId,
    status: "pending",
  }));
  const { error: insErr } = await supabaseAdmin
    .from("report_deliveries")
    .upsert(rows, { onConflict: "stripe_session_id,report_id", ignoreDuplicates: true });
  if (insErr) throw new Error(insErr.message);
  const { error: updErr } = await supabaseAdmin
    .from("report_deliveries")
    .update({ status: "pending", purchase_id: args.purchaseId, next_attempt_at: new Date().toISOString() })
    .eq("stripe_session_id", args.sessionId)
    .eq("status", "awaiting_payment");
  if (updErr) throw new Error(updErr.message);
}

export async function getProcessorToken(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("internal_cron_tokens")
    .select("token")
    .eq("name", "report_delivery")
    .maybeSingle();
  return data?.token ?? null;
}

/** Fire-and-forget wake-up of the delivery processor. */
export async function wakeDeliveryProcessor(origin?: string) {
  try {
    const token = await getProcessorToken();
    if (!token) return;
    const base = origin || process.env.SITE_URL || "https://yourcosmicblueprint.lovable.app";
    void fetch(new URL("/api/public/deliveries/process", base).toString(), {
      method: "POST",
      headers: { "content-type": "application/json", "x-cron-token": token },
      body: "{}",
    }).catch((e) => console.error("[delivery] wake failed", e));
  } catch (e) {
    console.error("[delivery] wake failed", e);
  }
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

async function fallbackChart(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_generated_reports")
    .select("chart_snapshot")
    .eq("user_id", userId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const snap = data?.chart_snapshot as Record<string, unknown> | null | undefined;
  return snap && Array.isArray(snap.bodies) ? snap : null;
}

/** Processes at most one delivery. Returns false when the queue is empty. */
export async function processNextDelivery(): Promise<boolean> {
  const { data: claimed, error } = await supabaseAdmin.rpc("claim_report_delivery");
  if (error) throw new Error(error.message);
  const job = (claimed as Array<Record<string, any>> | null)?.[0];
  if (!job) return false;

  try {
    const { REPORTS } = await import("@/lib/astrology/reports-catalog");
    const def = REPORTS.find((r) => r.id === job.report_id);
    if (!def) throw new Error(`Unknown report ${job.report_id}`);

    let pdfPath: string | null = job.pdf_path;
    if (!pdfPath) {
      const chart = (job.chart_snapshot as Record<string, unknown> | null) ?? (await fallbackChart(job.user_id));
      if (!chart) throw new Error("No calculated birth chart is saved for this customer.");
      const partner = job.partner_snapshot as Record<string, unknown> | null;
      if (def.requiresPartner && !partner) throw new Error("This report needs a partner chart that was not provided at checkout.");

      const { generateReportMarkdown } = await import("@/lib/astrology/generate-report-core.server");
      const payload = await generateReportMarkdown({
        reportId: job.report_id,
        chart: chart as never,
        partnerChart: (partner ?? undefined) as never,
      });
      const { buildLuxuryReportPdfBytes } = await import("@/lib/astrology/luxury-pdf");
      const bytes = buildLuxuryReportPdfBytes(payload, chart as never, (partner ?? null) as never);

      pdfPath = `${job.user_id}/purchase-${job.stripe_session_id}-${job.report_id}.pdf`;
      const { error: upErr } = await supabaseAdmin.storage
        .from("report-pdfs")
        .upload(pdfPath, bytes, { contentType: "application/pdf", upsert: true });
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
      await supabaseAdmin.from("report_deliveries").update({ pdf_path: pdfPath }).eq("id", job.id);
    }

    if (!job.email_sent_at) {
      const { data: purchase } = await supabaseAdmin
        .from("report_purchases")
        .select("id, customer_email, amount_cents, currency, created_at")
        .eq("stripe_session_id", job.stripe_session_id)
        .maybeSingle();
      if (!purchase?.customer_email) throw new Error("No customer email on the purchase.");
      const { data: signed, error: sErr } = await supabaseAdmin.storage
        .from("report-pdfs")
        .createSignedUrl(pdfPath, LINK_TTL_SECONDS);
      if (sErr || !signed?.signedUrl) throw new Error(`Signed link failed: ${sErr?.message ?? "none"}`);

      const { sendReportReadyEmail } = await import("@/lib/email/service.server");
      const res = await sendReportReadyEmail({
        to: purchase.customer_email,
        reportTitle: def.title,
        downloadUrl: signed.signedUrl,
        order: {
          orderId: purchase.id,
          amount: formatMoney(purchase.amount_cents, purchase.currency),
          date: new Date(purchase.created_at).toLocaleDateString("en-US", { dateStyle: "long" }),
        },
      });
      if (res && typeof res === "object" && "ok" in res && !res.ok) throw new Error("Report email delivery failed.");
      await supabaseAdmin.from("report_deliveries").update({ email_sent_at: new Date().toISOString() }).eq("id", job.id);
    }

    await supabaseAdmin
      .from("report_deliveries")
      .update({ status: "sent", last_error: null, locked_at: null })
      .eq("id", job.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const attempts = Number(job.attempts) || 1;
    console.error("[delivery] failed", { id: job.id, report: job.report_id, attempts, msg });
    await supabaseAdmin
      .from("report_deliveries")
      .update({
        status: attempts >= MAX_ATTEMPTS ? "failed" : "retry",
        last_error: msg.slice(0, 1000),
        locked_at: null,
        next_attempt_at: new Date(Date.now() + retryDelayMs(attempts)).toISOString(),
      })
      .eq("id", job.id);
  }
  return true;
}
