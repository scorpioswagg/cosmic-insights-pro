import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BirthForm } from "@/components/astrology/BirthForm";
import { ChartWheel } from "@/components/astrology/ChartWheel";
import { PlacementsTable } from "@/components/astrology/PlacementsTable";
import { ValidationBadge } from "@/components/astrology/ValidationBadge";
import { ReportsPanel } from "@/components/astrology/ReportsPanel";
import type { BirthInput, ChartCalculation } from "@/lib/astrology/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cosmic Blueprint — Professional Astrological Intelligence" },
      { name: "description", content: "Generate the most accurate natal charts powered by Swiss Ephemeris. Tropical zodiac, Placidus houses, geocentric Western astrology." },
      { property: "og:title", content: "Cosmic Blueprint" },
      { property: "og:description", content: "Swiss Ephemeris-powered astrological intelligence." },
    ],
  }),
  component: Index,
});

function Index() {
  const [chart, setChart] = useState<ChartCalculation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCalc(input: BirthInput) {
    setBusy(true); setError(null);
    try {
      if (typeof window === "undefined") {
        throw new Error("Chart calculation can only run in the browser.");
      }
      const { calculateChart } = await import("@/lib/astrology/swisseph-client");
      const c = await calculateChart(input);
      setChart(c);
      requestAnimationFrame(() => {
        document.getElementById("chart-result")?.scrollIntoView({ behavior: "smooth" });
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="starfield relative min-h-screen">
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16 md:py-24">
        <header className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.4em] text-gold mb-4">Cosmic Blueprint</p>
          <h1 className="font-display text-5xl md:text-7xl text-gradient-gold mb-6 leading-tight">
            The Stars,<br />Calculated Precisely
          </h1>
          <p className="max-w-2xl mx-auto text-muted-foreground text-lg leading-relaxed">
            Production-grade natal charts powered by <span className="text-gold">Swiss Ephemeris</span>.
            Tropical zodiac. Placidus houses. Geocentric Western astrology. No approximations, ever.
          </p>
        </header>

        <section className="grid lg:grid-cols-2 gap-8 items-start">
          <BirthForm onSubmit={handleCalc} busy={busy} />
          <div className="glass rounded-2xl p-6 shadow-deep space-y-4 text-sm">
            <h2 className="font-display text-xl text-gradient-gold">What you get</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex gap-3"><span className="text-gold">✦</span> All 10 classical planets, Chiron, North/South Nodes, Lilith</li>
              <li className="flex gap-3"><span className="text-gold">✦</span> Ascendant, Midheaven, Vertex, Part of Fortune</li>
              <li className="flex gap-3"><span className="text-gold">✦</span> 12 Placidus house cusps with planetary placements</li>
              <li className="flex gap-3"><span className="text-gold">✦</span> Major and minor aspects with orbs and applying/separating</li>
              <li className="flex gap-3"><span className="text-gold">✦</span> Automatic geocoding, timezone &amp; DST resolution</li>
            </ul>
            <div className="pt-3 border-t border-border/50 text-xs text-muted-foreground">
              Engine: Swiss Ephemeris (WASM build, files seas/semo/sepl_18). Range: 1800–2400 CE.
              If the ephemeris fails to load, calculation aborts — no fallback data is ever fabricated.
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-8 glass rounded-xl p-4 border border-destructive/50 text-destructive text-sm">
            <strong>Calculation failed:</strong> {error}
          </div>
        )}

        {chart && (
          <section id="chart-result" className="mt-20 space-y-8">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.35em] text-gold mb-2">Natal Chart</p>
              <h2 className="font-display text-4xl text-gradient-gold">{chart.input.name}</h2>
              <p className="text-sm text-muted-foreground mt-2">
                {chart.input.date} · {chart.input.time} · {chart.input.place}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1 font-mono">
                {chart.engine.name} {chart.engine.version} · {chart.engine.houseSystem} · JD {chart.julianDayUT.toFixed(5)} · {chart.engine.calculatedAt}
              </p>
            </div>

            <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-start">
              <div className="glass rounded-2xl p-6 shadow-deep">
                <ChartWheel chart={chart} />
              </div>
              <PlacementsTable chart={chart} />
            </div>

            <ValidationBadge chart={chart} />

            <div className="glass rounded-2xl p-6 shadow-deep">
              <h3 className="font-display text-xl text-gradient-gold mb-4">Aspects ({chart.aspects.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {chart.aspects.slice(0, 40).map((a, i) => (
                  <div key={i} className="flex items-center justify-between bg-card/50 rounded-md px-3 py-2 border border-border/40">
                    <span><span className="text-gold">{a.a}</span> {a.type} <span className="text-gold">{a.b}</span></span>
                    <span className="font-mono text-xs text-muted-foreground">{a.orb.toFixed(2)}° {a.applying ? "↗" : "↘"}</span>
                  </div>
                ))}
              </div>
            </div>

            <ReportsPanel chart={chart} />
          </section>
        )}

        <footer className="mt-24 pt-8 border-t border-border/40 text-center text-xs text-muted-foreground">
          Swiss Ephemeris © Astrodienst AG · Licensed under GPL v3 · Phase 1 of the Cosmic Blueprint platform
        </footer>
      </div>
    </div>
  );
}
