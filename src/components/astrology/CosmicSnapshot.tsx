import type { ChartCalculation, BodyPosition, Aspect } from "@/lib/astrology/types";
import { BODY_GLYPHS, ZODIAC_GLYPHS, ELEMENT_OF } from "@/lib/astrology/types";

function formatDeg(d: number): string {
  const whole = Math.floor(d);
  const mins = Math.round((d - whole) * 60);
  return `${whole}°${String(mins).padStart(2, "0")}′`;
}

function getBody(chart: ChartCalculation, name: string): BodyPosition | undefined {
  return chart.bodies.find((b) => b.name === name);
}

function rulingPlanetOf(sign: string): string {
  const map: Record<string, string> = {
    Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
    Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Pluto",
    Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Uranus", Pisces: "Neptune",
  };
  return map[sign] ?? "—";
}

function strongestHardAspect(aspects: Aspect[]): Aspect | null {
  const hard = aspects.filter((a) =>
    ["Square", "Opposition", "Conjunction"].includes(a.type) &&
    ["Sun", "Moon", "Ascendant", "Saturn", "Mars", "Pluto"].includes(a.a) &&
    ["Sun", "Moon", "Ascendant", "Saturn", "Mars", "Pluto"].includes(a.b)
  );
  if (!hard.length) return null;
  return hard.sort((a, b) => a.orb - b.orb)[0];
}

