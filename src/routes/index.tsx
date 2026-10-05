import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { BirthForm } from "@/components/astrology/BirthForm";
import { ChartWheel } from "@/components/astrology/ChartWheel";
import { PlacementsTable } from "@/components/astrology/PlacementsTable";
import { ReportsPanel } from "@/components/astrology/ReportsPanel";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { WelcomeModal } from "@/components/WelcomeModal";
import type { BirthInput, ChartCalculation } from "@/lib/astrology/types";
import { computeSynastry } from "@/lib/astrology/synastry";
import { analyticsEvent } from "@/lib/analytics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cosmic Blueprint — Professional Astrological Intelligence" },
      {
        name: "description",
        content:
          "Generate the most accurate natal and synastry charts powered by Swiss Ephemeris. Tropical zodiac, Placidus houses, geocentric Western astrology.",
      },
      { property: "og:title", content: "Cosmic Blueprint — Professional Astrological Intelligence" },
      {
        property: "og:description",
        content: "Swiss Ephemeris-powered natal and synastry intelligence.",
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
    if (result.error) {
      setError(`Sign-in failed: ${result.error.message}`);
    }
    if (result.redirected) return;
  }

  async function handleAppleSignIn() {
    analyticsEvent("Auth Started", { provider: "apple" });
    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError(`Apple sign-in failed: ${result.error.message}`);
    }
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
      if (typeof window === "undefined") {
        throw new Error("Chart calculation can only run in the browser.");
      }
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
        document
          .getElementById("partner-chart-result")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e) {
      analyticsEvent("Partner Chart Failed");
      setError((e as Error).message || "Partner chart calculation failed.");
    } finally {
      setPartnerBusy(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/20 blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4 py-10 md:py-16">
        <header className="mb-12 text-center">
          <div className="flex items-center justify-between mb-8">
            <Link to="/" className="font-display text-xl tracking-wide text-gold">
              COSMIC BLUEPRINT
            </Link>
            <div className="flex items-center gap-3">
              {!authLoading &&
                (user ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground hidden sm:inline">
                      {user.name || user.email}
                    </span>
                    {isAdmin && (
                      <Link
                        to="/admin/reports"
                        className="text-xs uppercase tracking-wider px-3 py-1.5 rounded-md border border-gold/40 text-gold hover:bg-gold/10 transition"
                      >
                        Admin
                      </Link>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="text-xs uppercase tracking-wider px-3 py-1.5 rounded-md border border-border/50 text-muted-foreground hover:text-foreground hover:border-gold/40 transition"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGoogleSignIn}
                      className="inline-flex items-center gap-2 text-xs uppercase tracking-wider px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition"
                    >
                      Sign in with Google
                    </button>
                    <button
                      onClick={handleAppleSignIn}
                      className="inline-flex items-center gap-2 text-xs uppercase tracking-wider px-4 py-2 rounded-md bg-foreground text-background hover:opacity-90 transition"
                    >
                      Sign in with Apple
                    </button>
                  </div>
                ))}
            </div>
          </div>
          <h1 className="font-display text-5xl md:text-7xl text-gradient-gold mb-6 leading-tight relative">
            The Stars,
            <br />
            Calculated Precisely
          </h1>
          <p className="max-w-2xl mx-auto text-muted-foreground text-lg leading-relaxed relative">
            Production-grade natal & synastry charts powered by{" "}
            <span className="text-gold">Swiss Ephemeris</span>. Tropical zodiac. Placidus houses.
            Geocentric Western astrology. No approximations, ever.
          </p>
        </header>

        {showWelcome && user && (
          <WelcomeModal open={showWelcome} onDismiss={dismissWelcome} />
        )}

        {!user && !authLoading ? (
          <div className="max-w-xl mx-auto glass rounded-2xl p-8 text-center shadow-deep">
            <p className="text-xs uppercase tracking-[0.3em] text-gold mb-3">Members only</p>
            <h2 className="font-display text-3xl text-gradient-gold mb-3">
              Sign in to access your Cosmic Blueprint
            </h2>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              Sign in with Google or Apple before the birth form and premium report library become
              available.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={handleGoogleSignIn}
                className="inline-flex items-center gap-2 text-sm uppercase tracking-wider px-6 py-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition"
              >
                Sign in with Google
              </button>
              <button
                onClick={handleAppleSignIn}
                className="inline-flex items-center gap-2 text-sm uppercase tracking-wider px-6 py-3 rounded-md bg-foreground text-background hover:opacity-90 transition"
              >
                Sign in with Apple
              </button>
            </div>
          </div>
        ) : (
          <>
            <section className="grid lg:grid-cols-2 gap-8 items-start">
              <BirthForm
                onSubmit={handleCalc}
                busy={busy}
                isAuthed={!!user}
                showSample={isAdmin}
                onSignIn={handleGoogleSignIn}
              />
              <div className="glass rounded-2xl p-6 shadow-deep space-y-5 text-sm">
                <h2 className="font-display text-xl text-gradient-gold">What you get</h2>
                <ul className="space-y-2.5 text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="text-gold shrink-0">✦</span> All 10 classical planets, Chiron,
                    North/South Nodes, Lilith
                  </li>
                  <li className="flex gap-3">
                    <span className="text-gold shrink-0">✦</span> Ascendant, Midheaven, Vertex, Part of
                    Fortune
                  </li>
                  <li className="flex gap-3">
                    <span className="text-gold shrink-0">⚯</span> True two-chart synastry with
                    cross-aspects & house overlays
                  </li>
                  <li className="flex gap-3">
                    <span className="text-gold shrink-0">★</span> Premium reports including THE
                    RELATIONSHIP CRIME SCENE™
                  </li>
                </ul>
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
                        Add a second birth chart to unlock two-chart reports and see partner wheel,
                        placements, and cross-aspects.
                      </p>
                    </div>
                    {partnerChart ? (
                      <div className="text-right">
                        <p className="text-sm text-gold font-medium">{partnerChart.input.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {partnerChart.input.date} · {partnerChart.input.place}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setPartnerChart(null);
                            setShowPartnerForm(true);
                          }}
                          className="mt-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-gold transition"
                        >
                          Replace partner chart
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowPartnerForm((v) => !v)}
                        className="px-5 py-2.5 rounded-xl border border-gold/50 text-gold text-xs uppercase tracking-widest hover:bg-gold/10 transition"
                      >
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
                      <h2 className="font-display text-3xl text-gradient-gold">
                        {partnerChart.input.name}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-2">
                        {partnerChart.input.date} · {partnerChart.input.time} ·{" "}
                        {partnerChart.input.place}
                      </p>
                    </div>
                    <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-start">
                      <div className="glass rounded-2xl p-6 shadow-deep">
                        <ChartWheel chart={partnerChart} />
                      </div>
                      <PlacementsTable chart={partnerChart} />
                    </div>
                    <div className="glass rounded-2xl p-6 shadow-deep space-y-3">
                      {(() => {
                        const syn = computeSynastry(chart, partnerChart);
                        return (
                          <>
                            <h3 className="font-display text-xl text-gradient-gold">
                              Cross-chart aspects ({syn.aspects.length})
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              Tightest contacts between {chart.input.name} and{" "}
                              {partnerChart.input.name}.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              {syn.aspects.slice(0, 24).map((a, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between bg-card/50 rounded-md px-3 py-2 border border-border/40"
                                >
                                  <span>
                                    <span className="text-gold">{a.a}</span> {a.type}{" "}
                                    <span className="text-gold">{a.b}</span>
                                  </span>
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {a.orb.toFixed(2)}°
                                  </span>
                                </div>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                <ReportsPanel chart={chart} partnerChart={partnerChart} />
              </section>
            )}
          </>
        )}

        <footer className="mt-24 pt-8 border-t border-border/40 text-center text-xs text-muted-foreground">
          Swiss Ephemeris © Astrodienst AG · Licensed under GPL v3 · Cosmic Blueprint platform
        </footer>
      </div>
    </div>
  );
}
