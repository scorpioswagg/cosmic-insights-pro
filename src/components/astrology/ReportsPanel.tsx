import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import type { ChartCalculation } from "@/lib/astrology/types";
import { REPORTS } from "@/lib/astrology/reports-catalog";
import { generateAstroReport } from "@/lib/astrology/generate-report.functions";
import { acknowledgeAdultConsent } from "@/lib/astrology/adult-consent.functions";
import { supabase } from "@/integrations/supabase/client";
import { listPublishedReports, getIsAdmin } from "@/lib/reports/catalog.functions";
import { createReportCheckout, getMyAccess } from "@/lib/reports/checkout.functions";
import { createBundleCheckout } from "@/lib/reports/bundle-checkout.functions";
import { GIFT_BUNDLES, bundlePricing } from "@/lib/reports/bundles";
import { formatPrice } from "@/lib/reports/pricing";
import { downloadLuxuryReportPdf } from "@/lib/astrology/luxury-pdf";

interface GeneratedReport {
  reportId: string;
  title: string;
  markdown: string;
  generatedAt: string;
}

export function ReportsPanel({
  chart,
  partnerChart = null,
}: {
  chart: ChartCalculation;
  partnerChart?: ChartCalculation | null;
}) {
  const runReport = useServerFn(generateAstroReport);
  const runAckAdult = useServerFn(acknowledgeAdultConsent);
  const fetchCatalog = useServerFn(listPublishedReports);
  const fetchIsAdmin = useServerFn(getIsAdmin);
  const fetchAccess = useServerFn(getMyAccess);
  const startCheckout = useServerFn(createReportCheckout);
  const startBundleCheckout = useServerFn(createBundleCheckout);

  const { data: catalog } = useQuery({
    queryKey: ["published-report-products"],
    queryFn: () => fetchCatalog(),
  });
  const { data: adminInfo } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => fetchIsAdmin(),
    retry: false,
  });
  const isAdmin = !!adminInfo?.isAdmin;

  const { data: accessInfo } = useQuery({
    queryKey: ["my-report-access"],
    queryFn: () => fetchAccess(),
    retry: false,
  });
  const unlockedIds = new Set(accessInfo?.unlocked ?? []);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [purchasingBundleId, setPurchasingBundleId] = useState<string | null>(null);
  const [expandedBundleId, setExpandedBundleId] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [reports, setReports] = useState<Record<string, GeneratedReport>>({});
  const [error, setError] = useState<string | null>(null);
  const [adultUnlocked, setAdultUnlocked] = useState(false);
  const [bulk, setBulk] = useState<{
    label: string;
    current: number;
    total: number;
    currentTitle: string;
    failures: { title: string; message: string }[];
  } | null>(null);
  const isBulkRunning = bulk !== null;

  // Time-based progress estimate while a report is being written.
  const [genPct, setGenPct] = useState(0);
  useEffect(() => {
    if (!loadingId) {
      setGenPct(0);
      return;
    }
    const started = Date.now();
    setGenPct(3);
    const t = setInterval(() => {
      const secs = (Date.now() - started) / 1000;
      // Asymptotic approach to 95% over roughly two minutes.
      setGenPct(Math.min(95, Math.round(95 * (1 - Math.exp(-secs / 55)))));
    }, 500);
    return () => clearInterval(t);
  }, [loadingId]);

  function toChartPayload(c: ChartCalculation) {
    return {
      input: {
        name: c.input.name,
        date: c.input.date,
        time: c.input.time,
        place: c.input.place,
        latitude: c.input.latitude,
        longitude: c.input.longitude,
        timezone: c.input.timezone,
        timeUnknown: c.input.timeUnknown ?? false,
      },
      julianDayUT: c.julianDayUT,
      utcIso: c.utcIso,
      ascendant: c.ascendant,
      midheaven: c.midheaven,
      bodies: c.bodies.map((b) => ({
        name: b.name,
        longitude: b.longitude,
        sign: b.sign,
        signDegree: b.signDegree,
        house: b.house,
        retrograde: b.retrograde,
        speed: b.speed,
      })),
      houses: c.houses,
      aspects: c.aspects.slice(0, 80).map((a) => ({
        a: a.a, b: a.b, type: a.type, angle: a.angle, orb: a.orb, applying: a.applying,
      })),
    };
  }

  async function generate(reportId: string) {
    setError(null);
    const def = REPORTS.find((r) => r.id === reportId);
    if (def?.adult && !adultUnlocked) {
      const ok = typeof window !== "undefined" &&
        window.confirm(
          "This is an 18+ Intimacy report with explicit sexual content. Confirm you are 18 or older and want to proceed."
        );
      if (!ok) return;
      try { await runAckAdult({}); } catch (e) {
        setError((e as Error).message || "Could not record adult consent.");
        return;
      }
      setAdultUnlocked(true);
    }
    setActiveId(reportId);
    if (reports[reportId]) return;
    setLoadingId(reportId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session || sessionData.session.user.is_anonymous) {
        throw new Error("Please sign in with Google to generate reports.");
      }
      if (def?.requiresPartner && !partnerChart) {
        throw new Error(
          "This synastry report needs a second (partner) chart. Use the Partner Chart form above, then try again.",
        );
      }
      const chartPayload = toChartPayload(chart);
      const partnerPayload = partnerChart ? toChartPayload(partnerChart) : undefined;
      const result = await runReport({
        data: { reportId, chart: chartPayload, partnerChart: partnerPayload },
      });
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

  const priceById = new Map((catalog ?? []).map((p) => [p.id, p]));
  const visible = catalog && catalog.length > 0
    ? REPORTS.filter((r) => priceById.has(r.id))
    : REPORTS;

  const grouped = visible.reduce<Record<string, typeof REPORTS>>((acc, r) => {
    (acc[r.category] ||= []).push(r);
    return acc;
  }, {});

  const active = activeId ? reports[activeId] : null;

  function downloadReport(r: GeneratedReport) {
    const safe = r.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const content = `# ${r.title}\n\nFor ${chart.input.name}\nGenerated ${new Date(r.generatedAt).toLocaleString()}\n\n---\n\n${r.markdown}`;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safe}-${chart.input.name.replace(/\s+/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadReportPdf(r: GeneratedReport) {
    downloadLuxuryReportPdf(r, chart, partnerChart);
  }

  const intimacyReports = visible.filter((r) => r.adult);
  const patrioticReports = visible.filter((r) => r.category === "Patriotic Collection");

  async function ensureReport(
    reportId: string,
    opts: { throwOnError?: boolean } = {},
  ): Promise<GeneratedReport | null> {
    if (reports[reportId]) return reports[reportId];
    setLoadingId(reportId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session || sessionData.session.user.is_anonymous) {
        throw new Error("Please sign in with Google to generate reports.");
      }
      const def = REPORTS.find((r) => r.id === reportId);
      if (def?.requiresPartner && !partnerChart) {
        throw new Error(
          "This synastry report needs a second (partner) chart. Use the Partner Chart form above, then try again.",
        );
      }
      const chartPayload = toChartPayload(chart);
      const partnerPayload = partnerChart ? toChartPayload(partnerChart) : undefined;
      const result = await runReport({
        data: { reportId, chart: chartPayload, partnerChart: partnerPayload },
      });
      setReports((prev) => ({ ...prev, [reportId]: result }));
      return result;
    } catch (e) {
      if (opts.throwOnError) throw e;
      setError((e as Error).message || "Report generation failed.");
      return null;
    } finally {
      setLoadingId(null);
    }
  }

  async function generateOneAndDownloadPdf(reportId: string) {
    setError(null);
    const def = REPORTS.find((r) => r.id === reportId);
    if (def?.adult && !adultUnlocked) {
      const ok = typeof window !== "undefined" &&
        window.confirm("This is an 18+ Intimacy report. Confirm you are 18 or older.");
      if (!ok) return;
      try { await runAckAdult({}); } catch (e) {
        setError((e as Error).message || "Could not record adult consent.");
        return;
      }
      setAdultUnlocked(true);
    }
    const report = await ensureReport(reportId);
    if (report) downloadReportPdf(report);
  }

  async function generateAndDownloadAllIntimacyPdfs() {
    setError(null);
    if (!adultUnlocked) {
      const ok = typeof window !== "undefined" &&
        window.confirm(
          "You are about to generate and download every 18+ Intimacy report as PDFs. Confirm you are 18 or older."
        );
      if (!ok) return;
      try { await runAckAdult({}); } catch (e) {
        setError((e as Error).message || "Could not record adult consent.");
        return;
      }
      setAdultUnlocked(true);
    }
    await bulkGeneratePdfs("Intimacy reports", intimacyReports);
  }

  async function generateAndDownloadAllPatrioticPdfs() {
    setError(null);
    await bulkGeneratePdfs("Patriotic Collection", patrioticReports);
  }

  async function bulkGeneratePdfs(
    label: string,
    defs: typeof REPORTS,
  ) {
    if (defs.length === 0) return;
    if (isBulkRunning) return;
    setError(null);
    const failures: { title: string; message: string }[] = [];
    let completed = 0;
    setBulk({ label, current: 0, total: defs.length, currentTitle: defs[0].title, failures: [] });
    const toastId = toast.loading(`Preparing ${label}…`, {
      description: `0 of ${defs.length} ready`,
    });
    try {
      for (let i = 0; i < defs.length; i++) {
        const def = defs[i];
        setBulk((prev) =>
          prev ? { ...prev, current: i, currentTitle: def.title } : prev,
        );
        toast.loading(`Generating ${def.title}`, {
          id: toastId,
          description: `${i} of ${defs.length} ready`,
        });
        try {
          const report = await ensureReport(def.id, { throwOnError: true });
          if (!report) throw new Error("Report generation returned no content.");
          downloadReportPdf(report);
          completed += 1;
          setBulk((prev) =>
            prev ? { ...prev, current: i + 1 } : prev,
          );
        } catch (e) {
          const message = (e as Error).message || "Unknown error";
          failures.push({ title: def.title, message });
          setBulk((prev) =>
            prev
              ? { ...prev, current: i + 1, failures: [...prev.failures, { title: def.title, message }] }
              : prev,
          );
        }
      }

      if (failures.length === 0) {
        toast.success(`${label} ready`, {
          id: toastId,
          description: `Downloaded ${completed} of ${defs.length} PDFs.`,
        });
      } else if (completed === 0) {
        toast.error(`${label} failed`, {
          id: toastId,
          description: `None of the ${defs.length} reports could be generated. ${failures[0].message}`,
        });
        setError(
          `Bulk download failed. ${failures.map((f) => `${f.title}: ${f.message}`).join(" · ")}`,
        );
      } else {
        toast.warning(`${label} finished with issues`, {
          id: toastId,
          description: `${completed} of ${defs.length} downloaded. ${failures.length} failed — see details below.`,
        });
      }
    } finally {
      setTimeout(() => setBulk(null), 1500);
    }
  }

  const generatedList = REPORTS.filter((r) => reports[r.id]).map((r) => reports[r.id]);

  function priceLabel(id: string): string | null {
    if (isAdmin) return "Included";
    const p = priceById.get(id);
    if (!p) return null;
    if (p.is_free) return "Free";
    return formatPrice(p.price_cents);
  }

  function isUnlocked(id: string): boolean {
    if (isAdmin) return true;
    const p = priceById.get(id);
    if (!p) return true;
    if (p.is_free || p.price_cents <= 0) return true;
    return unlockedIds.has(id);
  }

  function statusLabel(id: string): string {
    if (isAdmin) return "🆓 Included";
    const p = priceById.get(id);
    if (p && (p.is_free || p.price_cents <= 0)) return "🆓 Free";
    return isUnlocked(id) ? "🔓 Unlocked" : "🔒 Locked";
  }

  async function purchase(reportId: string) {
    setError(null);
    setPurchasingId(reportId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session || sessionData.session.user.is_anonymous) {
        throw new Error("Please sign in with Google before purchasing.");
      }
      const res = await startCheckout({ data: { reportId } });
      if (res.alreadyOwned) {
        toast.success("You already own this report.");
        return;
      }
      if (!res.url) throw new Error("Stripe did not return a checkout URL.");
      window.location.assign(res.url);
    } catch (e) {
      const msg = (e as Error).message || "Could not start checkout.";
      setError(msg);
      toast.error(msg);
    } finally {
      setPurchasingId(null);
    }
  }

  async function purchaseBundle(bundleId: string) {
    setError(null);
    setPurchasingBundleId(bundleId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session || sessionData.session.user.is_anonymous) {
        throw new Error("Please sign in with Google before purchasing.");
      }
      const res = await startBundleCheckout({ data: { bundleId } });
      if (!res.url) throw new Error("Stripe did not return a checkout URL.");
      window.location.assign(res.url);
    } catch (e) {
      const msg = (e as Error).message || "Could not start checkout.";
      setError(msg);
      toast.error(msg);
    } finally {
      setPurchasingBundleId(null);
    }
  }

  return (
    <section className="space-y-8">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-gold mb-2">Premium Reports</p>
        <h2 className="font-display text-4xl text-gradient-gold">{visible.length} Astrological Reports</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl mx-auto">
          Each report is generated from your real Swiss Ephemeris chart data — no templates, no guesswork.
        </p>
        {partnerChart ? (
          <p className="mt-3 text-xs text-gold">
            ✦ Partner chart loaded: <span className="font-medium">{partnerChart.input.name}</span> — synastry reports are ready.
          </p>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Synastry (two-chart) reports require a partner chart. Scroll up to add one, then return here.
          </p>
        )}
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">
          Gift Sets & Bundles
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {GIFT_BUNDLES.map((bundle) => {
            const pricing = bundlePricing(bundle);
            if (pricing.count === 0) return null;
            const titles = bundle.reportIds
              .map((id) => REPORTS.find((r) => r.id === id)?.title)
              .filter((t): t is string => !!t);
            const expanded = expandedBundleId === bundle.id;
            const shown = expanded ? titles : titles.slice(0, 6);
            const owned = titles.length > 0 && bundle.reportIds.every((id) => isUnlocked(id));
            const pct = pricing.listCents
              ? Math.round((pricing.savingsCents / pricing.listCents) * 100)
              : 0;
            return (
              <div
                key={bundle.id}
                className="glass rounded-xl border border-border/50 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-display text-lg text-gradient-gold">{bundle.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{bundle.description}</p>
                  </div>
                  {owned && (
                    <span className="text-[10px] uppercase tracking-widest text-gold border border-gold/40 rounded px-2 py-0.5 shrink-0">
                      Owned
                    </span>
                  )}
                </div>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {shown.map((t) => (
                    <li key={t}>· {t}</li>
                  ))}
                  {titles.length > 6 && (
                    <li>
                      <button
                        type="button"
                        onClick={() => setExpandedBundleId(expanded ? null : bundle.id)}
                        className="text-gold hover:underline"
                      >
                        {expanded ? "Show less" : `+${titles.length - 6} more`}
                      </button>
                    </li>
                  )}
                </ul>
                <div className="flex items-center justify-between pt-1">
                  <div className="text-sm">
                    {isAdmin ? (
                      <span className="text-gold">Included</span>
                    ) : (
                      <>
                        <span className="text-foreground font-medium">{formatPrice(pricing.saleCents)}</span>
                        {pct > 0 && (
                          <span className="text-xs text-muted-foreground ml-2 line-through">
                            {formatPrice(pricing.listCents)}
                          </span>
                        )}
                        {pct > 0 && (
                          <span className="text-xs text-gold ml-2">Save {pct}%</span>
                        )}
                      </>
                    )}
                  </div>
                  {!owned && !isAdmin && (
                    <button
                      type="button"
                      disabled={purchasingBundleId === bundle.id}
                      onClick={() => void purchaseBundle(bundle.id)}
                      className="text-[11px] uppercase tracking-widest px-3 py-1.5 rounded-md bg-gold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      {purchasingBundleId === bundle.id ? "…" : "Buy bundle"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="glass rounded-xl p-4 border border-destructive/50 text-destructive text-sm">
          {error}
        </div>
      )}

      {Object.entries(grouped).map(([category, list]) => {
        const built = list.filter((r) => reports[r.id]).length;
        const catPct = list.length ? Math.round((built / list.length) * 100) : 0;
        return (
        <div key={category}>
          <div className="mb-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{category}</h3>
              <span className="text-[11px] text-muted-foreground">
                {built} of {list.length} built
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-border/60 overflow-hidden">
              <div
                className="h-full rounded-full bg-gold transition-all duration-500"
                style={{ width: `${catPct}%` }}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((r) => {
              const isDone = !!reports[r.id];
              const isLoading = loadingId === r.id;
              const unlocked = isUnlocked(r.id);
              const isPurchasing = purchasingId === r.id;
              return (
                <div
                  key={r.id}
                  id={`report-${r.id}`}
                  className="group glass rounded-xl border border-border/50 p-4 hover:border-gold/40 transition"
                >
                  <button
                    type="button"
                    disabled={isLoading || isBulkRunning}
                    onClick={() => (unlocked ? generate(r.id) : purchase(r.id))}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-2xl" aria-hidden>{r.icon}</span>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {isLoading ? "Generating…" : isDone ? "Ready" : statusLabel(r.id)}
                      </span>
                    </div>
                    <h4 className="font-display text-lg text-foreground group-hover:text-gradient-gold">
                      {r.title}
                    </h4>
                    {r.requiresPartner && (
                      <span className="inline-block mt-1 text-[10px] uppercase tracking-widest text-gold border border-gold/40 rounded px-2 py-0.5">
                        Two-chart synastry{partnerChart ? " · ready" : " · needs partner"}
                      </span>
                    )}
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{r.tagline}</p>
                  </button>

                  {isLoading && (
                    <div className="mt-3 space-y-1">
                      <div className="h-1.5 w-full rounded-full bg-border/60 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gold transition-all duration-500"
                          style={{ width: `${genPct}%` }}
                        />
                      </div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Writing your report · {genPct}%
                      </p>
                    </div>
                  )}

                  {unlocked && !isLoading && (
                    <button
                      onClick={(e) => { e.stopPropagation(); void generate(r.id); }}
                      disabled={isBulkRunning || (r.requiresPartner && !partnerChart)}
                      className="mt-3 w-full block text-[11px] uppercase tracking-widest text-background bg-gold rounded-md py-2 hover:bg-gold/90 transition disabled:opacity-50"
                    >
                      {r.requiresPartner && !partnerChart
                        ? "Add partner details first"
                        : isDone
                          ? "↻ Regenerate report"
                          : "✦ Generate report"}
                    </button>
                  )}

                  {isDone && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadReport(reports[r.id]); }}
                        className="text-[11px] uppercase tracking-widest text-gold border border-gold/40 rounded-md py-1.5 hover:bg-gold/10 transition"
                      >
                        ↓ .md
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadReportPdf(reports[r.id]); }}
                        className="text-[11px] uppercase tracking-widest text-gold border border-gold/40 rounded-md py-1.5 hover:bg-gold/10 transition"
                      >
                        ↓ PDF
                      </button>
                    </div>
                  )}
                  {!unlocked && (
                    <button
                      onClick={(e) => { e.stopPropagation(); void purchase(r.id); }}
                      disabled={isPurchasing}
                      className="mt-3 text-[11px] uppercase tracking-widest text-background bg-gold rounded-md py-2 hover:bg-gold/90 transition disabled:opacity-50"
                    >
                      {isPurchasing
                        ? "Opening secure checkout…"
                        : `💳 Purchase Report · ${priceLabel(r.id) ?? ""}`}
                    </button>
                  )}
                  {unlocked && !isDone && r.adult && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void generateOneAndDownloadPdf(r.id);
                      }}
                      disabled={isLoading}
                      className="mt-3 text-[11px] uppercase tracking-widest text-gold/80 border border-gold/30 rounded-md py-1.5 hover:bg-gold/10 transition disabled:opacity-50"
                    >
                      ↓ Generate & download PDF
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        );
      })}

      {bulk && (
        <div className="glass rounded-xl p-4 border border-gold/30 text-sm">
          <p className="text-gold font-medium">{bulk.label}</p>
          <p className="text-muted-foreground mt-1">
            {bulk.current} of {bulk.total} — {bulk.currentTitle}
          </p>
          {bulk.failures.length > 0 && (
            <ul className="mt-2 text-xs text-destructive space-y-1">
              {bulk.failures.map((f) => (
                <li key={f.title}>{f.title}: {f.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {generatedList.length > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <p className="text-xs text-muted-foreground">
            {generatedList.length} reports ready to download.
          </p>
          <button
            type="button"
            onClick={() => generatedList.forEach(downloadReport)}
            className="text-xs uppercase tracking-widest px-4 py-2 rounded-md border border-gold/40 text-gold hover:bg-gold/10"
          >
            Download all .md
          </button>
        </div>
      )}

      {active && (
        <article className="glass rounded-2xl p-6 md:p-10 shadow-deep prose prose-invert max-w-none">
          <header className="mb-8 not-prose">
            <p className="text-xs uppercase tracking-[0.3em] text-gold mb-2">Report</p>
            <h2 className="font-display text-3xl text-gradient-gold">{active.title}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              For {chart.input.name} · generated {new Date(active.generatedAt).toLocaleString()}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => downloadReport(active)}
                className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-md border border-gold/40 text-gold hover:bg-gold/10"
              >
                ↓ Markdown
              </button>
              <button
                type="button"
                onClick={() => downloadReportPdf(active)}
                className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-md border border-gold/40 text-gold hover:bg-gold/10"
              >
                ↓ PDF
              </button>
            </div>
          </header>
          <ReactMarkdown>{active.markdown}</ReactMarkdown>
        </article>
      )}
    </section>
  );
}
