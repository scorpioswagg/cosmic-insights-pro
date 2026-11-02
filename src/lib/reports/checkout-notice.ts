import { z } from "zod";

export const INITIAL_CHECKOUT_MESSAGE = "Checkout is temporarily unavailable while we update our payment processing system. The Cosmic Blueprint website and its other features remain available. We appreciate your patience and look forward to welcoming you back to checkout soon.";
export const checkoutNoticeSchema = z.object({
  enabled: z.boolean(),
  message: z.string().trim().min(1, "Enter a customer message.").max(1000, "Use at most 1,000 characters."),
  scope: z.enum(["site-wide", "report-checkout-only"]),
}).strict();
export type CheckoutNoticeSettings = z.infer<typeof checkoutNoticeSchema>;
export const DEFAULT_CHECKOUT_NOTICE: CheckoutNoticeSettings = {
  enabled: true, message: INITIAL_CHECKOUT_MESSAGE, scope: "report-checkout-only",
};

export function showsCheckoutNotice(settings: CheckoutNoticeSettings, surface: "site-wide" | "report-checkout-only") {
  return settings.enabled && settings.scope === surface;
}

// Scope controls placement, never whether new checkout is paused.
export function assertNewCheckoutAllowed(settings: CheckoutNoticeSettings) {
  if (settings.enabled) throw new Error(settings.message);
}

export async function requireNoticeAdmin(isAdmin: () => Promise<boolean>) {
  if (!(await isAdmin())) throw new Error("Forbidden");
}