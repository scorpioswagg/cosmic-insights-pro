import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BirthProfileInput = z.object({
  name: z.string().min(1).max(120),
  date: z.string().min(8).max(16),
  time: z.string().min(1).max(16),
  place: z.string().min(1).max(240),
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string().min(1).max(80),
  timeUnknown: z.boolean().optional(),
});

const SaveGeneratedReportInput = z.object({
  reportId: z.string().min(1).max(64),
  reportTitle: z.string().min(1).max(200),
  chartName: z.string().min(1).max(120),
  partnerName: z.string().max(120).optional().nullable(),
  markdown: z.string().min(1).max(2_000_000),
  chartSnapshot: z.record(z.string(), z.unknown()),
  partnerSnapshot: z.record(z.string(), z.unknown()).optional().nullable(),
  generatedAt: z.string().optional(),
});

function unwrap(input: unknown): unknown {
  if (input && typeof input === "object" && "data" in input) {
    return (input as { data: unknown }).data;
  }
  return input;
}

export type SavedBirthProfile = {
  id: string;
  name: string;
  date: string;
  time: string;
  place: string;
  latitude: number;
  longitude: number;
  timezone: string;
  time_unknown: boolean;
  created_at: string;
  updated_at: string;
};

export type SavedGeneratedReport = {
  id: string;
  report_id: string;
  report_title: string;
  chart_name: string;
  partner_name: string | null;
  markdown: string;
  chart_snapshot: Record<string, unknown>;
  partner_snapshot: Record<string, unknown> | null;
  generated_at: string;
  created_at: string;
};

/** List saved people for the signed-in user (newest first). */
export const listSavedBirthProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("saved_birth_profiles")
      .select(
        "id, name, date, time, place, latitude, longitude, timezone, time_unknown, created_at, updated_at",
      )
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as SavedBirthProfile[];
  });

/** Upsert a birth person by user + name + date + time. */
export const saveBirthProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BirthProfileInput.parse(unwrap(input)))
  .handler(async ({ data, context }) => {
    const row = {
      user_id: context.userId,
      name: data.name.trim(),
      date: data.date,
      time: data.timeUnknown ? "12:00" : data.time,
      place: data.place.trim(),
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      time_unknown: !!data.timeUnknown,
      updated_at: new Date().toISOString(),
    };

    const { data: upserted, error } = await context.supabase
      .from("saved_birth_profiles")
      .upsert(row, {
        onConflict: "user_id,name,date,time",
        ignoreDuplicates: false,
      })
      .select(
        "id, name, date, time, place, latitude, longitude, timezone, time_unknown, created_at, updated_at",
      )
      .maybeSingle();

    if (error) {
      const { data: existing } = await context.supabase
        .from("saved_birth_profiles")
        .select("id")
        .eq("user_id", context.userId)
        .ilike("name", data.name.trim())
        .eq("date", data.date)
        .eq("time", row.time)
        .maybeSingle();
      if (existing?.id) {
        const { data: updated, error: upErr } = await context.supabase
          .from("saved_birth_profiles")
          .update(row)
          .eq("id", existing.id)
          .eq("user_id", context.userId)
          .select(
            "id, name, date, time, place, latitude, longitude, timezone, time_unknown, created_at, updated_at",
          )
          .single();
        if (upErr) throw new Error(upErr.message);
        return updated as SavedBirthProfile;
      }
      const { data: inserted, error: insErr } = await context.supabase
        .from("saved_birth_profiles")
        .insert(row)
        .select(
          "id, name, date, time, place, latitude, longitude, timezone, time_unknown, created_at, updated_at",
        )
        .single();
      if (insErr) throw new Error(insErr.message);
      return inserted as SavedBirthProfile;
    }

    return upserted as SavedBirthProfile;
  });

export const deleteBirthProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(unwrap(input)),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("saved_birth_profiles")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** List every report this user has generated (newest first). */
export const listMyGeneratedReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_generated_reports")
      .select(
        "id, report_id, report_title, chart_name, partner_name, markdown, chart_snapshot, partner_snapshot, generated_at, created_at",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as SavedGeneratedReport[];
  });

/** Persist a generated report so it survives logout. */
export const saveGeneratedReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveGeneratedReportInput.parse(unwrap(input)))
  .handler(async ({ data, context }) => {
    const row = {
      user_id: context.userId,
      report_id: data.reportId,
      report_title: data.reportTitle,
      chart_name: data.chartName,
      partner_name: data.partnerName ?? null,
      markdown: data.markdown,
      chart_snapshot: data.chartSnapshot,
      partner_snapshot: data.partnerSnapshot ?? null,
      generated_at: data.generatedAt ?? new Date().toISOString(),
    };
    const { data: inserted, error } = await context.supabase
      .from("user_generated_reports")
      .insert(row)
      .select(
        "id, report_id, report_title, chart_name, partner_name, markdown, chart_snapshot, partner_snapshot, generated_at, created_at",
      )
      .single();
    if (error) throw new Error(error.message);
    return inserted as SavedGeneratedReport;
  });

export const deleteGeneratedReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(unwrap(input)),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_generated_reports")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
