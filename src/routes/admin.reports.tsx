import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listAllReports,
  syncReportCatalog,
  exportStripeCatalogCsv,
  updateReportProduct,
  type ReportProduct,
} from "@/lib/reports/catalog.functions";
import {
  bulkUpdateReportProducts,
  createReportProduct,
  updateReportProductFields,
} from "@/lib/reports/catalog.admin.functions";
import { getWritingProviderStatus, listRecentReportGenerations } from "@/lib/admin/ai-status.functions";
import { formatPrice } from "@/lib/reports/pricing";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin/AdminNav";
import { syncStripePrices } from "@/lib/admin/purchases.functions";

const CATEGORY_OPTIONS = [
  "Core", "Relationships", "Growth", "Timing", "Vocation", "Esoteric",
  "Intimacy (18+)", "Patriotic Collection", "Signature Series", "Frontier Series",
  "Oracle Vault", "Unfiltered Series",
];

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
        <Button onClick={() => { reset(); router.invalidate(); }}>Retry</Button>
      </div>
    );
  },
});

type EditDraft = {
  title: string; tagline: string; category: string; icon: string; adult: boolean;
  price_dollars: string; is_free: boolean; is_published: boolean;
};

function emptyCreate() {
  return {
    id: "", title: "", tagline: "", category: "Core", icon: "✦",
    adult: false, price_dollars: "29", is_free: false, is_published: false,
  };
}

