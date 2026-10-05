import { track } from "@vercel/analytics";

type EventData = Record<string, string | number | boolean | null>;

export function analyticsEvent(
  name:
    | "Auth Started"
    | "Chart Calculated"
    | "Chart Calculation Failed"
    | "Partner Chart Calculated"
    | "Partner Chart Failed"
    | "Report Generated"
    | "Report Generation Failed"
    | "Report Downloaded"
    | "Report PDF Downloaded"
    | "Checkout Started"
    | "Bulk Reports Started"
    | "Bulk Reports Finished",
  data: EventData = {},
) {
  if (typeof window === "undefined") return;
  try {
    void track(name, data);
  } catch {
    // Analytics must never interrupt the user's Cosmic Blueprint workflow.
  }
}