function buildSynthesis(chart: ChartCalculation): {
  signature: string;
  dominant: string;
  obstacle: string;
} {
  const sun = getBody(chart, "Sun");
  const moon = getBody(chart, "Moon");
  const asc = getBody(chart, "Ascendant");
  const timeUnknown = !!chart.input.timeUnknown;

  const sunHouse = sun?.house ? ` in the ${sun.house}${ordinal(sun.house)} house` : "";
  const moonHouse = moon?.house ? ` in the ${moon.house}${ordinal(moon.house)} house` : "";

  const signature = [
    sun
      ? `Your Sun in ${sun.sign}${sunHouse} describes the core engine of identity and will. It is the area of life where you are structurally required to develop agency and visibility.`
      : "",
    moon
      ? `Your Moon in ${moon.sign}${moonHouse} shows the emotional operating system: what you need to feel safe, how you process experience, and the private weather that runs underneath everything else.`
      : "",
    !timeUnknown && asc
      ? `Your Ascendant in ${asc.sign} is the lens through which the world meets you first — and the style of approach you instinctively use when entering new territory.`
      : timeUnknown
        ? `Birth time is unknown, so the Ascendant and house cusps are approximate (solar chart mode). Planetary positions remain exact.`
        : "",
  ]
    .filter(Boolean)
    .join(" ");

  const hard = strongestHardAspect(chart.aspects);
  let dominant = "";
  if (hard) {
    dominant = `The ${hard.type.toLowerCase()} between your ${hard.a} and ${hard.b} (orb ${hard.orb.toFixed(1)}°) is one of the defining tensions in this chart. It creates a recurring negotiation between two planetary functions that do not resolve easily — and that is precisely where the real work (and the real power) lives.`;
  } else if (sun && moon) {
    const sunEl = ELEMENT_OF[sun.sign];
    const moonEl = ELEMENT_OF[moon.sign];
    if (sunEl === moonEl) {
      dominant = `Sun and Moon share the ${sunEl} element. The core identity and the emotional system run on the same fuel, which can produce remarkable coherence — and also a tendency to over-identify with a single mode of being.`;
    } else {
      dominant = `Sun in ${sun.sign} (${sunEl}) and Moon in ${moon.sign} (${moonEl}) create a cross-element conversation between who you are becoming and what you need to feel safe. Integration of these two is a lifelong project, not a one-time fix.`;
    }
  } else {
    dominant = "The primary pattern in this chart emerges from the relationship between the luminaries and the angular structure. Full analysis requires the complete report series.";
  }

  let obstacle = "The recurring cost of this chart is self-withholding: waiting for external permission before acting on what you already know.";
  if (hard && (hard.a === "Saturn" || hard.b === "Saturn")) {
    obstacle = "The recurring cost of this chart is delayed self-authorization: an internalized demand for proof that can postpone action long after the data is already clear.";
  } else if (hard && (hard.a === "Mars" || hard.b === "Mars")) {
    obstacle = "The recurring cost of this chart is misdirected heat: force applied at the wrong target or withheld when direct action is required.";
  } else if (sun?.sign === "Scorpio" || moon?.sign === "Scorpio") {
    obstacle = "The recurring cost of this chart is controlled intensity — depth that is real but carefully metered, often at the expense of spontaneous trust.";
  }

  return { signature, dominant, obstacle };
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export function CosmicSnapshot({
  chart,
  isAuthed = false,
  onSignIn,
}: {
  chart: ChartCalculation;
  isAuthed?: boolean;
  onSignIn?: () => void;
}) {
  const sun = getBody(chart, "Sun");
  const moon = getBody(chart, "Moon");
  const asc = getBody(chart, "Ascendant");
  const synthesis = buildSynthesis(chart);
  const timeUnknown = !!chart.input.timeUnknown;
  const ruling = asc ? rulingPlanetOf(asc.sign) : "—";

  return (
    <section className="space-y-8" id="cosmic-snapshot">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-gold mb-2">Your Cosmic Snapshot</p>
        <h2 className="font-display text-3xl md:text-4xl text-gradient-gold">
          {chart.input.name}
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          {chart.input.date} · {chart.input.time} · {chart.input.place}
        </p>
        <p className="text-[11px] text-muted-foreground/80 mt-1">
          Swiss Ephemeris · Tropical · {chart.engine.houseSystem}
          {timeUnknown ? " · Solar chart mode" : ""}
        </p>
      </div>

      <div className="glass rounded-2xl p-6 shadow-deep">
        <h3 className="font-display text-xl text-gradient-gold mb-4">Core Placements</h3>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          {[
            { label: "Sun", body: sun },
            { label: "Moon", body: moon },
            { label: "Ascendant", body: timeUnknown ? null : asc },
            { label: "Ruling Planet", body: null, extra: ruling },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between rounded-lg border border-border/40 bg-card/40 px-4 py-3"
            >
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium text-foreground">
                {row.body ? (
                  <>
                    <span className="text-gold mr-1.5">
                      {BODY_GLYPHS[row.body.name]} {ZODIAC_GLYPHS[row.body.sign]}
                    </span>
                    {row.body.sign} {formatDeg(row.body.signDegree)}
                    {row.body.house ? (
                      <span className="text-muted-foreground ml-1.5 text-xs">
                        · H{row.body.house}
                      </span>
                    ) : null}
                  </>
                ) : row.extra ? (
                  row.extra
                ) : (
                  <span className="text-muted-foreground text-xs">approx. (time unknown)</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-6 md:p-8 shadow-deep space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold mb-2">3-Minute Synthesis</p>
          <h3 className="font-display text-2xl text-gradient-gold mb-4">Your Calculated Signature</h3>
          <p className="text-sm md:text-base leading-relaxed text-foreground/90">
            {synthesis.signature}
          </p>
        </div>

        <div className="border-t border-border/40 pt-5">
          <h4 className="font-display text-lg text-gold mb-2">Dominant Pattern</h4>
          <p className="text-sm leading-relaxed text-muted-foreground">{synthesis.dominant}</p>
        </div>

        <div className="border-t border-border/40 pt-5">
          <h4 className="font-display text-lg text-gold mb-2">Primary Karmic Obstacle</h4>
          <p className="text-sm leading-relaxed text-muted-foreground">{synthesis.obstacle}</p>
        </div>

        <div className="border-t border-border/40 pt-5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            This is a 3-minute architectural overview — not a full psychological dossier. The complete
            reports expand every placement into signature → symbolism → healthy expression → shadow
            pattern → consequential reality → mature path.
          </p>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 shadow-deep text-center space-y-4">
        <h3 className="font-display text-xl text-gradient-gold">Unlock the Full Reading</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Go deeper with book-length dossiers calculated from the same Swiss Ephemeris data.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href="#reports"
            className="inline-flex items-center px-5 py-2.5 rounded-xl bg-gold text-primary-foreground text-xs uppercase tracking-widest font-medium hover:opacity-95 transition"
          >
            Natal Essence — $29
          </a>
          <a
            href="#reports"
            className="inline-flex items-center px-5 py-2.5 rounded-xl border border-gold/50 text-gold text-xs uppercase tracking-widest hover:bg-gold/10 transition"
          >
            The Brutal Blueprint™ — $99
          </a>
        </div>
        {!isAuthed && onSignIn && (
          <p className="text-xs text-muted-foreground pt-2">
            <button
              type="button"
              onClick={onSignIn}
              className="text-gold hover:underline underline-offset-2"
            >
              Sign in
            </button>{" "}
            to save this chart and access the full report library.
          </p>
        )}
      </div>
    </section>
  );
}
