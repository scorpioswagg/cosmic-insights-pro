import { defineMcp } from "@lovable.dev/mcp-js";
import listReports from "./tools/list-reports";
import getReportDetails from "./tools/get-report-details";
import listCategories from "./tools/list-categories";

export default defineMcp({
  name: "cosmic-blueprint-mcp",
  title: "Cosmic Blueprint",
  version: "0.1.0",
  instructions:
    "Tools for browsing the Cosmic Blueprint astrology report catalog. Use `list_categories` to see report groupings, `list_reports` to browse (optionally filtered by category), and `get_report_details` to fetch the full definition of a specific report.",
  tools: [listCategories, listReports, getReportDetails],
});