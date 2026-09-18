import { useMemo, useState } from "react";
import { BirthForm } from "./BirthForm";
import { generateAstroReport } from "@/lib/astrology/generate-report.functions";
import { REPORTS } from "@/lib/astrology/reports-catalog";
import type { BirthInput, ChartCalculation } from "@/lib/astrology/types";

interface Props {
  isAuthed: boolean;
  isAdmin?: boolean;
  onSignIn?: () => void;
}

export function SynastryWorkspace({ isAuthed, isAdmin = false, onSignIn }: Props) {
  const [count, setCount] = useState(2);
  const [charts, setCharts] = useState<(ChartCalculation | null)[]>([null, null]);
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [reportId, setReportId] = useState(REPORTS.find((r) => r.id === "synastry-power-dynamics")?.id ?? "");
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<{ title: string; markdown: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const synastryReports = useMemo(
    () => REPORTS.filter((r) => r.requiresPartner && (r.minCharts ?? 2) <= 2),
    [],
  );

  const ready = charts.filter((c): c is ChartCalculation => !!c);
  const selected = REPORTS.find((r) => r.id === reportId);
  const minCharts = selected?.minCharts ?? 2;
  const maxCharts = selected?.maxCharts ?? 2;

  function resize(next: number) {
    const safe = Math.max(2, Math.min(5, next));
    setCount(safe);
    setCharts((old) =>
      Array.from({ length: safe }, (_, i) => old[i] ?? null),
    );
    setReport(null);
    setError(null);
  }

  async function calculate(index: number, input: BirthInput) {
    setBusyIndex(index);
    setError(null);
    try {
      const { calculateChart } = await import("@/lib/astrology/swisseph-client");
      const chart = await calculateChart(input);
      setCharts((old) => old.map((c, i) => (i === index ? chart : c)));
      setReport(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyIndex(null);
    }
  }

  async function generate() {
    setError(null);
    if (ready.length < minCharts) {
      setError(`Add and calculate at least ${minCharts} charts for this report.`);
      return;
    }
    if (ready.length > maxCharts) {
      setError(`This report accepts at most ${maxCharts} charts. Choose a 2-chart report or reduce the participant count.`);
      return;
    }
    setGenerating(true);
    try {
      const payload = await generateAstroReport({
        data: {
          reportId,
          chart: ready[0],
          charts: ready,
        },
      });
      setReport({ title: payload.title, markdown: payload.markdown });
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
    } finally {
      setGenerating(false);
    }
  }

  function download() {
    if (!report) return;
    const blob = new Blob([report.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = report.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-8 glass rounded-2xl p-6 md:p-8 border border-gold/20">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-gold">Synastry Studio</p>
        <h2 className="font-display text-3xl text-gradient-gold">Two or More Charts</h2>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Build 2–5 real Swiss Ephemeris natal charts, then compare every unique pair.
          House overlays always use the host chart's houses, and the server receives the
          deterministic cross-chart evidence rather than guessing relationship facts.
        </p>
        {isAdmin && (
          <p className="text-xs uppercase tracking-widest text-gold">Admin access: all reports and PDF/report generation remain free.</p>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs uppercase tracking-widest text-muted-foreground">Participants</label>
        <select
          value={count}
          onChange={(e) => resize(Number(e.target.value))}
          className="cosmic-input w-24"
          aria-label="Number of synastry participants"
        >
          {[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">
          {ready.length} of {count} charts calculated
        </span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-gold">
              Participant {String.fromCharCode(65 + i)}
              {charts[i] ? " · calculated" : " · awaiting chart"}
            </div>
            <BirthForm
              onSubmit={(input) => void calculate(i, input)}
              busy={busyIndex === i}
              isAuthed={isAuthed}
              showSample={isAdmin && i === 0}
              onSignIn={onSignIn}
            />
          </div>
        ))}
      </div>

      <div className="space-y-4 border-t border-border/40 pt-6">
        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground block mb-2">
            Multi-Chart Synastry Report
          </label>
          <select
            value={reportId}
            onChange={(e) => { setReportId(e.target.value); setReport(null); }}
            className="cosmic-input w-full"
          >
            {synastryReports.map((r) => (
              <option key={r.id} value={r.id}>{r.title} — {r.tagline}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-2">
            This studio supports 2 charts for legacy pair reports. The new Unfiltered multi-chart reports accept 2–5 participants.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void generate()}
          disabled={generating || ready.length < minCharts || ready.length > maxCharts}
          className="text-xs uppercase tracking-widest text-background bg-gold rounded-md px-5 py-3 hover:bg-gold/90 transition disabled:opacity-50"
        >
          {generating ? "Generating synastry report…" : isAdmin ? "Generate — Admin Included" : "Generate Synastry Report"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/50 p-4 text-sm text-destructive">
          <strong>Synastry failed:</strong> {error}
        </div>
      )}

      {report && (
        <article className="space-y-4 border-t border-border/40 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-2xl text-gradient-gold">{report.title}</h3>
            <button
              type="button"
              onClick={download}
              className="text-xs uppercase tracking-widest text-gold border border-gold/50 rounded-md px-4 py-2 hover:bg-gold/10 transition"
            >
              ↓ Download .md
            </button>
          </div>
          <div className="prose-cosmic whitespace-pre-wrap">{report.markdown}</div>
        </article>
      )}
    </section>
  );
}
