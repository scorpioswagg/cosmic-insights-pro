import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
}

/** Direct Google Gemini provider, billed to the site owner's own Google account. */
export function createDirectGeminiProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "google-gemini-direct",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKey,
  });
}

export const DIRECT_GEMINI_MODEL = "gemini-3.6-flash";
export const LOVABLE_GATEWAY_MODEL = "google/gemini-3-flash-preview";

/**
 * Resolves the writing model for reports and the tutor.
 * Prefers the owner's own GEMINI_API_KEY; falls back to the Lovable AI Gateway.
 */
export function resolveWritingModel(): LanguageModel {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    return createDirectGeminiProvider(geminiKey)(DIRECT_GEMINI_MODEL);
  }
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!lovableKey) {
    throw new Error(
      "Report engine is not configured: add your GEMINI_API_KEY (or LOVABLE_API_KEY) in project settings.",
    );
  }
  return createLovableAiGatewayProvider(lovableKey)(LOVABLE_GATEWAY_MODEL);
}
