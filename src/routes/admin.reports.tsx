import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  listAllReports,
  syncReportCatalog,
  exportStripeCatalogCsv,
  updateReportProduct,
  type ReportProduct,
} from "@/lib/reports/catalog.functions";
import {
  getWritingProviderStatus,
  listRecentReportGenerations,
} from "@/lib/admin/ai-status.functions";
import { formatPrice } from "@/lib/reports/pricing";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin/AdminNav";
import { syncStripePrices } from "@/lib/admin/purchases.functions";
import { generateAstroReport } from "@/lib/astrology/generate-report.functions";
import { REPORTS as CODE_REPORTS } from "@/lib/astrology/reports-catalog";
import { KYLE_MERRITT_INPUT } from "@/lib/astrology/validation";
import type { ChartCalculation } from "@/lib/astrology/types";

export const Route = createFileRoute("/admin/reports")({
  ssr: false,
  component: AdminReportsPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    const msg = error instanceof Error ? error.message : String(error);
    return (
      <div className="mx-auto max-w-2xl p-8">
        <h1 className="mb-2 text-2xl font-semibold">Report catalog</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          {msg === "Forbidden" || msg.startsWith("Unauthorized")
            ? "You need admin access to view this page."
            : `Error: ${msg}`}
        </p>
        <Button
          onClick={() => {
            reset();
            router.invalidate();
          }}
        >
          Retry
        </Button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function AdminReportsPage() {
  const fetchAll = useServerFn(listAllReports);
  const runSync = useServerFn(syncReportCatalog);
  const runExportCsv = useServerFn(exportStripeCatalogCsv);
  const runUpdate = useServerFn(updateReportProduct);
  const runStripeSync = useServerFn(syncStripePrices);
  const fetchAi = useServerFn(getWritingProviderStatus);
  const fetchGens = useServerFn(listRecentReportGenerations);
  const runReport = useServerFn(generateAstroReport);
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkLog, setBulkLog] = useState<Array<{ id: string; status: string; detail: string }>>([]);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: s }) => setAuthed(!!s.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);
  const enabled = authed === true;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-report-products"],
    queryFn: () => fetchAll(),
    enabled,
  });

  const { data: aiStatus } = useQuery({
    queryKey: ["admin-ai-status"],
    queryFn: () => fetchAi(),
    enabled,
  });

  const { data: generations } = useQuery({
    queryKey: ["admin-report-generations"],
    queryFn: () => fetchGens(),
    enabled,
  });

  const sync = useMutation({
    mutationFn: () => runSync(),
    onSuccess: (r) => {
      toast.success(
        `Catalog synced — ${r.added} added, ${r.updated ?? 0} updated, ${r.unfiltered ?? "?"} Unfiltered, ${r.total} total.`,
      );
      qc.invalidateQueries({ queryKey: ["admin-report-products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const csvExport = useMutation({
    mutationFn: () => runExportCsv({ data: { unfilteredOnly: false } }),
    onSuccess: (res) => {
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${res.count} products to CSV`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: (vars: {
      id: string;
      price_cents?: number;
      is_free?: boolean;
      is_published?: boolean;
    }) => runUpdate({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-report-products"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const stripeSync = useMutation({
    mutationFn: () => runStripeSync(),
    onSuccess: (r) => {
      toast.success(`Synced ${r.synced} of ${r.total} paid reports to Stripe.`);
      if (r.failures.length) toast.error(r.failures[0]);
      qc.invalidateQueries({ queryKey: ["admin-report-products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (data ?? []).filter(
    (r) =>
      !filter ||
      r.title.toLowerCase().includes(filter.toLowerCase()) ||
      r.category.toLowerCase().includes(filter.toLowerCase()) ||
      r.id.toLowerCase().includes(filter.toLowerCase()),
  );

  const published = (data ?? []).filter((r) => r.is_published).length;
  const free = (data ?? []).filter((r) => r.is_free).length;
  const unfiltered = (data ?? []).filter((r) => r.category === "Unfiltered Series").length;

  const providerLabel =
    aiStatus?.provider === "gemini-direct"
      ? `Gemini direct (${aiStatus.geminiModel})`
      : aiStatus?.provider === "openai-direct"
        ? `OpenAI direct (${aiStatus.openaiModel})`
        : aiStatus?.provider === "lovable-gateway"
          ? "Lovable AI Gateway"
          : "Not configured";

  async function runAdminBulkGenerate() {
    if (bulkRunning) return;
    setBulkRunning(true);
    setBulkLog([]);
    try {
      const { calculateChart } = await import("@/lib/astrology/swisseph-client");
      const { timezoneAt, tzOffsetHoursFor } = await import("@/lib/astrology/timezone");
      const base = KYLE_MERRITT_INPUT;
      const tz = timezoneAt(base.latitude, base.longitude);
      const offset = tzOffsetHoursFor(`${base.date}T${base.time}`, tz);
      const chart = await calculateChart({
        name: base.name,
        date: base.date,
        time: base.time,
        place: base.place,
        latitude: base.latitude,
        longitude: base.longitude,
        timezone: tz,
        tzOffsetHours: offset,
      });
      const partner: ChartCalculation = {
        ...chart,
        input: { ...chart.input, name: "Partner Fixture" },
      };
      const toPayload = (c: ChartCalculation) => ({
        input: {
          name: c.input.name,
          date: c.input.date,
          time: c.input.time,
          place: c.input.place,
          latitude: c.input.latitude,
          longitude: c.input.longitude,
          timezone: c.input.timezone,
          timeUnknown: c.input.timeUnknown ?? false,
        },
        julianDayUT: c.julianDayUT,
        utcIso: c.utcIso,
        ascendant: c.ascendant,
        midheaven: c.midheaven,
        bodies: c.bodies.map((b) => ({
          name: b.name,
          longitude: b.longitude,
          sign: b.sign,
          signDegree: b.signDegree,
          house: b.house,
          retrograde: b.retrograde,
          speed: b.speed,
        })),
        houses: c.houses,
        aspects: c.aspects.slice(0, 80).map((a) => ({
          a: a.a,
          b: a.b,
          type: a.type,
          angle: a.angle,
          orb: a.orb,
          applying: a.applying,
        })),
      });
      const targets = CODE_REPORTS.slice(0, 12);
      setBulkProgress({ done: 0, total: targets.length });
      const log: Array<{ id: string; status: string; detail: string }> = [];
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        try {
          const result = await runReport({
            data: {
              reportId: t.id,
              chart: toPayload(chart),
              partnerChart: t.requiresPartner ? toPayload(partner) : undefined,
            },
          });
          log.push({
            id: t.id,
            status: "ok",
            detail: `${result.title} · ${(result.markdown?.length ?? 0)} chars`,
          });
        } catch (e) {
          log.push({
            id: t.id,
            status: "error",
            detail: ((e as Error).message || "failed").slice(0, 160),
          });
        }
        setBulkLog([...log]);
        setBulkProgress({ done: i + 1, total: targets.length });
      }
      toast.success(
        `Bulk smoke finished (${log.filter((x) => x.status === "ok").length}/${targets.length} ok)`,
      );
    } catch (e) {
      toast.error((e as Error).message);
      setBulkLog([{ id: "_", status: "error", detail: (e as Error).message }]);
    } finally {
      setBulkRunning(false);
    }
  }

  if (authed === false) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <AdminNav />
        <h1 className="mb-2 text-2xl font-semibold">Report catalog</h1>
        <p className="text-sm text-muted-foreground">
          Please sign in with your admin account on the home page to view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <AdminNav />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Report catalog</h1>
          <p className="text-sm text-muted-foreground">
            {data?.length ?? 0} products · {published} published · {free} free · {unfiltered}{" "}
            Unfiltered
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending}>
            {sync.isPending ? "Syncing…" : "Sync catalog"}
          </Button>
          <Button variant="outline" onClick={() => csvExport.mutate()} disabled={csvExport.isPending}>
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => stripeSync.mutate()} disabled={stripeSync.isPending}>
            Sync Stripe
          </Button>
        </div>
      </div>

      <div className="mb-6 space-y-2 rounded-md border p-4">
        <div className="text-sm font-medium text-muted-foreground">AI writing provider</div>
        <div className="text-lg font-semibold">{providerLabel}</div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>OPENAI_API_KEY: {aiStatus?.hasOpenAI ? "set" : "missing"}</span>
          <span>GEMINI_API_KEY: {aiStatus?.hasGemini ? "set" : "missing"}</span>
          <span>LOVABLE_API_KEY: {aiStatus?.hasLovable ? "set" : "missing"}</span>
        </div>
        {!aiStatus?.ready && (
          <p className="text-sm text-destructive">
            No AI key configured. Add GEMINI_API_KEY in project secrets so reports can generate.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Home → natal chart → Add partner chart → Generate a synastry report.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="secondary" disabled={bulkRunning} onClick={() => void runAdminBulkGenerate()}>
            {bulkRunning
              ? `Smoke generating… ${bulkProgress ? `${bulkProgress.done}/${bulkProgress.total}` : ""}`
              : "Bulk smoke-generate (12 reports)"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Kyle Merritt fixture + synthetic partner for synastry.
          </span>
        </div>
        {(bulkRunning || bulkLog.length > 0) && (
          <ul className="mt-3 max-h-40 overflow-y-auto space-y-1 font-mono text-xs">
            {bulkLog.map((row, i) => (
              <li key={`${row.id}-${i}`} className={row.status === "error" ? "text-destructive" : ""}>
                [{row.status}] {row.id}: {row.detail}
              </li>
            ))}
          </ul>
        )}
      </div>

      <input
        className="mb-3 max-w-xs rounded-md border bg-background px-3 py-2 text-sm"
        placeholder="Filter reports…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-3">Report</th>
                <th className="p-3">Category</th>
                <th className="p-3">Price</th>
                <th className="p-3">Published</th>
                <th className="p-3">Free</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{r.title}</div>
                    <div className="text-xs text-muted-foreground">{r.id}</div>
                  </td>
                  <td className="p-3 text-xs">{r.category}</td>
                  <td className="p-3">{formatPrice(r.price_cents)}</td>
                  <td className="p-3">{r.is_published ? "Yes" : "No"}</td>
                  <td className="p-3">{r.is_free ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-2 text-sm font-medium">Recent generations</h2>
        {!generations?.length ? (
          <p className="text-sm text-muted-foreground">No report.generate audit rows yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="p-2">When</th>
                  <th className="p-2">Report</th>
                  <th className="p-2">Actor</th>
                </tr>
              </thead>
              <tbody>
                {generations.map((g) => (
                  <tr key={g.id} className="border-t">
                    <td className="p-2 text-xs">{g.created_at}</td>
                    <td className="p-2">{g.target_report_id}</td>
                    <td className="p-2 text-xs">{g.actor_email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
