import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listReports from "./tools/list-reports";
import getReportDetails from "./tools/get-report-details";
import listCategories from "./tools/list-categories";

// OAuth issuer MUST be the direct Supabase host (not the .lovable.cloud proxy).
// VITE_SUPABASE_PROJECT_ID is inlined by Vite at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "cosmic-blueprint-mcp",
  title: "Cosmic Blueprint",
  version: "0.1.0",
  instructions:
    "Tools for browsing the Cosmic Blueprint astrology report catalog. Use `list_categories` to see report groupings, `list_reports` to browse (optionally filtered by category), and `get_report_details` to fetch the full definition of a specific report.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCategories, listReports, getReportDetails],
});