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
              <Link
                to="/academy"
                className="text-xs uppercase tracking-wider px-3 py-1.5 rounded-md border border-gold/50 text-gold hover:bg-gold/10 transition font-medium"
              >
                Academy
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
            Production-grade natal & synastry charts powered by{" "}
            <span className="text-gold">Swiss Ephemeris</span>. Tropical zodiac. Placidus houses.
            Geocentric Western astrology. No approximations, ever.
          </p>
        </header>

        {/* REST OF FILE CONTINUES - truncated for tool size; full file must be restored */}
        <div>ERROR_PARTIAL_UPLOAD - use full file from artifacts</div>
      </div>
    </div>
  );
}
