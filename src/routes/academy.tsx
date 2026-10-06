import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AssistantChat, BookReadingSection } from "@/components/academy/TutorAndBooking";
import {
  ASPECTS,
  GLOSSARY,
  HOUSES,
  LESSONS,
  PLANETS,
  QUIZZES,
  SIGNS,
  type QuizQuestion,
} from "@/lib/academy/content";

export const Route = createFileRoute("/academy")({
  head: () => ({
    meta: [
      { title: "Cosmic Blueprint Academy — Learn Astrology From Zero" },
      { name: "description", content: "A free, interactive crash course in reading natal charts. Planets, signs, houses, aspects, and how to interpret your Cosmic Blueprint report." },
      { property: "og:title", content: "Cosmic Blueprint Academy" },
      { property: "og:description", content: "Learn to read your natal chart — no prior knowledge required." },
    ],
  }),
  component: Academy,
});

const PROGRESS_KEY = "cb-academy-progress-v1";
const BOOKMARK_KEY = "cb-academy-bookmarks-v1";

function useLocalSet(key: string) {
  const [set, setSet] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setSet(new Set(JSON.parse(raw) as string[]));
    } catch { /* noop */ }
  }, [key]);
  const update = (next: Set<string>) => {
    setSet(new Set(next));
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, JSON.stringify(Array.from(next)));
    }
  };
  return [set, update] as const;
}

