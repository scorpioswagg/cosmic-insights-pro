import { REPORTS as BASE_REPORTS } from "./reports-catalog-base";
import { UNFILTERED_SERIES_REPORTS } from "./unfiltered-series-catalog";

export type { ReportDefinition } from "./reports-catalog-base";
import type { ReportDefinition } from "./reports-catalog-base";

/**
 * Canonical Cosmic Blueprint catalog.
 *
 * The legacy/base catalog remains intact in reports-catalog-base.ts. The
 * Unfiltered Series is layered on here and de-duplicated by stable report ID,
 * so existing products are never duplicated if they are already present in
 * the base catalog.
 */
export const REPORTS: ReportDefinition[] = Array.from(
  new Map(
    [...BASE_REPORTS, ...UNFILTERED_SERIES_REPORTS].map((report) => [report.id, report]),
  ).values(),
);
