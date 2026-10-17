import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { BirthForm } from "@/components/astrology/BirthForm";
import { ChartWheel } from "@/components/astrology/ChartWheel";
import { PlacementsTable } from "@/components/astrology/PlacementsTable";
import { ReportsPanel } from "@/components/astrology/ReportsPanel";
import { CosmicSnapshot } from "@/components/astrology/CosmicSnapshot";
import { SampleReader } from "@/components/astrology/SampleReader";
import { Starfield } from "@/components/Starfield";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { WelcomeModal } from "@/components/WelcomeModal";
import type { BirthInput, ChartCalculation } from "@/lib/astrology/types";
import { analyticsEvent } from "@/lib/analytics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cosmic Blueprint — Astrology Stripped of Platitudes. Powered by Precision." },
      {
        name: "description",
        content:
          "Book-length natal dossiers and forensic synastry calculated with real Swiss Ephemeris astronomical accuracy. Free chart snapshot. 150+ in-depth reports.",
      },
      { property: "og:title", content: "Cosmic Blueprint — Astrology Stripped of Platitudes. Powered by Precision." },
      {
        property: "og:description",
        content: "Swiss Ephemeris-powered natal and synastry intelligence. No vague positivity.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [chart, setChart] = useState<ChartCalculation | null>(null);
  const [partnerChart, setPartnerChart] = useState<ChartCalculation | null>(null);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [partnerBusy, setPartnerBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [catalogTab, setCatalogTab] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function loadAuth(u: { id: string; email?: string | null; user_metadata?: { full_name?: string } } | null) {
      if (!mounted) return;
      if (!u) {
        setUser(null);
        setUserId(null);
        setShowWelcome(false);
        setIsAdmin(false);
        setAuthLoading(false);
        return;
      }
      setUser({ email: u.email || undefined, name: u.user_metadata?.full_name });
      setUserId(u.id);
      setAuthLoading(false);
      if (typeof window !== "undefined") {
        try {
          const next = window.sessionStorage.getItem("oauth_next");
          if (next && next.startsWith("/") && !next.startsWith("//")) {
            window.sessionStorage.removeItem("oauth_next");
            window.location.replace(next);
            return;
          }
        } catch {
          // ignore
        }
      }
      try {
        const { data: roleData } = await supabase.rpc("has_role", {
          _user_id: u.id,
          _role: "admin",
        });
        if (mounted) setIsAdmin(!!roleData);
      } catch {
        if (mounted) setIsAdmin(false);
      }
      const { data: prof } = await supabase
        .from("profiles")
        .select("welcome_message_seen")
        .eq("id", u.id)
        .maybeSingle();
      if (!prof) {
        await supabase.from("profiles").insert({ id: u.id }).select().maybeSingle();
        if (mounted) setShowWelcome(true);
      } else if (!prof.welcome_message_seen) {
        if (mounted) setShowWelcome(true);
      }
    }
    supabase.auth.getUser().then(({ data }) => loadAuth(data.user as never));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        loadAuth((session?.user as never) ?? null);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function dismissWelcome() {
    setShowWelcome(false);
    if (userId) {
      await supabase.from("profiles").update({ welcome_message_seen: true }).eq("id", userId);
    }
  }

  async function handleGoogleSignIn() {
    analyticsEvent("Auth Started", { provider: "google" });
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) setError(`Sign-in failed: ${result.error.message}`);
    if (result.redirected) return;
  }

  async function handleAppleSignIn() {
    analyticsEvent("Auth Started", { provider: "apple" });
    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: window.location.origin,
    });
    if (result.error) setError(`Apple sign-in failed: ${result.error.message}`);
    if (result.redirected) return;
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  }

  async function handleCalc(input: BirthInput) {
    setBusy(true);
    setError(null);
    try {
      if (typeof window === "undefined") throw new Error("Chart calculation can only run in the browser.");
      const { calculateChart } = await import("@/lib/astrology/swisseph-client");
      const c = await calculateChart(input);
      setChart(c);
      analyticsEvent("Chart Calculated", { mode: input.timeUnknown ? "unknown_time" : "exact_time" });
      requestAnimationFrame(() => {
        document.getElementById("chart-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e) {
      analyticsEvent("Chart Calculation Failed");
      setError((e as Error).message || "Chart calculation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePartnerCalc(input: BirthInput) {
    setPartnerBusy(true);
    setError(null);
    try {
      const { calculateChart } = await import("@/lib/astrology/swisseph-client");
      const result = await calculateChart(input);
      setPartnerChart(result);
      analyticsEvent("Partner Chart Calculated", { mode: input.timeUnknown ? "unknown_time" : "exact_time" });
      setShowPartnerForm(false);
      requestAnimationFrame(() => {
        document.getElementById("partner-chart-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e) {
      analyticsEvent("Partner Chart Failed");
      setError((e as Error).message || "Partner chart calculation failed.");
    } finally {
      setPartnerBusy(false);
    }
  }

  const catalogTabs = ["Flagship Natal", "Unfiltered (18+)", "Synastry & Love", "Gift Sets"];

  return (
    <div className="min-h-screen relative">
      <Starfield />

      <div className="relative z-10">
        <nav className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-8 py-4 bg-background/85 backdrop-blur-md border-b border-border/60">
          <Link to="/" className="font-display text-lg md:text-xl tracking-wide text-gold">
            COSMIC BLUEPRINT<span className="text-gold/70">™</span>
          </Link>
          <div className="flex items-center gap-3 md:gap-6">
            <a href="#catalog" className="hidden sm:inline text-sm text-muted-foreground hover:text-gold transition">Reports</a>
            <a href="#samples" className="hidden sm:inline text-sm text-muted-foreground hover:text-gold transition">Samples</a>
            <Link to="/academy" className="text-sm text-muted-foreground hover:text-gold transition">Academy</Link>
            <a href="#bundles" className="hidden md:inline text-sm text-muted-foreground hover:text-gold transition">Bundles</a>
            {!authLoading && (
              user ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground hidden sm:inline">{user.name || user.email}</span>
                  {isAdmin && (
                    <Link to="/admin/reports" className="text-xs uppercase tracking-wider px-3 py-1.5 rounded-md border border-gold/40 text-gold hover:bg-gold/10 transition">
                      Admin
                    </Link>
                  )}
                  <button onClick={handleSignOut} className="text-xs uppercase tracking-wider px-3 py-1.5 rounded-md border border-border/50 text-muted-foreground hover:text-foreground hover:border-gold/40 transition">
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={handleGoogleSignIn} className="text-xs uppercase tracking-wider px-3 py-1.5 rounded-md border border-gold/50 text-gold hover:bg-gold/10 transition">
                    Sign In
                  </button>
                </div>
              )
            )}
          </div>
        </nav>

        <header className="px-4 md:px-8 pt-16 md:pt-24 pb-14 text-center max-w-4xl mx-auto">
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl text-gradient-gold leading-tight mb-6">
            Astrology Stripped of Platitudes.
            <br />
            Powered by Precision.
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-8">
            Book-length natal dossiers and forensic synastry calculated with real Swiss Ephemeris astronomical accuracy.
            No vague positivity. No generic filler. Just the calculated architecture of your chart.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <a href="#hook" className="inline-flex items-center px-6 py-3 rounded-xl bg-gold text-primary-foreground font-medium text-sm uppercase tracking-wider shadow-gold hover:opacity-95 transition">
              Calculate My Chart Free
            </a>
            <a href="#catalog" className="inline-flex items-center px-6 py-3 rounded-xl border border-gold/50 text-gold text-sm uppercase tracking-wider hover:bg-gold/10 transition">
              Browse 150+ Reports
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground tracking-wide">
            <span className="flex items-center gap-1.5"><span className="text-gold text-[8px]">●</span> Real Swiss Ephemeris</span>
            <span className="flex items-center gap-1.5"><span className="text-gold text-[8px]">●</span> 20–40 Page Dossiers</span>
            <span className="flex items-center gap-1.5"><span className="text-gold text-[8px]">●</span> Instant PDF Delivery</span>
          </div>
        </header>

        {showWelcome && user && (
          <WelcomeModal open={showWelcome} onDismiss={dismissWelcome} />
        )}

        <section id="hook" className="px-4 md:px-8 py-12 max-w-5xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">Start Here</p>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-3">
            Enter Your Birth Data for an Instant Natal Breakdown
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl">
            See your core placements and a precise 3-minute synthesis before you spend anything. This is not a sun-sign horoscope.
          </p>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <BirthForm
              onSubmit={handleCalc}
              busy={busy}
              isAuthed={!!user}
              showSample={isAdmin}
              onSignIn={handleGoogleSignIn}
            />
            <div className="glass rounded-2xl p-6 shadow-deep space-y-4 text-sm">
              <h3 className="font-display text-xl text-gradient-gold">What you get free</h3>
              <ul className="space-y-2.5 text-muted-foreground">
                <li className="flex gap-3"><span className="text-gold shrink-0">✦</span> Interactive chart wheel + full planetary table</li>
                <li className="flex gap-3"><span className="text-gold shrink-0">✦</span> 3-minute Cosmic Snapshot synthesis</li>
                <li className="flex gap-3"><span className="text-gold shrink-0">✦</span> Sun, Moon, Rising, ruling planet at exact degrees</li>
                <li className="flex gap-3"><span className="text-gold shrink-0">★</span> Path to full 20–40 page dossiers when ready</li>
              </ul>
              {!user && (
                <p className="text-xs text-muted-foreground border-t border-border/40 pt-4">
                  Free calculation is open to everyone. Sign in to save charts and unlock the report library.
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-6 glass rounded-xl p-4 border border-destructive/50 text-destructive text-sm">
              <strong>Calculation failed:</strong> {error}
            </div>
          )}
        </section>

        {chart && (
          <section id="chart-result" className="px-4 md:px-8 py-12 max-w-5xl mx-auto space-y-10">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.35em] text-gold mb-2">Natal Chart</p>
              <h2 className="font-display text-3xl md:text-4xl text-gradient-gold">{chart.input.name}</h2>
              <p className="text-sm text-muted-foreground mt-2">
                {chart.input.date} · {chart.input.time} · {chart.input.place}
              </p>
            </div>

            <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-start">
              <div className="glass rounded-2xl p-6 shadow-deep">
                <ChartWheel chart={chart} />
              </div>
              <PlacementsTable chart={chart} />
            </div>

            <div className="glass rounded-2xl p-6 shadow-deep space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-gold mb-1">Synastry</p>
                  <h3 className="font-display text-2xl text-gradient-gold">Partner Chart</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                    Add a second birth chart for two-chart reports and cross-aspects.
                  </p>
                </div>
                {partnerChart ? (
                  <div className="text-right">
                    <p className="text-sm text-gold font-medium">{partnerChart.input.name}</p>
                    <p className="text-xs text-muted-foreground">{partnerChart.input.date} · {partnerChart.input.place}</p>
                    <button type="button" onClick={() => { setPartnerChart(null); setShowPartnerForm(true); }}
                      className="mt-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-gold transition">
                      Replace partner chart
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowPartnerForm((v) => !v)}
                    className="px-5 py-2.5 rounded-xl border border-gold/50 text-gold text-xs uppercase tracking-widest hover:bg-gold/10 transition">
                    {showPartnerForm ? "Hide form" : "Add partner chart"}
                  </button>
                )}
              </div>
              {showPartnerForm && !partnerChart && (
                <div className="pt-4 border-t border-border/40">
                  <BirthForm
                    onSubmit={handlePartnerCalc}
                    busy={partnerBusy}
                    isAuthed={!!user}
                    showSample={false}
                    onSignIn={handleGoogleSignIn}
                    title="Partner Birth Details"
                    nameLabel="Partner's Full Name"
                    submitLabel="Calculate Partner Chart"
                    hideGuide
                  />
                </div>
              )}
            </div>

            {partnerChart && (
              <div id="partner-chart-result" className="space-y-6">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-[0.35em] text-gold mb-2">Partner Chart</p>
                  <h2 className="font-display text-3xl text-gradient-gold">{partnerChart.input.name}</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    {partnerChart.input.date} · {partnerChart.input.time} · {partnerChart.input.place}
                  </p>
                </div>
                <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-start">
                  <div className="glass rounded-2xl p-6 shadow-deep">
                    <ChartWheel chart={partnerChart} />
                  </div>
                  <PlacementsTable chart={partnerChart} />
                </div>
              </div>
            )}

            <CosmicSnapshot chart={chart} isAuthed={!!user} onSignIn={handleGoogleSignIn} />

            <div id="reports">
              <ReportsPanel chart={chart} partnerChart={partnerChart} />
            </div>
          </section>
        )}

        <section id="catalog" className="px-4 md:px-8 py-16 max-w-5xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">The Catalog</p>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-3">150+ Reports. Organized by Depth.</h2>
          <p className="text-muted-foreground mb-8 max-w-xl">
            Every report is calculated from your exact astronomical positions. Choose the depth you need.
          </p>

          <div className="flex flex-wrap gap-2 mb-8 border-b border-border/40 pb-3">
            {catalogTabs.map((tab, i) => (
              <button
                key={tab}
                type="button"
                onClick={() => setCatalogTab(i)}
                className={`text-sm px-4 py-2 rounded-md transition ${
                  catalogTab === i
                    ? "bg-gold/15 text-gold"
                    : "text-muted-foreground hover:text-gold hover:bg-gold/5"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {[
              { price: "$99", title: "The Brutal Blueprint™", desc: "31 chapters of uncompromising psychological truth. Shadow architecture, karmic patterns, and the five Brutal Truths your chart will not let you ignore." },
              { price: "$99", title: "The Relationship Crime Scene™", desc: "Forensic two-chart synastry. The unspoken contracts, power dynamics, and attachment patterns — calculated, not guessed." },
              { price: "$29", title: "Natal Essence", desc: "Your foundational architectural report. Clear, precise overview of the major signatures without the full 31-chapter depth." },
              { price: "$199", title: "Oracle Vault Gift Bundle", desc: "Five curated reports + printable luxury gift certificate. Save 40%. For birthdays, anniversaries, and people who have outgrown sun-sign horoscopes." },
            ].map((card) => (
              <div key={card.title} className="glass rounded-2xl p-6 shadow-deep flex flex-col border border-border/40 hover:border-gold/40 transition">
                <p className="font-mono text-lg text-gold mb-2">{card.price}</p>
                <h3 className="font-display text-xl text-foreground mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground flex-grow mb-5">{card.desc}</p>
                <div className="flex gap-2">
                  <a href="#samples" className="flex-1 text-center text-xs uppercase tracking-wider py-2.5 rounded-lg border border-gold/40 text-gold hover:bg-gold/10 transition">
                    Read Sample
                  </a>
                  <a href="#hook" className="flex-1 text-center text-xs uppercase tracking-wider py-2.5 rounded-lg bg-gold text-primary-foreground hover:opacity-95 transition">
                    Get Report
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 md:px-8 py-12 max-w-5xl mx-auto">
          <SampleReader />
        </section>

        <section id="academy" className="px-4 md:px-8 py-16 max-w-5xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">Free Education</p>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-3">Cosmic Blueprint Academy</h2>
          <p className="text-muted-foreground mb-8 max-w-xl">
            Learn how a chart actually works — the angles, dignities, and aspects that determine what a placement means. No sales pitch required.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {[
              { num: "01", title: "The Angles", desc: "Why the Ascendant, Midheaven, Descendant and IC form the structural skeleton of every chart." },
              { num: "02", title: "Dignity & Debility", desc: "How planetary strength changes interpretation. A planet in its own sign is not the same planet in fall." },
              { num: "03", title: "Aspects as Architecture", desc: "Squares, trines, and oppositions are not good or bad. They are different kinds of relationship between planetary functions." },
            ].map((l) => (
              <div key={l.num} className="glass rounded-xl p-5 border border-border/40 hover:border-gold/30 transition">
                <p className="font-mono text-xs text-gold mb-2">{l.num}</p>
                <h4 className="font-display text-lg text-foreground mb-1">{l.title}</h4>
                <p className="text-sm text-muted-foreground">{l.desc}</p>
              </div>
            ))}
          </div>
          <Link to="/academy" className="inline-flex items-center px-6 py-3 rounded-xl border border-gold/50 text-gold text-sm uppercase tracking-wider hover:bg-gold/10 transition">
            Explore the Free Academy →
          </Link>
        </section>

        <section className="px-4 md:px-8 py-16 max-w-5xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">The Difference</p>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mb-3">Cosmic Blueprint vs. Everything Else</h2>
          <p className="text-muted-foreground mb-8 max-w-xl">
            Most people who buy astrology reports have already been disappointed. Here is the exact comparison.
          </p>
          <div className="glass rounded-2xl overflow-hidden border border-border/40 shadow-deep overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gold/10 text-left">
                  <th className="px-5 py-4 text-gold font-medium"></th>
                  <th className="px-5 py-4 text-gold font-medium">Cosmic Blueprint</th>
                  <th className="px-5 py-4 text-muted-foreground font-medium">Generic Apps</th>
                  <th className="px-5 py-4 text-muted-foreground font-medium">Human Astrologer</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {[
                  ["Calculation", "Swiss Ephemeris (WASM)", "Sun-sign approximations", "Usually accurate"],
                  ["Length & Depth", "20–40 page dossiers", "1–3 page snippets", "Variable"],
                  ["Speed", "Instant PDF", "Instant but shallow", "Days to weeks"],
                  ["Tone", "Forensic & psychologically honest", "Vague positivity", "Depends on the reader"],
                  ["Price", "$29–$99", "$0–$30", "$100–$300+"],
                ].map((row, i) => (
                  <tr key={i} className="border-t border-border/30">
                    <td className="px-5 py-3.5 text-foreground/80">{row[0]}</td>
                    <td className="px-5 py-3.5 text-gold font-medium">{row[1]}</td>
                    <td className="px-5 py-3.5">{row[2]}</td>
                    <td className="px-5 py-3.5">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="bundles" className="px-4 md:px-8 py-16 max-w-5xl mx-auto">
          <div className="glass rounded-2xl p-8 md:p-12 text-center border border-gold/25 shadow-deep"
            style={{ background: "linear-gradient(145deg, oklch(0.82 0.15 85 / 0.08), oklch(0.16 0.045 278 / 0.6))" }}>
            <p className="text-xs uppercase tracking-[0.2em] text-gold mb-3">High-Value Gifting</p>
            <h2 className="font-display text-3xl md:text-4xl text-gradient-gold mb-4">Oracle Vault Gift Bundles</h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8">
              Curated sets of reports with printable luxury gift certificates and digital vouchers.
              Designed for birthdays, anniversaries, and the people who have already outgrown sun-sign horoscopes.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a href="#catalog" className="inline-flex items-center px-6 py-3 rounded-xl bg-gold text-primary-foreground text-sm uppercase tracking-wider font-medium hover:opacity-95 transition">
                View Gift Bundles
              </a>
              <a href="#catalog" className="inline-flex items-center px-6 py-3 rounded-xl border border-gold/50 text-gold text-sm uppercase tracking-wider hover:bg-gold/10 transition">
                Browse Individual Reports
              </a>
            </div>
          </div>
        </section>

        <footer className="border-t border-border/40 mt-8 px-4 md:px-8 py-12 bg-background/70">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <h5 className="text-xs uppercase tracking-widest text-gold mb-3">Catalog</h5>
              <a href="#catalog" className="block text-sm text-muted-foreground hover:text-gold mb-1.5 transition">All Reports</a>
              <a href="#catalog" className="block text-sm text-muted-foreground hover:text-gold mb-1.5 transition">Flagship Natal</a>
              <a href="#catalog" className="block text-sm text-muted-foreground hover:text-gold mb-1.5 transition">Unfiltered Series</a>
            </div>
            <div>
              <h5 className="text-xs uppercase tracking-widest text-gold mb-3">Learn</h5>
              <Link to="/academy" className="block text-sm text-muted-foreground hover:text-gold mb-1.5 transition">Academy</Link>
              <a href="#samples" className="block text-sm text-muted-foreground hover:text-gold mb-1.5 transition">Sample Chapters</a>
            </div>
            <div>
              <h5 className="text-xs uppercase tracking-widest text-gold mb-3">Company</h5>
              <span className="block text-sm text-muted-foreground mb-1.5">About</span>
              <span className="block text-sm text-muted-foreground mb-1.5">Contact</span>
              <span className="block text-sm text-muted-foreground mb-1.5">Terms</span>
            </div>
            <div>
              <h5 className="text-xs uppercase tracking-widest text-gold mb-3">Account</h5>
              {!user ? (
                <button onClick={handleGoogleSignIn} className="block text-sm text-muted-foreground hover:text-gold mb-1.5 transition">Sign In</button>
              ) : (
                <button onClick={handleSignOut} className="block text-sm text-muted-foreground hover:text-gold mb-1.5 transition">Sign Out</button>
              )}
              {isAdmin && (
                <Link to="/admin/reports" className="block text-sm text-muted-foreground hover:text-gold mb-1.5 transition">Admin</Link>
              )}
            </div>
          </div>
          <div className="max-w-5xl mx-auto pt-6 border-t border-border/30 flex flex-wrap justify-between gap-3 text-xs text-muted-foreground">
            <span>© 2026 Cosmic Blueprint™ · Swiss Ephemeris powered</span>
            <span>yourcosmicblueprint.lovable.app · mycosmicblueprint.online</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
