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

/** Stable flash model for direct Gemini calls. */
export const DIRECT_GEMINI_MODEL = "gemini-2.5-flash";

/** Model id used when talking to the Lovable AI Gateway. */
export const LOVABLE_GATEWAY_MODEL = "google/gemini-2.5-flash";

export type WritingProvider = "gemini-direct" | "lovable-gateway";

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
 * Optional AI_PROVIDER=gemini|lovable forces a specific path when that key exists.
 * OpenAI is intentionally disabled.
 */
export function whichWritingProvider(): WritingProvider | null {
  const forced = process.env.AI_PROVIDER?.trim().toLowerCase();
  const hasGemini = !!resolveGeminiApiKey();
  const hasLovable = !!process.env.LOVABLE_API_KEY?.trim();

  if (forced === "openai") {
    console.warn(
      "[ai-gateway] AI_PROVIDER=openai is disabled; use gemini or lovable.",
    );
  }

  if (forced === "gemini" && hasGemini) return "gemini-direct";
  if ((forced === "lovable" || forced === "lovable-gateway") && hasLovable) {
    return "lovable-gateway";
  }

  // Prefer Gemini (no Lovable credits). Fallback: Lovable gateway only.
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
 */
export function resolveWritingModel(): LanguageModel {
  const provider = whichWritingProvider();
  console.log("[ai-gateway] writing provider", {
    provider,
    hasGemini: !!resolveGeminiApiKey(),
    hasLovable: !!process.env.LOVABLE_API_KEY?.trim(),
    forced: process.env.AI_PROVIDER?.trim() || null,
  });

  if (provider === "gemini-direct") {
    const key = resolveGeminiApiKey()!;
    return createDirectGeminiProvider(key)(geminiModelId());
  }

  if (provider === "lovable-gateway") {
    const key = process.env.LOVABLE_API_KEY!.trim();
    return createLovableAiGatewayProvider(key)(LOVABLE_GATEWAY_MODEL);
  }

  throw new Error(
    "Report engine is not configured: set GEMINI_API_KEY in project secrets (exact name), then republish. OpenAI is disabled.",
  );
}
