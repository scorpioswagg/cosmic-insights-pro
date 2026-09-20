import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
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

/** Published catalog — safe for anonymous visitors. */
export const listPublishedReports = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("report_products")
    .select(SELECT_COLS)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ReportProduct[];
});

async function assertAdmin(context: { supabase: ReturnType<typeof publicClient>; userId: string }) {
  const { isAdminUser } = await import("@/lib/reports/access.server");
  if (!(await isAdminUser(context.userId))) throw new Error("Forbidden");
}

/** Whether the signed-in caller is an admin (admins get every report free). */
export const getIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isAdminUser } = await import("@/lib/reports/access.server");
    const isAdmin = await isAdminUser(context.userId);
    return { isAdmin };
  });

/** Full catalog including unpublished rows. Admin only. */
export const listAllReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
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
 * Admin only. Used by the Admin → Reports "Sync catalog" action.
 */
export const syncReportCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const rows = REPORTS.map((r, i) => ({
      id: r.id,
      title: r.title,
      tagline: r.tagline,
      category: r.category,
      icon: r.icon,
      adult: !!r.adult,
      price_cents: defaultPriceCents(r),
      is_free: false,
      is_published: true,
      slug: r.id,
      sort_order: i,
    }));

    const { error } = await supabaseAdmin.from("report_products").upsert(rows, {
      onConflict: "id",
    });
    if (error) throw new Error(error.message);
    return { upserted: rows.length };
  });

/** Export published paid products as a Stripe CSV (admin). */
export const exportStripeCatalogCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("report_products")
      .select("id, title, tagline, price_cents, currency, is_free, is_published, stripe_price_id")
      .eq("is_published", true)
      .eq("is_free", false)
      .gt("price_cents", 0)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);

    const header = ["id", "title", "tagline", "price_cents", "currency", "stripe_price_id"];
    const lines = [header.join(",")];
    for (const row of data ?? []) {
      const cells = [
        row.id,
        JSON.stringify(row.title ?? ""),
        JSON.stringify(row.tagline ?? ""),
        String(row.price_cents ?? 0),
        row.currency ?? "usd",
        row.stripe_price_id ?? "",
      ];
      lines.push(cells.join(","));
    }
    return { csv: lines.join("\n"), count: data?.length ?? 0 };
  });
