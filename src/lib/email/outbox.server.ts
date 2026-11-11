import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { replayDecision } from "./delivery-policy";

export interface EmailPayload { from: string; to: string[]; subject: string; html: string }
export type OutboxResult = { ok: true; id: string | undefined; logId: string | null } | { ok: false; error: string; logId: string | null };

/** Atomic database claim plus immutable payload: concurrent invocations cannot change a retry's signed URL. */
export async function sendStableEmail(args: {
  key: string; template: string; name?: string; payload: EmailPayload;
  send: (payload: EmailPayload, key: string) => Promise<{ data: { id: string } | null; error: unknown }>;
}): Promise<OutboxResult> {
  const db = supabaseAdmin;
  const { error: insertError } = await db.from("email_outbox").upsert({
    idempotency_key: args.key, template_name: args.template, payload: args.payload as unknown as Json,
  }, { onConflict: "idempotency_key", ignoreDuplicates: true });
  if (insertError) return { ok: false, error: "Email persistence failed; no send attempted.", logId: null };
  const { data: row, error: readError } = await db.from("email_outbox").select("*").eq("idempotency_key", args.key).single();
  if (readError || !row) return { ok: false, error: "Email persistence unavailable; no send attempted.", logId: null };
  const decision = replayDecision(row);
  if (decision === "sent") return { ok: true, id: row.resend_id ?? undefined, logId: row.id };
  if (decision === "attention") {
    await db.from("email_outbox").update({ status: "requires_attention" }).eq("id", row.id);
    await db.from("email_send_log").update({ status: "requires_attention", error_message: "Provider reconciliation required; automatic replay stopped." }).eq("id", row.id);
    return { ok: false, error: "requires_attention: provider reconciliation required.", logId: row.id };
  }
  if (decision === "wait") return { ok: false, error: "Email retry deferred for provider reconciliation.", logId: row.id };
  const { data: claims, error: claimError } = await db.rpc("claim_outbox_email", { email_key: args.key });
  const claimed = claims?.[0];
  if (claimError || !claimed) return { ok: false, error: "Email already being processed; retry later.", logId: row.id };
  const payload = claimed.payload as unknown as EmailPayload;
  const { error: logError } = await db.from("email_send_log").upsert({
    id: row.id, template_name: args.template, recipient_email: payload.to[0], recipient_name: args.name ?? null,
    status: "pending", attempts: claimed.attempts, message_id: args.key,
  }, { onConflict: "id", ignoreDuplicates: true });
  if (logError) return { ok: false, error: "Email audit persistence failed; no send attempted.", logId: row.id };
  try {
    const response = await args.send(payload, args.key);
    if (response.error || !response.data?.id) throw new Error("Provider send was not confirmed.");
    const { error: saved } = await db.from("email_outbox").update({ status: "sent", resend_id: response.data.id, updated_at: new Date().toISOString() }).eq("id", row.id);
    // If this write fails, the same payload/key is replayed inside the safe provider window.
    if (saved) return { ok: false, error: "Provider response uncertain; retry with the same key only.", logId: row.id };
    await db.from("email_send_log").update({ status: "sent", attempts: claimed.attempts, resend_id: response.data.id, error_message: null }).eq("id", row.id);
    return { ok: true, id: response.data.id, logId: row.id };
  } catch {
    await db.from("email_outbox").update({ status: "uncertain" }).eq("id", row.id);
    await db.from("email_send_log").update({ status: "uncertain", attempts: claimed.attempts, error_message: "Provider send not confirmed; only stable-key replay is permitted." }).eq("id", row.id);
    return { ok: false, error: "Email provider send not confirmed; retry deferred with stable key.", logId: row.id };
  }
}