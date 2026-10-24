import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { REPORTS } from "@/lib/astrology/reports-catalog";
import { defaultPriceCents } from "./pricing";
import { catalogPriceFor } from "./catalog-pricing";

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

function productFromDef(
  r: (typeof REPORTS)[number],
  index: number,
): ReportProduct {
  const price = catalogPriceFor(r.id, defaultPriceCents(r));
  return {
    id: r.id,
    title: r.title,
    tagline: r.tagline,
    category: r.category,
    icon: r.icon,
    adult: !!r.adult,
    price_cents: price.price_cents,
    is_free: price.is_free,
    is_published: price.is_published,
    sort_order: index,
  };
}

/** Only insert missing code-catalog rows; never overwrite admin free/published/price. */
async function ensureCatalogSeeded(): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing, error: readErr } = await supabaseAdmin
      .from("report_products")
      .select("id");
    if (readErr) {
      console.error("[ensureCatalogSeeded] read", readErr.message);
      return;
    }
    const known = new Set((existing ?? []).map((r) => r.id));
    const missing = REPORTS.filter((r) => !known.has(r.id)).map((r) => {
      const price = catalogPriceFor(r.id, defaultPriceCents(r));
      return {
        id: r.id,
        title: r.title,
        tagline: r.tagline,
        category: r.category,
        icon: r.icon,
        adult: !!r.adult,
        price_cents: price.price_cents,
        is_free: price.is_free,
        is_published: price.is_published,
        sort_order: Math.max(0, REPORTS.findIndex((x) => x.id === r.id)),
        slug: r.id,
      };
    });
    if (missing.length === 0) return;
    const { error } = await supabaseAdmin.from("report_products").insert(missing);
    if (error) console.error("[ensureCatalogSeeded]", error.message);
    else console.log(`[ensureCatalogSeeded] inserted ${missing.length} products`);
  } catch (err) {
    console.error("[ensureCatalogSeeded] failed", err);
  }
}

export const listPublishedReports = createServerFn({ method: "GET" }).handler(async () => {
  await ensureCatalogSeeded();

  const { data, error } = await publicClient()
    .from("report_products")
    .select(SELECT_COLS)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[listPublishedReports]", error.message);
    return REPORTS.map((r, i) => productFromDef(r, i));
  }

  const byId = new Map((data ?? []).map((p) => [p.id, p as ReportProduct]));
  const codeIds = new Set(REPORTS.map((r) => r.id));
  const fromCode: ReportProduct[] = REPORTS.map((r, i) => {
    const db = byId.get(r.id);
    if (db) return db;
    return productFromDef(r, i);
  }).filter((p) => p.is_published);

  const dbOnly = (data ?? [])
    .filter((p) => !codeIds.has(p.id))
    .map((p) => p as ReportProduct);

  return [...fromCode, ...dbOnly];
});

function claimEmail(context: { claims?: unknown }): string | null {
  const email = (context.claims as { email?: unknown } | undefined)?.email;
  return typeof email === "string" ? email : null;
}

async function assertAdmin(context: { userId: string; claims?: unknown }) {
  const { isAdminUser } = await import("@/lib/reports/access.server");
  if (!(await isAdminUser(context.userId, claimEmail(context)))) throw new Error("Forbidden");
}

export const getIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isAdminUser } = await import("@/lib/reports/access.server");
    return { isAdmin: await isAdminUser(context.userId, claimEmail(context)) };
  });

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

export const syncReportCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);

    const { data: existing, error: readErr } = await context.supabase
      .from("report_products")
      .select("id");
    if (readErr) throw new Error(readErr.message);
    const known = new Set((existing ?? []).map((r) => r.id));

    const inserts = REPORTS.filter((r) => !known.has(r.id)).map((r) => {
      const price = catalogPriceFor(r.id, defaultPriceCents(r));
      return {
        id: r.id,
        title: r.title,
        tagline: r.tagline,
        category: r.category,
        icon: r.icon,
        adult: !!r.adult,
        price_cents: price.price_cents,
        is_free: price.is_free,
        is_published: price.is_published,
        sort_order: Math.max(0, REPORTS.findIndex((x) => x.id === r.id)),
        slug: r.id,
      };
    });

    if (inserts.length > 0) {
      const { error } = await context.supabase.from("report_products").insert(inserts);
      if (error) throw new Error(error.message);
    }

    let updated = 0;
    for (const r of REPORTS) {
      const price = catalogPriceFor(r.id, defaultPriceCents(r));
      const patch = {
        title: r.title,
        tagline: r.tagline,
        category: r.category,
        icon: r.icon,
        adult: !!r.adult,
        price_cents: price.price_cents,
        is_free: price.is_free,
        is_published: price.is_published,
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
    if (patch.is_free === true) (patch as { price_cents?: number }).price_cents = 0;
    const { error } = await context.supabase
      .from("report_products")
      .update(patch)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
