import { useState } from "react";

const SAMPLES = [
  {
    id: "brutal-ch1",
    report: "The Brutal Blueprint™",
    chapter: "Chapter 1 — Signature",
    meta: "EXTRACT · PAGE 4 OF 34 · SWISS EPHEMERIS COORDINATES VERIFIED",
    title: "I. The Calculated Signature",
    body: `Your chart does not describe a personality type. It describes a specific set of astronomical coordinates that were present at the moment of your first breath. Those coordinates create measurable patterns of psychological pressure, preference, and conflict. This report treats those patterns as data — not destiny.

The Sun at 17°42′ Scorpio in the 8th house, tightly squared by Saturn at 19°11′ Aquarius, is not "intense" in the vague sense the internet uses. It is a structural demand for emotional sovereignty that repeatedly collides with external systems of control. The result is a lifelong negotiation between radical self-possession and the cost of that possession.

We will map that negotiation across seven stages: Signature → Symbolism → Healthy Expression → Shadow Pattern → Consequential Reality → Uncomfortable Question → Mature Path. Every claim is anchored to degree, aspect, and dignity. Nothing is invented.

This is not a horoscope. It is a forensic reading of the architecture you were handed — and the mature use of that architecture is entirely yours.`,
    closer: "Your chart does not give you an excuse. It gives you a mirror.",
  },
  {
    id: "brutal-ch4",
    report: "The Brutal Blueprint™",
    chapter: "Chapter 4 — Shadow Pattern",
    meta: "EXTRACT · PAGE 11 OF 34",
    title: "IV. Shadow Pattern",
    body: `When the Sun–Saturn square is running the show from the unconscious, the native often develops a private economy of self-denial. Achievement is pursued, but the moment of arrival is never allowed to land. The internal Saturn voice redefines the finish line the instant it is reached. The result is a quiet, chronic sense of "not yet" that can look like high standards from the outside and feel like exile from the inside.

In relationships this pattern frequently appears as emotional withholding framed as self-protection. The 8th-house Sun wants depth and truth; the Saturn square demands proof that depth will not be used against it. The compromise is often a controlled intensity — passion that is real, but carefully metered.

The shadow is not the desire for control. The shadow is the refusal to notice when control has become the primary relationship.`,
    closer: null,
  },
  {
    id: "crime-scene",
    report: "The Relationship Crime Scene™",
    chapter: "Opening Forensic Frame",
    meta: "EXTRACT · PAGE 2 OF 28 · TWO-CHART ANALYSIS",
    title: "The Unspoken Contract",
    body: `Synastry does not tell you whether two people "belong together." It maps the gravitational forces that will be present when they try. Every major inter-aspect is a pressure point: some generate heat that becomes intimacy, others generate heat that becomes attrition. This report does not romanticize either outcome.

We examine three layers:

1. The magnetic layer — the contacts that create immediate recognition or charge.
2. The structural layer — house overlays and rulership connections that determine where each person lives inside the other's life.
3. The attrition layer — the aspects and overlays that will require conscious management if the relationship is to remain generative rather than depleting.

No aspect is inherently "good" or "bad." An exact Venus–Mars conjunction can be the engine of a passionate marriage or the engine of a revolving-door affair. The difference is never the aspect. It is the maturity of the people carrying it.

What follows is the crime scene: the evidence, the trajectories, and the questions the charts force into the open.`,
    closer: null,
  },
] as const;

export function SampleReader() {
  const [active, setActive] = useState(0);
  const sample = SAMPLES[active];

  return (
    <section className="space-y-6" id="samples">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-gold mb-2">Transparency</p>
        <h2 className="font-display text-3xl md:text-4xl text-gradient-gold">
          Read Real Report Excerpts
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
          No blurred samples. No marketing fluff. See the actual formatting, depth, and tone before
          you spend a dime.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {SAMPLES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActive(i)}
            className={`text-xs uppercase tracking-widest px-4 py-2 rounded-md border transition ${
              i === active
                ? "border-gold bg-gold/10 text-gold"
                : "border-border/50 text-muted-foreground hover:border-gold/40 hover:text-gold"
            }`}
          >
            {s.report.split("™")[0].trim()}
            {s.chapter.includes("Chapter") ? ` · ${s.chapter.split("—")[0].trim()}` : ""}
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl overflow-hidden shadow-deep border border-border/40">
        <div className="px-6 py-4 border-b border-border/40 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-display text-base text-gradient-gold">{sample.report}</span>
            <span className="text-muted-foreground text-sm ml-3">{sample.chapter}</span>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Sample excerpt
          </span>
        </div>
        <div className="px-6 md:px-8 py-6 space-y-4 max-h-[420px] overflow-y-auto">
          <p className="text-[11px] tracking-wide text-muted-foreground/80">{sample.meta}</p>
          <h3 className="font-display text-xl text-gold">{sample.title}</h3>
          {sample.body.split("\n\n").map((para, i) => (
            <p key={i} className="text-sm md:text-[0.95rem] leading-relaxed text-foreground/90">
              {para}
            </p>
          ))}
          {sample.closer && (
            <p className="pt-2 text-gold/90 italic font-display text-base">
              "{sample.closer}"
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
