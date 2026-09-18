export interface ReportDefinition {
  id: string;
  title: string;
  tagline: string;
  icon: string;
  category: "Core" | "Relationships" | "Growth" | "Timing" | "Vocation" | "Esoteric" | "Intimacy (18+)" | "Patriotic Collection" | "Signature Series" | "Frontier Series" | "Oracle Vault" | "Unfiltered Series";
  /** Marks reports with mature/explicit sexual content. UI should gate behind an 18+ confirmation. */
  adult?: boolean;
  /** Sections the LLM must produce, in order. */
  sections: string[];
  /** Approx target length in words for the whole report. */
  targetWords: number;
  /** Specialized framing handed to the LLM. */
  systemFraming: string;
  /** True when the report needs a second or additional participant chart(s). */
  requiresPartner?: boolean;
  /** Minimum number of charts required by the report. Defaults to 1. */
  minCharts?: number;
  /** Maximum number of charts accepted by the report. Defaults to 2 for partner reports. */
  maxCharts?: number;
  seoTitle?: string;
  seoDescription?: string;
  estimatedPages?: number;
  readingMinutes?: number;
  difficulty?: string;
}

export const REPORTS: ReportDefinition[] = [
  {
    id: "natal-essence",
    title: "Natal Essence",
    tagline: "The complete portrait of your birth chart.",
    icon: "☉",
    category: "Core",
    targetWords: 1400,
    sections: [
      "Overview & Cosmic Signature",
      "The Big Three (Sun, Moon, Rising)",
      "Personal Planets (Mercury, Venus, Mars)",
      "Social & Generational Planets",
      "Elemental & Modality Balance",
      "Defining Aspects",
      "Integration & Path Forward",
    ],