/**
 * Canonical list prices from the Cosmic Blueprint Stripe catalog CSV.
 * Source of truth: catalog-pricing.json (generated from cosmic-blueprint-stripe-catalog.csv).
 */
import pricingJson from "./catalog-pricing.json";

export type CatalogPriceRow = {
  price_cents: number;
  is_free: boolean;
  is_published: boolean;
};

export const CATALOG_PRICING = pricingJson as Record<string, CatalogPriceRow>;

export function catalogPriceFor(id: string, fallbackCents: number): CatalogPriceRow {
  const row = CATALOG_PRICING[id];
  if (row) return row;
  return { price_cents: fallbackCents, is_free: fallbackCents <= 0, is_published: true };
}
