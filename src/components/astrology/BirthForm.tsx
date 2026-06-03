import { useState } from "react";
import { geocodePlace, type GeocodeResult } from "@/lib/astrology/geocoding";
import { timezoneAt, tzOffsetHoursFor } from "@/lib/astrology/timezone";
import type { BirthInput } from "@/lib/astrology/types";
import { KYLE_MERRITT_INPUT } from "@/lib/astrology/validation";

interface Props {
  onSubmit: (input: BirthInput) => void;
  busy?: boolean;
}

export function BirthForm({ onSubmit, busy }: Props) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [picked, setPicked] = useState<GeocodeResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function searchPlace() {
    if (!place.trim()) return;
    setSearching(true); setError(null);
    try {
      const r = await geocodePlace(place.trim());
      setResults(r);
      if (r.length === 0) setError("No matching place found.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  }

  function loadKyle() {
    setName(KYLE_MERRITT_INPUT.name);
    setDate(KYLE_MERRITT_INPUT.date);
    setTime(KYLE_MERRITT_INPUT.time);
    setPlace(KYLE_MERRITT_INPUT.place);
    setPicked({
      name: "Cincinnati", country: "United States", admin1: "Ohio",
      latitude: KYLE_MERRITT_INPUT.latitude,
      longitude: KYLE_MERRITT_INPUT.longitude,
      timezone: KYLE_MERRITT_INPUT.timezone,
    });
    setResults([]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !date || !time) {
      setError("Name, date and time are required.");
      return;
    }
    if (!picked) {
      setError("Search and select a birth location.");
      return;
    }
    const tz = picked.timezone || timezoneAt(picked.latitude, picked.longitude);
    const offset = tzOffsetHoursFor(`${date}T${time}`, tz);
    const input: BirthInput = {
      name: name.trim(),
      date, time,
      place: `${picked.name}${picked.admin1 ? ", " + picked.admin1 : ""}, ${picked.country}`,
      latitude: picked.latitude,
      longitude: picked.longitude,
      timezone: tz,
      tzOffsetHours: offset,
    };
    onSubmit(input);
  }

  return (
    <form onSubmit={submit} className="glass rounded-2xl p-6 md:p-8 space-y-5 shadow-deep">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl text-gradient-gold">Birth Details</h2>
        <button type="button" onClick={loadKyle}
          className="text-xs uppercase tracking-widest text-gold hover:underline">
          Load validation chart
        </button>
      </div>

      <Field label="Full Name">
        <input value={name} onChange={(e) => setName(e.target.value)}
          className="cosmic-input" placeholder="Your name" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Birth Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="cosmic-input" />
        </Field>
        <Field label="Birth Time (24h)">
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="cosmic-input" />
        </Field>
      </div>

      <Field label="Birthplace">
        <div className="flex gap-2">
          <input value={place} onChange={(e) => { setPlace(e.target.value); setPicked(null); }}
            placeholder="City, region, country" className="cosmic-input flex-1" />
          <button type="button" onClick={searchPlace} disabled={searching}
            className="px-4 rounded-lg bg-gold text-primary-foreground font-medium text-sm disabled:opacity-50">
            {searching ? "…" : "Search"}
          </button>
        </div>
        {results.length > 0 && !picked && (
          <ul className="mt-2 rounded-lg border border-border bg-card/80 divide-y divide-border max-h-48 overflow-y-auto">
            {results.map((r, i) => (
              <li key={i}>
                <button type="button" onClick={() => { setPicked(r); setResults([]); setPlace(`${r.name}, ${r.country}`); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/60 transition">
                  <span className="text-foreground">{r.name}</span>
                  <span className="text-muted-foreground"> — {r.admin1 ? r.admin1 + ", " : ""}{r.country}</span>
                  <span className="text-xs text-muted-foreground/80 block">{r.latitude.toFixed(2)}°, {r.longitude.toFixed(2)}° · {r.timezone}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {picked && (
          <div className="mt-2 text-xs text-muted-foreground">
            <span className="text-gold">✓</span> {picked.latitude.toFixed(4)}°, {picked.longitude.toFixed(4)}° · {picked.timezone}
          </div>
        )}
      </Field>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button type="submit" disabled={busy}
        className="w-full py-3 rounded-xl bg-gold text-primary-foreground font-display tracking-wider uppercase shadow-gold hover:opacity-95 transition disabled:opacity-50">
        {busy ? "Consulting the heavens…" : "Calculate Cosmic Blueprint"}
      </button>

      <style>{`
        .cosmic-input {
          width: 100%;
          background: var(--input);
          border: 1px solid var(--color-border);
          border-radius: 0.5rem;
          padding: 0.6rem 0.85rem;
          color: var(--color-foreground);
          font-size: 0.95rem;
          outline: none;
          transition: border-color .15s, box-shadow .15s;
        }
        .cosmic-input:focus {
          border-color: var(--gold);
          box-shadow: 0 0 0 3px oklch(0.82 0.15 85 / 0.15);
        }
        .cosmic-input::-webkit-calendar-picker-indicator { filter: invert(0.85) sepia(0.5) saturate(3) hue-rotate(10deg); }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}