import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { checkoutNoticeSchema, assertNewCheckoutAllowed } from "./checkout-notice";

export async function readCheckoutNotice() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Checkout settings are unavailable. Please try again shortly.");
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  const { data, error } = await client.from("checkout_notice_settings")
    .select("enabled, message, scope").eq("id", true).single();
  if (error || !data) throw new Error("Checkout settings are unavailable. Please try again shortly.");
  return checkoutNoticeSchema.parse(data);
}

export async function assertCheckoutAvailable() {
  // No cache: every initiation checks current settings; read failures fail closed.
  assertNewCheckoutAllowed(await readCheckoutNotice());
}