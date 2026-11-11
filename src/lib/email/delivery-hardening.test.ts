import { describe, it, expect, vi, beforeEach } from "vitest";
import { deliveryLabel, emailKey, replayDecision, retryDelayMs, retryStatus, SAFE_REPLAY_MS, SUPPORT_EMAIL } from "./delivery-policy";

const fixture = vi.hoisted(() => ({ rows: new Map<string, any>(), logs: new Map<string, any>(), sends: [] as any[], error: false }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  from: (table: string) => {
    let key = "";
    const rows = table === "email_outbox" ? fixture.rows : fixture.logs;
    const query: any = {
      upsert: async (data: any) => {
        const id = data.idempotency_key ?? data.id;
        if (!rows.has(id)) rows.set(id, { id: id, status: "pending", attempts: 0, ...data });
        return { error: null };
      },
      select: () => query,
      eq: (_column: string, value: string) => { key = value; return query; },
      single: async () => ({ data: rows.get(key), error: null }),
      update: (data: any) => ({ eq: async (_column: string, value: string) => { const row = rows.get(value); if (row) Object.assign(row, data); return { error: null }; } }),
    };
    return query;
  },
  rpc: async (_name: string, { email_key }: { email_key: string }) => {
    const row = fixture.rows.get(email_key);
    if (!row || replayDecision(row) !== "send") return { data: [], error: null };
    row.attempts += 1;
    row.first_attempt_at ??= new Date().toISOString();
    row.next_attempt_at = new Date(Date.now() + 300000).toISOString();
    row.status = "sending";
    return { data: [structuredClone(row)], error: null };
  },
} }));
vi.mock("resend", () => ({ Resend: class {
  emails = { send: async (payload: any, options: any) => {
    fixture.sends.push({ payload, options });
    if (fixture.error) throw new Error("Uncertain transport");
    return { data: { id: "provider-email-1" }, error: null };
  } };
} }));

import { sendPurchaseReceiptEmail, sendReportReadyEmail, sendDeliveryFailureAlert } from "./service.server";

beforeEach(() => { fixture.rows.clear(); fixture.logs.clear(); fixture.sends.length = 0; fixture.error = false; vi.stubEnv("RESEND_API_KEY", "fixture-only"); });

describe("durable email sending", () => {
  const receipt = { to: "customer@example.test", name: "Alex & River", reportTitle: "Natal", reportId: "natal", orderId: "purchase-1", amountFormatted: "$99.00" };
  it("repeated receipts reuse one provider key and one audit record", async () => {
    await sendPurchaseReceiptEmail(receipt);
    await sendPurchaseReceiptEmail(receipt);
    expect(fixture.sends).toHaveLength(1);
    expect(fixture.sends[0].options.idempotencyKey).toBe("purchase_receipt:purchase-1:natal");
    expect(fixture.logs.size).toBe(1);
  });
  it("includes persisted name and mailto support in both customer emails", async () => {
    await sendPurchaseReceiptEmail(receipt);
    await sendReportReadyEmail({ ...receipt, downloadUrl: "https://example.test/private-link", order: { orderId: "purchase-1", amount: "$99.00", date: "November 11" } });
    for (const { payload } of fixture.sends) {
      expect(payload.html).toContain("Alex &amp; River");
      expect(payload.html).toContain("mailto:oracle@mycosmicblueprint.online");
    }
    expect(fixture.sends[1].payload.html).toContain("active for 7 days");
  });
  it("does not immediately resend an uncertain response and reuses identical signed-link payload", async () => {
    fixture.error = true;
    const args = { to: receipt.to, reportTitle: "Natal", reportId: "natal", downloadUrl: "https://example.test/private-original", order: { orderId: "purchase-1", amount: "$99.00", date: "November 11" } };
    await sendReportReadyEmail(args);
    await sendReportReadyEmail({ ...args, downloadUrl: "https://example.test/different-link" });
    expect(fixture.sends).toHaveLength(1);
    fixture.error = false;
    const row = fixture.rows.get("report_ready:purchase-1:natal");
    row.next_attempt_at = new Date(Date.now() - 1).toISOString();
    await sendReportReadyEmail({ ...args, downloadUrl: "https://example.test/different-link" });
    expect(fixture.sends[1]).toEqual(fixture.sends[0]);
    expect(fixture.logs.size).toBe(1);
  });
  it("blocks replay outside the safe provider retention window", async () => {
    fixture.error = true;
    await sendPurchaseReceiptEmail(receipt);
    const row = fixture.rows.get("purchase_receipt:purchase-1:natal");
    row.first_attempt_at = new Date(Date.now() - SAFE_REPLAY_MS - 1).toISOString();
    const result = await sendPurchaseReceiptEmail(receipt);
    expect(result.ok).toBe(false);
    expect(row.status).toBe("requires_attention");
    expect(fixture.sends).toHaveLength(1);
  });
  it("deduplicates alerts by delivery and failure class and omits unsafe error contents", async () => {
    const args = { orderId: "purchase-1", reportId: "natal", deliveryId: "delivery-1", failureClass: "retry_exhausted", error: new Error("Private snapshot 1990-01-01 https://example.test/signed?token=private") };
    await sendDeliveryFailureAlert(args);
    await sendDeliveryFailureAlert(args);
    expect(fixture.sends).toHaveLength(1);
    expect(fixture.sends[0].payload.to).toEqual([SUPPORT_EMAIL]);
    expect(fixture.sends[0].payload.html).not.toContain("token=private");
    expect(fixture.sends[0].payload.html).not.toContain("1990-01-01");
    expect(fixture.sends[0].payload.html).toContain("/admin/purchases");
    await sendDeliveryFailureAlert({ ...args, failureClass: "report_ready" });
    expect(fixture.sends).toHaveLength(2);
  });
  it("failed alert sends do not recursively alert", async () => {
    fixture.error = true;
    await sendDeliveryFailureAlert({ orderId: "p1", reportId: "r1", failureClass: "enqueue", error: "failed" });
    expect(fixture.sends).toHaveLength(1);
  });
});

describe("retry and display policy", () => {
  it("exhausts after five attempts and stops uncertain replay requiring attention", () => {
    expect(retryStatus(4)).toBe("retry");
    expect(retryStatus(5)).toBe("failed");
    expect(retryStatus(1, true)).toBe("failed");
    expect([1, 2, 3, 4, 5].map(retryDelayMs)).toEqual([120000, 240000, 480000, 960000, 1920000]);
  });
  it("shows concrete delivery states without exposing PDF paths", () => {
    expect(deliveryLabel({ status: "pending", attempts: 0 })).toBe("payment_received");
    expect(deliveryLabel({ status: "generating", attempts: 1 })).toBe("report_generating");
    expect(deliveryLabel({ status: "retry", attempts: 2, pdf_path: "private" })).toBe("report_ready");
    expect(deliveryLabel({ status: "sent", attempts: 1, email_sent_at: "today" })).toBe("email_sent");
    expect(deliveryLabel({ status: "failed", attempts: 5 })).toBe("delivery_failed / requires_attention");
  });
  it("preserves separate keys for each report in a bundle", () => {
    expect(emailKey("report_ready", "p1", "r1")).not.toBe(emailKey("report_ready", "p1", "r2"));
  });
});