import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
 * Resolve the existing Stripe Price assigned to a report. Stripe is the source
 * of truth for live pricing: checkout must never silently create replacement
 * products/prices or change the price a customer is offered.
 */
export async function ensureStripePrice(
  stripe: Stripe,
  row: CatalogRow,
): Promise<string> {
  if (!row.stripe_price_id) {
    throw new Error(
      `Checkout is not configured for "${row.title}" yet. Please contact support while the existing Stripe price is linked.`,
    );
  }

  let existing: Stripe.Price;
  try {
    existing = await stripe.prices.retrieve(row.stripe_price_id);
  } catch {
    throw new Error(
      `The saved Stripe price for "${row.title}" could not be found. No replacement price was created. Please contact support.`,
    );
  }

  if (!existing.active || existing.type !== "one_time") {
    throw new Error(
      `The saved Stripe price for "${row.title}" is inactive or not a one-time price. Please contact support.`,
    );
  }

  // Do not compare against report_products.price_cents: Stripe's existing
  // Price is the source of truth for what the customer will be charged.
  return existing.id;
}
