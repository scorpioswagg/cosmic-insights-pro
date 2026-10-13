import { useEffect, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { askAcademy } from "@/lib/academy/chat.functions";
import { submitReadingBooking } from "@/lib/academy/booking.functions";
import { supabase } from "@/integrations/supabase/client";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const BOOKING_EMAIL = "oracle@mycosmicblueprint.online";

/** Live reading booking CTA for the Academy page. */
export function BookReadingSection() {
  const submit = useServerFn(submitReadingBooking);
  const [form, setForm] = useState({
    name: "",
    email: "",
    readingType: "Natal Chart Reading (60 min)",
    preferredTimes: "",
    timezone: "",
    birthDate: "",
    partnerInfo: "",
    focus: "",
    notes: "",
    hasReports: false,
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setDone(null);
    setBusy(true);
    try {
      const res = await submit({ data: form });
      setDone(res.message);
      setForm((f) => ({
        ...f,
        preferredTimes: "",
        focus: "",
        notes: "",
        partnerInfo: "",
      }));
    } catch (e) {
      setErr(
        (e as Error).message ||
          "Something went wrong. Please email oracle@mycosmicblueprint.online directly.",
      );
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold/50";
  const labelClass = "block text-xs uppercase tracking-wider text-muted-foreground mb-1.5";

  return (
    <section id="book-reading" className="mt-16 space-y-10">
      <div className="glass rounded-2xl p-6 md:p-8 shadow-deep border border-gold/30">
        <p className="text-xs uppercase tracking-[0.3em] text-gold">Live readings</p>
        <h2 className="font-display text-2xl md:text-3xl text-gradient-gold mt-1">Book a reading</h2>
        <p className="mt-3 text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Prefer a human conversation after the AI tutor and written reports? Book a live Cosmic Blueprint
          session with Kyle (the Oracle) to walk through your natal chart, a synastry pairing, or any
          Unfiltered Series report you have generated.
        </p>

        <h3 className="font-display text-xl text-gradient-gold mt-8 mb-3">How a typical reading goes</h3>
        <ol className="space-y-3 text-sm text-muted-foreground list-none">
          <li className="flex gap-3">
            <span className="text-gold font-medium shrink-0 w-6">1.</span>
            <span>
              <strong className="text-foreground">Arrival & intention (5 min).</strong> We confirm birth
              data, what brought you here, and the one or two questions that matter most right now.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-gold font-medium shrink-0 w-6">2.</span>
            <span>
              <strong className="text-foreground">The Big Three (10–15 min).</strong> Sun, Moon, and Rising
              — your core identity, emotional needs, and the face you show the world — in plain language.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-gold font-medium shrink-0 w-6">3.</span>
            <span>
              <strong className="text-foreground">Key patterns (15–20 min).</strong> Standout aspects, loaded
              houses, and repeating themes in your chart (or the cross-chart dynamics in synastry).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-gold font-medium shrink-0 w-6">4.</span>
            <span>
              <strong className="text-foreground">Focus deep-dive (15–20 min).</strong> Career, relationships,
              timing, healing, or whatever you named on the form — grounded in the placements, not generic
              horoscopes.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-gold font-medium shrink-0 w-6">5.</span>
            <span>
              <strong className="text-foreground">Questions & takeaways (5–10 min).</strong> Space for your
              questions, plus 2–3 clear takeaways you can act on after the call.
            </span>
          </li>
        </ol>

        <h3 className="font-display text-xl text-gradient-gold mt-8 mb-3">What I will ask you</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-gold">✦</span> Exact birth date, time, and place (or that time is unknown)
          </li>
          <li className="flex gap-2">
            <span className="text-gold">✦</span> What you most want clarity on — work, love, purpose, a
            specific relationship, or a season of change
          </li>
          <li className="flex gap-2">
            <span className="text-gold">✦</span> Whether you have already generated a Cosmic Blueprint report
            (so we read from the same evidence)
          </li>
          <li className="flex gap-2">
            <span className="text-gold">✦</span> For synastry: the other person&apos;s birth data and the nature
            of the bond
          </li>
        </ul>

        <h3 className="font-display text-xl text-gradient-gold mt-8 mb-3">What I will read to you</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-gold">✦</span> Your Sun / Moon / Rising story and how they work together
          </li>
          <li className="flex gap-2">
            <span className="text-gold">✦</span> Major aspects (conjunctions, squares, trines, oppositions) that
            shape your patterns
          </li>
          <li className="flex gap-2">
            <span className="text-gold">✦</span> House emphasis — where life keeps asking for your attention
          </li>
          <li className="flex gap-2">
            <span className="text-gold">✦</span> Nodes, Chiron, and other special points when they matter to your
            question
          </li>
          <li className="flex gap-2">
            <span className="text-gold">✦</span> For couples: cross-aspects, house overlays, and the honest
            chemistry + friction map
          </li>
        </ul>
      </div>

      <div className="glass rounded-2xl p-6 md:p-8 shadow-deep border border-gold/20">
        <p className="text-xs uppercase tracking-[0.3em] text-gold">Investment</p>
        <h3 className="font-display text-2xl text-gradient-gold mt-1 mb-5">Reading packages</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border/50 bg-background/40 p-5 flex flex-col">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Foundation</p>
            <h4 className="font-display text-lg text-gold mt-1">Natal Chart</h4>
            <p className="text-3xl font-display text-foreground mt-3">$97</p>
            <p className="text-xs text-muted-foreground mt-1">60 minutes · live video or voice</p>
            <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground flex-1">
              <li>✦ Big Three deep read</li>
              <li>✦ Key aspects & houses</li>
              <li>✦ One focus area of your choice</li>
              <li>✦ Written takeaways after the call</li>
            </ul>
          </div>
          <div className="rounded-xl border border-gold/50 bg-gold/5 p-5 flex flex-col relative">
            <span className="absolute -top-2.5 left-4 text-[10px] uppercase tracking-widest bg-gold text-primary-foreground px-2 py-0.5 rounded">
              Popular
            </span>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Relationship</p>
            <h4 className="font-display text-lg text-gold mt-1">Synastry</h4>
            <p className="text-3xl font-display text-foreground mt-3">$147</p>
            <p className="text-xs text-muted-foreground mt-1">75 minutes · two charts compared</p>
            <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground flex-1">
              <li>✦ Both natal charts overview</li>
              <li>✦ Cross-aspects & house overlays</li>
              <li>✦ Chemistry, friction, growth edges</li>
              <li>✦ Honest guidance (not fortune-telling)</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border/50 bg-background/40 p-5 flex flex-col">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Deep dive</p>
            <h4 className="font-display text-lg text-gold mt-1">Extended Session</h4>
            <p className="text-3xl font-display text-foreground mt-3">$197</p>
            <p className="text-xs text-muted-foreground mt-1">90 minutes · multi-theme</p>
            <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground flex-1">
              <li>✦ Full chart walkthrough</li>
              <li>✦ Up to three focus areas</li>
              <li>✦ Optional report review</li>
              <li>✦ Priority scheduling</li>
            </ul>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Payment details are confirmed by email after a time is locked in. Written Cosmic Blueprint reports
          are separate and available on the home page.
        </p>
      </div>

      <div className="glass rounded-2xl p-6 md:p-8 shadow-deep border border-gold/30">
        <p className="text-xs uppercase tracking-[0.3em] text-gold">Request a session</p>
        <h3 className="font-display text-2xl text-gradient-gold mt-1">Email to book</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Fill this form and it goes straight to{" "}
          <span className="text-foreground">{BOOKING_EMAIL}</span>. You will receive a confirmation email
          immediately; we reply within 1–2 business days to set a time.
        </p>

        {done ? (
          <div className="mt-6 rounded-xl border border-gold/40 bg-gold/10 p-5 text-sm text-foreground">
            <p className="font-medium text-gold">Request sent</p>
            <p className="mt-2 text-muted-foreground">{done}</p>
            <button
              type="button"
              className="mt-4 text-xs uppercase tracking-widest text-gold hover:underline"
              onClick={() => setDone(null)}
            >
              Submit another request
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Your name *</label>
                <input
                  required
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className={labelClass}>Email *</label>
                <input
                  required
                  type="email"
                  className={inputClass}
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="you@email.com"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Reading type *</label>
                <select
                  className={inputClass}
                  value={form.readingType}
                  onChange={(e) => setField("readingType", e.target.value)}
                >
                  <option>Natal Chart Reading (60 min)</option>
                  <option>Synastry / Relationship (75 min)</option>
                  <option>Extended Deep Dive (90 min)</option>
                  <option>Report review only (30 min)</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Your timezone</label>
                <input
                  className={inputClass}
                  value={form.timezone}
                  onChange={(e) => setField("timezone", e.target.value)}
                  placeholder="e.g. Pacific (PT), Eastern (ET)"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Preferred days / times *</label>
              <textarea
                required
                rows={2}
                className={inputClass}
                value={form.preferredTimes}
                onChange={(e) => setField("preferredTimes", e.target.value)}
                placeholder="e.g. Weekday evenings after 6pm PT, or Saturday mornings"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Your birth date (optional)</label>
                <input
                  className={inputClass}
                  value={form.birthDate}
                  onChange={(e) => setField("birthDate", e.target.value)}
                  placeholder="YYYY-MM-DD"
                />
              </div>
              <div>
                <label className={labelClass}>Partner info (synastry only)</label>
                <input
                  className={inputClass}
                  value={form.partnerInfo}
                  onChange={(e) => setField("partnerInfo", e.target.value)}
                  placeholder="Name + birth date if known"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>What do you most want clarity on?</label>
              <textarea
                rows={2}
                className={inputClass}
                value={form.focus}
                onChange={(e) => setField("focus", e.target.value)}
                placeholder="Career direction, a relationship, purpose, a hard season…"
              />
            </div>
            <div>
              <label className={labelClass}>Anything else we should know?</label>
              <textarea
                rows={2}
                className={inputClass}
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Optional notes"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.hasReports}
                onChange={(e) => setField("hasReports", e.target.checked)}
                className="rounded border-border"
              />
              I have already generated a Cosmic Blueprint chart or report
            </label>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center px-6 py-2.5 rounded-xl bg-gold text-primary-foreground text-xs uppercase tracking-widest hover:opacity-95 transition disabled:opacity-60"
              >
                {busy ? "Sending…" : "Send booking request"}
              </button>
              <Link
                to="/"
                className="inline-flex items-center px-5 py-2.5 rounded-xl border border-gold/50 text-gold text-xs uppercase tracking-widest hover:bg-gold/10 transition"
              >
                Calculate my chart first
              </Link>
              <a
                href={`mailto:${BOOKING_EMAIL}?subject=Cosmic%20Blueprint%20Reading%20Booking`}
                className="inline-flex items-center px-5 py-2.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-gold transition"
              >
                Or email directly
              </a>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

/** Academy AI tutor — answers via Gemini / Groq (same dual-provider engine as reports). */
export function AssistantChat() {
  const ask = useServerFn(askAcademy);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your astrology tutor. Ask me anything — 'What does my Moon sign mean?', 'Why is my Rising Sign important?', 'What is a square aspect?'",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const suggestions = [
    "What does my Moon sign mean?",
    "Why is my Rising Sign important?",
    "What is a square aspect?",
    "What are the houses?",
    "Why do I need my exact birth time?",
    "How do I book a live reading?",
  ];

  async function send(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    setError(null);
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session || sessionData.session.user.is_anonymous) {
        throw new Error("Please sign in with Google to chat with the tutor.");
      }
      const history = messages.slice(-8);
      const res = await ask({ data: { question, history } });
      const providerNote =
        res.provider === "gemini-direct"
          ? "\n\n_Answered via Gemini_"
          : res.provider === "groq"
            ? "\n\n_Answered via Groq_"
            : res.provider === "lovable-gateway"
              ? "\n\n_Answered via Lovable AI_"
              : "";
      setMessages((m) => [...m, { role: "assistant", content: res.answer + providerNote }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-20 glass rounded-2xl p-6 md:p-8 shadow-deep">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold">AI Astrology Tutor</p>
          <h2 className="font-display text-2xl text-gradient-gold mt-1">Ask anything</h2>
        </div>
        <span className="text-xs text-muted-foreground">Powered by Gemini / Groq · real AI answers</span>
      </div>

      <div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card/70 border border-border/40 text-foreground"
              }`}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-card/70 border border-border/40 rounded-2xl px-4 py-2.5 text-sm text-muted-foreground">
              Thinking…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="text-xs px-3 py-1.5 rounded-full border border-border/50 text-muted-foreground hover:text-gold hover:border-gold/40 transition"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <div className="mt-3 text-xs text-destructive">{error}</div>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-4 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question…"
          className="cosmic-input flex-1"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="px-5 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50 text-xs uppercase tracking-widest"
        >
          {busy ? "…" : "Ask"}
        </button>
      </form>
    </section>
  );
}
