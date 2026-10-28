import { generateText } from "ai";
import type { LanguageModel } from "ai";
import type { ReportDefinition } from "./reports-catalog";
import {
  computeSynastry,
  type SerialChart,
  type SynastryResult,
} from "./synastry";
import { natalEvidence, synastryEvidence } from "./evidence";

/** Minimal chart shape shared with generate-report-core. */
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
    longitude?: number;
    sign: string;
    signDegree: number;
    house?: number;
    retrograde: boolean;
    speed?: number;
  }>;
  houses: number[];
  aspects: Array<{
    a: string;
    b: string;
    type: string;
    angle?: number;
    orb: number;
    applying: boolean;
  }>;
}

function toSerial(c: ReportChartInput): SerialChart {
  return {
    input: c.input,
    julianDayUT: c.julianDayUT,
    utcIso: c.utcIso,
    ascendant: c.ascendant,
    midheaven: c.midheaven,
    bodies: c.bodies.map((b) => ({
      name: b.name,
      longitude: b.longitude,
      sign: b.sign,
      signDegree: b.signDegree,
      house: b.house,
      retrograde: b.retrograde,
      speed: b.speed,
    })),
    houses: c.houses,
    aspects: c.aspects.map((a) => ({
      a: a.a,
      b: a.b,
      type: a.type,
      orb: a.orb,
      applying: a.applying,
    })),
  };
}

/**
 * How many chapters to generate in parallel.
 * 8 batches a 31-chapter Unfiltered report into ~4 waves instead of ~8.
 */
const CHAPTER_PARALLELISM = 8;

/**
 * Chapter-by-chapter generation with evidence packets.
 * Runs in parallel batches of CHAPTER_PARALLELISM to cut wall-clock time.
 */
export async function generateChapterEvidenceReport(opts: {
  def: ReportDefinition;
  chart: ReportChartInput;
  partnerChart?: ReportChartInput;
  system: string;
  model: LanguageModel;
}): Promise<string> {
  const { def, chart, partnerChart, system, model } = opts;
  const serialA = toSerial(chart);
  const serialB = partnerChart ? toSerial(partnerChart) : null;
  let synResult: SynastryResult | null = null;
  if (def.requiresPartner && serialB) {
    synResult = computeSynastry(serialA, serialB);
  }

  const wordsPerChapter = Math.max(
    100,
    Math.round(def.targetWords / def.sections.length),
  );
  const chapters: string[] = new Array(def.sections.length);
  let rolling = "";

  const names =
    def.requiresPartner && partnerChart
      ? `${chart.input.name} and ${partnerChart.input.name}`
      : chart.input.name;

  for (let start = 0; start < def.sections.length; start += CHAPTER_PARALLELISM) {
    const end = Math.min(start + CHAPTER_PARALLELISM, def.sections.length);
    const batchPrev = rolling
      ? `\nPrior chapters (continuity only — do NOT repeat):\n${rolling.slice(-1800)}\n`
      : "";

    const tasks = [];
    for (let i = start; i < end; i++) {
      const chapter = def.sections[i];
      const evidence =
        def.requiresPartner && serialB && synResult
          ? synastryEvidence(serialA, serialB, synResult, chapter)
          : natalEvidence(serialA, chapter);

      const isFinal = i === def.sections.length - 1;
      const prompt = `Write CHAPTER ${i + 1} of ${def.sections.length} of **${def.title}** for ${names}.

Exact H2 heading (use this verbatim as ## heading):
${chapter}

Target length: ~${wordsPerChapter} words for this chapter only.

EVIDENCE PACKET (cite only these factors; do not invent placements):
${evidence}

${batchPrev}
Rules for this chapter:
- Open with a one-line italic "Chart Anchors:" listing the placements/aspects you will use.
- Every paragraph must cite at least one factor from the evidence packet.
- Do not write other chapters. No preamble about the whole report.
${isFinal ? `- This is the FINAL chapter. End with the line: Your chart does not give you an excuse. It gives you a mirror.` : ""}
- Write in markdown. Begin with ## ${chapter}

Begin now.`;

      tasks.push(
        generateText({ model, system, prompt }).then((result) => ({
          index: i,
          text: result.text.trim(),
        })),
      );
    }

    const results = await Promise.all(tasks);
    results.sort((a, b) => a.index - b.index);
    for (const r of results) {
      chapters[r.index] = r.text;
      rolling = `${rolling}\n\n${r.text}`.slice(-5000);
    }
  }

  return chapters.join("\n\n");
}
