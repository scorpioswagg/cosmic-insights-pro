import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  listSavedBirthProfiles,
  listMyGeneratedReports,
  deleteBirthProfile,
  deleteGeneratedReport,
  type SavedBirthProfile,
  type SavedGeneratedReport,
} from "@/lib/dashboard/library.functions";
import { downloadLuxuryReportPdf } from "@/lib/astrology/luxury-pdf";
import type { ChartCalculation } from "@/lib/astrology/types";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "My Dashboard — Cosmic Blueprint" },
      {
        name: "description",
        content:
          "Your saved birth charts and every report you have generated — download any reading as a PDF anytime.",
      },
    ],
  }),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    const msg = error instanceof Error ? error.message : String(error);
    const needsAuth = msg.startsWith("Unauthorized");
    return (
      <main className="mx-auto max-w-2xl p-8 text-center">
        <h1 className="mb-2 text-2xl font-semibold">My Dashboard</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          {needsAuth ? "Sign in to see your saved charts and reports." : msg}
        </p>
        <div className="flex justify-center gap-3">
          <Link to="/">
            <Button variant="outline">Home</Button>
          </Link>
          <Button
            onClick={() => {
              reset();
              router.invalidate();
            }}
          >
            Retry
          </Button>
        </div>
      </main>
    );
  },
});

function snapshotToChart(snapshot: Record<string, unknown> | null | undefined): ChartCalculation | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  try {
    return snapshot as unknown as ChartCalculation;
  } catch {
    return null;
  }
}

function DashboardPage() {
  const qc = useQueryClient();
  const fetchProfiles = useServerFn(listSavedBirthProfiles);
  const fetchReports = useServerFn(listMyGeneratedReports);
  const runDeleteProfile = useServerFn(deleteBirthProfile);
  const runDeleteReport = useServerFn(deleteGeneratedReport);
  const [preview, setPreview] = useState<SavedGeneratedReport | null>(null);

  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ["saved-birth-profiles"],
    queryFn: () => fetchProfiles(),
    retry: false,
  });

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ["my-generated-reports"],
    queryFn: () => fetchReports(),
    retry: false,
  });

  const delProfile = useMutation({
    mutationFn: (id: string) => runDeleteProfile({ data: { id } }),
    onSuccess: () => {
      toast.success("Person removed");
      qc.invalidateQueries({ queryKey: ["saved-birth-profiles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delReport = useMutation({
    mutationFn: (id: string) => runDeleteReport({ data: { id } }),
    onSuccess: () => {
      toast.success("Report removed");
      setPreview(null);
      qc.invalidateQueries({ queryKey: ["my-generated-reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function usePerson(p: SavedBirthProfile) {
    try {
      sessionStorage.setItem(
        "cb_prefill_birth",
        JSON.stringify({
          name: p.name,
          date: p.date,
          time: p.time,
          place: p.place,
          latitude: p.latitude,
          longitude: p.longitude,
          timezone: p.timezone,
          timeUnknown: p.time_unknown,
        }),
      );
    } catch {
      // ignore
    }
    window.location.href = "/?prefill=1";
  }

  function downloadPdf(r: SavedGeneratedReport) {
    const chart = snapshotToChart(r.chart_snapshot);
    if (!chart) {
      toast.error("Chart data missing for this report — cannot build PDF.");
      return;
    }
    const partner = snapshotToChart(r.partner_snapshot ?? undefined);
    downloadLuxuryReportPdf(
      {
        reportId: r.report_id,
        title: r.report_title,
        markdown: r.markdown,
        generatedAt: r.generated_at,
      },
      chart,
      partner,
    );
    toast.success("PDF download started");
  }

  function downloadMarkdown(r: SavedGeneratedReport) {
    const content = `# ${r.report_title}\n\nFor ${r.chart_name}${
      r.partner_name ? ` & ${r.partner_name}` : ""
    }\nGenerated ${new Date(r.generated_at).toLocaleString()}\n\n---\n\n${r.markdown}`;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.report_title.replace(/[^\w]+/g, "-")}-${r.chart_name.replace(/\s+/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold mb-1">Member library</p>
          <h1 className="text-3xl font-display text-gradient-gold">My Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
            Saved birth people load into the chart form with one click. Every report you generate
            stays here as a downloadable PDF — even after you log out and back in.
          </p>
        </div>
        <Link to="/">
          <Button variant="outline">Back to chart</Button>
        </Link>
      </div>

      <section className="mb-12 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Saved people</h2>
          <span className="text-xs text-muted-foreground">
            {profilesLoading ? "Loading…" : `${profiles?.length ?? 0} saved`}
          </span>
        </div>
        {!profilesLoading && (profiles?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground glass rounded-xl p-4">
            No saved people yet. Calculate a chart on the home page — we save the birth details
            automatically so you can reuse them later.
          </p>
        )}
        <ul className="grid gap-3 sm:grid-cols-2">
          {(profiles ?? []).map((p) => (
            <li
              key={p.id}
              className="glass rounded-xl border border-border/40 p-4 flex flex-col gap-3"
            >
              <div>
                <p className="font-medium text-gold">{p.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {p.date} · {p.time_unknown ? "time unknown" : p.time} · {p.place}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => usePerson(p)}>
                  Use in birth form
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => delProfile.mutate(p.id)}
                  disabled={delProfile.isPending}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Generated reports</h2>
          <span className="text-xs text-muted-foreground">
            {reportsLoading ? "Loading…" : `${reports?.length ?? 0} saved`}
          </span>
        </div>
        {!reportsLoading && (reports?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground glass rounded-xl p-4">
            No reports yet. Generate a reading from your chart page — it will appear here with a
            PDF download button.
          </p>
        )}
        <ul className="space-y-3">
          {(reports ?? []).map((r) => (
            <li
              key={r.id}
              className="glass rounded-xl border border-border/40 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-medium">{r.report_title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {r.chart_name}
                  {r.partner_name ? ` × ${r.partner_name}` : ""} ·{" "}
                  {new Date(r.generated_at).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button size="sm" onClick={() => downloadPdf(r)}>
                  Download PDF
                </Button>
                <Button size="sm" variant="outline" onClick={() => downloadMarkdown(r)}>
                  Markdown
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPreview(r)}>
                  View
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => delReport.mutate(r.id)}
                  disabled={delReport.isPending}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="glass max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gold/20 p-6 shadow-deep">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-xl text-gradient-gold">{preview.report_title}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {preview.chart_name}
                  {preview.partner_name ? ` × ${preview.partner_name}` : ""}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setPreview(null)}>
                Close
              </Button>
            </div>
            <div className="mb-4 flex gap-2">
              <Button size="sm" onClick={() => downloadPdf(preview)}>
                Download PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => downloadMarkdown(preview)}>
                Markdown
              </Button>
            </div>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground font-sans">
              {preview.markdown.slice(0, 12000)}
              {preview.markdown.length > 12000 ? "\n\n…(truncated for PDF download)" : ""}
            </pre>
          </div>
        </div>
      )}
    </main>
  );
}
