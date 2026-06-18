import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import type { ChartCalculation } from "@/lib/astrology/types";
import { REPORTS } from "@/lib/astrology/reports-catalog";
import { generateAstroReport } from "@/lib/astrology/generate-report.functions";
import { supabase } from "@/integrations/supabase/client";

interface GeneratedReport {
  reportId: string;
  title: string;
  markdown: string;
  generatedAt: string;
}

export function ReportsPanel({ chart }: { chart: ChartCalculation }) {
  const runReport = useServerFn(generateAstroReport);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [reports, setReports] = useState<Record<string, GeneratedReport>>({});
  const [error, setError] = useState<string | null>(null);

  async function generate(reportId: string) {
    setError(null);
    setActiveId(reportId);
    if (reports[reportId]) return;
    setLoadingId(reportId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const { error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) throw new Error(`Sign-in failed: ${signInError.message}`);
      }
      const chartPayload = {
        input: {
          name: chart.input.name,
          date: chart.input.date,
          time: chart.input.time,
          place: chart.input.place,
          latitude: chart.input.latitude,
          longitude: chart.input.longitude,
          timezone: chart.input.timezone,
        },
        julianDayUT: chart.julianDayUT,
        utcIso: chart.utcIso,
        ascendant: chart.ascendant,
        midheaven: chart.midheaven,
        bodies: chart.bodies.map((b) => ({
          name: b.name,
          longitude: b.longitude,
          sign: b.sign,
          signDegree: b.signDegree,
          house: b.house,
          retrograde: b.retrograde,
          speed: b.speed,
        })),
        houses: chart.houses,
        aspects: chart.aspects.slice(0, 80).map((a) => ({
          a: a.a, b: a.b, type: a.type, angle: a.angle, orb: a.orb, applying: a.applying,
        })),
      };
      const result = await runReport({ data: { reportId, chart: chartPayload } });
      setReports((prev) => ({ ...prev, [reportId]: result }));
      requestAnimationFrame(() => {
        document.getElementById(`report-${reportId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e) {
      setError((e as Error).message || "Report generation failed.");
    } finally {
      setLoadingId(null);
    }
  }

  const grouped = REPORTS.reduce<Record<string, typeof REPORTS>>((acc, r) => {
    (acc[r.category] ||= []).push(r);
    return acc;
  }, {});

  const active = activeId ? reports[activeId] : null;

  return (
    <section className="space-y-8">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-gold mb-2">Premium Reports</p>
        <h2 className="font-display text-4xl text-gradient-gold">15 Astrological Reports</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl mx-auto">
          Each report is generated from your real Swiss Ephemeris chart data — no templates, no guesswork.
        </p>
      </div>

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h3 className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">{category}</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((r) => {
              const isLoading = loadingId === r.id;
              const isDone = !!reports[r.id];
              const isActive = activeId === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => generate(r.id)}
                  disabled={isLoading}
                  className={`text-left glass rounded-xl p-5 border transition group ${
                    isActive ? "border-gold/60 shadow-gold" : "border-border/40 hover:border-gold/40"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-3xl text-gold">{r.icon}</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {isLoading ? "generating…" : isDone ? "✓ ready" : "tap to generate"}
                    </span>
                  </div>
                  <h4 className="font-display text-lg text-foreground group-hover:text-gradient-gold">
                    {r.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{r.tagline}</p>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {error && (
        <div className="glass rounded-xl p-4 border border-destructive/50 text-destructive text-sm">
          <strong>Report failed:</strong> {error}
        </div>
      )}

      {active && (
        <article
          id={`report-${active.reportId}`}
          className="glass rounded-2xl p-8 md:p-10 shadow-deep"
        >
          <header className="mb-6 pb-6 border-b border-border/40">
            <p className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Cosmic Blueprint Report</p>
            <h2 className="font-display text-3xl text-gradient-gold">{active.title}</h2>
            <p className="text-xs text-muted-foreground/80 mt-2 font-mono">
              For {chart.input.name} · generated {new Date(active.generatedAt).toLocaleString()}
            </p>
          </header>
          <div className="prose-cosmic">
            <ReactMarkdown>{active.markdown}</ReactMarkdown>
          </div>
        </article>
      )}

      <style>{`
        .prose-cosmic { color: var(--color-foreground); line-height: 1.75; font-size: 0.98rem; }
        .prose-cosmic h2 {
          font-family: var(--font-display, serif);
          font-size: 1.5rem;
          color: var(--gold);
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          letter-spacing: 0.01em;
        }
        .prose-cosmic h3 {
          font-size: 1.1rem;
          color: var(--color-foreground);
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }
        .prose-cosmic p { margin-bottom: 1rem; color: oklch(0.85 0.02 280); }
        .prose-cosmic strong { color: var(--gold); font-weight: 600; }
        .prose-cosmic em { color: oklch(0.9 0.03 280); }
        .prose-cosmic ul, .prose-cosmic ol { margin: 0.75rem 0 1rem 1.25rem; }
        .prose-cosmic li { margin-bottom: 0.4rem; }
        .prose-cosmic blockquote {
          border-left: 2px solid var(--gold);
          padding-left: 1rem;
          margin: 1rem 0;
          color: oklch(0.78 0.02 280);
          font-style: italic;
        }
      `}</style>
    </section>
  );
}