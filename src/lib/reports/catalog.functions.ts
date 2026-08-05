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
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

/** Whether the signed-in caller is an admin (admins get every report free). */
export const getIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) throw new Error(error.message);
    return { isAdmin: !!data };
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
 * Upserts every report in the code catalog into the database, filling in
 * default prices. Existing rows keep their admin-set price/visibility.
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

    const inserts = REPORTS.filter((r) => !known.has(r.id)).map((r, i) => ({
      id: r.id,
      title: r.title,
      tagline: r.tagline,
      category: r.category,
      icon: r.icon,
      adult: !!r.adult,
      price_cents: defaultPriceCents(r),
      is_free: false,
      is_published: true,
      sort_order: REPORTS.findIndex((x) => x.id === r.id) + i * 0,
    }));

    if (inserts.length > 0) {
      const { error } = await context.supabase.from("report_products").insert(inserts);
      if (error) throw new Error(error.message);
    }

    // Keep presentation fields in sync with code for rows that already exist.
    for (const r of REPORTS) {
      if (!known.has(r.id)) continue;
      await context.supabase
        .from("report_products")
        .update({
          title: r.title,
          tagline: r.tagline,
          category: r.category,
          icon: r.icon,
          adult: !!r.adult,
        })
        .eq("id", r.id);
    }

    return { added: inserts.length, total: REPORTS.length };
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