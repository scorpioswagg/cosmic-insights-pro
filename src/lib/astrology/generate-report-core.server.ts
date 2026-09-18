import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { REPORTS } from "./reports-catalog";
import { computeMultiSynastry, multiSynastryToPrompt, type SerialChart } from "./synastry";

// Minimal chart shape needed for report generation (subset of ChartCalculation).
export interface ReportChartInput {
  input: {
    name: string;
    date: string;
    time: string;
    place: string;
    latitude: number;
    longitude: number;
    timezone: string;
    timeUnknown?: boolean;
  };
  julianDayUT: number;
  utcIso: string;
  ascendant: number;
  midheaven: number;
  bodies: Array<{
    name: string;
    sign: string;
    signDegree: number;
    house?: number;
    retrograde: boolean;
    longitude?: number;
  }>;
  houses: number[];
  aspects: Array<{
    a: string;
    b: string;
    type: string;
    orb: number;
    applying: boolean;
  }>;
}

function fmtDeg(d: number) {
  const deg = Math.floor(d);
  const min = Math.round((d - deg) * 60);
  return `${deg}°${String(min).padStart(2, "0")}'`;
}

function chartToPrompt(chart: ReportChartInput) {
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
- Date/Time: ${chart.input.date} ${
    chart.input.timeUnknown
      ? "TIME UNKNOWN (calculated at local noon)"
      : chart.input.time
  } (${chart.input.timezone})
- Place: ${chart.input.place} (${chart.input.latitude.toFixed(4)}, ${chart.input.longitude.toFixed(4)})
- UTC: ${chart.utcIso}  JD(UT): ${chart.julianDayUT.toFixed(5)}

PLACEMENTS:
${bodies}

ANGLES:
- Ascendant: ${chart.ascendant.toFixed(4)}°
- Midheaven: ${chart.midheaven.toFixed(4)}°

HOUSE CUSPS (Placidus):
${houses}
${
  chart.input.timeUnknown
    ? `
BIRTH TIME STATUS: UNKNOWN.
- Houses above are SOLAR-SIGN houses (the Sun's exact degree begins House 1). They are NOT Placidus cusps.
- The reported "Ascendant" equals the Sun's degree and is a frame marker, not a real rising sign.
- The Moon's degree may vary by up to ~13° across the birth day; its SIGN is reliable only if far from a cusp.
`
    : ""
}

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
  chart: ReportChartInput;
  charts?: ReportChartInput[];
}): Promise<GeneratedReportPayload> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const def = REPORTS.find((r) => r.id === input.reportId);
  if (!def) throw new Error(`Unknown report: ${input.reportId}`);

  const charts = input.charts?.length ? input.charts : [input.chart];
  const minCharts = def.minCharts ?? (def.requiresPartner ? 2 : 1);
  const maxCharts = def.maxCharts ?? (def.requiresPartner ? 2 : 1);
  if (charts.length < minCharts) throw new Error(`${def.title} requires at least ${minCharts} charts.`);
  if (charts.length > maxCharts) throw new Error(`${def.title} accepts at most ${maxCharts} charts.`);

  const gateway = createLovableAiGatewayProvider(key);
  const chartBlock = chartToPrompt(charts[0]);
  const multiBlock = charts.length > 1
    ? multiSynastryToPrompt(computeMultiSynastry(charts as SerialChart[]))
    : "";

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
${
  input.chart.input.timeUnknown
    ? `
UNKNOWN BIRTH TIME PROTOCOL (STRICT):
- Open the report with a short italic note: birth time unknown, solar-sign house frame in use.
- NEVER name a rising sign, Ascendant degree, Midheaven sign, Vertex, Part of Fortune, or a Placidus cusp as fact.
- Interpret houses as SOLAR houses ("your solar 7th house") and say so.
- If the Moon is within 6° of a sign boundary, state both possible signs and interpret the tension.
- Deliver the full required length and depth; never shorten or hedge the whole report — only the time-dependent factors are qualified.
`
    : ""
}

REPORT FRAMING:
${def.systemFraming}

${charts.length > 1 ? "MULTI-CHART EVIDENCE RULES:\n- Analyze every unique participant pair from the supplied evidence.\n- For 3+ charts, describe the network without inventing a composite chart or deterministic group verdict.\n- Preserve participant names and A→B/B→A overlay ownership exactly." : ""}
  const model = gateway("google/gemini-3-flash-preview");

  const reportDef = def;
  function buildPrompt(sections: string[], opts: { partOf?: [number, number]; previous?: string }) {
    const sectionsList = sections.map((s, i) => `${i + 1}. ${s}`).join("\n");
    const partNote = opts.partOf
      ? `\nThis is PART ${opts.partOf[0]} of ${opts.partOf[1]} of a single continuous report. Write only the sections listed below — no preamble, no recap, no closing summary unless the final section calls for one.`
      : "";
    const prevNote = opts.previous
      ? `\nPreviously written sections (for continuity — do NOT repeat them):\n${opts.previous.slice(-4000)}`
      : "";
    return `Write the **${reportDef.title}** report for ${input.chart.input.name}.${partNote}

Target length for this part: ~${Math.round(reportDef.targetWords / (opts.partOf ? opts.partOf[1] : 1))} words.

Required sections (use exactly these as ## H2 headings, in order):
${sectionsList}

CHART DATA FOR PRIMARY PARTICIPANT:
${chartBlock}
${charts.length > 1 ? "
MULTI-CHART SYNASTRY EVIDENCE:
" + multiBlock : ""}
${prevNote}

Begin now. Do not restate the chart data; weave it into interpretation.`;
  }

  let text: string;

  // Very long reports (Unfiltered Series and similar) are produced in two passes so
  // the model never truncates mid-report.
  if (def.targetWords >= 4500 && def.sections.length > 20) {
    const mid = Math.ceil(def.sections.length / 2);
    const first = await generateText({
      model,
      system,
      prompt: buildPrompt(def.sections.slice(0, mid), { partOf: [1, 2] }),
    });
    const second = await generateText({
      model,
      system,
      prompt: buildPrompt(def.sections.slice(mid), { partOf: [2, 2], previous: first.text }),
    });
    text = `${first.text.trim()}\n\n${second.text.trim()}`;
  } else {
    const result = await generateText({ model, system, prompt: buildPrompt(def.sections, {}) });
    text = result.text;
  }

  return {
    reportId: def.id,
    title: def.title,
    markdown: text,
    generatedAt: new Date().toISOString(),
  };
}