function AdminReportsPage() {
  const fetchAll = useServerFn(listAllReports);
  const runSync = useServerFn(syncReportCatalog);
  const runExportCsv = useServerFn(exportStripeCatalogCsv);
  const runUpdate = useServerFn(updateReportProduct);
  const runUpdateFields = useServerFn(updateReportProductFields);
  const runBulk = useServerFn(bulkUpdateReportProducts);
  const runCreate = useServerFn(createReportProduct);
  const runStripeSync = useServerFn(syncStripePrices);
  const fetchAi = useServerFn(getWritingProviderStatus);
  const fetchGens = useServerFn(listRecentReportGenerations);
  const qc = useQueryClient();

  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreate());

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
      toast.success(`Catalog synced — ${r.added} added, ${r.updated ?? 0} updated, ${r.total} total.`);
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
      a.href = url; a.download = res.filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${res.count} products to CSV`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: (vars: Record<string, unknown> & { id: string }) => {
      const hasExtra = ["title", "tagline", "category", "icon", "adult"].some((k) => k in vars);
      if (hasExtra) return runUpdateFields({ data: vars as never });
      return runUpdate({ data: vars as never });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-report-products"] });
      toast.success("Report updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulk = useMutation({
    mutationFn: (vars: { ids: string[]; is_free?: boolean; is_published?: boolean; price_cents?: number }) =>
      runBulk({ data: vars }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["admin-report-products"] });
      toast.success(`Updated ${r.updated} report(s)`);
      setSelected(new Set());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: () => {
      const dollars = parseFloat(createForm.price_dollars || "0");
      const price_cents = createForm.is_free ? 0 : Math.round((Number.isFinite(dollars) ? dollars : 0) * 100);
      return runCreate({
        data: {
          id: createForm.id.trim().toLowerCase(),
          title: createForm.title.trim(),
          tagline: createForm.tagline.trim(),
          category: createForm.category,
          icon: createForm.icon || "✦",
          adult: createForm.adult,
          price_cents,
          is_free: createForm.is_free,
          is_published: createForm.is_published,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-report-products"] });
      toast.success("Report added to catalog");
      setCreateForm(emptyCreate());
      setShowCreate(false);
    },
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

  const rows = useMemo(
    () =>
      (data ?? []).filter(
        (r) =>
          !filter ||
          r.title.toLowerCase().includes(filter.toLowerCase()) ||
          r.category.toLowerCase().includes(filter.toLowerCase()) ||
          r.id.toLowerCase().includes(filter.toLowerCase()),
      ),
    [data, filter],
  );

  const published = (data ?? []).filter((r) => r.is_published).length;
  const free = (data ?? []).filter((r) => r.is_free).length;
  const allVisibleSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const selectedIds = Array.from(selected);

  const providerLabel =
    aiStatus?.provider === "groq" ? "Groq (free)"
      : aiStatus?.provider === "gemini-direct" ? `Gemini direct (${aiStatus.geminiModel})`
      : aiStatus?.provider === "lovable-gateway" ? "Lovable AI Gateway"
      : "Not configured";

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => next.add(r.id));
      return next;
    });
  }

  function startEdit(r: ReportProduct) {
    setEditingId(r.id);
    setDraft({
      title: r.title,
      tagline: r.tagline,
      category: r.category,
      icon: r.icon || "✦",
      adult: r.adult,
      price_dollars: (r.price_cents / 100).toFixed(r.price_cents % 100 === 0 ? 0 : 2),
      is_free: r.is_free,
      is_published: r.is_published,
    });
  }

  function saveEdit() {
    if (!editingId || !draft) return;
    const dollars = parseFloat(draft.price_dollars || "0");
    const price_cents = draft.is_free ? 0 : Math.round((Number.isFinite(dollars) ? dollars : 0) * 100);
    update.mutate({
      id: editingId,
      title: draft.title.trim(),
      tagline: draft.tagline.trim(),
      category: draft.category,
      icon: draft.icon,
      adult: draft.adult,
      price_cents,
      is_free: draft.is_free,
      is_published: draft.is_published,
    });
    setEditingId(null);
    setDraft(null);
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <AdminNav />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Report catalog</h1>
          <p className="text-sm text-muted-foreground">
            {data?.length ?? 0} products · {published} published · {free} free
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? "Close add form" : "Add report"}
          </Button>
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

      {showCreate && (
        <div className="mb-6 space-y-3 rounded-md border p-4">
          <h2 className="text-sm font-medium">Add report to product catalog</h2>
          <p className="text-xs text-muted-foreground">
            Creates a commercial product (price, free, published). Full AI dossier generation still needs a matching code catalog definition.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">ID (kebab-case)</span>
              <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={createForm.id}
                onChange={(e) => setCreateForm((f) => ({ ...f, id: e.target.value }))} placeholder="soul-purpose-activation" />
            </label>
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">Title</span>
              <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={createForm.title}
                onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} />
            </label>
            <label className="text-xs space-y-1 sm:col-span-2">
              <span className="text-muted-foreground">Tagline</span>
              <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={createForm.tagline}
                onChange={(e) => setCreateForm((f) => ({ ...f, tagline: e.target.value }))} />
            </label>
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">Category</span>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={createForm.category}
                onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}>
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">Price (USD)</span>
              <input type="number" min={0} step={1} className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={createForm.price_dollars} disabled={createForm.is_free}
                onChange={(e) => setCreateForm((f) => ({ ...f, price_dollars: e.target.value }))} />
            </label>
            <div className="flex flex-wrap items-center gap-4 text-sm sm:col-span-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={createForm.is_free}
                  onChange={(e) => setCreateForm((f) => ({ ...f, is_free: e.target.checked }))} /> Free
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={createForm.is_published}
                  onChange={(e) => setCreateForm((f) => ({ ...f, is_published: e.target.checked }))} /> Published on site
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={createForm.adult}
                  onChange={(e) => setCreateForm((f) => ({ ...f, adult: e.target.checked }))} /> 18+
              </label>
            </div>
          </div>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? "Saving…" : "Create report product"}
          </Button>
        </div>
      )}

      <div className="mb-4 rounded-md border p-3 text-sm">
        <span className="text-muted-foreground">AI writing provider: </span>
        <span className="font-medium">{providerLabel}</span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input className="max-w-xs rounded-md border bg-background px-3 py-2 text-sm" placeholder="Filter reports…"
          value={filter} onChange={(e) => setFilter(e.target.value)} />
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{selectedIds.length} selected</span>
            <Button size="sm" variant="outline" disabled={bulk.isPending}
              onClick={() => bulk.mutate({ ids: selectedIds, is_free: true, price_cents: 0 })}>Make free</Button>
            <Button size="sm" variant="outline" disabled={bulk.isPending}
              onClick={() => bulk.mutate({ ids: selectedIds, is_free: false })}>Make paid</Button>
            <Button size="sm" variant="outline" disabled={bulk.isPending}
              onClick={() => bulk.mutate({ ids: selectedIds, is_published: true })}>Publish</Button>
            <Button size="sm" variant="outline" disabled={bulk.isPending}
              onClick={() => bulk.mutate({ ids: selectedIds, is_published: false })}>Unpublish</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-3 w-10">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
                </th>
                <th className="p-3">Report</th>
                <th className="p-3">Category</th>
                <th className="p-3">Price</th>
                <th className="p-3">Published</th>
                <th className="p-3">Free</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isEditing = editingId === r.id && draft;
                return (
                  <tr key={r.id} className="border-t align-top">
                    <td className="p-3">
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} />
                    </td>
                    <td className="p-3">
                      {isEditing ? (
                        <div className="space-y-2 min-w-[220px]">
                          <input className="w-full rounded-md border bg-background px-2 py-1 text-sm" value={draft.title}
                            onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                          <input className="w-full rounded-md border bg-background px-2 py-1 text-xs" value={draft.tagline}
                            onChange={(e) => setDraft({ ...draft, tagline: e.target.value })} />
                          <div className="text-xs text-muted-foreground">{r.id}</div>
                        </div>
                      ) : (
                        <>
                          <div className="font-medium">{r.icon ? `${r.icon} ` : ""}{r.title}</div>
                          <div className="text-xs text-muted-foreground">{r.id}</div>
                          <div className="text-xs text-muted-foreground/80 line-clamp-2">{r.tagline}</div>
                        </>
                      )}
                    </td>
                    <td className="p-3 text-xs">
                      {isEditing ? (
                        <select className="rounded-md border bg-background px-2 py-1 text-xs" value={draft.category}
                          onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                          {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      ) : r.category}
                    </td>
                    <td className="p-3">
                      {isEditing ? (
                        <input type="number" min={0} step={1} className="w-24 rounded-md border bg-background px-2 py-1 text-sm"
                          value={draft.price_dollars} disabled={draft.is_free}
                          onChange={(e) => setDraft({ ...draft, price_dollars: e.target.value })} />
                      ) : r.is_free ? "Free" : formatPrice(r.price_cents)}
                    </td>
                    <td className="p-3">
                      {isEditing ? (
                        <input type="checkbox" checked={draft.is_published}
                          onChange={(e) => setDraft({ ...draft, is_published: e.target.checked })} />
                      ) : (
                        <button type="button"
                          className={`text-xs underline-offset-2 hover:underline ${r.is_published ? "text-emerald-600" : "text-muted-foreground"}`}
                          onClick={() => update.mutate({ id: r.id, is_published: !r.is_published })}>
                          {r.is_published ? "Yes" : "No"}
                        </button>
                      )}
                    </td>
                    <td className="p-3">
                      {isEditing ? (
                        <input type="checkbox" checked={draft.is_free}
                          onChange={(e) => setDraft({ ...draft, is_free: e.target.checked })} />
                      ) : (
                        <button type="button"
                          className={`text-xs underline-offset-2 hover:underline ${r.is_free ? "text-emerald-600" : "text-muted-foreground"}`}
                          onClick={() => update.mutate({
                            id: r.id,
                            is_free: !r.is_free,
                            price_cents: !r.is_free ? 0 : (r.price_cents || 2900),
                          })}>
                          {r.is_free ? "Yes" : "No"}
                        </button>
                      )}
                    </td>
                    <td className="p-3">
                      {isEditing ? (
                        <div className="flex flex-col gap-1">
                          <Button size="sm" onClick={saveEdit} disabled={update.isPending}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setDraft(null); }}>Cancel</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => startEdit(r)}>Edit</Button>
                      )}
                    </td>
                  </tr>
                );
              })}
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
