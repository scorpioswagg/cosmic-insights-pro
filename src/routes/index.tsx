import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { BirthForm } from "@/components/astrology/BirthForm";
import { ChartWheel } from "@/components/astrology/ChartWheel";
import { PlacementsTable } from "@/components/astrology/PlacementsTable";
import { ReportsPanel } from "@/components/astrology/ReportsPanel";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { WelcomeModal } from "@/components/WelcomeModal";
import { getIsAdmin } from "@/lib/reports/catalog.functions";
import type { BirthInput, ChartCalculation } from "@/lib/astrology/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cosmic Blueprint — Professional Astrological Intelligence" },
      {
        name: "description",
        content:
          "Generate the most accurate natal and synastry charts powered by Swiss Ephemeris. Tropical zodiac, Placidus houses, geocentric Western astrology.",
      },
      { property: "og:title", content: "Cosmic Blueprint" },
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
  const [busy, setBusy] = useState(false);
  const [partnerBusy, setPartnerBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadAuth(
      u: { id: string; email?: string | null; user_metadata?: { full_name?: string } } | null,
    ) {
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
      getIsAdmin()
        .then((r) => mounted && setIsAdmin(r.isAdmin))
        .catch(() => mounted && setIsAdmin(false));
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
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError(`Sign-in failed: ${result.error.message}`);
    }
    if (result.redirected) {
      return;
    }
  }

  async function handleAppleSignIn() {
    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError(`Sign-in failed: ${result.error.message}`);
    }
    if (result.redirected) {
      return;
    }
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
      requestAnimationFrame(() => {
        document.getElementById("chart-result")?.scrollIntoView({ behavior: "smooth" });
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePartnerCalc(input: BirthInput) {
    setPartnerBusy(true);
    setError(null);
    try {
      if (typeof window === "undefined") {
        throw new Error("Chart calculation can only run in the browser.");
      }
      const { calculateChart } = await import("@/lib/astrology/swisseph-client");
      const c = await calculateChart(input);
      setPartnerChart(c);
      setShowPartnerForm(false);
      requestAnimationFrame(() => {
        document.getElementById("partner-chart-result")?.scrollIntoView({ behavior: "smooth" });
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPartnerBusy(false);
    }
  }

  return (
    <div className="starfield relative min-h-screen">
      <WelcomeModal open={showWelcome} onDismiss={dismissWelcome} />
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16 md:py-24">
        <header className="text-center mb-16 relative">
          <div className="absolute inset-0 pointer-events-none opacity-30" aria-hidden>
            <div className="absolute top-0 left-1/4 w-32 h-32 rounded-full bg-gold/5 blur-3xl" />
            <div className="absolute top-10 right-1/4 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
          </div>
          <div className="flex items-center justify-center gap-3 mb-4 relative">
            <p className="text-xs uppercase tracking-[0.4em] text-gold">Cosmic Blueprint</p>
            <div className="ml-auto flex items-center gap-3">
              <Link
                to="/academy"
                className="text-xs uppercase tracking-wider px-3 py-1.5 rounded-md border border-gold/40 text-gold hover:bg-gold/10 transition"
              >
                Learn Astrology
              </Link>
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
            Production-grade natal &amp; synastry charts powered by{" "}
            <span className="text-gold">Swiss Ephemeris</span>. Tropical zodiac. Placidus houses.
            Geocentric Western astrology. No approximations, ever.
          </p>
        </header>

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
                cross-aspects &amp; house overlays
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
                    Add a second birth chart to unlock two-chart reports such as THE RELATIONSHIP
                    CRIME SCENE™, THE CHEMISTRY AUTOPSY™, and THE POWER STRUGGLE™.
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
                    bare
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
              </div>
            )}

            <ReportsPanel chart={chart} partnerChart={partnerChart} />
          </section>
        )}

        <footer className="mt-24 pt-8 border-t border-border/40 text-center text-xs text-muted-foreground">
          Swiss Ephemeris © Astrodienst AG · Licensed under GPL v3 · Cosmic Blueprint platform
        </footer>
      </div>
    </div>
  );
}
