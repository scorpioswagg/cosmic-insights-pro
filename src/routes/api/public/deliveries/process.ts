import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/deliveries/process")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get("x-cron-token") ?? "";
        const { getProcessorToken, processNextDelivery, wakeDeliveryProcessor } = await import(
          "@/lib/reports/delivery.server"
        );
        const expected = await getProcessorToken();
        if (!expected || provided.length !== expected.length || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        let worked = false;
        try {
          worked = await processNextDelivery();
        } catch (e) {
          console.error("[delivery] processor error", e);
          return new Response("Processor error", { status: 500 });
        }
        // Chain to the next queued delivery (e.g. the rest of a gift set).
        if (worked) await wakeDeliveryProcessor(new URL(request.url).origin);
        return Response.json({ processed: worked });
      },
    },
  },
});
