import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { askAcademy } from "@/lib/academy/chat.functions";
import { supabase } from "@/integrations/supabase/client";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

/** Live reading booking CTA for the Academy page. */
export function BookReadingSection() {
  return (
    <section id="book-reading" className="mt-16 glass rounded-2xl p-6 md:p-8 shadow-deep border border-gold/30">
      <p className="text-xs uppercase tracking-[0.3em] text-gold">Live readings</p>
      <h2 className="font-display text-2xl md:text-3xl text-gradient-gold mt-1">Book a reading</h2>
      <p className="mt-3 text-sm text-muted-foreground max-w-2xl leading-relaxed">
        Prefer a human conversation after the AI tutor and written reports? Book a live Cosmic Blueprint
        session to walk through your natal chart, a synastry pairing, or any Unfiltered Series report
        you have generated.
      </p>
      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
        <li className="flex gap-2">
          <span className="text-gold">1.</span> Generate your chart on the home page (and a partner chart for
          relationship work).
        </li>
        <li className="flex gap-2">
          <span className="text-gold">2.</span> Optionally run a written report so we share the same evidence.
        </li>
        <li className="flex gap-2">
          <span className="text-gold">3.</span> Email{" "}
          <span className="text-foreground">swaggersofyne@gmail.com</span> with your preferred dates and
          report titles.
        </li>
      </ul>
      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href="mailto:swaggersofyne@gmail.com?subject=Cosmic%20Blueprint%20Reading%20Booking"
          className="inline-flex items-center px-5 py-2.5 rounded-xl bg-gold text-primary-foreground text-xs uppercase tracking-widest hover:opacity-95 transition"
        >
          Email to book
        </a>
        <Link
          to="/"
          className="inline-flex items-center px-5 py-2.5 rounded-xl border border-gold/50 text-gold text-xs uppercase tracking-widest hover:bg-gold/10 transition"
        >
          Calculate my chart first
        </Link>
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
