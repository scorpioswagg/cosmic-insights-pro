import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

/** Lovable-hosted OpenAI-compatible gateway (uses LOVABLE_API_KEY / project credits). */
export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
}

/**
 * Direct Google Gemini via the official OpenAI-compatible endpoint.
 * Billed to the site owner's Google AI Studio / Cloud account — no Lovable credits.
 * @see https://ai.google.dev/gemini-api/docs/openai
 */
export function createDirectGeminiProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "google-gemini-direct",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    apiKey,
  });
}

/** Default free-tier Google AI Studio model (override with GEMINI_MODEL). */
export const DIRECT_GEMINI_MODEL = "gemini-2.5-flash";

type AnyModel = any;

function statusOf(err: unknown): number | undefined {
  const e = err as { statusCode?: number; status?: number; cause?: { statusCode?: number } };
  return e?.statusCode ?? e?.status ?? e?.cause?.statusCode;
}

function retryAfterMs(err: unknown): number | null {
  const h = (err as { responseHeaders?: Record<string, string> })?.responseHeaders;
  const v = h?.["retry-after"];
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(n * 1000, 60_000) : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callWithRetry<T>(fn: () => Promise<T>, label: string, attempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const s = statusOf(err);
      const retryable = s === 429 || (s !== undefined && s >= 500);
      if (!retryable || i === attempts - 1) throw err;
      const wait = retryAfterMs(err) ?? Math.min(2000 * 2 ** i, 30_000) + Math.random() * 1000;
      console.warn(`[ai-gateway] ${label} ${s}; retrying in ${Math.round(wait)}ms`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

/** Wrap a model with bounded 429/5xx retry + pacing. */
function withRetry(model: AnyModel): AnyModel {
  return new Proxy(model, {
    get(target, prop, recv) {
      if (prop === "doGenerate" || prop === "doStream") {
        return (opts: unknown) =>
          callWithRetry(() => target[prop](opts), `${target.provider}:${String(prop)}`);
      }
      return Reflect.get(target, prop, recv);
    },
  });
}

/** Try primary (with retry); on any failure fall back to secondary (with retry). */
function withFallback(primary: AnyModel, secondary: AnyModel): AnyModel {
  const p = withRetry(primary);
  const s = withRetry(secondary);
  return new Proxy(primary, {
    get(target, prop, recv) {
      if (prop === "doGenerate" || prop === "doStream") {
        return async (opts: unknown) => {
          try {
            return await p[prop](opts);
          } catch (err) {
            console.warn(
              `[ai-gateway] ${target.provider} failed (${statusOf(err) ?? "error"}); falling back to ${secondary.provider}`,
            );
            return s[prop](opts);
          }
        };
      }
      return Reflect.get(target, prop, recv);
    },
  });
}

/** Model id used when talking to the Lovable AI Gateway. */
export const LOVABLE_GATEWAY_MODEL = "google/gemini-3.8-flash";

export type WritingProvider = "groq" | "gemini-direct" | "lovable-gateway";

/** Groq free tier (no card). OpenAI-compatible endpoint. */
export function createGroqProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "groq",
    baseURL: "https://api.groq.com/openai/v1",
    apiKey,
  });
}

export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

export function groqModelId(): string {
  return process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL;
}

export function resolveGroqApiKey(): string | null {
  return process.env.GROQ_API_KEY?.trim() || null;
}

/** Read Gemini key from common secret names Lovable / Vercel users set. */
export function resolveGeminiApiKey(): string | null {
  const candidates = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GOOGLE_GEMINI_API_KEY,
  ];
  for (const c of candidates) {
    const v = c?.trim();
    if (v) return v;
  }
  return null;
}

/**
 * Which provider will be used, or null if none is configured.
 * Optional AI_PROVIDER=groq|gemini|lovable forces a specific path when that key exists.
 */
export function whichWritingProvider(): WritingProvider | null {
  const forced = process.env.AI_PROVIDER?.trim().toLowerCase();
  const hasGroq = !!resolveGroqApiKey();
  const hasGemini = !!resolveGeminiApiKey();
  const hasLovable = !!process.env.LOVABLE_API_KEY?.trim();

  if (forced === "groq" && hasGroq) return "groq";
  if (forced === "gemini" && hasGemini) return "gemini-direct";
  if ((forced === "lovable" || forced === "lovable-gateway") && hasLovable) {
    return "lovable-gateway";
  }

  // Prefer Groq (free), then Gemini, then Lovable gateway.
  if (hasGroq) return "groq";
  if (hasGemini) return "gemini-direct";
  if (hasLovable) return "lovable-gateway";
  return null;
}

function geminiModelId(): string {
  return process.env.GEMINI_MODEL?.trim() || DIRECT_GEMINI_MODEL;
}

/**
 * Resolves the writing model for natal reports, synastry, and the Academy tutor.
 *
 * Priority:
 * 1. AI_PROVIDER=gemini|lovable (when that key is set)
 * 2. GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY / GOOGLE_API_KEY)
 * 3. LOVABLE_API_KEY → Lovable AI Gateway (credits; fails at $0)
 *
 * OpenAI is not used.
 * Default model: gemini-3.8-flash (override with GEMINI_MODEL).
 */
export function resolveWritingModel(): LanguageModel {
  const provider = whichWritingProvider();
  console.log("[ai-gateway] writing provider", {
    provider,
    model:
      provider === "groq"
        ? groqModelId()
        : provider === "gemini-direct"
          ? geminiModelId()
          : provider === "lovable-gateway"
            ? LOVABLE_GATEWAY_MODEL
            : null,
    hasGroq: !!resolveGroqApiKey(),
    hasGemini: !!resolveGeminiApiKey(),
    hasLovable: !!process.env.LOVABLE_API_KEY?.trim(),
    forced: process.env.AI_PROVIDER?.trim() || null,
  });

  const groqKey = resolveGroqApiKey();
  const geminiKey = resolveGeminiApiKey();
  const forced = process.env.AI_PROVIDER?.trim().toLowerCase();

  // Dual provider: Gemini (1M TPM free) first, Groq as automatic fallback.
  if (geminiKey && groqKey && !forced) {
    return withFallback(
      createDirectGeminiProvider(geminiKey)(geminiModelId()),
      createGroqProvider(groqKey)(groqModelId()),
    );
  }

  if (provider === "groq") {
    return withRetry(createGroqProvider(groqKey!)(groqModelId()));
  }

  if (provider === "gemini-direct") {
    return withRetry(createDirectGeminiProvider(geminiKey!)(geminiModelId()));
  }

  if (provider === "lovable-gateway") {
    const key = process.env.LOVABLE_API_KEY!.trim();
    return createLovableAiGatewayProvider(key)(LOVABLE_GATEWAY_MODEL);
  }

  throw new Error(
    "Report engine is not configured: set GEMINI_API_KEY in project secrets (exact name), then republish. OpenAI is disabled.",
  );
}
