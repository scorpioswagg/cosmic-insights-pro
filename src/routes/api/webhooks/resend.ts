import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";
import type { Database, Json } from "@/integrations/supabase/types";

// Resend webhooks are signed via Svix.
// Headers: svix-id, svix-timestamp, svix-signature ("v1,<base64sig> v1,<base64sig>")
// Signed payload: `${svix_id}.${svix_timestamp}.${rawBody}`
// Secret: `whsec_<base64>` — decode the base64 portion for the HMAC key.
function verifySvix(opts: {
  secret: string;
  svixId: string;
  svixTimestamp: string;
  svixSignature: string;
  rawBody: string;
}): boolean {
  const { secret, svixId, svixTimestamp, svixSignature, rawBody } = opts;
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  // Reject timestamps older than 5 minutes to prevent replay.
  const ts = Number(svixTimestamp);
  if (!Number.isFinite(ts)) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > 60 * 5) return false;

  const secretB64 = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  let keyBytes: Buffer;
  try {
    keyBytes = Buffer.from(secretB64, "base64");
  } catch {
    return false;
  }
  const signedPayload = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = createHmac("sha256", keyBytes).update(signedPayload).digest("base64");
  const expectedBuf = Buffer.from(expected);

  const parts = svixSignature.split(" ");
  for (const part of parts) {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) continue;
    const sigBuf = Buffer.from(sig);
    if (sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)) {
      return true;
    }
  }
  return false;
}

// Map Resend event type -> row status in email_send_log.
function statusFromEvent(eventType: string): string | null {
  switch (eventType) {
    case "email.sent":
    case "email.delivery_delayed":
      return "sent";
    case "email.delivered":
      return "delivered";
    case "email.opened":
      return "opened";
    case "email.clicked":
      return "clicked";
    case "email.bounced":
      return "bounced";
    case "email.complained":
      return "complained";
    case "email.failed":
      return "failed";
    default:
      return null;
  }
}

// Ordering so a late "sent" webhook doesn't overwrite "delivered".
const STATUS_RANK: Record<string, number> = {
  pending: 0,
  sent: 1,
  delivery_delayed: 1,
  delivered: 2,
  opened: 3,
  clicked: 4,
  bounced: 5,
  complained: 5,
  failed: 5,
};

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const Route = createFileRoute("/api/webhooks/resend")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.RESEND_WEBHOOK_SECRET;
        if (!secret) {
          console.error("[resend-webhook] RESEND_WEBHOOK_SECRET not configured");
          return new Response("Server misconfigured", { status: 500 });
        }

        const rawBody = await request.text();
        const svixId = request.headers.get("svix-id") ?? "";
        const svixTimestamp = request.headers.get("svix-timestamp") ?? "";
        const svixSignature = request.headers.get("svix-signature") ?? "";

        const verified = verifySvix({
          secret,
          svixId,
          svixTimestamp,
          svixSignature,
          rawBody,
        });
        if (!verified) {
          console.warn("[resend-webhook] signature verification failed", { svixId });
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: {
          type?: string;
          created_at?: string;
          data?: {
            email_id?: string;
            to?: string[] | string;
            subject?: string;
            bounce?: { message?: string; subType?: string };
            click?: { link?: string };
          };
        };
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const eventType = payload.type ?? "";
        const nextStatus = statusFromEvent(eventType);
        const resendId = payload.data?.email_id;

        if (!nextStatus || !resendId) {
          // Ack unknown/irrelevant events so Resend doesn't retry forever.
          return Response.json({ ok: true, ignored: true, type: eventType });
        }

        const db = adminClient();
        if (!db) {
          console.error("[resend-webhook] admin client unavailable");
          return new Response("Server misconfigured", { status: 500 });
        }

        const { data: row, error: fetchErr } = await db
          .from("email_send_log")
          .select("id, status, metadata")
          .eq("resend_id", resendId)
          .maybeSingle();

        if (fetchErr) {
          console.error("[resend-webhook] lookup failed", fetchErr);
          return new Response("Lookup failed", { status: 500 });
        }
        if (!row) {
          // Ack — nothing to update, but not an error worth retrying.
          console.warn("[resend-webhook] no log row for resend_id", resendId);
          return Response.json({ ok: true, unmatched: true });
        }

        const currentRank = STATUS_RANK[row.status] ?? 0;
        const nextRank = STATUS_RANK[nextStatus] ?? 0;
        const shouldAdvance = nextRank >= currentRank;

        const prevMeta =
          row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
            ? (row.metadata as Record<string, unknown>)
            : {};
        const events = Array.isArray((prevMeta as { events?: unknown }).events)
          ? ((prevMeta as { events: unknown[] }).events as unknown[])
          : [];
        const nextMeta: Record<string, unknown> = {
          ...prevMeta,
          events: [
            ...events,
            {
              type: eventType,
              at: payload.created_at ?? new Date().toISOString(),
              ...(payload.data?.bounce ? { bounce: payload.data.bounce } : {}),
              ...(payload.data?.click ? { click: payload.data.click } : {}),
            },
          ],
        };

        const patch: {
          metadata: Json;
          updated_at: string;
          status?: string;
          error_message?: string | null;
        } = {
          metadata: nextMeta as Json,
          updated_at: new Date().toISOString(),
        };
        if (shouldAdvance) patch.status = nextStatus;
        if (nextStatus === "bounced" || nextStatus === "failed") {
          patch.error_message =
            payload.data?.bounce?.message ?? `Resend event: ${eventType}`;
        }

        const { error: updateErr } = await db
          .from("email_send_log")
          .update(patch)
          .eq("id", row.id);

        if (updateErr) {
          console.error("[resend-webhook] update failed", updateErr);
          return new Response("Update failed", { status: 500 });
        }

        return Response.json({ ok: true, id: row.id, status: patch.status ?? row.status });
      },
    },
  },
});