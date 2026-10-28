import Stripe from "stripe";

export function stripeSecret(): string {
  // The project secret was originally saved under a misspelled name; support both.
  const key =
    process.env.STRIPE_SECRET_KEY ??
    process.env.SRIPE_API_SECTRET_KEY ??
    process.env.STRIPE_API_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured: missing STRIPE_SECRET_KEY.");
  return key;
}

export function stripeWebhookSecret(): string {
  const key = process.env.STRIPE_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK;
  if (!key) throw new Error("Stripe webhook secret is not configured.");
  return key;
}

export function getStripe(): Stripe {
  return new Stripe(stripeSecret(), {
    apiVersion: "2025-08-27.basil" as Stripe.LatestApiVersion,
    httpClient: Stripe.createFetchHttpClient(),
    timeout: 20_000,
    maxNetworkRetries: 1,
  });
}

export interface CatalogRow {
  id: string;
  title: string;
  tagline: string;
  price_cents: number;
  currency: string;
  is_free: boolean;
  is_published: boolean;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
}

/**
 * Read-only validation: checkout must use a configured Stripe Price.
 * Never create or replace live products/prices during a customer checkout.
 */
export async function ensureStripePrice(
  stripe: Stripe,
  row: CatalogRow,
): Promise<string> {
  if (!row.stripe_price_id) {
    throw new Error(
      "This report is not configured for secure checkout yet. Please contact Cosmic Blueprint support.",
    );
  }

  let existing: Stripe.Price;
  try {
    existing = await stripe.prices.retrieve(row.stripe_price_id);
  } catch {
    throw new Error("We couldn't verify this report's price. Please try again shortly.");
  }

  const productId =
    typeof existing.product === "string" ? existing.product : existing.product.id;
  if (
    !existing.active ||
    existing.type !== "one_time" ||
    existing.unit_amount !== row.price_cents ||
    existing.currency.toLowerCase() !== row.currency.toLowerCase() ||
    (row.stripe_product_id && row.stripe_product_id !== productId)
  ) {
    throw new Error(
      "This report's checkout price needs review. No payment has been started.",
    );
  }

  return existing.id;
}
