import { useState } from "react";
import { REPORTS, type ReportDefinition } from "@/lib/astrology/reports-catalog";
import { GIFT_BUNDLES, bundlePricing } from "@/lib/reports/bundles";
import { defaultPriceCents, formatPrice } from "@/lib/reports/pricing";

const TABS = ["Flagship Natal", "Unfiltered (18+)", "Synastry & Love", "Gift Sets"] as const;

function filterReports(tab: number): ReportDefinition[] {
  if (tab === 0) {
    return REPORTS.filter(
      (r) =>
        !r.requiresPartner &&
        !r.adult &&
        r.category !== "Unfiltered Series" &&
        [
          "Core",
          "Signature Series",
          "Oracle Vault",
          "Frontier Series",
          "Growth",
          "Timing",
          "Vocation",
          "Esoteric",
          "Patriotic Collection",
        ].includes(r.category),
    );
  }
  if (tab === 1) {
    return REPORTS.filter((r) => r.category === "Unfiltered Series" || r.adult);
  }
  if (tab === 2) {
    return REPORTS.filter(
      (r) =>
        r.requiresPartner ||
        r.category === "Relationships" ||
        r.category === "Intimacy (18+)" ||
        r.id.includes("synastry") ||
        r.id.includes("relationship") ||
        r.id.includes("chemistry") ||
        r.id.includes("love"),
    );
  }
  return [];
}

export function CatalogSection() {
  const [tab, setTab] = useState(0);
  const reports = filterReports(tab);

  return (
    <section id="catalog" className="px-4 md:px-8 py-16 max-w-5xl mx-auto">
      <p className="text-xs uppercase tracking-[0.2em] text-gold mb-2">The Catalog</p>
      <h2 className="font-display text-3xl md:text-4xl text-foreground mb-3">
        150+ Reports. Organized by Depth.
      </h2>
      <p className="text-muted-foreground mb-8 max-w-xl">
        Every report is calculated from your exact astronomical positions. Choose the depth you need.
      </p>

      <div className="flex flex-wrap gap-2 mb-8 border-b border-border/40 pb-3">
        {TABS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setTab(i)}
            className={`text-sm px-4 py-2 rounded-md transition ${
              tab === i
                ? "bg-gold/15 text-gold"
                : "text-muted-foreground hover:text-gold hover:bg-gold/5"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 3 ? (
        <div className="grid sm:grid-cols-2 gap-5">
          {GIFT_BUNDLES.map((bundle) => {
            const pricing = bundlePricing(bundle);
            return (
              <div
                key={bundle.id}
                className="glass rounded-2xl p-6 shadow-deep flex flex-col border border-border/40 hover:border-gold/40 transition"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="font-mono text-lg text-gold">{formatPrice(pricing.saleCents)}</p>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    Save {Math.round(bundle.discount * 100)}%
                  </span>
                </div>
                <h3 className="font-display text-xl text-foreground mb-1">
                  {bundle.icon} {bundle.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">{bundle.tagline}</p>
                <p className="text-xs text-muted-foreground/80 flex-grow mb-5">{bundle.giftNote}</p>
                <p className="text-xs text-gold/80 mb-4">
                  {bundle.reportIds.length} reports · was {formatPrice(pricing.listCents)}
                </p>
                <a
                  href="#hook"
                  className="text-center text-xs uppercase tracking-wider py-2.5 rounded-lg bg-gold text-primary-foreground hover:opacity-95 transition"
                >
                  Calculate chart & unlock
                </a>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((r) => {
              const cents = defaultPriceCents(r);
              return (
                <div
                  key={r.id}
                  className="glass rounded-2xl p-5 shadow-deep flex flex-col border border-border/40 hover:border-gold/40 transition"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="font-mono text-base text-gold">{formatPrice(cents)}</p>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate max-w-[45%]">
                      {r.category}
                    </span>
                  </div>
                  <h3 className="font-display text-lg text-foreground mb-1 leading-snug">
                    {r.icon ? `${r.icon} ` : ""}
                    {r.title}
                  </h3>
                  <p className="text-sm text-muted-foreground flex-grow mb-4 line-clamp-3">{r.tagline}</p>
                  <div className="flex gap-2">
                    <a
                      href="#samples"
                      className="flex-1 text-center text-[11px] uppercase tracking-wider py-2 rounded-lg border border-gold/40 text-gold hover:bg-gold/10 transition"
                    >
                      Sample
                    </a>
                    <a
                      href="#hook"
                      className="flex-1 text-center text-[11px] uppercase tracking-wider py-2 rounded-lg bg-gold text-primary-foreground hover:opacity-95 transition"
                    >
                      Get Report
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
          {reports.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">No reports in this tab yet.</p>
          )}
          <p className="text-center text-sm text-muted-foreground mt-8">
            Showing {reports.length} of {REPORTS.length}+ reports.{" "}
            <a href="#hook" className="text-gold hover:underline">
              Calculate your chart
            </a>{" "}
            to unlock the full library, purchase, and generate any report.
          </p>
        </>
      )}
    </section>
  );
}
