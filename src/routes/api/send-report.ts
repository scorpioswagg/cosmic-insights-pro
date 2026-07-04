import { createFileRoute } from "@tanstack/react-router";
import { Resend } from "resend";
import { z } from "zod";

const BodySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  reportType: z.string().min(1).max(200),
  pdfUrl: z.string().url().optional(),
});

const FROM_ADDRESS = "Cosmic Blueprint <reports@mycosmicblueprint.online>";

export const Route = createFileRoute("/api/send-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = process.env.RESEND_API_KEY;
          if (!apiKey) {
            console.error("[send-report] Missing RESEND_API_KEY");
            return Response.json(
              { success: false, error: "Email service not configured" },
              { status: 500 },
            );
          }

          let json: unknown;
          try {
            json = await request.json();
          } catch {
            return Response.json(
              { success: false, error: "Invalid JSON body" },
              { status: 400 },
            );
          }

          const parsed = BodySchema.safeParse(json);
          if (!parsed.success) {
            return Response.json(
              { success: false, error: "Invalid input", issues: parsed.error.flatten() },
              { status: 400 },
            );
          }
          const { name, email, reportType, pdfUrl } = parsed.data;

          const attachments: { filename: string; content: string }[] = [];
          if (pdfUrl) {
            try {
              const res = await fetch(pdfUrl);
              if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
              const buf = new Uint8Array(await res.arrayBuffer());
              let binary = "";
              for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
              const base64 = btoa(binary);
              const safeName = reportType.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
              attachments.push({ filename: `${safeName}.pdf`, content: base64 });
            } catch (err) {
              console.error("[send-report] Failed to fetch PDF attachment", err);
              return Response.json(
                { success: false, error: "Failed to fetch PDF attachment" },
                { status: 502 },
              );
            }
          }

          const subject = `Your ${reportType} — Cosmic Blueprint`;
          const html = `
            <div style="font-family:Georgia,serif;color:#1a1a2e;max-width:600px;margin:0 auto;padding:32px;">
              <h1 style="color:#b8860b;font-size:24px;margin-bottom:16px;">Your Cosmic Blueprint Report</h1>
              <p>Dear ${escapeHtml(name)},</p>
              <p>Thank you for your purchase. Your <strong>${escapeHtml(reportType)}</strong> is ready.</p>
              ${pdfUrl ? `<p>Your report is attached to this email. You can also download it here: <a href="${escapeHtml(pdfUrl)}" style="color:#b8860b;">Download PDF</a></p>` : ""}
              <p style="margin-top:24px;">With gratitude,<br/>The Cosmic Blueprint Team</p>
            </div>
          `;

          const resend = new Resend(apiKey);
          const { data, error } = await resend.emails.send({
            from: FROM_ADDRESS,
            to: [email],
            subject,
            html,
            attachments: attachments.length ? attachments : undefined,
          });

          if (error) {
            console.error("[send-report] Resend error", error);
            return Response.json(
              { success: false, error: error.message ?? "Email delivery failed" },
              { status: 502 },
            );
          }

          console.log("[send-report] Sent", { id: data?.id, to: email, reportType });
          return Response.json({ success: true, id: data?.id });
        } catch (err) {
          console.error("[send-report] Unhandled error", err);
          return Response.json(
            { success: false, error: "Internal server error" },
            { status: 500 },
          );
        }
      },
    },
  },
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}