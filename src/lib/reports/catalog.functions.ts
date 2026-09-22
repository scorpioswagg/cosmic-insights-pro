import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { REPORTS } from "@/lib/astrology/reports-catalog";
import { defaultPriceCents } from "./pricing";

export interface ReportProduct {
  id: string;
  title: string;
  tagline: string;
  category: string;
  icon: string;
  adult: boolean;
  price_cents: number;
  is_free: boolean;
  is_published: boolean;
  sort_order: number;
}

const SELECT_COLS =
  "id, title, tagline, category, icon, adult, price_cents, is_free, is_published, sort_order";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

/** Build a published product row from the code catalog definition. */
function productFromDef(
  r: (typeof REPORTS)[number],
  index: number,
): ReportProduct {
  return {
    id: r.id,
    title: r.title,
    tagline: r.tagline,
    category: r.category,
    icon: r.icon,
    adult: !!r.adult,
    price_cents: 0, // temporarily free for everyone
    is_free: true,
    is_published: true,
    sort_order: index,
  };
}

/**
 * Ensure every report in the code catalog exists in report_products.
 * Missing rows are upserted via service role so generate buttons always
 * have real product IDs (including all 18 Unfiltered Series).
 */
async function ensureCatalogSeeded(): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.from("report_products").select("id");
    const known = new Set((existing ?? []).map((r) => r.id));
    const missing = REPORTS.filter((r) => !known.has(r.id));
    if (missing.length === 0) return;

    const rows = missing.map((r, i) => ({
      id: r.id,
      title: r.title,
      tagline: r.tagline,
      category: r.category,
      icon: r.icon,
      adult: !!r.adult,
      price_cents: 0,
      is_free: true,
      is_published: true,
      sort_order: Math.max(0, REPORTS.findIndex((x) => x.id === r.id)),
      slug: r.id,
    }));
    const { error } = await supabaseAdmin.from("report_products").upsert(rows, {
      onConflict: "id",
    });
    if (error) console.error("[ensureCatalogSeeded]", error.message);
    else console.log(`[ensureCatalogSeeded] inserted/updated ${rows.length} products`);
  } catch (err) {
    console.error("[ensureCatalogSeeded] failed", err);
  }
}

/** Published catalog — always includes the full code catalog. */
export const listPublishedReports = createServerFn({ method: "GET" }).handler(async () => {
  // Best-effort seed so Unfiltered Series + synastry products exist in DB.
  await ensureCatalogSeeded();

  const { data, error } = await publicClient()
    .from("report_products")
    .select(SELECT_COLS)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[listPublishedReports]", error.message);
    // Fall back entirely to code catalog so the UI never goes empty.
    return REPORTS.map((r, i) => productFromDef(r, i));
  }

  const byId = new Map((data ?? []).map((p) => [p.id, p as ReportProduct]));

  // Merge: every code-catalog report appears, preferring DB metadata when present.
  const merged: ReportProduct[] = REPORTS.map((r, i) => {
    const db = byId.get(r.id);
    if (db) {
      return {
        ...db,
        // Force free while ALL_REPORTS_FREE is on
        is_free: true,
        price_cents: 0,
        is_published: true,
      };
    }
    return productFromDef(r, i);
  });

  return merged;
});

function claimEmail(context: { claims?: unknown }): string | null {
  const email = (context.claims as { email?: unknown } | undefined)?.email;
  return typeof email === "string" ? email : null;
}

async function assertAdmin(context: { userId: string; claims?: unknown }) {
  const { isAdminUser } = await import("@/lib/reports/access.server");
  if (!(await isAdminUser(context.userId, claimEmail(context)))) throw new Error("Forbidden");
}

/** Whether the signed-in caller is an admin (admins get every report free). */
export const getIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isAdminUser } = await import("@/lib/reports/access.server");
    return { isAdmin: await isAdminUser(context.userId, claimEmail(context)) };
  });

