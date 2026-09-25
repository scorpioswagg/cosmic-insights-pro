import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-report-products"],
    queryFn: () => fetchAll(),
  });

  const { data: aiStatus } = useQuery({
    queryKey: ["admin-ai-status"],
    queryFn: () => fetchAi(),
  });

  const { data: generations } = useQuery({
    queryKey: ["admin-report-generations"],
    queryFn: () => fetchGens(),
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

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Report catalog</h1>
          <p className="text-sm text-muted-foreground">
            Pricing, visibility, AI provider status, and recent generations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => stripeSync.mutate()} disabled={stripeSync.isPending}>
            {stripeSync.isPending ? "Syncing Stripe…" : "Sync prices to Stripe"}
          </Button>
          <Button variant="outline" onClick={() => csvExport.mutate()} disabled={csvExport.isPending}>
            {csvExport.isPending ? "Exporting…" : "Download Stripe CSV"}
          </Button>
          <Button onClick={() => sync.mutate()} disabled={sync.isPending}>
            {sync.isPending ? "Syncing…" : "Sync from code catalog"}
          </Button>
        </div>
      </div>

      <AdminNav />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Reports" value={data?.length ?? 0} />
        <Stat label="Published" value={published} />
        <Stat label="Free" value={free} />
        <Stat label="Unfiltered Series" value={unfiltered} />
      </div>

      <div className="mb-6 rounded-md border p-4 space-y-2">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">AI writing provider</div>
        <div className="text-lg font-semibold">{providerLabel}</div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>OPENAI_API_KEY: {aiStatus?.hasOpenAI ? "set" : "missing"}</span>
          <span>GEMINI_API_KEY: {aiStatus?.hasGemini ? "set" : "missing"}</span>
          <span>LOVABLE_API_KEY: {aiStatus?.hasLovable ? "set" : "missing"}</span>
          {aiStatus?.forced && <span>AI_PROVIDER forced: {aiStatus.forced}</span>}
        </div>
        {!aiStatus?.ready && (
          <p className="text-sm text-destructive">
            No AI key configured. Add GEMINI_API_KEY (or OPENAI_API_KEY) in Lovable project secrets so
            reports can generate.
          </p>
        )}
        {aiStatus?.ready && aiStatus.provider === "lovable-gateway" && (
          <p className="text-sm text-amber-600">
            Using Lovable credits. Set GEMINI_API_KEY or OPENAI_API_KEY to bill your own account.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          To run reports end-to-end: home page → natal chart → Add partner chart → Generate "THE
          RELATIONSHIP CRIME SCENE™" (or any synastry report).
        </p>
      </div>

      <div className="mb-8">
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
                  <th className="p-2">Provider / reason</th>
                </tr>
              </thead>
              <tbody>
                {generations.map((g) => {
                  const meta = (g.metadata ?? {}) as Record<string, unknown>;
                  return (
                    <tr key={g.id} className="border-t">
                      <td className="p-2 text-xs text-muted-foreground">
                        {g.created_at ? new Date(g.created_at).toLocaleString() : "—"}
                      </td>
                      <td className="p-2">
                        {(meta.title as string) || g.target_report_id || "—"}
                      </td>
                      <td className="p-2 text-xs">{g.actor_email || g.actor_id}</td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {[meta.aiProvider, meta.accessReason].filter(Boolean).join(" · ") || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by title, id, or category…"
        className="mb-4 w-full rounded-md border bg-background px-3 py-2 text-sm"
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No reports yet. Click “Sync from code catalog” to import them.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-3">Report</th>
                <th className="p-3">Category</th>
                <th className="p-3 w-40">Price</th>
                <th className="p-3 w-24">Free</th>
                <th className="p-3 w-28">Published</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Row key={r.id} row={r} onChange={(v) => update.mutate({ id: r.id, ...v })} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Row({
  row,
  onChange,
}: {
  row: ReportProduct;
  onChange: (v: { price_cents?: number; is_free?: boolean; is_published?: boolean }) => void;
}) {
  const [price, setPrice] = useState((row.price_cents / 100).toFixed(2));

  function commitPrice() {
    const cents = Math.round(parseFloat(price) * 100);
    if (!Number.isFinite(cents) || cents < 0) {
      setPrice((row.price_cents / 100).toFixed(2));
      return;
    }
    if (cents !== row.price_cents) onChange({ price_cents: cents });
  }

  return (
    <tr className="border-t align-middle">
      <td className="p-3">
        <div className="flex items-center gap-2">
          <span>{row.icon}</span>
          <div>
            <div className="font-medium">{row.title}</div>
            <div className="text-xs text-muted-foreground">{row.id}</div>
            <div className="text-xs text-muted-foreground">{row.tagline}</div>
          </div>
        </div>
      </td>
      <td className="p-3 text-xs text-muted-foreground">
        {row.category}
        {row.adult && <span className="ml-1 rounded border px-1">18+</span>}
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">$</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onBlur={commitPrice}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            inputMode="decimal"
            disabled={row.is_free}
            className="w-24 rounded-md border bg-background px-2 py-1 text-sm disabled:opacity-40"
          />
          {!row.is_free && (
            <span className="text-xs text-muted-foreground">{formatPrice(row.price_cents)}</span>
          )}
        </div>
      </td>
      <td className="p-3">
        <input
          type="checkbox"
          checked={row.is_free}
          onChange={(e) => onChange({ is_free: e.target.checked })}
          className="h-4 w-4"
        />
      </td>
      <td className="p-3">
        <input
          type="checkbox"
          checked={row.is_published}
          onChange={(e) => onChange({ is_published: e.target.checked })}
          className="h-4 w-4"
        />
      </td>
    </tr>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
