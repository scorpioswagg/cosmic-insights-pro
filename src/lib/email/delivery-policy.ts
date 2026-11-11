/** Resend retains keys for 24h; stop automatic replay at 23h to allow clock/network margin. */
export const SAFE_REPLAY_MS = 23 * 60 * 60 * 1000;
export const EMAIL_RETRY_MS = 5 * 60 * 1000;
export const SUPPORT_EMAIL = "oracle@mycosmicblueprint.online";

export function emailKey(template: string, orderId: string, reportId: string): string {
  return `${template}:${encodeURIComponent(orderId)}:${encodeURIComponent(reportId)}`;
}

export function replayDecision(row: { resend_id?: string | null; status: string; first_attempt_at?: string | null; next_attempt_at?: string | null }, now = Date.now()) {
  if (row.resend_id) return "sent";
  if (row.status === "requires_attention") return "attention";
  if (row.first_attempt_at && now - Date.parse(row.first_attempt_at) >= SAFE_REPLAY_MS) return "attention";
  if (row.next_attempt_at && Date.parse(row.next_attempt_at) > now) return "wait";
  return "send";
}

/** Never carry raw provider messages (which may echo private inputs) into alerts/logs. */
export function safeFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/requires_attention|reconciliation/i.test(message)) return "Email requires provider reconciliation before retry.";
  if (/email|resend|receipt/i.test(message)) return "Email delivery failed or provider response is uncertain.";
  if (/partner chart/i.test(message)) return "Required partner chart is unavailable.";
  if (/chart/i.test(message)) return "Calculated chart is unavailable or report generation failed.";
  if (/upload|storage|signed link/i.test(message)) return "Private PDF storage or download link creation failed.";
  return "Fulfillment operation failed; inspect administrator delivery records.";
}

export function retryDelayMs(attempts: number): number {
  return Math.min(60 * 60 * 1000, 2 ** Math.max(0, attempts - 1) * 2 * 60 * 1000);
}
export function retryStatus(attempts: number, attention = false) {
  return attention || attempts >= 5 ? "failed" : "retry";
}
export function deliveryLabel(row: { status: string; pdf_path?: string | null; email_sent_at?: string | null; attempts: number }) {
  if (row.email_sent_at) return "email_sent";
  if (row.status === "failed" || row.attempts >= 5) return "delivery_failed / requires_attention";
  if (row.pdf_path) return "report_ready";
  if (row.status === "generating") return "report_generating";
  if (row.status === "awaiting_payment") return "awaiting_payment";
  return "payment_received";
}