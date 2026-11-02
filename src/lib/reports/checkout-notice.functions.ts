import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkoutNoticeSchema, DEFAULT_CHECKOUT_NOTICE, requireNoticeAdmin } from "./checkout-notice";

async function assertAdmin(context: { userId: string; claims?: unknown }) {
  const { isAdminUser } = await import("./access.server");
  const email = (context.claims as { email?: unknown } | undefined)?.email;
  await requireNoticeAdmin(() => isAdminUser(context.userId, typeof email === "string" ? email : null));
}

export const getCheckoutNotice = createServerFn({ method: "GET" }).handler(async () => {
  setResponseHeader("Cache-Control", "no-store");
  const { readCheckoutNotice } = await import("./checkout-notice.server");
  try {
    return { settings: await readCheckoutNotice(), unavailable: false };
  } catch {
    // Never silently enable purchasing when the settings service fails.
    return { settings: DEFAULT_CHECKOUT_NOTICE, unavailable: true };
  }
});

export const getAdminCheckoutNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    setResponseHeader("Cache-Control", "no-store");
    const { readCheckoutNotice } = await import("./checkout-notice.server");
    return readCheckoutNotice();
  });

export const saveCheckoutNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => checkoutNoticeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    setResponseHeader("Cache-Control", "no-store");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: saved, error } = await supabaseAdmin.from("checkout_notice_settings")
      .upsert({ id: true, ...data, updated_at: new Date().toISOString() })
      .select("enabled, message, scope").single();
    if (error || !saved) throw new Error("The notice could not be saved. Your previous settings remain active.");
    return checkoutNoticeSchema.parse(saved);
  });