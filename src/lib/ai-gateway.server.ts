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

/**
 * Direct OpenAI API — billed to the site owner's OpenAI account.
 * No Lovable credits used.
 */
export function createDirectOpenAIProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "openai-direct",
    baseURL: "https://api.openai.com/v1",
    apiKey,
  });
}

/** Stable flash model for direct Gemini calls. */
export const DIRECT_GEMINI_MODEL = "gemini-2.5-flash";

/** Default OpenAI chat model (cost-efficient for long reports). Override with OPENAI_MODEL. */
export const DIRECT_OPENAI_MODEL = "gpt-4o-mini";

/** Model id used when talking to the Lovable AI Gateway. */
export const LOVABLE_GATEWAY_MODEL = "google/gemini-2.5-flash";

export type WritingProvider = "openai-direct" | "gemini-direct" | "lovable-gateway";

/**
 * Which provider will be used, or null if none is configured.
 * Optional AI_PROVIDER=openai|gemini|lovable forces a specific path when that key exists.
 */
export function whichWritingProvider(): WritingProvider | null {
  const forced = process.env.AI_PROVIDER?.trim().toLowerCase();
  const hasOpenAI = !!process.env.OPENAI_API_KEY?.trim();
  const hasGemini = !!process.env.GEMINI_API_KEY?.trim();
  const hasLovable = !!process.env.LOVABLE_API_KEY?.trim();

  if (forced === "openai" && hasOpenAI) return "openai-direct";
  if (forced === "gemini" && hasGemini) return "gemini-direct";
  if ((forced === "lovable" || forced === "lovable-gateway") && hasLovable) {
    return "lovable-gateway";
  }

  // Default priority: own OpenAI → own Gemini → Lovable credits
  if (hasOpenAI) return "openai-direct";
  if (hasGemini) return "gemini-direct";
  if (hasLovable) return "lovable-gateway";
  return null;
}

function openAiModelId(): string {
  return process.env.OPENAI_MODEL?.trim() || DIRECT_OPENAI_MODEL;
}

function geminiModelId(): string {
  return process.env.GEMINI_MODEL?.trim() || DIRECT_GEMINI_MODEL;
}

/**
 * Resolves the writing model for natal reports, synastry, and the Academy tutor.
 *
 * Priority:
 * 1. AI_PROVIDER=openai|gemini|lovable (when that key is set)
 * 2. OPENAI_API_KEY  → gpt-4o-mini (or OPENAI_MODEL)
 * 3. GEMINI_API_KEY  → gemini-2.5-flash (or GEMINI_MODEL)
 * 4. LOVABLE_API_KEY → Lovable AI Gateway
 */
export function resolveWritingModel(): LanguageModel {
  const provider = whichWritingProvider();

  if (provider === "openai-direct") {
    const key = process.env.OPENAI_API_KEY!.trim();
    return createDirectOpenAIProvider(key)(openAiModelId());
  }

  if (provider === "gemini-direct") {
    const key = process.env.GEMINI_API_KEY!.trim();
    return createDirectGeminiProvider(key)(geminiModelId());
  }

  if (provider === "lovable-gateway") {
    const key = process.env.LOVABLE_API_KEY!.trim();
    return createLovableAiGatewayProvider(key)(LOVABLE_GATEWAY_MODEL);
  }

  throw new Error(
    "Report engine is not configured: set OPENAI_API_KEY, GEMINI_API_KEY, or LOVABLE_API_KEY in project secrets.",
  );
}