function Academy() {
  const [completed, setCompleted] = useLocalSet(PROGRESS_KEY);
  const [bookmarks, setBookmarks] = useLocalSet(BOOKMARK_KEY);
  const [openLesson, setOpenLesson] = useState<string | null>("what-is-natal");
  const [search, setSearch] = useState("");

  const pct = Math.round((completed.size / LESSONS.length) * 100);

  const markDone = (id: string) => {
    const n = new Set(completed); n.add(id); setCompleted(n);
  };
  const toggleBookmark = (id: string) => {
    const n = new Set(bookmarks);
    if (n.has(id)) n.delete(id); else n.add(id);
    setBookmarks(n);
  };

  const filteredGlossary = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return GLOSSARY;
    return GLOSSARY.filter((g) =>
      g.term.toLowerCase().includes(s) || g.def.toLowerCase().includes(s),
    );
  }, [search]);

  return (
    <div className="starfield relative min-h-screen">
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 md:py-20">
        <header className="flex items-center justify-between mb-10">
          <Link to="/" className="text-xs uppercase tracking-[0.4em] text-gold hover:text-foreground transition">
            ← Cosmic Blueprint
          </Link>
          <Link to="/" className="text-xs uppercase tracking-wider px-3 py-1.5 rounded-md border border-border/50 text-muted-foreground hover:text-foreground hover:border-gold/40 transition">
            Calculate my chart →
          </Link>
        </header>

        <section className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.4em] text-gold mb-3">Cosmic Blueprint Academy</p>
          <h1 className="font-display text-5xl md:text-7xl text-gradient-gold leading-tight mb-6">
            Learn to read<br />your natal chart
          </h1>
          <p className="max-w-2xl mx-auto text-muted-foreground text-lg leading-relaxed">
            Ten short lessons. Zero prior knowledge required. By the end you'll understand every
            symbol in your Cosmic Blueprint report and feel confident interpreting your own chart.
          </p>

          <div className="max-w-md mx-auto mt-10">
            <div className="flex justify-between text-xs uppercase tracking-wider text-muted-foreground mb-2">
              <span>Your progress</span>
              <span>{completed.size} / {LESSONS.length} lessons</span>
            </div>
            <div className="h-2 rounded-full bg-card/60 overflow-hidden border border-border/40">
              <div className="h-full bg-gradient-to-r from-gold to-accent transition-all" style={{ width: `${pct}%` }} />
            </div>
            {pct === 100 && (
              <p className="mt-4 text-gold text-sm">🏆 Academy complete — you've earned the Cosmic Blueprint badge.</p>
            )}
          </div>
        </section>

        {/* Lesson nav */}
        <nav className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-12">
          {LESSONS.map((l) => {
            const done = completed.has(l.id);
            const bookmarked = bookmarks.has(l.id);
            const active = openLesson === l.id;
            return (
              <button
                key={l.id}
                onClick={() => {
                  setOpenLesson(l.id);
                  requestAnimationFrame(() => {
                    document.getElementById(`lesson-${l.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  });
                }}
                className={`text-left p-3 rounded-xl border transition ${
                  active ? "border-gold/60 bg-card/80" : "border-border/40 bg-card/40 hover:border-gold/40"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span>Lesson {l.number}</span>
                  <span className="flex items-center gap-1">
                    {bookmarked && <span className="text-gold">★</span>}
                    {done && <span className="text-emerald-400">✓</span>}
                  </span>
                </div>
                <div className="mt-1 text-sm text-foreground font-medium leading-tight">{l.title}</div>
              </button>
            );
          })}
        </nav>

        {/* Lessons */}
        <div className="space-y-6">
          {LESSONS.map((l) => (
            <Lesson
              key={l.id}
              meta={l}
              isOpen={openLesson === l.id}
              onToggle={() => setOpenLesson((cur) => (cur === l.id ? null : l.id))}
              done={completed.has(l.id)}
              bookmarked={bookmarks.has(l.id)}
              onMarkDone={() => markDone(l.id)}
              onToggleBookmark={() => toggleBookmark(l.id)}
            />
          ))}
        </div>

        {/* Glossary */}
        <section className="mt-20 glass rounded-2xl p-6 md:p-8 shadow-deep">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gold">Interactive Glossary</p>
              <h2 className="font-display text-2xl text-gradient-gold mt-1">Every term, defined</h2>
            </div>
            <input
              type="search"
              placeholder="Search terms — try 'square' or 'rising'"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="cosmic-input w-full sm:w-80"
            />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredGlossary.map((g) => (
              <div key={g.term} className="rounded-lg border border-border/40 bg-card/50 p-3">
                <div className="text-gold text-sm font-medium">{g.term}</div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{g.def}</div>
              </div>
            ))}
            {filteredGlossary.length === 0 && (
              <div className="text-sm text-muted-foreground col-span-full text-center py-6">
                No matches. Try a different word.
              </div>
            )}
          </div>
        </section>

        <BookReadingSection />

        <AssistantChat />

        <footer className="mt-20 pt-8 border-t border-border/40 text-center text-xs text-muted-foreground">
          Academy progress saved in your browser. Ready when you are —{" "}
          <Link to="/" className="text-gold hover:underline">calculate your chart</Link>.
        </footer>
      </div>
    </div>
  );
}

/* ----------------------------- Lesson container ---------------------------- */

interface LessonProps {
  meta: typeof LESSONS[number];
  isOpen: boolean;
  onToggle: () => void;
  done: boolean;
  bookmarked: boolean;
  onMarkDone: () => void;
  onToggleBookmark: () => void;
}

function Lesson({ meta, isOpen, onToggle, done, bookmarked, onMarkDone, onToggleBookmark }: LessonProps) {
  return (
    <section id={`lesson-${meta.id}`} className="glass rounded-2xl shadow-deep overflow-hidden border border-border/40">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 p-5 md:p-6 text-left hover:bg-card/40 transition"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/30 to-accent/30 border border-gold/40 flex items-center justify-center text-gold font-display">
            {meta.number}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{meta.minutes} min read</div>
            <h3 className="font-display text-xl md:text-2xl text-gradient-gold">{meta.title}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{meta.tagline}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {done && <span className="text-emerald-400 text-xs">✓ Done</span>}
          {bookmarked && <span className="text-gold text-xs">★</span>}
          <span className="text-gold text-xl">{isOpen ? "−" : "+"}</span>
        </div>
      </button>

      {isOpen && (
        <div className="px-5 md:px-8 pb-8 space-y-8">
          <LessonBody id={meta.id} />
          <Quiz id={meta.id} questions={QUIZZES[meta.id] ?? []} />
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/40">
            <button
              onClick={onToggleBookmark}
              className="text-xs uppercase tracking-wider px-3 py-1.5 rounded-md border border-border/50 text-muted-foreground hover:text-gold hover:border-gold/40 transition"
            >
              {bookmarked ? "★ Bookmarked" : "☆ Bookmark"}
            </button>
            <button
              onClick={onMarkDone}
              disabled={done}
              className="text-xs uppercase tracking-wider px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-60"
            >
              {done ? "✓ Lesson complete" : "Mark lesson complete"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/* ----------------------------- Lesson bodies ------------------------------ */

function LessonBody({ id }: { id: string }) {
  switch (id) {
    case "what-is-natal": return <LessonWhat />;
    case "planets": return <LessonPlanets />;
    case "signs": return <LessonSigns />;
    case "houses": return <LessonHouses />;
    case "combinations": return <LessonCombinations />;
    case "aspects": return <LessonAspects />;
    case "angles": return <LessonAngles />;
    case "special": return <LessonSpecial />;
    case "putting-together": return <LessonPutTogether />;
    case "reading-reports": return <LessonReadingReports />;
    default: return null;
  }
}

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4 text-foreground/90 leading-relaxed">{children}</div>;
}

function LessonWhat() {
  return (
    <Prose>
      <p>
        A <strong className="text-gold">natal chart</strong> is a map of the sky at the exact moment
        and place you were born. Imagine pausing time, freezing every planet where it was, and
        drawing a circle of the sky overhead from your hospital room. That circle is your chart.
      </p>
      <div className="grid md:grid-cols-3 gap-4">
        <InfoCard title="Birth date" body="Tells us which sign each planet was in. The Sun moves through one sign per month." />
        <InfoCard title="Birth time" body="Determines your Ascendant (rising sign) and house placements. The sky shifts about one degree every four minutes — so even 15 minutes can change houses." />
        <InfoCard title="Birth place" body="Houses depend on your latitude and longitude. The same moment looks different from Tokyo vs Toronto." />
      </div>
      <p>
        <strong className="text-gold">Astrology vs astronomy.</strong> Astronomy is the science of
        celestial mechanics — it measures where planets are. Astrology is the symbolic language
        built on top, interpreting what those positions mean for human experience. Cosmic Blueprint
        uses real astronomy (Swiss Ephemeris) to power the symbolism — no estimates, no shortcuts.
      </p>
      <p className="text-sm text-muted-foreground">
        <strong>Why precision matters:</strong> If your time is off by an hour, your Ascendant and
        house placements may be wrong. The interpretation that follows would then describe someone
        else's life. Check your birth certificate when possible.
      </p>
      <SampleChartIllustration />
    </Prose>
  );
}

function LessonPlanets() {
  const [open, setOpen] = useState<string | null>(PLANETS[0].name);
  const current = PLANETS.find((p) => p.name === open) ?? PLANETS[0];
  return (
    <Prose>
      <p>
        Astrologers use ten <strong className="text-gold">planetary bodies</strong> (the Sun and Moon
        count, even though they're technically a star and a satellite). Think of each as a different
        character living inside you. Click any planet to meet them.
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {PLANETS.map((p) => (
          <button
            key={p.name}
            onClick={() => setOpen(p.name)}
            className={`p-3 rounded-xl border transition text-center ${
              open === p.name ? "border-gold/70 bg-gold/10" : "border-border/40 bg-card/50 hover:border-gold/40"
            }`}
          >
            <div className="text-2xl text-gold">{p.glyph}</div>
            <div className="text-xs mt-1">{p.name}</div>
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-gold/30 bg-card/60 p-5">
        <div className="flex items-baseline gap-3">
          <span className="text-4xl text-gold">{current.glyph}</span>
          <div>
            <h4 className="font-display text-xl text-gradient-gold">{current.name}</h4>
            <p className="text-sm text-muted-foreground">{current.tagline}</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4 mt-5 text-sm">
          <KV k="Represents" v={current.represents} />
          <KV k="Personality" v={current.traits} />
          <KV k="Strengths" v={current.strengths} />
          <KV k="Challenges" v={current.challenges} />
          <KV k="Everyday example" v={current.everyday} />
          <KV k="In your report" v={current.inReport} />
        </div>
      </div>
    </Prose>
  );
}

function LessonSigns() {
  const [open, setOpen] = useState<string | null>(SIGNS[0].name);
  const current = SIGNS.find((s) => s.name === open) ?? SIGNS[0];
  const elementColor: Record<string, string> = {
    Fire: "text-rose-300", Earth: "text-emerald-300", Air: "text-sky-300", Water: "text-cyan-300",
  };
  return (
    <Prose>
      <p>
        Each planet expresses itself through one of <strong className="text-gold">12 zodiac signs</strong>.
        Signs are <em>how</em> a planet acts. They're grouped by <strong>element</strong> (Fire/Earth/Air/Water)
        and <strong>modality</strong> (Cardinal/Fixed/Mutable).
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {SIGNS.map((s) => (
          <button key={s.name} onClick={() => setOpen(s.name)}
            className={`p-3 rounded-xl border transition text-center ${
              open === s.name ? "border-gold/70 bg-gold/10" : "border-border/40 bg-card/50 hover:border-gold/40"
            }`}>
            <div className={`text-2xl ${elementColor[s.element]}`}>{s.glyph}</div>
            <div className="text-xs mt-1">{s.name}</div>
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-gold/30 bg-card/60 p-5">
        <div className="flex items-baseline gap-3">
          <span className={`text-4xl ${elementColor[current.element]}`}>{current.glyph}</span>
          <div>
            <h4 className="font-display text-xl text-gradient-gold">{current.name}</h4>
            <p className="text-sm text-muted-foreground">{current.dates}</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4 mt-5 text-sm">
          <KV k="Element" v={current.element} />
          <KV k="Modality" v={current.modality} />
          <KV k="Keywords" v={current.keywords} />
          <KV k="Strengths" v={current.strengths} />
          <KV k="Weaknesses" v={current.weaknesses} />
          <KV k="Famous for" v={current.famous} />
        </div>
      </div>
    </Prose>
  );
}

function LessonHouses() {
  return (
    <Prose>
      <p>
        Houses answer <strong className="text-gold">where</strong> in life a planet shows up.
        Your chart is sliced into 12 wedges, each one a different department of life — money, love,
        career, secrets. A planet's <em>house</em> tells you the arena it plays in.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {HOUSES.map((h) => (
          <div key={h.number} className="rounded-xl border border-border/40 bg-card/50 p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl text-gold font-display">{h.number}</span>
              <span className="text-sm font-medium">{h.name}</span>
            </div>
            <div className="mt-2 text-xs space-y-1 text-muted-foreground">
              <div><span className="text-foreground/80">Rules:</span> {h.rules}</div>
              <div><span className="text-foreground/80">Asks:</span> {h.questions}</div>
              <div><span className="text-foreground/80">Example:</span> {h.example}</div>
              <div className="text-gold/80">{h.why}</div>
            </div>
          </div>
        ))}
      </div>
    </Prose>
  );
}

function LessonCombinations() {
  return (
    <Prose>
      <p>
        Here's the secret: every interpretation in your report is built from the same simple formula:
      </p>
      <div className="rounded-xl border border-gold/40 bg-gradient-to-br from-gold/10 to-accent/10 p-5 text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-gold">The Formula</div>
        <div className="font-display text-2xl md:text-3xl mt-2">
          <span className="text-gold">Planet</span> <span className="text-muted-foreground">(what)</span>
          {" + "}
          <span className="text-gold">Sign</span> <span className="text-muted-foreground">(how)</span>
          {" + "}
          <span className="text-gold">House</span> <span className="text-muted-foreground">(where)</span>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <ComboExample p="Sun" s="Scorpio" h="8th House"
          reading="Identity (Sun) expressed through intensity and depth (Scorpio) in the arena of transformation and intimacy (8th). You find yourself by surviving rebirth." />
        <ComboExample p="Moon" s="Pisces" h="4th House"
          reading="Emotions (Moon) dreamy and boundary-less (Pisces) at home and with family (4th). You feel things in your kitchen that others miss entirely." />
        <ComboExample p="Venus" s="Leo" h="5th House"
          reading="Love (Venus) dramatic and generous (Leo) in romance and play (5th). When you're smitten, the whole room knows." />
        <ComboExample p="Mars" s="Capricorn" h="10th House"
          reading="Drive (Mars) disciplined and strategic (Capricorn) aimed at career (10th). You climb. Slowly. And you arrive." />
      </div>
      <p className="text-sm text-muted-foreground">
        Once you can read one placement, you can read the whole chart. Just stack them.
      </p>
    </Prose>
  );
}

function LessonAspects() {
  return (
    <Prose>
      <p>
        <strong className="text-gold">Aspects</strong> are the angles between planets. They describe
        the conversation — harmony, tension, or opportunity — between two parts of you.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {ASPECTS.map((a) => (
          <div key={a.name} className="rounded-xl border border-border/40 bg-card/50 p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl text-gold">{a.glyph}</span>
              <div>
                <div className="font-medium">{a.name}</div>
                <div className="text-xs text-muted-foreground">{a.degrees} · {a.vibe}</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{a.meaning}</p>
            <p className="text-xs text-gold/80 mt-1">{a.example}</p>
          </div>
        ))}
      </div>
    </Prose>
  );
}

function LessonAngles() {
  return (
    <Prose>
      <p>
        Four special points on the chart circle act as doorways. They need your exact birth time.
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        <InfoCard title="Ascendant (Rising)" body="The sign rising on the eastern horizon at birth. Your first impression, body language, and the mask you wear in new rooms." />
        <InfoCard title="Descendant" body="Opposite the Ascendant. The kind of partner or counterpart you attract — and the qualities you project onto others." />
        <InfoCard title="Midheaven (MC)" body="The highest point. Career reputation, public image, and the role you grow into over decades." />
        <InfoCard title="Imum Coeli (IC)" body="Opposite the MC. Roots, family, private self, and the emotional basement of the chart." />
      </div>
      <p className="text-sm text-muted-foreground">
        Without birth time, we can still interpret planets in signs and most aspects. Houses and angles stay approximate.
      </p>
    </Prose>
  );
}

function LessonSpecial() {
  return (
    <Prose>
      <p>
        Beyond the ten planets, a few extra points show up in Cosmic Blueprint reports.
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        <InfoCard title="North Node" body="Your growth edge this lifetime — the unfamiliar skill the chart is pushing you toward." />
        <InfoCard title="South Node" body="Comfort-zone talent you already mastered. Useful, but over-relying on it stalls growth." />
        <InfoCard title="Chiron" body="The wound that becomes a gift. Where you heal others by healing yourself." />
        <InfoCard title="Lilith (Black Moon)" body="Raw instinct, refusal to be tamed, and the parts of desire culture tries to shame." />
      </div>
    </Prose>
  );
}

function LessonPutTogether() {
  return (
    <Prose>
      <p>
        Reading a full chart is pattern recognition, not a laundry list. Start with the big three,
        then layer houses and aspects.
      </p>
      <ol className="list-decimal list-inside space-y-2 text-sm">
        <li><strong className="text-gold">Sun</strong> — core identity and life direction.</li>
        <li><strong className="text-gold">Moon</strong> — emotional needs and private self.</li>
        <li><strong className="text-gold">Rising</strong> — how you enter the room.</li>
        <li>Strongest aspects (tight orbs, personal planets) — the plot twists.</li>
        <li>Angular houses (1, 4, 7, 10) — high-visibility life arenas.</li>
      </ol>
      <p className="text-sm text-muted-foreground">
        Your written Cosmic Blueprint reports already do this stacking for you. The Academy teaches you to verify and deepen what the AI wrote.
      </p>
    </Prose>
  );
}

function LessonReadingReports() {
  return (
    <Prose>
      <p>
        Cosmic Blueprint reports are chaptered evidence, not vague horoscopes. Each chapter cites
        real placements from Swiss Ephemeris.
      </p>
      <ul className="list-disc list-inside space-y-2 text-sm">
        <li>Read the placement first, then the interpretation.</li>
        <li>If something feels off, check birth time — houses move fast.</li>
        <li>Download the PDF after generation so you keep a permanent copy.</li>
        <li>For relationship work, run partner charts and synastry reports before a live reading.</li>
      </ul>
      <p className="text-sm text-muted-foreground">
        Ready for a human conversation? Use the Book a Reading section below, or ask the tutor how to prepare.
      </p>
    </Prose>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/50 p-4">
      <div className="text-gold text-sm font-medium">{title}</div>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{body}</p>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="text-sm">{v}</div>
    </div>
  );
}

function ComboExample({ p, s, h, reading }: { p: string; s: string; h: string; reading: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/50 p-4 text-sm">
      <div className="text-gold font-medium">{p} in {s} · {h}</div>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{reading}</p>
    </div>
  );
}

function SampleChartIllustration() {
  return (
    <div className="rounded-xl border border-gold/30 bg-card/40 p-5 text-center text-sm text-muted-foreground">
      Imagine a circle divided into 12 houses, with planets plotted by sign degree.
      That frozen sky-map is your natal chart — the raw data every Cosmic Blueprint report is built on.
    </div>
  );
}

/* ----------------------------- Quiz --------------------------------------- */

function Quiz({ id, questions }: { id: string; questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  if (!questions.length) return null;

  const all = Object.keys(answers).length === questions.length;
  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);

  return (
    <div className="rounded-xl border border-gold/20 bg-card/40 p-5">
      <p className="text-xs uppercase tracking-[0.3em] text-gold mb-3">Quick check</p>
      <div className="space-y-5">
        {questions.map((q, qi) => {
          const picked = answers[qi];
          const correct = picked === q.correct;
          return (
            <div key={qi}>
              <div className="text-sm font-medium mb-2">{q.q}</div>
              <div className="space-y-1.5">
                {q.choices.map((c, ci) => {
                  const selected = picked === ci;
                  let cls = "text-left w-full text-xs px-3 py-2 rounded-md border transition ";
                  if (picked === undefined) {
                    cls += "border-border/40 hover:border-gold/40 text-muted-foreground hover:text-foreground";
                  } else if (ci === q.correct) {
                    cls += "border-emerald-500/50 bg-emerald-500/10 text-emerald-200";
                  } else if (selected) {
                    cls += "border-rose-500/50 bg-rose-500/10 text-rose-200";
                  } else {
                    cls += "border-border/30 text-muted-foreground/60";
                  }
                  return (
                    <button
                      key={ci}
                      type="button"
                      disabled={picked !== undefined}
                      onClick={() => setAnswers((a) => ({ ...a, [qi]: ci }))}
                      className={cls}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              {picked !== undefined && (
                <div className={`text-xs mt-2 ${correct ? "text-emerald-300" : "text-rose-300"}`}>
                  {correct ? "Correct — " : "Not quite. "} <span className="text-muted-foreground">{q.explain}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {all && (
        <div className="mt-5 text-center text-sm">
          <span className="text-gold">Score: {score} / {questions.length}</span>
          {score === questions.length && <span className="ml-2">🏅 Perfect — lesson mastered.</span>}
        </div>
      )}
    </div>
  );
}
