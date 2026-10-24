import { createFileRoute } from "@tanstack/react-router";
import { IndexPage } from "./index-page";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cosmic Blueprint — Astrology Stripped of Platitudes. Powered by Precision." },
      {
        name: "description",
        content:
          "Book-length natal dossiers and forensic synastry calculated with real Swiss Ephemeris astronomical accuracy. Free chart snapshot. 150+ in-depth reports.",
      },
      { property: "og:title", content: "Cosmic Blueprint — Astrology Stripped of Platitudes. Powered by Precision." },
      {
        property: "og:description",
        content: "Swiss Ephemeris-powered natal and synastry intelligence. No vague positivity.",
      },
    ],
  }),
  component: IndexPage,
});
