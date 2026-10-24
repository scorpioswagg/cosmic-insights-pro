import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ReportProduct } from "./catalog.functions";

function claimEmail(context: { claims?: unknown }): string | null {
  const email = (context.claims as { email?: unknown } | undefined)?.email;
  return typeof email === "string" ? email : null;
}

async function assertAdmin(context: { userId: string; claims?: unknown }) {
  const { isAdminUser } = await import("@/lib/reports/access.server");
  if (!(await isAdminUser(context.userId, claimEmail(context)))) throw new Error("Forbidden");
}

const BulkUpdateSchema = z.object({
  ids: z.array(z.string().min(1).max(64)).min(1).max(500),
  is_free: z.boolean().optional(),
  is_published: z.boolean().optional(),
  price_cents: z.number().int().min(0).max(100000).optional(),
});

export const bulkUpdateReportProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BulkUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { ids, ...patch } = data;
    if (Object.keys(patch).length === 0) return { ok: true, updated: 0 };
    if (patch.is_free === true) patch.price_cents = 0;
    const { error, count } = await context.supabase
      .from("report_products")
      .update(patch, { count: "exact" })
      .in("id", ids);
    if (error) throw new Error(error.message);
    return { ok: true, updated: count ?? ids.length };
  });

const CreateSchema = z.object({
  id: z.string().min(2).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase kebab-case ids"),
  title: z.string().min(1).max(200),
  tagline: z.string().min(1).max(500),
  category: z.string().min(1).max(80),
  icon: z.string().max(16).optional(),
  adult: z.boolean().optional(),
  price_cents: z.number().int().min(0).max(100000).optional(),
  is_free: z.boolean().optional(),
  is_published: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(10000).optional(),
});

export const createReportProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const is_free = data.is_free ?? false;
    const price_cents = is_free ? 0 : (data.price_cents ?? 2900);
    const row = {
      id: data.id,
      slug: data.id,
      title: data.title,
      tagline: data.tagline,
      category: data.category,
      icon: data.icon || "✦",
      adult: data.adult ?? (data.category.includes("18+") || data.category === "Unfiltered Series"),
      price_cents,
      is_free,
      is_published: data.is_published ?? false,
      sort_order: data.sort_order ?? 9999,
    };
    const { error } = await context.supabase.from("report_products").insert(row);
    if (error) {
      if (error.message.toLowerCase().includes("duplicate") || (error as { code?: string }).code === "23505") {
        throw new Error(`Report id "${data.id}" already exists`);
      }
      throw new Error(error.message);
    }
    return { ok: true, product: row as ReportProduct };
  });

const ExtendedUpdateSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(200).optional(),
  tagline: z.string().min(1).max(500).optional(),
  category: z.string().min(1).max(80).optional(),
  icon: z.string().max(16).optional(),
  adult: z.boolean().optional(),
  price_cents: z.number().int().min(0).max(100000).optional(),
  is_free: z.boolean().optional(),
  is_published: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(10000).optional(),
});

/** Extended product edit (title, tagline, category, flags). */
export const updateReportProductFields = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ExtendedUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { id, ...patch } = data;
    if (Object.keys(patch).length === 0) return { ok: true };
    if (patch.is_free === true) patch.price_cents = 0;
    const { error } = await context.supabase.from("report_products").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
