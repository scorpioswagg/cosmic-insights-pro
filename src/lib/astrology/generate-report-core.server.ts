import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { REPORTS } from "./reports-catalog";
import type { ChartCalculation } from "./types";

function fmtDeg(d: number) {
  const deg = Math.floor(d);
  const min = Math.round((d - deg) * 60);
  return `${deg}°${String(min).padStart(2, "0")}'`;
}

function chartToPrompt(chart: ChartCalculation) {
  const bodies = chart.bodies
    .map((b) =>
      `- ${b.name}: ${b.sign} ${fmtDeg(b.signDegree)}${
        b.house ? ` (House ${b.house})` : ""
      }${b.retrograde ? " ℞" : ""}`,
    )
    .join("\n");
  const houses = chart.houses
    .map((cusp, i) => `  H${i + 1}: ${fmtDeg(cusp % 30)} (${cusp.toFixed(2)}°)`)
    .join("\n");
  const aspects = chart.aspects
    .slice(0, 40)
    .map((a) => `- ${a.a} ${a.type} ${a.b} (orb ${a.orb.toFixed(2)}°, ${a.applying ? "applying" : "separating"})`)
    .join("\n");
  return `BIRTH:
- Name: ${chart.input.name}
- Date/Time: ${chart.input.date} ${chart.input.time} (${chart.input.timezone})
- Place: ${chart.input.place} (${chart.input.latitude.toFixed(4)}, ${chart.input.longitude.toFixed(4)})
- UTC: ${chart.utcIso}  JD(UT): ${chart.julianDayUT.toFixed(5)}

PLACEMENTS:
${bodies}

ANGLES:
- Ascendant: ${chart.ascendant.toFixed(4)}°
- Midheaven: ${chart.midheaven.toFixed(4)}°

HOUSE CUSPS (Placidus):
${houses}

ASPECTS (top 40 by tightness):
${aspects}`;
}

export interface GeneratedReportPayload {
  reportId: string;
  title: string;
  markdown: string;
  generatedAt: string;
}

export async function generateReportMarkdown(input: {
  reportId: string;
  chart: ChartCalculation;
}): Promise<GeneratedReportPayload> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const def = REPORTS.find((r) => r.id === input.reportId);
  if (!def) throw new Error(`Unknown report: ${input.reportId}`);

  const gateway = createLovableAiGatewayProvider(key);
  const chartBlock = chartToPrompt(input.chart);

  const system = `You are a master astrologer writing for the Cosmic Blueprint platform.

ABSOLUTE RULES:
- Use ONLY the placements, houses, and aspects given. Never invent or hallucinate any position, aspect, degree, or house assignment.
- Reference SPECIFIC placements by name (e.g., "your Moon in Cancer in the 4th House").
- Tropical zodiac, Placidus houses, geocentric Western astrology.
- Do not predict literal future events; describe patterns, energies, and choices.
- Use markdown: H2 (##) per section, H3 (###) for subsections. No emojis.
- Maintain a literate, grounded, modern psychological-astrology voice.

CHAPTER BINDING RULES (STRICT):
- Every chapter (## section) MUST open with a short "Chart Anchors" line in italics listing the exact placements and aspects from the CHART DATA that this chapter interprets.
- Every paragraph MUST explicitly cite at least one real placement, house cusp, or aspect from the CHART DATA.
- Never write a paragraph of generic astrology with no citation.
- Do not paraphrase placements in ways that change the data.

REPORT FRAMING:
${def.systemFraming}`;

  const sectionsList = def.sections.map((s, i) => `${i + 1}. ${s}`).join("\n");
  const prompt = `Write the **${def.title}** report for ${input.chart.input.name}.

Target length: ~${def.targetWords} words.

Required sections (use exactly these as ## H2 headings, in order):
${sectionsList}

CHART DATA:
${chartBlock}

Begin the report now. Do not include a preamble or restate the chart data; weave it into interpretation.`;

  const { text } = await generateText({
    model: gateway("google/gemini-3-flash-preview"),
    system,
    prompt,
  });

  return {
    reportId: def.id,
    title: def.title,
    markdown: text,
    generatedAt: new Date().toISOString(),
  };
}