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
          "Something went wrong. Please try again or use the Email me button below.",
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
          Ready to hear your chart spoken out loud — not as vague horoscope fluff, but as the precise story
          written in your planets, houses, and aspects? A live Cosmic Blueprint session turns the numbers
          into a conversation that feels personal, clear, and immediately useful.
        </p>
        <p className="mt-4 text-sm text-muted-foreground max-w-2xl leading-relaxed">
          We start by confirming your birth data and the one or two questions that matter most right now.
          Then we walk your Big Three (Sun, Moon, Rising), the standout aspects and house themes that keep
          showing up in your life, and a focused deep-dive on career, love, purpose, timing, or whatever you
          name. You leave with concrete takeaways you can act on the same day. Synastry sessions map the
          chemistry, friction, and growth edges between two charts; extended sessions open space for multiple
          themes or a full report review. Bring your birth details (and a partner's if relevant) — we do
          the rest.
        </p>
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
        <h3 className="font-display text-2xl text-gradient-gold mt-1">Book your session</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Fill out the form below and you will receive a confirmation email right away. We reply within
          1–2 business days to lock in a time. Prefer to write in your own words? Use the Email me button.
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
                href={`mailto:${BOOKING_EMAIL}?subject=${encodeURIComponent("Cosmic Blueprint Reading Booking")}&body=${encodeURIComponent("Hi,\\n\\nI would like to book a live Cosmic Blueprint reading.\\n\\nPreferred reading type:\\nPreferred days/times:\\nTimezone:\\nBirth date (if known):\\nWhat I want clarity on:\\n\\nThank you!")}`}
                className="inline-flex items-center px-5 py-2.5 rounded-xl border border-gold/50 text-gold text-xs uppercase tracking-widest hover:bg-gold/10 transition"
              >
                Email me
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
                  : "bg-muted/40 text-foreground border border-border/40"
              }`}
            >
              {m.role === "assistant" ? (
                <ReactMarkdown>{m.content}</ReactMarkdown>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-2.5 text-sm text-muted-foreground bg-muted/30 border border-border/30">
              Thinking…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => send(s)}
            disabled={busy}
            className="text-xs px-3 py-1.5 rounded-full border border-border/60 text-muted-foreground hover:border-gold/50 hover:text-gold transition disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          className="flex-1 rounded-xl border border-border/60 bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold/50"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about signs, aspects, houses…"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="px-5 py-2.5 rounded-xl bg-gold text-primary-foreground text-xs uppercase tracking-widest hover:opacity-95 transition disabled:opacity-60"
        >
          Ask
        </button>
      </form>
    </section>
  );
}
