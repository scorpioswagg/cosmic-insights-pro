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
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKey,
  });
}

/** Stable, widely available flash model for direct Gemini calls. */
export const DIRECT_GEMINI_MODEL = "gemini-2.5-flash";

/** Model id used when talking to the Lovable AI Gateway. */
export const LOVABLE_GATEWAY_MODEL = "google/gemini-2.5-flash";

export type WritingProvider = "gemini-direct" | "lovable-gateway";

export function whichWritingProvider(): WritingProvider | null {
  if (process.env.GEMINI_API_KEY?.trim()) return "gemini-direct";
  if (process.env.LOVABLE_API_KEY?.trim()) return "lovable-gateway";
  return null;
}

/**
 * Resolves the writing model for natal reports, synastry, and the Academy tutor.
 * Prefers the owner's own GEMINI_API_KEY (bypasses Lovable credit limits);
 * falls back to the Lovable AI Gateway when only LOVABLE_API_KEY is set.
 */
export function resolveWritingModel(): LanguageModel {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    return createDirectGeminiProvider(geminiKey)(DIRECT_GEMINI_MODEL);
  }

  const lovableKey = process.env.LOVABLE_API_KEY?.trim();
  if (lovableKey) {
    return createLovableAiGatewayProvider(lovableKey)(LOVABLE_GATEWAY_MODEL);
  }

  throw new Error(
    "Report engine is not configured: set GEMINI_API_KEY (preferred) or LOVABLE_API_KEY in project secrets.",
  );
}