/** Full catalog including unpublished rows. Admin only. */
export const listAllReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    await ensureCatalogSeeded();
    const { data, error } = await context.supabase
      .from("report_products")
      .select(SELECT_COLS)
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as ReportProduct[];
  });

/**
 * Upserts every report in the code catalog into the database.
 * - New rows: free + published (temporary free period).
 * - Existing rows: refresh presentation fields.
 * - Unfiltered Series rows: published.
 */
export const syncReportCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);

    const { data: existing, error: readErr } = await context.supabase
      .from("report_products")
      .select("id");
    if (readErr) throw new Error(readErr.message);
    const known = new Set((existing ?? []).map((r) => r.id));

    const inserts = REPORTS.filter((r) => !known.has(r.id)).map((r) => ({
      id: r.id,
      title: r.title,
      tagline: r.tagline,
      category: r.category,
      icon: r.icon,
      adult: !!r.adult,
      price_cents: 0,
      is_free: true,
      is_published: true,
      sort_order: Math.max(0, REPORTS.findIndex((x) => x.id === r.id)),
      slug: r.id,
    }));

    if (inserts.length > 0) {
      const { error } = await context.supabase.from("report_products").insert(inserts);
      if (error) throw new Error(error.message);
    }

    let updated = 0;
    for (const r of REPORTS) {
      const patch: {
        title: string;
        tagline: string;
        category: string;
        icon: string;
        adult: boolean;
        price_cents?: number;
        is_free?: boolean;
        is_published?: boolean;
      } = {
        title: r.title,
        tagline: r.tagline,
        category: r.category,
        icon: r.icon,
        adult: !!r.adult,
        price_cents: 0,
        is_free: true,
        is_published: true,
      };
      const { error } = await context.supabase
        .from("report_products")
        .update(patch)
        .eq("id", r.id);
      if (error) throw new Error(error.message);
      updated += 1;
    }

    return {
      inserted: inserts.length,
      added: inserts.length,
      updated,
      unfiltered: REPORTS.filter((r) => r.category === "Unfiltered Series").length,
      total: REPORTS.length,
    };
  });

/** Export catalog rows as a Stripe-ready CSV (admin). */
export const exportStripeCatalogCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ unfilteredOnly: z.boolean().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const unfilteredOnly = !!data?.unfilteredOnly;

    const { data: rows, error } = await context.supabase
      .from("report_products")
      .select(
        "id, title, tagline, category, price_cents, currency, is_free, is_published, stripe_product_id, stripe_price_id",
      )
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);

    const filtered = (rows ?? []).filter((r) =>
      unfilteredOnly ? r.category === "Unfiltered Series" : true,
    );

    const esc = (s: string | null | undefined) => {
      const v = (s ?? "").replace(/"/g, '""');
      return `"${v}"`;
    };

    const header = [
      "report_id",
      "name",
      "description",
      "category",
      "price_usd",
      "price_cents",
      "currency",
      "is_free",
      "is_published",
      "stripe_product_id",
      "stripe_price_id",
    ].join(",");

    const lines = filtered.map((r) =>
      [
        esc(r.id),
        esc(r.title),
        esc(r.tagline),
        esc(r.category),
        (r.price_cents / 100).toFixed(2),
        String(r.price_cents),
        esc(r.currency ?? "usd"),
        r.is_free ? "true" : "false",
        r.is_published ? "true" : "false",
        esc(r.stripe_product_id),
        esc(r.stripe_price_id),
      ].join(","),
    );

    return {
      filename: unfilteredOnly
        ? "cosmic-blueprint-unfiltered-stripe-catalog.csv"
        : "cosmic-blueprint-stripe-catalog.csv",
      csv: [header, ...lines].join("\n") + "\n",
      count: filtered.length,
    };
  });

const UpdateSchema = z.object({
  id: z.string().min(1).max(64),
  price_cents: z.number().int().min(0).max(100000).optional(),
  is_free: z.boolean().optional(),
  is_published: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(10000).optional(),
});

export const updateReportProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { id, ...patch } = data;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase
      .from("report_products")
      .update(patch)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
