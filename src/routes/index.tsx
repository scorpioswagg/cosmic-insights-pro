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
import { REPORTS, type ReportDefinition } from "@/lib/astrology/reports-catalog";
import { GIFT_BUNDLES, bundlePricing } from "@/lib/reports/bundles";
import { defaultPriceCents, formatPrice } from "@/lib/reports/pricing";
import { analyticsEvent } from "@/lib/analytics";

// NOTE: Full file content loaded from local patched index.tsx — see follow-up if truncated
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cosmic Blueprint — Astrology Stripped of Platitudes. Powered by Precision." },
    ],
  }),
  component: Index,
});

function Index() {
  return <div>Loading catalog rebuild…</div>;
}
